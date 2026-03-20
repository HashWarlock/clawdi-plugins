import { Router } from "./router.js";
import { runConnectApps } from "./onboarding/connect-apps.js";
import { runCheckSetup, formatCheckSetup } from "./onboarding/check-setup.js";
import { lookupBroadestApp } from "./onboarding/app-grouping.js";

// Types for OpenClaw Plugin SDK — in production these come from openclaw/plugin-sdk/core
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
  getEnabledPlugins(): Array<{ id: string; installPath: string }>;
  getConfig(): Record<string, unknown>;
}

export function register(api: OpenClawPluginApi) {
  const config = api.getConfig() as any;
  const router = new Router({
    adapterOrder: config.adapterOrder,
    disabledAdapters: config.disabledAdapters,
    capabilityPins: config.capabilityPins,
    sideEffectPolicy: config.sideEffectPolicy,
    executionTimeoutMs: config.executionTimeoutMs,
    composio: config.composio,
    mcporter: config.mcporter,
    cli: config.cli,
  });

  // Discover packs at startup
  api.on("gateway_start", async () => {
    const allPlugins = api.getEnabledPlugins();
    const packs = allPlugins.filter((p) => p.id.startsWith("@clawdi-ai/pack-"));

    for (const pack of packs) {
      try {
        const manifest = await Router.loadPackManifest(pack.installPath);
        router.registerPack(manifest);
      } catch (err) {
        console.error(`[knowledge-work-router] Failed to load pack manifest from ${pack.installPath}:`, err);
      }
    }

    console.log(`[knowledge-work-router] Discovered ${router.packs.length} pack(s)`);
  });

  // Register capability_execute tool
  api.registerTool({
    name: "capability_execute",
    description: "Execute a capability through the knowledge-work router. Pack skills use this to invoke capabilities like calendar.read_events, crm.lookup_account, etc. The router resolves the best available adapter automatically.",
    parameters: {
      type: "object",
      properties: {
        capabilityId: {
          type: "string",
          description: "The capability to execute, e.g. 'calendar.read_events', 'crm.lookup_account'",
        },
        packId: {
          type: "string",
          description: "The pack requesting the capability, e.g. 'sales', 'recruiting'",
        },
        args: {
          type: "object",
          description: "Arguments for the capability",
        },
        confirmationToken: {
          type: "string",
          description: "Token from a prior blocked result, provided after user approval",
        },
      },
      required: ["capabilityId", "packId"],
    },
    handler: async ({ capabilityId, packId, args, confirmationToken }) => {
      // If a confirmation token is provided, execute the confirmed operation
      if (confirmationToken) {
        return router.executeConfirmed(confirmationToken);
      }

      // Normal resolve: finds adapter, checks side-effects, executes
      const result = await router.resolve(capabilityId, packId, args ?? {});

      // Augment needs_setup results with onboarding guidance
      if (result.status === "needs_setup") {
        const suggestedApp = lookupBroadestApp(capabilityId);
        return {
          ...result,
          data: {
            ...(result.data as any),
            message: `${capabilityId} is not ready. Run /connect_apps to set up.`,
            suggestedApp,
          },
        };
      }

      // blocked results already contain confirmationToken and message from the router
      return result;
    },
  });

  // Register /connect_apps command
  api.registerCommand({
    name: "connect_apps",
    description: "Set up connections for your installed knowledge-work packs",
    handler: async () => {
      const report = await runConnectApps({
        packs: router.packs,
        adapters: router.adapters,
        adapterOrder: config.adapterOrder ?? ["composio", "openclaw_tool", "lobster", "cli", "mcporter"],
        disabledAdapters: config.disabledAdapters ?? [],
      });

      // Build a response the LLM can present naturally
      const lines: string[] = [];
      for (const pr of report.packReports) {
        lines.push(`\n**${pr.displayName}**`);
        if (pr.allRequiredReady) {
          lines.push("All required capabilities are ready.");
        } else {
          lines.push(`Ready: ${pr.readyCapabilities.join(", ") || "none"}`);
          lines.push(`Needs setup: ${pr.unreadyRequired.join(", ")}`);
          if (pr.suggestions.length > 0) {
            for (const s of pr.suggestions) {
              lines.push(`Suggestion: Connect **${s.appName}** to enable ${s.coversCapabilities.join(", ")}`);
            }
          }
        }
        if (pr.unreadyOptional.length > 0) {
          lines.push(`Optional (not connected): ${pr.unreadyOptional.join(", ")}`);
        }
      }

      return { systemPrompt: lines.join("\n") };
    },
  });

  // Register /check_setup command
  api.registerCommand({
    name: "check_setup",
    description: "Show the status of all knowledge-work pack capabilities and adapters",
    handler: async () => {
      const status = await runCheckSetup(
        router.packs,
        router.adapters,
        config.disabledAdapters ?? []
      );
      return { systemPrompt: formatCheckSetup(status) };
    },
  });
}
