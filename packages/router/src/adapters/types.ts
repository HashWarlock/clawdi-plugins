import type { CapabilityId, PackId } from "../capabilities/types.js";

export interface AdapterReadiness {
  ready: boolean;
  missingBins?: string[];
  missingEnv?: string[];
  missingConnections?: string[];
  suggestedApps?: string[];
  setupAction?: "connect" | "install" | "configure" | "none";
}

export interface AdapterResult {
  status: "ok" | "needs_setup" | "blocked" | "error";
  data?: unknown;
  artifacts?: Array<{
    kind: "file" | "link" | "text" | "structured";
    name?: string;
    mimeType?: string;
    value?: unknown;
  }>;
  notes?: string[];
}

export interface CapabilityAdapter {
  id: string;
  providesCapabilities(): Promise<CapabilityId[]>;
  checkReadiness(input: {
    packId: PackId;
    capabilityId: CapabilityId;
  }): Promise<AdapterReadiness>;
  execute(input: {
    packId: PackId;
    capabilityId: CapabilityId;
    args: Record<string, unknown>;
  }): Promise<AdapterResult>;
}
