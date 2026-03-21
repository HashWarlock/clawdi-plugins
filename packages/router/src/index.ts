import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Router } from "./router.js";
import { ComposioAdapter } from "./adapters/composio.js";
import { OpenClawToolAdapter } from "./adapters/openclaw-tool.js";
import { LobsterAdapter } from "./adapters/lobster.js";
import { CliAdapter } from "./adapters/cli.js";
import { McporterAdapter } from "./adapters/mcporter.js";
import { runConnectApps } from "./onboarding/connect-apps.js";
import {
  runCheckSetup,
  formatCheckSetup,
} from "./onboarding/check-setup.js";

// Use permissive type — the plugin API shape varies across OpenClaw versions
type PluginApi = any;

const DEFAULT_CONFIG = {
  adapterOrder: ["composio", "openclaw_tool", "lobster", "cli", "mcporter"],
  disabledAdapters: [] as string[],
  capabilityPins: {} as Record<string, string>,
  sideEffectPolicy: "confirm_destructive",
  cacheTtl: 600000,
  cliMappings: {} as Record<string, string>,
};

function resolveConfig(api: PluginApi) {
  return {
    ...DEFAULT_CONFIG,
    ...((api?.getConfig?.() as Record<string, unknown>) ?? {}),
  } as typeof DEFAULT_CONFIG;
}

/**
 * Discover pack install paths. First tries the plugin API registry,
 * then falls back to scanning /data/openclaw/extensions/pack-*.
 */
function discoverPackInstallPaths(api: PluginApi): string[] {
  const pathsFromApi =
    api
      ?.getEnabledPlugins?.()
      ?.filter((p: any) => {
        const id = String(p?.id ?? "");
        return id.startsWith("pack-") || id.startsWith("@clawdi-ai/pack-");
      })
      ?.map((p: any) => p.installPath) ?? [];

  if (pathsFromApi.length) return pathsFromApi;

  // Filesystem fallback for environments without plugin registry
  const root = "/data/openclaw/extensions";
  if (!existsSync(root)) return [];

  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("pack-"))
    .map((d) => join(root, d.name));
}

export function register(api: PluginApi) {
  const config = resolveConfig(api);

  // Create adapters with runtime callbacks (safe-access for optional runtime methods)
  const composio = new ComposioAdapter((server, tool, args) =>
    api?.runtime?.callMcpTool?.(server, tool, args) ?? Promise.resolve(null)
  );
  const openclawTool = new OpenClawToolAdapter(
    () => api?.runtime?.listBuiltinTools?.() ?? [],
    (name, args) =>
      api?.runtime?.callBuiltinTool?.(name, args) ?? Promise.resolve(null)
  );
  const lobster = new LobsterAdapter(
    () =>
      api?.runtime?.listLobsterWorkflows?.() ?? Promise.resolve([]),
    (id, args) =>
      api?.runtime?.runLobsterWorkflow?.(id, args) ?? Promise.resolve(null)
  );
  const cli = new CliAdapter(config.cliMappings ?? {});
  const mcporter = new McporterAdapter(
    () =>
      api?.runtime?.listMcpServers?.() ?? Promise.resolve([]),
    (server, tool, args) =>
      api?.runtime?.callMcpTool?.(server, tool, args) ?? Promise.resolve(null)
  );

  const adapters = [composio, openclawTool, lobster, cli, mcporter];

  const router = new Router(adapters, {
    adapterOrder: config.adapterOrder,
    disabledAdapters: config.disabledAdapters,
    capabilityPins: config.capabilityPins,
    sideEffectPolicy: config.sideEffectPolicy,
    cacheTtl: config.cacheTtl,
  });

  // Discover packs at startup
  api.on("gateway_start", async () => {
    const packPaths = discoverPackInstallPaths(api);
    for (const installPath of packPaths) {
      try {
        const manifest = await Router.loadPackManifest(installPath);
        router.registerPack(manifest);
      } catch (err) {
        console.error(
          `[knowledge-work-router] Failed to load pack from ${installPath}:`,
          err
        );
      }
    }
    console.log(
      `[knowledge-work-router] Discovered ${router.packs.length} pack(s)`
    );
  });

  // Register capability_execute tool
  api.registerTool({
    name: "capability_execute",
    description:
      "Execute a capability through the knowledge-work router. Pack skills use this to invoke capabilities like calendar.read_events, crm.lookup_account, etc.",
    parameters: {
      type: "object",
      properties: {
        capabilityId: {
          type: "string",
          description: "Capability ID, e.g. 'calendar.read_events'",
        },
        packId: {
          type: "string",
          description: "Pack ID, e.g. 'sales'",
        },
        args: {
          type: "object",
          description: "Arguments for the capability",
        },
        confirmationToken: {
          type: "string",
          description: "Token from a prior blocked result",
        },
      },
      required: ["capabilityId", "packId"],
    },
    handler: async ({
      capabilityId,
      packId,
      args,
      confirmationToken,
    }: any) => {
      if (confirmationToken) {
        return router.executeConfirmed(confirmationToken);
      }
      return router.resolve(capabilityId, packId, args ?? {});
    },
  });

  // Register /connect_apps command
  api.registerCommand({
    name: "connect_apps",
    description:
      "Set up connections for your installed knowledge-work packs",
    handler: async () => {
      const report = await runConnectApps(
        router.packs,
        router.engine
      );
      const lines: string[] = [];
      for (const pr of report.packReports) {
        lines.push(`\n**${pr.displayName}**`);
        if (pr.allRequiredReady) {
          lines.push("All required capabilities are ready.");
        } else {
          if (pr.ready.length) {
            lines.push(
              `Ready: ${pr.ready.map((r: any) => `${r.capabilityId} -> ${r.displayName}`).join(", ")}`
            );
          }
          for (const s of pr.needsSetup) {
            lines.push(
              `Needs setup: ${s.capabilityId} -> ${s.displayName}${s.setupUrl ? ` (${s.setupUrl})` : s.setupHint ? ` — ${s.setupHint}` : ""}`
            );
          }
          if (pr.notFound.length) {
            lines.push(`No provider: ${pr.notFound.join(", ")}`);
          }
        }
      }
      return { text: lines.join("\n") || "No packs discovered." };
    },
  });

  // Register /check_setup command
  api.registerCommand({
    name: "check_setup",
    description:
      "Show the status of all knowledge-work pack capabilities and adapters",
    handler: async () => {
      const status = await runCheckSetup(
        router.packs,
        router.engine,
        adapters,
        config.disabledAdapters ?? []
      );
      return { text: formatCheckSetup(status) };
    },
  });
}
