import type { CapabilityAdapter, AdapterReadiness, AdapterResult } from "./types.js";
import type { CapabilityId, PackId } from "../capabilities/types.js";

interface ComposioMapping {
  toolkit: string;
  action: string;
}

export interface ComposioClient {
  checkConnection(toolkit: string): Promise<boolean>;
  executeAction(action: string, args: Record<string, unknown>): Promise<{ data: unknown }>;
  searchActions(query: string): Promise<Array<{ name: string; description: string }>>;
}

const CAPABILITY_MAP: Record<string, ComposioMapping> = {
  "calendar.read_events": { toolkit: "googlesuper", action: "GOOGLESUPER_LIST_EVENTS" },
  "calendar.prepare_meeting_context": { toolkit: "googlesuper", action: "GOOGLESUPER_GET_EVENT" },
  "crm.lookup_account": { toolkit: "hubspot", action: "HUBSPOT_SEARCH_CONTACTS" },
  "crm.create_note": { toolkit: "hubspot", action: "HUBSPOT_CREATE_NOTE" },
  "mail.send_followup": { toolkit: "googlesuper", action: "GOOGLESUPER_SEND_EMAIL" },
  "mail.read_inbox": { toolkit: "googlesuper", action: "GOOGLESUPER_LIST_EMAILS" },
  "docs.create_brief": { toolkit: "googlesuper", action: "GOOGLESUPER_CREATE_DOC" },
  "chat.search_messages": { toolkit: "slack", action: "SLACK_SEARCH_MESSAGES" },
  "chat.send_message": { toolkit: "slack", action: "SLACK_SEND_MESSAGE" },
  "ats.search_candidates": { toolkit: "greenhouse", action: "GREENHOUSE_SEARCH_CANDIDATES" },
  "ats.get_candidate": { toolkit: "greenhouse", action: "GREENHOUSE_GET_CANDIDATE" },
  "ats.update_candidate_stage": { toolkit: "greenhouse", action: "GREENHOUSE_UPDATE_STAGE" },
  "hris.get_employee": { toolkit: "bamboohr", action: "BAMBOOHR_GET_EMPLOYEE" },
  "hris.list_employees": { toolkit: "bamboohr", action: "BAMBOOHR_LIST_EMPLOYEES" },
  "project.list_tasks": { toolkit: "linear", action: "LINEAR_LIST_ISSUES" },
  "project.create_task": { toolkit: "linear", action: "LINEAR_CREATE_ISSUE" },
  "compensation.get_benchmarks": { toolkit: "pave", action: "PAVE_GET_BENCHMARKS" },
};

const TOOLKIT_TO_APP: Record<string, string> = {
  googlesuper: "Google Workspace",
  hubspot: "HubSpot",
  salesforce: "Salesforce",
  slack: "Slack",
  greenhouse: "Greenhouse",
  bamboohr: "BambooHR",
  linear: "Linear",
  pave: "Pave",
};

export class ComposioAdapter implements CapabilityAdapter {
  readonly id = "composio";
  private client: ComposioClient | null;

  constructor(client?: ComposioClient) {
    this.client = client ?? null;
  }

  setClient(client: ComposioClient): void {
    this.client = client;
  }

  async providesCapabilities(): Promise<CapabilityId[]> {
    return Object.keys(CAPABILITY_MAP);
  }

  async checkReadiness(input: {
    packId: PackId;
    capabilityId: CapabilityId;
  }): Promise<AdapterReadiness> {
    const mapping = CAPABILITY_MAP[input.capabilityId];
    if (!mapping) {
      return { ready: false, setupAction: "none" };
    }

    if (!this.client) {
      return {
        ready: false,
        missingConnections: [mapping.toolkit],
        suggestedApps: [TOOLKIT_TO_APP[mapping.toolkit] ?? mapping.toolkit],
        setupAction: "connect",
      };
    }

    try {
      const connected = await this.client.checkConnection(mapping.toolkit);
      if (!connected) {
        return {
          ready: false,
          missingConnections: [mapping.toolkit],
          suggestedApps: [TOOLKIT_TO_APP[mapping.toolkit] ?? mapping.toolkit],
          setupAction: "connect",
        };
      }
      return { ready: true, setupAction: "none" };
    } catch {
      return {
        ready: false,
        missingConnections: [mapping.toolkit],
        suggestedApps: [TOOLKIT_TO_APP[mapping.toolkit] ?? mapping.toolkit],
        setupAction: "connect",
      };
    }
  }

  async execute(input: {
    packId: PackId;
    capabilityId: CapabilityId;
    args: Record<string, unknown>;
  }): Promise<AdapterResult> {
    const mapping = CAPABILITY_MAP[input.capabilityId];
    if (!mapping) {
      return { status: "error", notes: [`No Composio mapping for ${input.capabilityId}`] };
    }

    if (!this.client) {
      return { status: "needs_setup", notes: ["Composio client not available"] };
    }

    try {
      const result = await this.client.executeAction(mapping.action, input.args);
      return { status: "ok", data: result.data };
    } catch (err) {
      return {
        status: "error",
        notes: [`Composio execution failed: ${err instanceof Error ? err.message : String(err)}`],
      };
    }
  }
}
