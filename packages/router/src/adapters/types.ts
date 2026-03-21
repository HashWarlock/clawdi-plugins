import type { CapabilityId } from "../capabilities/types.js";

export interface ProbeHints {
  preferredApps?: string[];
  domain?: string;
  pinned?: boolean;
}

export interface ProbeResult {
  adapterId: string;
  providerDetails: unknown;
  connectionReady: boolean;
  displayName: string;
  setupHint?: string;
  setupUrl?: string;
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
  probe(
    capabilityId: CapabilityId,
    intent: string,
    hints?: ProbeHints
  ): Promise<ProbeResult | null>;
  execute(
    capabilityId: CapabilityId,
    providerDetails: unknown,
    args: Record<string, unknown>,
    packId: string
  ): Promise<AdapterResult>;
}
