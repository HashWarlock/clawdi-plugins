import type {
  CapabilityAdapter,
  ProbeResult,
  AdapterResult,
} from "./types.js";

export class OpenClawToolAdapter implements CapabilityAdapter {
  readonly id = "openclaw_tool";

  constructor(
    private listTools: () => string[],
    private callTool: (
      name: string,
      args: Record<string, unknown>
    ) => Promise<unknown>
  ) {}

  async probe(capabilityId: string): Promise<ProbeResult | null> {
    const dotIndex = capabilityId.indexOf(".");
    const toolName =
      dotIndex === -1
        ? capabilityId
        : capabilityId.slice(dotIndex + 1);
    const tools = this.listTools();
    if (!tools.includes(toolName)) return null;

    return {
      adapterId: this.id,
      providerDetails: { toolName },
      connectionReady: true,
      displayName: toolName,
    };
  }

  async execute(
    _capabilityId: string,
    providerDetails: unknown,
    args: Record<string, unknown>,
    _packId: string
  ): Promise<AdapterResult> {
    const { toolName } = providerDetails as { toolName: string };
    try {
      const data = await this.callTool(toolName, args);
      return { status: "ok", data };
    } catch (err) {
      return {
        status: "error",
        notes: [
          `OpenClaw tool failed: ${err instanceof Error ? err.message : String(err)}`,
        ],
      };
    }
  }
}
