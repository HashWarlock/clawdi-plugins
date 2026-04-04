import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import { loadContract } from "./contract.js";
import { createRegistry, populate } from "./registry.js";
import { runAllScanners } from "./scanners.js";
import { resolve } from "./resolve.js";
import { buildCheckSetup, formatCheckSetup, formatConnectApps } from "./check-setup.js";
import type {
  PackContract,
  PackManifest,
  RuntimeCallbacks,
  SideEffectPolicy,
} from "./types.js";
import type { Registry } from "./registry.js";

// Use permissive type — the plugin API shape varies across OpenClaw versions
type PluginApi = any;

const DEFAULT_CONFIG = {
  sideEffectPolicy: "confirm_destructive" as SideEffectPolicy,
  cliMappings: {} as Record<string, string>,
};

function resolveConfig(api: PluginApi) {
  return {
    ...DEFAULT_CONFIG,
    ...((api?.getConfig?.() as Record<string, unknown>) ?? {}),
  } as typeof DEFAULT_CONFIG;
}

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

  const root = "/data/openclaw/extensions";
  if (!existsSync(root)) return [];

  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("pack-"))
    .map((d) => join(root, d.name));
}

function buildCallbacks(api: PluginApi): RuntimeCallbacks {
  return {
    callBuiltinTool: (name, args) =>
      api?.runtime?.callBuiltinTool?.(name, args) ?? Promise.resolve(null),
    callMcpTool: (server, tool, args) =>
      api?.runtime?.callMcpTool?.(server, tool, args) ?? Promise.resolve(null),
    listBuiltinTools: () => api?.runtime?.listBuiltinTools?.() ?? [],
    listMcpServers: () =>
      api?.runtime?.listMcpServers?.() ?? Promise.resolve([]),
    listLobsterWorkflows: () =>
      api?.runtime?.listLobsterWorkflows?.() ?? Promise.resolve([]),
    runLobsterWorkflow: (id, args) =>
      api?.runtime?.runLobsterWorkflow?.(id, args) ?? Promise.resolve(null),
  };
}

async function loadManifest(installPath: string): Promise<PackManifest> {
  const raw = await readFile(join(installPath, "pack-manifest.yaml"), "utf-8");
  return parseYaml(raw) as PackManifest;
}

export function register(api: PluginApi) {
  const config = resolveConfig(api);
  const callbacks = buildCallbacks(api);

  const registry: Registry = createRegistry();
  const contracts = new Map<string, PackContract>();
  const manifests = new Map<string, PackManifest>();

  // Discover packs and populate registry at startup
  api.on("gateway_start", async () => {
    const packPaths = discoverPackInstallPaths(api);

    for (const installPath of packPaths) {
      try {
        const contract = await loadContract(installPath);
        const manifest = await loadManifest(installPath);
        contracts.set(contract.packId, contract);
        manifests.set(contract.packId, manifest);

        // Collect skill directories for this pack
        const skillDir = join(installPath, "skills");
        const skillDirs = existsSync(skillDir) ? [skillDir] : [];

        // Run all scanners for this pack's capabilities
        const entries = await runAllScanners(
          contract.capabilities,
          callbacks,
          config.cliMappings ?? {},
          skillDirs,
          contract.preferredProviders
        );
        populate(registry, entries);
      } catch (err) {
        console.error(`[knowledge-work-router] Failed to load pack from ${installPath}:`, err);
      }
    }

    console.log(`[knowledge-work-router] Discovered ${contracts.size} pack(s)`);
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
    handler: async ({ capabilityId, packId, args, confirmationToken }: any) => {
      return resolve(
        packId,
        capabilityId,
        args ?? {},
        registry,
        contracts,
        callbacks,
        config.sideEffectPolicy,
        confirmationToken
      );
    },
  });

  // Register /connect_apps command
  api.registerCommand({
    name: "connect_apps",
    description: "Set up connections for your installed knowledge-work packs",
    handler: async () => {
      const status = buildCheckSetup(contracts, manifests, registry);
      return { text: formatConnectApps(status) };
    },
  });

  // Register /check_setup command
  api.registerCommand({
    name: "check_setup",
    description: "Show the status of all knowledge-work pack capabilities",
    handler: async () => {
      const status = buildCheckSetup(contracts, manifests, registry);
      return { text: formatCheckSetup(status) };
    },
  });
}
