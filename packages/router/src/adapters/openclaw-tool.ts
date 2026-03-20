import type { CapabilityAdapter, AdapterReadiness, AdapterResult } from "./types.js";
import type { CapabilityId, PackId } from "../capabilities/types.js";

export interface OpenClawToolApi {
  isToolAvailable(toolName: string): Promise<boolean>;
  invokeTool(toolName: string, args: Record<string, unknown>): Promise<unknown>;
}

const CAPABILITY_TO_TOOL: Record<string, string> = {
  "research.collect_sources": "web_search",
  "research.web_search": "web_search",
  "docs.read_file": "read_file",
  "docs.write_file": "write_file",
  "docs.search_files": "glob",
};

export class OpenClawToolAdapter implements CapabilityAdapter {
  readonly id = "openclaw_tool";
  private api: OpenClawToolApi | null;

  constructor(api?: OpenClawToolApi) {
    this.api = api ?? null;
  }

  setApi(api: OpenClawToolApi): void {
    this.api = api;
  }

  async providesCapabilities(): Promise<CapabilityId[]> {
    return Object.keys(CAPABILITY_TO_TOOL);
  }

  async checkReadiness(input: {
    packId: PackId;
    capabilityId: CapabilityId;
  }): Promise<AdapterReadiness> {
    const toolName = CAPABILITY_TO_TOOL[input.capabilityId];
    if (!toolName) {
      return { ready: false, setupAction: "none" };
    }

    if (!this.api) {
      return { ready: false, setupAction: "configure" };
    }

    try {
      const available = await this.api.isToolAvailable(toolName);
      return { ready: available, setupAction: available ? "none" : "configure" };
    } catch {
      return { ready: false, setupAction: "configure" };
    }
  }

  async execute(input: {
    packId: PackId;
    capabilityId: CapabilityId;
    args: Record<string, unknown>;
  }): Promise<AdapterResult> {
    const toolName = CAPABILITY_TO_TOOL[input.capabilityId];
    if (!toolName || !this.api) {
      return { status: "error", notes: [`No native tool for ${input.capabilityId}`] };
    }

    try {
      const result = await this.api.invokeTool(toolName, input.args);
      return { status: "ok", data: result };
    } catch (err) {
      return {
        status: "error",
        notes: [`Tool execution failed: ${err instanceof Error ? err.message : String(err)}`],
      };
    }
  }
}
