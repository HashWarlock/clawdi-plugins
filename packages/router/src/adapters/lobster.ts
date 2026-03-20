import type { CapabilityAdapter, AdapterReadiness, AdapterResult } from "./types.js";
import type { CapabilityId, PackId } from "../capabilities/types.js";

export interface LobsterClient {
  workflowExists(workflowId: string): Promise<boolean>;
  startWorkflow(workflowId: string, args: Record<string, unknown>): Promise<{ result: unknown }>;
}

const CAPABILITY_TO_WORKFLOW: Record<string, string> = {
  "crm.create_note_workflow": "crm-note-with-approval",
  "crm.update_deal_workflow": "crm-deal-update",
  "mail.send_sequence": "email-sequence-workflow",
  "docs.create_brief_workflow": "brief-from-research",
  "recruiting.offer_workflow": "offer-approval-chain",
};

export class LobsterAdapter implements CapabilityAdapter {
  readonly id = "lobster";
  private client: LobsterClient | null;

  constructor(client?: LobsterClient) {
    this.client = client ?? null;
  }

  setClient(client: LobsterClient): void {
    this.client = client;
  }

  async providesCapabilities(): Promise<CapabilityId[]> {
    return Object.keys(CAPABILITY_TO_WORKFLOW);
  }

  async checkReadiness(input: {
    packId: PackId;
    capabilityId: CapabilityId;
  }): Promise<AdapterReadiness> {
    const workflowId = CAPABILITY_TO_WORKFLOW[input.capabilityId];
    if (!workflowId || !this.client) {
      return { ready: false, setupAction: "configure" };
    }

    try {
      const exists = await this.client.workflowExists(workflowId);
      return { ready: exists, setupAction: exists ? "none" : "configure" };
    } catch {
      return { ready: false, setupAction: "configure" };
    }
  }

  async execute(input: {
    packId: PackId;
    capabilityId: CapabilityId;
    args: Record<string, unknown>;
  }): Promise<AdapterResult> {
    const workflowId = CAPABILITY_TO_WORKFLOW[input.capabilityId];
    if (!workflowId || !this.client) {
      return { status: "error", notes: [`No Lobster workflow for ${input.capabilityId}`] };
    }

    try {
      const run = await this.client.startWorkflow(workflowId, input.args);
      return { status: "ok", data: run.result };
    } catch (err) {
      return {
        status: "error",
        notes: [`Lobster workflow failed: ${err instanceof Error ? err.message : String(err)}`],
      };
    }
  }
}
