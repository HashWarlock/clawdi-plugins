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

interface OpenClawPluginApi {
  registerTool(tool: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    handler: (args: any) => Promise<unknown>;
  }): void;
  registerCommand(command: {
    name: string;
    description: string;
    handler: (ctx: any) => Promise<unknown>;
  }): void;
  on(event: string, handler: (...args: any[]) => Promise<void>): void;
  getEnabledPlugins(): Array<{
    id: string;
    installPath: string;
  }>;
  getConfig(): Record<string, unknown>;
  runtime: {
    callMcpTool(
      server: string,
      tool: string,
      args: Record<string, unknown>
    ): Promise<unknown>;
    listBuiltinTools(): string[];
    callBuiltinTool(
      name: string,
      args: Record<string, unknown>
    ): Promise<unknown>;
    listLobsterWorkflows(): Promise<string[]>;
    runLobsterWorkflow(
      id: string,
      args: Record<string, unknown>
    ): Promise<unknown>;
    listMcpServers(): Promise<
      Array<{
        name: string;
        tools: Array<{ name: string; description?: string }>;
      }>
    >;
  };
}

export function register(api: OpenClawPluginApi) {
  const config = api.getConfig() as any;

  // Create adapters with runtime callbacks
  const composio = new ComposioAdapter((server, tool, args) =>
    api.runtime.callMcpTool(server, tool, args)
  );
  const openclawTool = new OpenClawToolAdapter(
    () => api.runtime.listBuiltinTools(),
    (name, args) => api.runtime.callBuiltinTool(name, args)
  );
  const lobster = new LobsterAdapter(
    () => api.runtime.listLobsterWorkflows(),
    (id, args) => api.runtime.runLobsterWorkflow(id, args)
  );
  const cli = new CliAdapter(config.cliMappings ?? {});
  const mcporter = new McporterAdapter(
    () => api.runtime.listMcpServers(),
    (server, tool, args) =>
      api.runtime.callMcpTool(server, tool, args)
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
    const allPlugins = api.getEnabledPlugins();
    const packs = allPlugins.filter((p) =>
      p.id.startsWith("@clawdi-ai/pack-")
    );
    for (const pack of packs) {
      try {
        const manifest = await Router.loadPackManifest(
          pack.installPath
        );
        router.registerPack(manifest);
      } catch (err) {
        console.error(
          `[knowledge-work-router] Failed to load pack from ${pack.installPath}:`,
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
    }) => {
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
              `Ready: ${pr.ready.map((r) => `${r.capabilityId} -> ${r.displayName}`).join(", ")}`
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
      return { systemPrompt: lines.join("\n") };
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
      return { systemPrompt: formatCheckSetup(status) };
    },
  });
}
