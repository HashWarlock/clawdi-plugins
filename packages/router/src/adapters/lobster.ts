import type {
  CapabilityAdapter,
  ProbeResult,
  ProbeHints,
  AdapterResult,
} from "./types.js";

export class LobsterAdapter implements CapabilityAdapter {
  readonly id = "lobster";

  constructor(
    private listWorkflows: () => Promise<string[]>,
    private runWorkflow: (
      id: string,
      args: Record<string, unknown>
    ) => Promise<unknown>
  ) {}

  async probe(
    capabilityId: string,
    _intent: string,
    hints?: ProbeHints
  ): Promise<ProbeResult | null> {
    const isWorkflow = capabilityId.endsWith("_workflow");
    if (!isWorkflow && !hints?.pinned) return null;

    const dotIndex = capabilityId.indexOf(".");
    const suffix =
      dotIndex === -1
        ? capabilityId
        : capabilityId.slice(dotIndex + 1);
    const searchTerm = isWorkflow
      ? suffix.replace(/_workflow$/, "").replace(/_/g, "-")
      : suffix.replace(/_/g, "-");

    const workflows = await this.listWorkflows();
    const match = workflows.find((w) => w.includes(searchTerm));
    if (!match) return null;

    return {
      adapterId: this.id,
      providerDetails: { workflowId: match },
      connectionReady: true,
      displayName: match,
    };
  }

  async execute(
    _capabilityId: string,
    providerDetails: unknown,
    args: Record<string, unknown>,
    _packId: string
  ): Promise<AdapterResult> {
    const { workflowId } = providerDetails as {
      workflowId: string;
    };
    try {
      const data = await this.runWorkflow(workflowId, args);
      return { status: "ok", data };
    } catch (err) {
      return {
        status: "error",
        notes: [
          `Lobster workflow failed: ${err instanceof Error ? err.message : String(err)}`,
        ],
      };
    }
  }
}
