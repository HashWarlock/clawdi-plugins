import type {
  CapabilityAdapter,
  ProbeResult,
  AdapterResult,
} from "./types.js";

export interface McpServer {
  name: string;
  tools: Array<{ name: string; description?: string }>;
}

export class McporterAdapter implements CapabilityAdapter {
  readonly id = "mcporter";

  constructor(
    private listServers: () => Promise<McpServer[]>,
    private callTool: (
      server: string,
      tool: string,
      args: Record<string, unknown>
    ) => Promise<unknown>
  ) {}

  async probe(
    _capabilityId: string,
    intent: string
  ): Promise<ProbeResult | null> {
    try {
      const servers = await this.listServers();
      const keywords = intent.toLowerCase().split(" ");

      for (const server of servers) {
        for (const tool of server.tools) {
          const nameHaystack = tool.name.replace(/_/g, " ").toLowerCase();
          const descHaystack = (tool.description ?? "").toLowerCase();
          const matchesName = keywords.some((kw) => nameHaystack.includes(kw));
          const matchesDesc = keywords.some((kw) => descHaystack.includes(kw));
          if (matchesName && (matchesDesc || !tool.description)) {
            return {
              adapterId: this.id,
              providerDetails: {
                server: server.name,
                tool: tool.name,
              },
              connectionReady: true,
              displayName: `${tool.name} (${server.name})`,
            };
          }
        }
      }
      return null;
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
    const { server, tool } = providerDetails as {
      server: string;
      tool: string;
    };
    try {
      const data = await this.callTool(server, tool, args);
      return { status: "ok", data };
    } catch (err) {
      return {
        status: "error",
        notes: [
          `MCPorter execution failed: ${err instanceof Error ? err.message : String(err)}`,
        ],
      };
    }
  }
}
