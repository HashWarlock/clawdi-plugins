import type {
  CapabilityAdapter,
  ProbeResult,
  ProbeHints,
  AdapterResult,
} from "./types.js";

export type McpCallFn = (
  server: string,
  tool: string,
  args: Record<string, unknown>
) => Promise<unknown>;

function toolkitDisplayName(toolkit: string): string {
  const overrides: Record<string, string> = {
    googlesuper: "Google Workspace",
    hubspot: "HubSpot",
    bamboohr: "BambooHR",
  };
  return (
    overrides[toolkit] ??
    toolkit.charAt(0).toUpperCase() + toolkit.slice(1)
  );
}

export class ComposioAdapter implements CapabilityAdapter {
  readonly id = "composio";

  constructor(private callMcp: McpCallFn) {}

  async probe(
    _capabilityId: string,
    intent: string,
    hints?: ProbeHints
  ): Promise<ProbeResult | null> {
    try {
      const res = (await this.callMcp(
        "clawdi-mcp",
        "COMPOSIO_SEARCH_TOOLS",
        { queries: [{ use_case: intent }] }
      )) as any;

      const slugs: string[] = res?.primary_tool_slugs ?? [];
      if (!slugs.length) return null;

      // Check preferred apps from hints
      if (hints?.preferredApps?.length) {
        const preferred = slugs.find((s) =>
          hints.preferredApps!.some((app) =>
            s.toLowerCase().startsWith(app.toLowerCase())
          )
        );
        if (preferred) {
          const tk = preferred.split("_")[0].toLowerCase();
          const statuses: Record<string, string> =
            res?.toolkit_connection_statuses ?? {};
          return {
            adapterId: this.id,
            providerDetails: { toolkit: tk, action: preferred },
            connectionReady: statuses[tk] === "active",
            displayName: toolkitDisplayName(tk),
            setupHint:
              statuses[tk] !== "active"
                ? "Connect via OAuth"
                : undefined,
          };
        }
      }

      const action = slugs[0];
      const toolkit = action.split("_")[0].toLowerCase();
      const statuses: Record<string, string> =
        res?.toolkit_connection_statuses ?? {};
      const connected = statuses[toolkit] === "active";

      let setupUrl: string | undefined;
      if (!connected) {
        try {
          const conn = (await this.callMcp(
            "clawdi-mcp",
            "COMPOSIO_MANAGE_CONNECTIONS",
            { toolkits: [toolkit] }
          )) as any;
          setupUrl = conn?.redirect_url;
        } catch {
          // Best-effort — OAuth URL is optional
        }
      }

      return {
        adapterId: this.id,
        providerDetails: { toolkit, action },
        connectionReady: connected,
        displayName: toolkitDisplayName(toolkit),
        setupHint: connected ? undefined : "Connect via OAuth",
        setupUrl,
      };
    } catch {
      return null;
    }
  }

  async execute(
    _capabilityId: string,
    providerDetails: unknown,
    args: Record<string, unknown>,
    _packId: string
  ): Promise<AdapterResult> {
    const { action } = providerDetails as {
      toolkit: string;
      action: string;
    };
    try {
      const data = await this.callMcp(
        "clawdi-mcp",
        "COMPOSIO_MULTI_EXECUTE_TOOL",
        { tool_slug: action, ...args }
      );
      return { status: "ok", data };
    } catch (err) {
      return {
        status: "error",
        notes: [
          `Composio execution failed: ${err instanceof Error ? err.message : String(err)}`,
        ],
      };
    }
  }
}
