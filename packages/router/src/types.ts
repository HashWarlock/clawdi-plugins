// types.ts — the complete type surface for router v2

export type CapabilityId = string;
export type PackId = string;
export type ProviderId = string;
export type SideEffect = "read" | "write" | "destructive";
export type SideEffectPolicy = "always_confirm" | "confirm_destructive" | "never_confirm";

// --- Pack contract (capabilities.yaml) ---

export interface PackCapability {
  id: CapabilityId;
  required: boolean;
  sideEffect: SideEffect;
}

export interface PackContract {
  packId: PackId;
  version: string;
  capabilities: PackCapability[];
  preferredProviders?: Record<string, string[]>;
}

// --- Provider registry ---

export type ProviderTarget =
  | { kind: "builtin_tool"; name: string }
  | { kind: "mcp_tool"; server: string; tool: string }
  | { kind: "composio"; action: string; toolkit: string }
  | { kind: "cli"; command: string }
  | { kind: "lobster"; workflowId: string }
  | { kind: "skill"; skillName: string };

export interface ProviderEntry {
  providerId: ProviderId;
  capabilityId: CapabilityId;
  target: ProviderTarget;
  ready: boolean;
  setupHint?: string;
  setupUrl?: string;
  source: "builtin" | "composio" | "mcp" | "cli" | "lobster" | "skill";
}

// --- Resolution results ---

export type ResolutionResult =
  | { status: "executed"; provider: ProviderId; data: unknown }
  | { status: "skill_context"; provider: ProviderId; skillName: string }
  | { status: "needs_setup"; provider: ProviderId; setupHint?: string; setupUrl?: string }
  | { status: "blocked"; message: string; confirmationToken: string }
  | { status: "unavailable" };

// --- Side-effect confirmation ---

export interface PendingConfirmation {
  capabilityId: CapabilityId;
  packId: PackId;
  args: Record<string, unknown>;
  provider: ProviderId;
  target: ProviderTarget;
  expiresAt: number;
}

// --- Runtime callbacks (injected from OpenClaw plugin API) ---

export interface RuntimeCallbacks {
  callBuiltinTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  callMcpTool: (server: string, tool: string, args: Record<string, unknown>) => Promise<unknown>;
  listBuiltinTools: () => string[];
  listMcpServers: () => Promise<Array<{ name: string; tools: Array<{ name: string; description?: string }> }>>;
  listLobsterWorkflows: () => Promise<string[]>;
  runLobsterWorkflow: (id: string, args: Record<string, unknown>) => Promise<unknown>;
}

// --- Pack manifest (onboarding-only, not used by router for resolution) ---

export interface PackManifest {
  packId: PackId;
  displayName: string;
  onboarding: { welcomeMessage: string; suggestedFirstTask: string };
}
