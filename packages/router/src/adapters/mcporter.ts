import type { CapabilityAdapter, AdapterReadiness, AdapterResult } from "./types.js";
import type { CapabilityId, PackId } from "../capabilities/types.js";

export interface McporterClient {
  isServerAvailable(server: string): Promise<boolean>;
  callTool(server: string, tool: string, args: Record<string, unknown>): Promise<unknown>;
}

interface McpMapping {
  server: string;
  tool: string;
}

const CAPABILITY_TO_MCP: Record<string, McpMapping> = {
  "seo.audit_page": { server: "ahrefs", tool: "site_audit" },
  "seo.keyword_research": { server: "ahrefs", tool: "keyword_research" },
  "analytics.get_metrics": { server: "google-analytics", tool: "get_report" },
  "enrichment.lookup_company": { server: "clearbit", tool: "company_lookup" },
  "enrichment.lookup_person": { server: "clearbit", tool: "person_lookup" },
};

export class McporterAdapter implements CapabilityAdapter {
  readonly id = "mcporter";
  private client: McporterClient | null;
  private allowedServers: Set<string>;

  constructor(client?: McporterClient, allowedServers?: string[]) {
    this.client = client ?? null;
    this.allowedServers = new Set(allowedServers ?? Object.values(CAPABILITY_TO_MCP).map((m) => m.server));
  }

  setClient(client: McporterClient): void {
    this.client = client;
  }

  setAllowedServers(servers: string[]): void {
    this.allowedServers = new Set(servers);
  }

  async providesCapabilities(): Promise<CapabilityId[]> {
    return Object.keys(CAPABILITY_TO_MCP);
  }

  async checkReadiness(input: {
    packId: PackId;
    capabilityId: CapabilityId;
  }): Promise<AdapterReadiness> {
    const mapping = CAPABILITY_TO_MCP[input.capabilityId];
    if (!mapping) {
      return { ready: false, setupAction: "none" };
    }

    if (!this.allowedServers.has(mapping.server)) {
      return { ready: false, setupAction: "configure" };
    }

    if (!this.client) {
      return {
        ready: false,
        missingConnections: [mapping.server],
        setupAction: "configure",
      };
    }

    try {
      const available = await this.client.isServerAvailable(mapping.server);
      return {
        ready: available,
        missingConnections: available ? [] : [mapping.server],
        setupAction: available ? "none" : "configure",
      };
    } catch {
      return { ready: false, missingConnections: [mapping.server], setupAction: "configure" };
    }
  }

  async execute(input: {
    packId: PackId;
    capabilityId: CapabilityId;
    args: Record<string, unknown>;
  }): Promise<AdapterResult> {
    const mapping = CAPABILITY_TO_MCP[input.capabilityId];
    if (!mapping || !this.client) {
      return { status: "error", notes: [`No MCPorter mapping for ${input.capabilityId}`] };
    }

    try {
      const result = await this.client.callTool(mapping.server, mapping.tool, input.args);
      return { status: "ok", data: result };
    } catch (err) {
      return {
        status: "error",
        notes: [`MCPorter call failed: ${err instanceof Error ? err.message : String(err)}`],
      };
    }
  }
}
