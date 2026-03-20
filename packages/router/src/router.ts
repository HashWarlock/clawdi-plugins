import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import { CapabilityRegistry } from "./capabilities/registry.js";
import { FallbackResolver, type FallbackConfig } from "./policy/fallback.js";
import { SideEffectGuard, type SideEffectPolicy } from "./policy/side-effects.js";
import { ComposioAdapter } from "./adapters/composio.js";
import { OpenClawToolAdapter } from "./adapters/openclaw-tool.js";
import { LobsterAdapter } from "./adapters/lobster.js";
import { CliAdapter } from "./adapters/cli.js";
import { McporterAdapter } from "./adapters/mcporter.js";
import type { CapabilityAdapter, AdapterResult } from "./adapters/types.js";
import type { PackManifest, CapabilityId, PackId } from "./capabilities/types.js";

export interface RouterConfig {
  adapterOrder?: string[];
  disabledAdapters?: string[];
  capabilityPins?: Record<string, string>;
  sideEffectPolicy?: SideEffectPolicy;
  executionTimeoutMs?: number;
  composio?: { apiKey?: string; preferGooglesuper?: boolean };
  mcporter?: { allowedServers?: string[] };
  cli?: { allowedBinaries?: string[] };
}

// Known capabilities and their side-effect classification
const KNOWN_CAPABILITIES: Array<{ id: string; sideEffect: boolean }> = [
  // Calendar
  { id: "calendar.read_events", sideEffect: false },
  { id: "calendar.prepare_meeting_context", sideEffect: false },
  // CRM
  { id: "crm.lookup_account", sideEffect: false },
  { id: "crm.create_note", sideEffect: true },
  { id: "crm.create_note_workflow", sideEffect: true },
  { id: "crm.update_deal_workflow", sideEffect: true },
  // Mail
  { id: "mail.send_followup", sideEffect: true },
  { id: "mail.read_inbox", sideEffect: false },
  { id: "mail.send_sequence", sideEffect: true },
  // Docs
  { id: "docs.create_brief", sideEffect: true },
  { id: "docs.create_brief_workflow", sideEffect: true },
  { id: "docs.read_file", sideEffect: false },
  { id: "docs.write_file", sideEffect: true },
  { id: "docs.search_files", sideEffect: false },
  { id: "docs.convert_format", sideEffect: false },
  // Research
  { id: "research.collect_sources", sideEffect: false },
  { id: "research.web_search", sideEffect: false },
  // Chat
  { id: "chat.search_messages", sideEffect: false },
  { id: "chat.send_message", sideEffect: true },
  // ATS
  { id: "ats.search_candidates", sideEffect: false },
  { id: "ats.get_candidate", sideEffect: false },
  { id: "ats.update_candidate_stage", sideEffect: true },
  // HRIS
  { id: "hris.get_employee", sideEffect: false },
  { id: "hris.list_employees", sideEffect: false },
  // Project
  { id: "project.list_tasks", sideEffect: false },
  { id: "project.create_task", sideEffect: true },
  // Compensation
  { id: "compensation.get_benchmarks", sideEffect: false },
  // SEO
  { id: "seo.audit_page", sideEffect: false },
  { id: "seo.keyword_research", sideEffect: false },
  // Analytics
  { id: "analytics.get_metrics", sideEffect: false },
  // Enrichment
  { id: "enrichment.lookup_company", sideEffect: false },
  { id: "enrichment.lookup_person", sideEffect: false },
  // Data
  { id: "data.query_json", sideEffect: false },
  // Recruiting workflows
  { id: "recruiting.offer_workflow", sideEffect: true },
];

export class Router {
  readonly registry = new CapabilityRegistry();
  readonly adapters: CapabilityAdapter[];
  readonly packs: PackManifest[] = [];
  private resolver: FallbackResolver;
  private sideEffectGuard: SideEffectGuard;
  private config: RouterConfig;

  constructor(config: RouterConfig = {}) {
    this.config = config;

    // Initialize adapters
    const composio = new ComposioAdapter();
    const openclawTool = new OpenClawToolAdapter();
    const lobster = new LobsterAdapter();
    const cli = new CliAdapter(config.cli?.allowedBinaries);
    const mcporter = new McporterAdapter(undefined, config.mcporter?.allowedServers);

    this.adapters = [composio, openclawTool, lobster, cli, mcporter];

    // Register known capabilities
    for (const cap of KNOWN_CAPABILITIES) {
      this.registry.register(cap);
    }

    // Build adapter -> capability map
    // (done lazily on first resolve to allow adapters to be configured after construction)

    this.resolver = new FallbackResolver(this.adapters, {
      adapterOrder: config.adapterOrder,
      disabledAdapters: config.disabledAdapters,
      capabilityPins: config.capabilityPins,
      executionTimeoutMs: config.executionTimeoutMs,
    });

    this.sideEffectGuard = new SideEffectGuard(config.sideEffectPolicy ?? "confirm_destructive");
  }

  registerPack(manifest: PackManifest): void {
    this.packs.push(manifest);
  }

  /**
   * Resolve a capability: find a ready adapter, check side-effect policy, execute.
   * If skipSideEffectCheck is true, the side-effect guard is bypassed (used after confirmation).
   */
  async resolve(
    capabilityId: CapabilityId,
    packId: PackId,
    args: Record<string, unknown>,
    skipSideEffectCheck = false
  ): Promise<AdapterResult> {
    const entry = this.registry.get(capabilityId);
    const pack = this.packs.find((p) => p.packId === packId);
    const overrides = pack?.fallbackOverrides;

    // Find a ready adapter via fallback chain
    const result = await this.resolver.resolve(capabilityId, packId, args, overrides);

    // If no adapter is ready, return as-is (needs_setup or error)
    if (result.status !== "ok") return result;

    // Check side-effect policy before returning the result
    if (!skipSideEffectCheck && result.resolvedAdapterId) {
      const isSideEffect = entry?.sideEffect ?? false;
      const sideEffectCheck = this.sideEffectGuard.check({
        capabilityId,
        packId,
        args,
        isSideEffect,
        adapterId: result.resolvedAdapterId,
        resolvedApp: result.resolvedAdapterId, // TODO: map to user-facing app label
      });

      if (sideEffectCheck.blocked) {
        return {
          status: "blocked",
          data: {
            message: sideEffectCheck.message,
            confirmationToken: sideEffectCheck.confirmationToken,
          },
        };
      }
    }

    return result;
  }

  /**
   * Execute a previously confirmed side-effecting operation.
   * Returns the adapter result, or an error if the token is invalid/expired.
   */
  async executeConfirmed(token: string): Promise<AdapterResult> {
    const pending = this.sideEffectGuard.validateToken(token);
    if (!pending) {
      return { status: "error", notes: ["Invalid or expired confirmation token"] };
    }

    // Re-resolve with side-effect check bypassed
    return this.resolve(pending.capabilityId, pending.packId, pending.args, true);
  }

  getAdapter(id: string): CapabilityAdapter | undefined {
    return this.adapters.find((a) => a.id === id);
  }

  static async loadPackManifest(installPath: string): Promise<PackManifest> {
    const raw = await readFile(`${installPath}/pack-manifest.yaml`, "utf-8");
    return parseYaml(raw) as PackManifest;
  }
}
