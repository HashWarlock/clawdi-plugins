export type CapabilityId = string;
export type PackId = string;
export type AdapterId = string;

export interface PackManifest {
  packId: PackId;
  displayName: string;
  capabilities: {
    required: CapabilityId[];
    optional: CapabilityId[];
  };
  preferredApps: Record<string, string[]>;
  fallbackOverrides?: Record<string, { adapters: AdapterId[] }>;
  preferences?: Record<string, PackPreference>;
  sideEffects?: CapabilityId[];
  onboarding: {
    welcomeMessage: string;
    suggestedFirstTask: string;
  };
}

export interface PackPreference {
  type: "enum" | "string" | "boolean";
  values?: string[];
  label: string;
  description: string;
  captureAt: "first_use" | "onboarding";
}

export interface PendingConfirmation {
  capabilityId: CapabilityId;
  packId: PackId;
  args: Record<string, unknown>;
  adapterId: AdapterId;
  expiresAt: number;
}
