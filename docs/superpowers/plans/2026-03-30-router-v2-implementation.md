# Router v2 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the v1 probe-based adapter router (~1,460 lines, 14 source files) with a v2 registry-based scanner architecture (~600 lines, 7 source files). Side effects come from the pack contract instead of verb parsing. Skills become a provider target kind. Resolution is a map lookup instead of an ordered probe chain.

**Architecture:** Six scanner functions populate a `Map<CapabilityId, ProviderEntry[]>` at enrollment time. One `resolve()` function does a map lookup, sorts by preference, checks side effects from the contract, and dispatches to `executeTarget()` via an exhaustive switch. Each pack ships a `capabilities.yaml` as the single router-facing source of truth.

**Tech Stack:** TypeScript, pnpm workspaces, OpenClaw Plugin SDK, YAML for pack contracts, Vitest for testing.

**Spec:** `docs/superpowers/specs/2026-03-30-router-v2-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `packages/router/src/types.ts` | Create | All v2 type definitions |
| `packages/router/src/contract.ts` | Create | Load + validate capabilities.yaml |
| `packages/router/src/registry.ts` | Create | Map + populate + lookup |
| `packages/router/src/scanners.ts` | Create | 6 scanner functions |
| `packages/router/src/resolve.ts` | Create | resolve + executeTarget + side-effect confirmation |
| `packages/router/src/index.ts` | Rewrite | Plugin registration, gateway_start, tool + commands |
| `packages/router/src/check-setup.ts` | Create | /check_setup and /connect_apps formatting |
| `packages/router/src/__tests__/contract.test.ts` | Create | Contract loading + validation tests |
| `packages/router/src/__tests__/scanners.test.ts` | Create | All 6 scanner function tests |
| `packages/router/src/__tests__/resolve.test.ts` | Create | Resolution + side-effect + integration tests |
| `packages/pack-*/capabilities.yaml` | Create (x10) | Pack contracts generated from pack-manifest.yaml |
| `packages/router/openclaw.plugin.json` | Modify | Remove deprecated config fields |
| `scripts/deploy.sh` | Modify | Add capabilities.yaml copy |
| `packages/router/src/router.ts` | Delete | Replaced by resolve.ts + index.ts |
| `packages/router/src/adapters/*.ts` | Delete (x6) | Replaced by scanners.ts |
| `packages/router/src/capabilities/types.ts` | Delete | Replaced by types.ts |
| `packages/router/src/discovery/*.ts` | Delete (x2) | Replaced by registry.ts + scanners.ts |
| `packages/router/src/policy/side-effects.ts` | Delete | Inlined in resolve.ts |
| `packages/router/src/onboarding/*.ts` | Delete (x2) | Replaced by check-setup.ts |
| `packages/router/src/__tests__/engine.test.ts` | Delete | Replaced by resolve.test.ts |
| `packages/router/src/__tests__/integration.test.ts` | Delete | Replaced by resolve.test.ts |
| `packages/router/src/__tests__/side-effects.test.ts` | Delete | Replaced by resolve.test.ts |
| `packages/router/src/__tests__/adapters.test.ts` | Delete | Replaced by scanners.test.ts |
| `packages/router/src/__tests__/composio.test.ts` | Delete | Replaced by scanners.test.ts |
| `packages/router/src/__tests__/intent.test.ts` | Delete | No replacement needed |
| `packages/router/src/__tests__/openclaw-tool.test.ts` | Delete | Replaced by scanners.test.ts |

---

## Chunk 1: Save Spec + Foundation Types

### Task 1: Save design spec

**Files:**
- Create: `docs/superpowers/specs/2026-03-30-router-v2-design.md`

- [ ] **Step 1: Write the spec file**

Save the user-provided design document (the full "Clawdi Router v2 — Design Proposal" content) to `docs/superpowers/specs/2026-03-30-router-v2-design.md`.

- [ ] **Step 2: Save this implementation plan**

Copy this plan to `docs/superpowers/plans/2026-03-30-router-v2-implementation.md`.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-03-30-router-v2-design.md docs/superpowers/plans/2026-03-30-router-v2-implementation.md
git commit -m "docs: add router v2 design spec and implementation plan"
```

---

### Task 2: Create types.ts

**Files:**
- Create: `packages/router/src/types.ts`

**Context:** This file replaces three v1 type sources: `capabilities/types.ts` (PackManifest, PendingConfirmation), `adapters/types.ts` (CapabilityAdapter, ProbeResult, AdapterResult), and inline types. It defines the entire v2 type surface.

- [ ] **Step 1: Create `packages/router/src/types.ts`**

```typescript
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
```

- [ ] **Step 2: Verify types compile**

Run: `cd /Users/hashwarlock/Projects/Clawdi/clawdi-plugins/packages/router && npx tsc --noEmit src/types.ts`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add packages/router/src/types.ts
git commit -m "feat(router): add v2 type definitions"
```

---

### Task 3: Create contract.ts

**Files:**
- Create: `packages/router/src/contract.ts`

**Context:** Loads and validates `capabilities.yaml` files. Replaces v1's `Router.loadPackManifest()` for router concerns. Uses the `yaml` package already in package.json.

- [ ] **Step 1: Create `packages/router/src/contract.ts`**

```typescript
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { PackContract, PackCapability, SideEffect } from "./types.js";

const VALID_SIDE_EFFECTS = new Set<SideEffect>(["read", "write", "destructive"]);

export async function loadContract(installPath: string): Promise<PackContract> {
  const raw = await readFile(join(installPath, "capabilities.yaml"), "utf-8");
  const parsed = parseYaml(raw) as PackContract;
  const errors = validateContract(parsed);
  if (errors.length) {
    throw new Error(`Invalid capabilities.yaml at ${installPath}:\n  ${errors.join("\n  ")}`);
  }
  return parsed;
}

export function validateContract(contract: PackContract): string[] {
  const errors: string[] = [];

  if (!contract.packId || typeof contract.packId !== "string") {
    errors.push("Missing or invalid packId");
  }
  if (!contract.version) {
    errors.push("Missing version");
  }
  if (!Array.isArray(contract.capabilities) || contract.capabilities.length === 0) {
    errors.push("capabilities must be a non-empty array");
  }

  const seen = new Set<string>();
  for (const cap of contract.capabilities ?? []) {
    if (!cap.id || typeof cap.id !== "string") {
      errors.push("Capability missing id");
      continue;
    }
    if (seen.has(cap.id)) {
      errors.push(`Duplicate capability: ${cap.id}`);
    }
    seen.add(cap.id);
    if (!VALID_SIDE_EFFECTS.has(cap.sideEffect)) {
      errors.push(`${cap.id}: invalid sideEffect "${cap.sideEffect}" (must be read, write, or destructive)`);
    }
    if (typeof cap.required !== "boolean") {
      errors.push(`${cap.id}: required must be a boolean`);
    }
  }

  return errors;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/router/src/contract.ts
git commit -m "feat(router): add contract loader for capabilities.yaml"
```

---

### Task 4: Create registry.ts

**Files:**
- Create: `packages/router/src/registry.ts`

**Context:** Minimal data structure — a `Map<CapabilityId, ProviderEntry[]>` with populate and lookup helpers. Intelligence lives in scanners (what goes in) and resolve (how to pick).

- [ ] **Step 1: Create `packages/router/src/registry.ts`**

```typescript
import type { CapabilityId, ProviderEntry } from "./types.js";

export type Registry = Map<CapabilityId, ProviderEntry[]>;

export function createRegistry(): Registry {
  return new Map();
}

export function populate(registry: Registry, entries: ProviderEntry[]): void {
  for (const entry of entries) {
    const list = registry.get(entry.capabilityId) ?? [];
    list.push(entry);
    registry.set(entry.capabilityId, list);
  }
}

export function lookup(registry: Registry, capabilityId: CapabilityId): ProviderEntry[] {
  return registry.get(capabilityId) ?? [];
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/router/src/registry.ts
git commit -m "feat(router): add provider registry"
```

---

## Chunk 2: Scanners

### Task 5: Create scanners.ts

**Files:**
- Create: `packages/router/src/scanners.ts`

**Context:** Six pure functions, each returning `ProviderEntry[]`. Ports logic from v1's five adapter classes (composio.ts:31-101, openclaw-tool.ts:18-33, lobster.ts:19-46, cli.ts:31-52, mcporter.ts:24-55) plus a new skill scanner. Also ports `extractIntent()` from discovery/intent.ts:6-15 as a private helper for Composio and MCP intent matching.

- [ ] **Step 1: Create `packages/router/src/scanners.ts`**

```typescript
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readdirSync, existsSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import type { PackCapability, ProviderEntry, RuntimeCallbacks } from "./types.js";

const execFileAsync = promisify(execFile);

// --- Private helpers ---

function extractIntent(capabilityId: string): { intent: string; domain: string } {
  const dotIndex = capabilityId.indexOf(".");
  if (dotIndex === -1) return { intent: capabilityId, domain: "" };
  const domain = capabilityId.slice(0, dotIndex);
  const intent = capabilityId.slice(dotIndex + 1).replace(/_/g, " ");
  return { intent, domain };
}

function matchPattern(pattern: string, capabilityId: string): boolean {
  if (pattern === capabilityId) return true;
  if (pattern.endsWith(".*")) return capabilityId.startsWith(pattern.slice(0, -1));
  if (pattern.endsWith("*")) return capabilityId.startsWith(pattern.slice(0, -1));
  return false;
}

function toolkitDisplayName(toolkit: string): string {
  const overrides: Record<string, string> = {
    googlesuper: "Google Workspace",
    hubspot: "HubSpot",
    bamboohr: "BambooHR",
  };
  return overrides[toolkit] ?? toolkit.charAt(0).toUpperCase() + toolkit.slice(1);
}

// --- Scanners ---

export function scanBuiltins(
  capabilities: PackCapability[],
  callbacks: RuntimeCallbacks
): ProviderEntry[] {
  const tools = callbacks.listBuiltinTools();
  const entries: ProviderEntry[] = [];

  for (const cap of capabilities) {
    const dotIndex = cap.id.indexOf(".");
    const toolName = dotIndex === -1 ? cap.id : cap.id.slice(dotIndex + 1);
    if (tools.includes(toolName)) {
      entries.push({
        providerId: `builtin:${toolName}`,
        capabilityId: cap.id,
        target: { kind: "builtin_tool", name: toolName },
        ready: true,
        source: "builtin",
      });
    }
  }

  return entries;
}

export async function scanComposio(
  capabilities: PackCapability[],
  callbacks: RuntimeCallbacks,
  preferredProviders?: Record<string, string[]>
): Promise<ProviderEntry[]> {
  const entries: ProviderEntry[] = [];

  for (const cap of capabilities) {
    try {
      const { intent } = extractIntent(cap.id);
      const res = (await callbacks.callMcpTool("clawdi-mcp", "COMPOSIO_SEARCH_TOOLS", {
        queries: [{ use_case: intent }],
      })) as any;

      const slugs: string[] = res?.primary_tool_slugs ?? [];
      if (!slugs.length) continue;

      // Check preferred providers for this capability
      const preferredApps: string[] = [];
      if (preferredProviders) {
        for (const [pattern, apps] of Object.entries(preferredProviders)) {
          if (matchPattern(pattern, cap.id)) {
            preferredApps.push(...apps);
            break;
          }
        }
      }

      let action: string;
      if (preferredApps.length) {
        const preferred = slugs.find((s) =>
          preferredApps.some((app) => s.toLowerCase().startsWith(app.toLowerCase()))
        );
        action = preferred ?? slugs[0];
      } else {
        action = slugs[0];
      }

      const toolkit = action.split("_")[0].toLowerCase();
      const statuses: Record<string, string> = res?.toolkit_connection_statuses ?? {};
      const connected = statuses[toolkit] === "active";

      let setupUrl: string | undefined;
      if (!connected) {
        try {
          const conn = (await callbacks.callMcpTool("clawdi-mcp", "COMPOSIO_MANAGE_CONNECTIONS", {
            toolkits: [toolkit],
          })) as any;
          setupUrl = conn?.redirect_url;
        } catch {
          // Best-effort
        }
      }

      entries.push({
        providerId: `composio:${toolkit}`,
        capabilityId: cap.id,
        target: { kind: "composio", action, toolkit },
        ready: connected,
        setupHint: connected ? undefined : "Connect via OAuth",
        setupUrl,
        source: "composio",
      });
    } catch {
      // Skip capabilities that fail Composio search
    }
  }

  return entries;
}

export async function scanMcpServers(
  capabilities: PackCapability[],
  callbacks: RuntimeCallbacks
): Promise<ProviderEntry[]> {
  const entries: ProviderEntry[] = [];

  let servers: Array<{ name: string; tools: Array<{ name: string; description?: string }> }>;
  try {
    servers = await callbacks.listMcpServers();
  } catch {
    return entries;
  }

  for (const cap of capabilities) {
    const { intent } = extractIntent(cap.id);
    const keywords = intent.toLowerCase().split(" ");

    for (const server of servers) {
      for (const tool of server.tools) {
        const nameHaystack = tool.name.replace(/_/g, " ").toLowerCase();
        const descHaystack = (tool.description ?? "").toLowerCase();
        const matchesName = keywords.some((kw) => nameHaystack.includes(kw));
        const matchesDesc = keywords.some((kw) => descHaystack.includes(kw));

        if (matchesName && (matchesDesc || !tool.description)) {
          entries.push({
            providerId: `mcp:${server.name}:${tool.name}`,
            capabilityId: cap.id,
            target: { kind: "mcp_tool", server: server.name, tool: tool.name },
            ready: true,
            source: "mcp",
          });
          break; // First match per capability per server
        }
      }
    }
  }

  return entries;
}

export async function scanCliMappings(
  capabilities: PackCapability[],
  cliMappings: Record<string, string>
): Promise<ProviderEntry[]> {
  const entries: ProviderEntry[] = [];

  for (const cap of capabilities) {
    let bin: string | undefined;
    for (const [pattern, binary] of Object.entries(cliMappings)) {
      if (pattern === cap.id || (pattern.endsWith("*") && cap.id.startsWith(pattern.slice(0, -1)))) {
        bin = binary;
        break;
      }
    }
    if (!bin) continue;

    let ready = false;
    try {
      await execFileAsync("which", [bin]);
      ready = true;
    } catch {
      // Binary not found
    }

    entries.push({
      providerId: `cli:${bin}`,
      capabilityId: cap.id,
      target: { kind: "cli", command: bin },
      ready,
      setupHint: ready ? undefined : `Install ${bin}`,
      source: "cli",
    });
  }

  return entries;
}

export async function scanLobster(
  capabilities: PackCapability[],
  callbacks: RuntimeCallbacks
): Promise<ProviderEntry[]> {
  const entries: ProviderEntry[] = [];

  let workflows: string[];
  try {
    workflows = await callbacks.listLobsterWorkflows();
  } catch {
    return entries;
  }

  for (const cap of capabilities) {
    if (!cap.id.endsWith("_workflow")) continue;

    const dotIndex = cap.id.indexOf(".");
    const suffix = dotIndex === -1 ? cap.id : cap.id.slice(dotIndex + 1);
    const searchTerm = suffix.replace(/_workflow$/, "").replace(/_/g, "-");

    const match = workflows.find((w) => w.includes(searchTerm));
    if (!match) continue;

    entries.push({
      providerId: `lobster:${match}`,
      capabilityId: cap.id,
      target: { kind: "lobster", workflowId: match },
      ready: true,
      source: "lobster",
    });
  }

  return entries;
}

export function scanSkills(
  capabilities: PackCapability[],
  skillDirs: string[]
): ProviderEntry[] {
  const entries: ProviderEntry[] = [];

  for (const dir of skillDirs) {
    if (!existsSync(dir)) continue;

    let skillFolders: string[];
    try {
      skillFolders = readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    } catch {
      continue;
    }

    for (const folder of skillFolders) {
      const skillPath = join(dir, folder, "SKILL.md");
      if (!existsSync(skillPath)) continue;

      let content: string;
      try {
        // Synchronous read is acceptable during enrollment
        const { readFileSync } = require("node:fs");
        content = readFileSync(skillPath, "utf-8");
      } catch {
        continue;
      }

      // Extract YAML frontmatter
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!fmMatch) continue;

      let fm: any;
      try {
        fm = parseYaml(fmMatch[1]);
      } catch {
        continue;
      }

      const provides: string[] = fm?.metadata?.router?.provides?.capabilities ?? [];
      if (!provides.length) continue;

      // Check requirements
      const reqBins: string[] = fm?.metadata?.openclaw?.requires?.bins ?? [];
      const reqEnv: string[] = fm?.metadata?.openclaw?.requires?.env ?? [];
      const binsOk = reqBins.every((bin: string) => {
        try {
          require("node:child_process").execFileSync("which", [bin], { stdio: "ignore" });
          return true;
        } catch {
          return false;
        }
      });
      const envOk = reqEnv.every((key: string) => !!process.env[key]);
      const ready = binsOk && envOk;

      const skillName = fm?.name ?? folder;

      for (const provided of provides) {
        if (!capabilities.some((c) => c.id === provided)) continue;
        entries.push({
          providerId: `skill:${skillName}`,
          capabilityId: provided,
          target: { kind: "skill", skillName },
          ready,
          setupHint: ready ? undefined : `Missing requirements for skill ${skillName}`,
          source: "skill",
        });
      }
    }
  }

  return entries;
}

export async function runAllScanners(
  capabilities: PackCapability[],
  callbacks: RuntimeCallbacks,
  cliMappings: Record<string, string>,
  skillDirs: string[],
  preferredProviders?: Record<string, string[]>
): Promise<ProviderEntry[]> {
  const [builtins, composio, mcp, cli, lobster, skills] = await Promise.all([
    Promise.resolve(scanBuiltins(capabilities, callbacks)),
    scanComposio(capabilities, callbacks, preferredProviders),
    scanMcpServers(capabilities, callbacks),
    scanCliMappings(capabilities, cliMappings),
    scanLobster(capabilities, callbacks),
    Promise.resolve(scanSkills(capabilities, skillDirs)),
  ]);

  return [...builtins, ...composio, ...mcp, ...cli, ...lobster, ...skills];
}
```

- [ ] **Step 2: Verify scanners compile**

Run: `cd /Users/hashwarlock/Projects/Clawdi/clawdi-plugins/packages/router && npx tsc --noEmit src/scanners.ts`
Expected: No errors (or only errors from missing sibling files not yet wired).

- [ ] **Step 3: Commit**

```bash
git add packages/router/src/scanners.ts
git commit -m "feat(router): add 6 scanner functions for provider discovery"
```

---

## Chunk 3: Resolution

### Task 6: Create resolve.ts

**Files:**
- Create: `packages/router/src/resolve.ts`

**Context:** Ports logic from `router.ts:56-143` (resolve + executeConfirmed), `policy/side-effects.ts:40-108` (SideEffectGuard check + token management). Side effects now come from the pack contract's `sideEffect` field instead of verb parsing.

- [ ] **Step 1: Create `packages/router/src/resolve.ts`**

```typescript
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { lookup } from "./registry.js";
import type {
  CapabilityId,
  PackId,
  PackContract,
  ProviderEntry,
  ProviderTarget,
  ResolutionResult,
  PendingConfirmation,
  RuntimeCallbacks,
  SideEffectPolicy,
} from "./types.js";
import type { Registry } from "./registry.js";

const execFileAsync = promisify(execFile);

const TOKEN_TTL = 300_000; // 5 minutes
const EXEC_TIMEOUT = 30_000; // 30 seconds

const pendingConfirmations = new Map<string, PendingConfirmation>();

function matchPattern(pattern: string, capabilityId: string): boolean {
  if (pattern === capabilityId) return true;
  if (pattern.endsWith(".*")) return capabilityId.startsWith(pattern.slice(0, -1));
  if (pattern.endsWith("*")) return capabilityId.startsWith(pattern.slice(0, -1));
  return false;
}

function sortByPreference(
  candidates: ProviderEntry[],
  preferredProviders: Record<string, string[]> | undefined,
  capabilityId: CapabilityId
): ProviderEntry[] {
  if (!preferredProviders) return candidates;

  let preferred: string[] = [];
  for (const [pattern, providers] of Object.entries(preferredProviders)) {
    if (matchPattern(pattern, capabilityId)) {
      preferred = providers;
      break;
    }
  }

  if (!preferred.length) return candidates;

  return [...candidates].sort((a, b) => {
    const aIdx = preferred.findIndex((p) => a.providerId.toLowerCase().includes(p.toLowerCase()));
    const bIdx = preferred.findIndex((p) => b.providerId.toLowerCase().includes(p.toLowerCase()));
    const aRank = aIdx === -1 ? Infinity : aIdx;
    const bRank = bIdx === -1 ? Infinity : bIdx;
    return aRank - bRank;
  });
}

export async function resolve(
  packId: PackId,
  capabilityId: CapabilityId,
  args: Record<string, unknown>,
  registry: Registry,
  contracts: Map<PackId, PackContract>,
  callbacks: RuntimeCallbacks,
  sideEffectPolicy: SideEffectPolicy,
  confirmationToken?: string
): Promise<ResolutionResult> {
  // 0. Handle confirmation flow
  if (confirmationToken) {
    const pending = validateToken(confirmationToken);
    if (!pending) return { status: "unavailable" };
    return executeTarget(pending.target, args, callbacks, pending.provider);
  }

  // 1. Verify capability is declared by this pack
  const contract = contracts.get(packId);
  if (!contract) return { status: "unavailable" };

  const cap = contract.capabilities.find((c) => c.id === capabilityId);
  if (!cap) return { status: "unavailable" };

  // 2. Look up providers
  let candidates = lookup(registry, capabilityId);
  if (!candidates.length) return { status: "unavailable" };

  // 3. Sort by pack's preferredProviders
  candidates = sortByPreference(candidates, contract.preferredProviders, capabilityId);

  // 4. Find best candidate (ready first)
  const ready = candidates.filter((c) => c.ready);
  if (!ready.length) {
    const best = candidates[0];
    return {
      status: "needs_setup",
      provider: best.providerId,
      setupHint: best.setupHint,
      setupUrl: best.setupUrl,
    };
  }

  const chosen = ready[0];

  // 5. Side-effect check
  if (cap.sideEffect === "write" || cap.sideEffect === "destructive") {
    const shouldBlock =
      sideEffectPolicy === "always_confirm" ||
      (sideEffectPolicy === "confirm_destructive" &&
        (cap.sideEffect === "write" || cap.sideEffect === "destructive"));

    if (shouldBlock) {
      const token = randomUUID();
      pendingConfirmations.set(token, {
        capabilityId,
        packId,
        args,
        provider: chosen.providerId,
        target: chosen.target,
        expiresAt: Date.now() + TOKEN_TTL,
      });
      return {
        status: "blocked",
        message: `About to perform ${capabilityId} via ${chosen.providerId}. Proceed?`,
        confirmationToken: token,
      };
    }
  }

  // 6. Execute or return skill_context
  return executeTarget(chosen.target, args, callbacks, chosen.providerId);
}

async function executeTarget(
  target: ProviderTarget,
  args: Record<string, unknown>,
  callbacks: RuntimeCallbacks,
  providerId: string
): Promise<ResolutionResult> {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Execution timeout (30s)")), EXEC_TIMEOUT);
  });

  try {
    const execPromise = (async (): Promise<ResolutionResult> => {
      switch (target.kind) {
        case "builtin_tool":
          return {
            status: "executed",
            provider: providerId,
            data: await callbacks.callBuiltinTool(target.name, args),
          };

        case "mcp_tool":
          return {
            status: "executed",
            provider: providerId,
            data: await callbacks.callMcpTool(target.server, target.tool, args),
          };

        case "composio":
          return {
            status: "executed",
            provider: providerId,
            data: await callbacks.callMcpTool("clawdi-mcp", "COMPOSIO_MULTI_EXECUTE_TOOL", {
              tool_slug: target.action,
              ...args,
            }),
          };

        case "cli": {
          const cliArgs = (args.argv as string[]) ?? (args.args as string[]) ?? [];
          const { stdout } = await execFileAsync(target.command, cliArgs, { timeout: EXEC_TIMEOUT });
          return { status: "executed", provider: providerId, data: stdout };
        }

        case "lobster":
          return {
            status: "executed",
            provider: providerId,
            data: await callbacks.runLobsterWorkflow(target.workflowId, args),
          };

        case "skill":
          return { status: "skill_context", provider: providerId, skillName: target.skillName };
      }
    })();

    const result = await Promise.race([execPromise, timeoutPromise]);
    clearTimeout(timer!);
    return result;
  } catch (err) {
    clearTimeout(timer!);
    return { status: "unavailable" };
  }
}

function validateToken(token: string): PendingConfirmation | undefined {
  const pending = pendingConfirmations.get(token);
  if (!pending) return undefined;
  if (Date.now() > pending.expiresAt) {
    pendingConfirmations.delete(token);
    return undefined;
  }
  pendingConfirmations.delete(token); // Single-use
  return pending;
}

export function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [token, pending] of pendingConfirmations) {
    if (now > pending.expiresAt) pendingConfirmations.delete(token);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/router/src/resolve.ts
git commit -m "feat(router): add resolve + executeTarget with contract-based side effects"
```

---

## Chunk 4: Plugin Entry + Commands

### Task 7: Create check-setup.ts

**Files:**
- Create: `packages/router/src/check-setup.ts`

**Context:** Replaces both `onboarding/check-setup.ts` (124 lines) and `onboarding/connect-apps.ts` (82 lines). Reads from the pre-populated registry instead of probing adapters. Same `[+]`/`[!]`/`[X]` icon format.

- [ ] **Step 1: Create `packages/router/src/check-setup.ts`**

```typescript
import { lookup, type Registry } from "./registry.js";
import type { PackContract, PackManifest } from "./types.js";

export interface SetupStatus {
  packStatuses: Array<{
    packId: string;
    displayName: string;
    capabilities: Array<{
      id: string;
      required: boolean;
      status: "ready" | "needs_setup" | "not_found";
      provider?: string;
      displayName?: string;
      setupHint?: string;
      setupUrl?: string;
      source?: string;
    }>;
  }>;
  scannerSources: string[];
}

export function buildCheckSetup(
  contracts: Map<string, PackContract>,
  manifests: Map<string, PackManifest>,
  registry: Registry
): SetupStatus {
  const packStatuses: SetupStatus["packStatuses"] = [];

  for (const [packId, contract] of contracts) {
    const manifest = manifests.get(packId);
    const capabilities: SetupStatus["packStatuses"][0]["capabilities"] = [];

    for (const cap of contract.capabilities) {
      const providers = lookup(registry, cap.id);
      const readyProvider = providers.find((p) => p.ready);

      if (readyProvider) {
        capabilities.push({
          id: cap.id,
          required: cap.required,
          status: "ready",
          provider: readyProvider.providerId,
          displayName: readyProvider.providerId,
          source: readyProvider.source,
        });
      } else if (providers.length > 0) {
        const best = providers[0];
        capabilities.push({
          id: cap.id,
          required: cap.required,
          status: "needs_setup",
          provider: best.providerId,
          displayName: best.providerId,
          setupHint: best.setupHint,
          setupUrl: best.setupUrl,
        });
      } else {
        capabilities.push({
          id: cap.id,
          required: cap.required,
          status: "not_found",
        });
      }
    }

    packStatuses.push({
      packId,
      displayName: manifest?.displayName ?? packId,
      capabilities,
    });
  }

  return {
    packStatuses,
    scannerSources: ["builtin", "composio", "mcp", "cli", "lobster", "skill"],
  };
}

export function formatCheckSetup(status: SetupStatus): string {
  const lines: string[] = [];

  for (const pack of status.packStatuses) {
    lines.push(`\n${pack.displayName}`);
    for (const cap of pack.capabilities) {
      const icon =
        cap.status === "ready" ? "[+]" : cap.status === "needs_setup" ? "[!]" : "[X]";
      const suffix = cap.provider
        ? ` -> ${cap.displayName}${cap.source ? ` (via ${cap.source})` : ""}`
        : cap.setupHint
          ? ` -> ${cap.setupHint}`
          : " -> no provider found";
      const optLabel = cap.required ? "" : " (optional)";
      lines.push(`  ${icon} ${cap.id}${suffix}${optLabel}`);
    }
  }

  lines.push(`\nAdapters scanned: ${status.scannerSources.join(", ")}`);

  return lines.join("\n");
}

export function formatConnectApps(status: SetupStatus): string {
  const lines: string[] = [];

  for (const pack of status.packStatuses) {
    lines.push(`\n**${pack.displayName}**`);

    const ready = pack.capabilities.filter((c) => c.status === "ready");
    const needsSetup = pack.capabilities.filter((c) => c.status === "needs_setup");
    const notFound = pack.capabilities.filter((c) => c.status === "not_found");
    const allRequiredReady = pack.capabilities
      .filter((c) => c.required)
      .every((c) => c.status === "ready");

    if (allRequiredReady) {
      lines.push("All required capabilities are ready.");
    }

    if (ready.length) {
      lines.push(`Ready: ${ready.map((r) => `${r.id} -> ${r.displayName}`).join(", ")}`);
    }
    for (const s of needsSetup) {
      lines.push(
        `Needs setup: ${s.id} -> ${s.displayName}${s.setupUrl ? ` (${s.setupUrl})` : s.setupHint ? ` — ${s.setupHint}` : ""}`
      );
    }
    if (notFound.length) {
      lines.push(`No provider: ${notFound.map((c) => c.id).join(", ")}`);
    }
  }

  return lines.join("\n") || "No packs discovered.";
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/router/src/check-setup.ts
git commit -m "feat(router): add check-setup and connect-apps formatting"
```

---

### Task 8: Rewrite index.ts

**Files:**
- Rewrite: `packages/router/src/index.ts`

**Context:** The plugin entry point. Significantly simplified from v1's 206 lines. No adapter instances — `RuntimeCallbacks` are passed directly to scanners and resolve. On `gateway_start`: loads contracts + manifests, runs all scanners, populates registry. Same `capability_execute` tool interface.

- [ ] **Step 1: Rewrite `packages/router/src/index.ts`**

```typescript
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import { loadContract } from "./contract.js";
import { createRegistry, populate } from "./registry.js";
import { runAllScanners } from "./scanners.js";
import { resolve } from "./resolve.js";
import { buildCheckSetup, formatCheckSetup, formatConnectApps } from "./check-setup.js";
import type {
  PackContract,
  PackManifest,
  RuntimeCallbacks,
  SideEffectPolicy,
} from "./types.js";
import type { Registry } from "./registry.js";

// Use permissive type — the plugin API shape varies across OpenClaw versions
type PluginApi = any;

const DEFAULT_CONFIG = {
  sideEffectPolicy: "confirm_destructive" as SideEffectPolicy,
  cliMappings: {} as Record<string, string>,
};

function resolveConfig(api: PluginApi) {
  return {
    ...DEFAULT_CONFIG,
    ...((api?.getConfig?.() as Record<string, unknown>) ?? {}),
  } as typeof DEFAULT_CONFIG;
}

function discoverPackInstallPaths(api: PluginApi): string[] {
  const pathsFromApi =
    api
      ?.getEnabledPlugins?.()
      ?.filter((p: any) => {
        const id = String(p?.id ?? "");
        return id.startsWith("pack-") || id.startsWith("@clawdi-ai/pack-");
      })
      ?.map((p: any) => p.installPath) ?? [];

  if (pathsFromApi.length) return pathsFromApi;

  const root = "/data/openclaw/extensions";
  if (!existsSync(root)) return [];

  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("pack-"))
    .map((d) => join(root, d.name));
}

function buildCallbacks(api: PluginApi): RuntimeCallbacks {
  return {
    callBuiltinTool: (name, args) =>
      api?.runtime?.callBuiltinTool?.(name, args) ?? Promise.resolve(null),
    callMcpTool: (server, tool, args) =>
      api?.runtime?.callMcpTool?.(server, tool, args) ?? Promise.resolve(null),
    listBuiltinTools: () => api?.runtime?.listBuiltinTools?.() ?? [],
    listMcpServers: () =>
      api?.runtime?.listMcpServers?.() ?? Promise.resolve([]),
    listLobsterWorkflows: () =>
      api?.runtime?.listLobsterWorkflows?.() ?? Promise.resolve([]),
    runLobsterWorkflow: (id, args) =>
      api?.runtime?.runLobsterWorkflow?.(id, args) ?? Promise.resolve(null),
  };
}

async function loadManifest(installPath: string): Promise<PackManifest> {
  const raw = await readFile(join(installPath, "pack-manifest.yaml"), "utf-8");
  return parseYaml(raw) as PackManifest;
}

export function register(api: PluginApi) {
  const config = resolveConfig(api);
  const callbacks = buildCallbacks(api);

  const registry: Registry = createRegistry();
  const contracts = new Map<string, PackContract>();
  const manifests = new Map<string, PackManifest>();

  // Discover packs and populate registry at startup
  api.on("gateway_start", async () => {
    const packPaths = discoverPackInstallPaths(api);

    for (const installPath of packPaths) {
      try {
        const contract = await loadContract(installPath);
        const manifest = await loadManifest(installPath);
        contracts.set(contract.packId, contract);
        manifests.set(contract.packId, manifest);

        // Collect skill directories for this pack
        const skillDir = join(installPath, "skills");
        const skillDirs = existsSync(skillDir) ? [skillDir] : [];

        // Run all scanners for this pack's capabilities
        const entries = await runAllScanners(
          contract.capabilities,
          callbacks,
          config.cliMappings ?? {},
          skillDirs,
          contract.preferredProviders
        );
        populate(registry, entries);
      } catch (err) {
        console.error(`[knowledge-work-router] Failed to load pack from ${installPath}:`, err);
      }
    }

    console.log(`[knowledge-work-router] Discovered ${contracts.size} pack(s)`);
  });

  // Register capability_execute tool
  api.registerTool({
    name: "capability_execute",
    description:
      "Execute a capability through the knowledge-work router. Pack skills use this to invoke capabilities like calendar.read_events, crm.lookup_account, etc.",
    parameters: {
      type: "object",
      properties: {
        capabilityId: {
          type: "string",
          description: "Capability ID, e.g. 'calendar.read_events'",
        },
        packId: {
          type: "string",
          description: "Pack ID, e.g. 'sales'",
        },
        args: {
          type: "object",
          description: "Arguments for the capability",
        },
        confirmationToken: {
          type: "string",
          description: "Token from a prior blocked result",
        },
      },
      required: ["capabilityId", "packId"],
    },
    handler: async ({ capabilityId, packId, args, confirmationToken }: any) => {
      return resolve(
        packId,
        capabilityId,
        args ?? {},
        registry,
        contracts,
        callbacks,
        config.sideEffectPolicy,
        confirmationToken
      );
    },
  });

  // Register /connect_apps command
  api.registerCommand({
    name: "connect_apps",
    description: "Set up connections for your installed knowledge-work packs",
    handler: async () => {
      const status = buildCheckSetup(contracts, manifests, registry);
      return { text: formatConnectApps(status) };
    },
  });

  // Register /check_setup command
  api.registerCommand({
    name: "check_setup",
    description: "Show the status of all knowledge-work pack capabilities",
    handler: async () => {
      const status = buildCheckSetup(contracts, manifests, registry);
      return { text: formatCheckSetup(status) };
    },
  });
}
```

- [ ] **Step 2: Verify the new index.ts compiles with all v2 modules**

Run: `cd /Users/hashwarlock/Projects/Clawdi/clawdi-plugins/packages/router && npx tsc --noEmit`
Expected: Errors only from old test files importing deleted modules (acceptable at this stage).

- [ ] **Step 3: Commit**

```bash
git add packages/router/src/index.ts
git commit -m "feat(router): rewrite plugin entry point for v2 registry architecture"
```

---

## Chunk 5: Pack Contracts

### Task 9: Generate capabilities.yaml for all 10 packs

**Files:**
- Create: `packages/pack-sales/capabilities.yaml`
- Create: `packages/pack-engineering/capabilities.yaml`
- Create: `packages/pack-marketing/capabilities.yaml`
- Create: `packages/pack-product-management/capabilities.yaml`
- Create: `packages/pack-customer-support/capabilities.yaml`
- Create: `packages/pack-human-resources/capabilities.yaml`
- Create: `packages/pack-operations/capabilities.yaml`
- Create: `packages/pack-productivity/capabilities.yaml`
- Create: `packages/pack-recruiting/capabilities.yaml`
- Create: `packages/pack-enterprise-search/capabilities.yaml`

**Context:** Each `capabilities.yaml` is generated from the pack's `pack-manifest.yaml`. Mapping: `capabilities.required` → `required: true`, `capabilities.optional` → `required: false`, verb-based classification → explicit `sideEffect`, `preferredApps` → `preferredProviders`.

**Side-effect classification (all 25 unique capabilities):**
- `read`: calendar.read_events, calendar.prepare_meeting_context, crm.lookup_account, research.web_search, research.collect_sources, docs.search_files, chat.search_messages, enrichment.lookup_company, enrichment.lookup_person, mail.read_inbox, project.list_tasks, analytics.get_metrics, seo.audit_page, seo.keyword_research, ats.search_candidates, ats.get_candidate, hris.get_employee, hris.list_employees, compensation.get_benchmarks
- `write`: crm.create_note, mail.send_followup, docs.create_brief, project.create_task, ats.update_candidate_stage, recruiting.offer_workflow

- [ ] **Step 1: Create `packages/pack-sales/capabilities.yaml`**

```yaml
packId: sales
version: "1"

capabilities:
  - id: calendar.read_events
    required: true
    sideEffect: read
  - id: calendar.prepare_meeting_context
    required: true
    sideEffect: read
  - id: crm.lookup_account
    required: true
    sideEffect: read
  - id: crm.create_note
    required: true
    sideEffect: write
  - id: mail.send_followup
    required: true
    sideEffect: write
  - id: research.web_search
    required: true
    sideEffect: read
  - id: docs.create_brief
    required: false
    sideEffect: write
  - id: research.collect_sources
    required: false
    sideEffect: read
  - id: chat.search_messages
    required: false
    sideEffect: read
  - id: enrichment.lookup_company
    required: false
    sideEffect: read
  - id: enrichment.lookup_person
    required: false
    sideEffect: read

preferredProviders:
  calendar.*:
    - google_workspace
    - outlook
  crm.*:
    - salesforce
    - hubspot
  mail.*:
    - google_workspace
    - outlook
```

- [ ] **Step 2: Create `packages/pack-engineering/capabilities.yaml`**

```yaml
packId: engineering
version: "1"

capabilities:
  - id: project.list_tasks
    required: true
    sideEffect: read
  - id: project.create_task
    required: true
    sideEffect: write
  - id: docs.search_files
    required: true
    sideEffect: read
  - id: chat.search_messages
    required: true
    sideEffect: read
  - id: research.web_search
    required: false
    sideEffect: read
  - id: docs.create_brief
    required: false
    sideEffect: write
  - id: calendar.read_events
    required: false
    sideEffect: read

preferredProviders:
  project.*:
    - linear
    - jira
    - github_projects
    - asana
  docs.*:
    - notion
    - confluence
    - google_workspace
  chat.*:
    - slack
    - teams
  calendar.*:
    - google_workspace
    - outlook
```

- [ ] **Step 3: Create `packages/pack-marketing/capabilities.yaml`**

```yaml
packId: marketing
version: "1"

capabilities:
  - id: research.web_search
    required: true
    sideEffect: read
  - id: docs.create_brief
    required: true
    sideEffect: write
  - id: analytics.get_metrics
    required: false
    sideEffect: read
  - id: seo.audit_page
    required: false
    sideEffect: read
  - id: seo.keyword_research
    required: false
    sideEffect: read
  - id: mail.send_followup
    required: false
    sideEffect: write
  - id: chat.search_messages
    required: false
    sideEffect: read
  - id: enrichment.lookup_company
    required: false
    sideEffect: read

preferredProviders:
  research.web_search:
    - google_workspace
    - bing
  analytics.get_metrics:
    - googlesuper
    - google_analytics
  seo.audit_page:
    - googlesearchconsole
    - googlesuper
  seo.keyword_research:
    - googlesearchconsole
    - googlesuper
  docs.create_brief:
    - google_workspace
    - notion
  mail.send_followup:
    - google_workspace
    - outlook
  chat.search_messages:
    - slack
    - msteams
```

- [ ] **Step 4: Create `packages/pack-product-management/capabilities.yaml`**

```yaml
packId: product-management
version: "1"

capabilities:
  - id: project.list_tasks
    required: true
    sideEffect: read
  - id: project.create_task
    required: true
    sideEffect: write
  - id: docs.search_files
    required: true
    sideEffect: read
  - id: docs.create_brief
    required: true
    sideEffect: write
  - id: research.web_search
    required: false
    sideEffect: read
  - id: analytics.get_metrics
    required: false
    sideEffect: read
  - id: chat.search_messages
    required: false
    sideEffect: read
  - id: calendar.read_events
    required: false
    sideEffect: read
  - id: mail.read_inbox
    required: false
    sideEffect: read

preferredProviders:
  project.*:
    - linear
    - jira
    - asana
    - shortcut
  docs.*:
    - notion
    - google_workspace
    - confluence
  research.*:
    - perplexity
    - tavily
    - brave_search
  analytics.*:
    - amplitude
    - mixpanel
    - posthog
  chat.*:
    - slack
    - teams
  calendar.*:
    - google_workspace
    - outlook
  mail.*:
    - google_workspace
    - outlook
```

- [ ] **Step 5: Create `packages/pack-customer-support/capabilities.yaml`**

```yaml
packId: customer-support
version: "1"

capabilities:
  - id: mail.read_inbox
    required: true
    sideEffect: read
  - id: crm.lookup_account
    required: true
    sideEffect: read
  - id: project.create_task
    required: true
    sideEffect: write
  - id: docs.search_files
    required: true
    sideEffect: read
  - id: research.web_search
    required: false
    sideEffect: read
  - id: mail.send_followup
    required: false
    sideEffect: write
  - id: docs.create_brief
    required: false
    sideEffect: write
  - id: chat.search_messages
    required: false
    sideEffect: read

preferredProviders:
  mail.*:
    - google_workspace
    - outlook
  crm.*:
    - zendesk
    - salesforce
    - hubspot
  project.*:
    - linear
    - jira
    - asana
  docs.*:
    - notion
    - google_workspace
    - confluence
  chat.*:
    - slack
    - teams
```

- [ ] **Step 6: Create `packages/pack-human-resources/capabilities.yaml`**

```yaml
packId: human-resources
version: "1"

capabilities:
  - id: hris.get_employee
    required: true
    sideEffect: read
  - id: hris.list_employees
    required: true
    sideEffect: read
  - id: docs.search_files
    required: true
    sideEffect: read
  - id: docs.create_brief
    required: true
    sideEffect: write
  - id: compensation.get_benchmarks
    required: false
    sideEffect: read
  - id: research.web_search
    required: false
    sideEffect: read
  - id: project.list_tasks
    required: false
    sideEffect: read
  - id: calendar.read_events
    required: false
    sideEffect: read
  - id: mail.send_followup
    required: false
    sideEffect: write

preferredProviders:
  hris.*:
    - bamboohr
    - workday
    - rippling
  docs.*:
    - google_workspace
    - notion
    - confluence
  compensation.*:
    - payscale
    - levels_fyi
  calendar.*:
    - google_workspace
    - outlook
  mail.*:
    - google_workspace
    - outlook
```

- [ ] **Step 7: Create `packages/pack-operations/capabilities.yaml`**

```yaml
packId: operations
version: "1"

capabilities:
  - id: project.list_tasks
    required: true
    sideEffect: read
  - id: project.create_task
    required: true
    sideEffect: write
  - id: docs.create_brief
    required: true
    sideEffect: write
  - id: docs.search_files
    required: true
    sideEffect: read
  - id: research.web_search
    required: true
    sideEffect: read
  - id: calendar.read_events
    required: false
    sideEffect: read
  - id: chat.search_messages
    required: false
    sideEffect: read
  - id: mail.send_followup
    required: false
    sideEffect: write

preferredProviders:
  project.list_tasks:
    - jira
    - asana
    - linear
  project.create_task:
    - jira
    - asana
    - linear
  docs.create_brief:
    - google_workspace
    - notion
    - confluence
  docs.search_files:
    - google_workspace
    - notion
    - confluence
  calendar.read_events:
    - google_workspace
    - outlook
  chat.search_messages:
    - slack
    - msteams
  mail.send_followup:
    - google_workspace
    - outlook
```

- [ ] **Step 8: Create `packages/pack-productivity/capabilities.yaml`**

```yaml
packId: productivity
version: "1"

capabilities:
  - id: calendar.read_events
    required: true
    sideEffect: read
  - id: mail.read_inbox
    required: true
    sideEffect: read
  - id: project.list_tasks
    required: true
    sideEffect: read
  - id: chat.search_messages
    required: false
    sideEffect: read
  - id: docs.search_files
    required: false
    sideEffect: read
  - id: project.create_task
    required: false
    sideEffect: write
  - id: research.web_search
    required: false
    sideEffect: read

preferredProviders:
  calendar.*:
    - google_workspace
    - outlook
  project.*:
    - linear
    - asana
    - jira
```

- [ ] **Step 9: Create `packages/pack-recruiting/capabilities.yaml`**

```yaml
packId: recruiting
version: "1"

capabilities:
  - id: ats.search_candidates
    required: true
    sideEffect: read
  - id: ats.get_candidate
    required: true
    sideEffect: read
  - id: calendar.read_events
    required: true
    sideEffect: read
  - id: research.web_search
    required: true
    sideEffect: read
  - id: ats.update_candidate_stage
    required: false
    sideEffect: write
  - id: mail.send_followup
    required: false
    sideEffect: write
  - id: mail.read_inbox
    required: false
    sideEffect: read
  - id: docs.create_brief
    required: false
    sideEffect: write
  - id: recruiting.offer_workflow
    required: false
    sideEffect: write

preferredProviders:
  ats.*:
    - greenhouse
    - lever
    - ashby
```

- [ ] **Step 10: Create `packages/pack-enterprise-search/capabilities.yaml`**

```yaml
packId: enterprise-search
version: "1"

capabilities:
  - id: research.web_search
    required: true
    sideEffect: read
  - id: docs.search_files
    required: true
    sideEffect: read
  - id: mail.read_inbox
    required: true
    sideEffect: read
  - id: chat.search_messages
    required: false
    sideEffect: read
  - id: docs.create_brief
    required: false
    sideEffect: write

preferredProviders:
  research.*:
    - perplexity
    - tavily
    - brave_search
  docs.*:
    - notion
    - google_workspace
    - confluence
    - sharepoint
  mail.*:
    - google_workspace
    - outlook
  chat.*:
    - slack
    - teams
```

- [ ] **Step 11: Commit**

```bash
git add packages/pack-*/capabilities.yaml
git commit -m "feat(packs): add capabilities.yaml contracts for all 10 packs"
```

---

## Chunk 6: Config + Deploy

### Task 10: Update openclaw.plugin.json

**Files:**
- Modify: `packages/router/openclaw.plugin.json`

**Context:** Remove deprecated v1 config fields: `adapterOrder`, `disabledAdapters`, `capabilityPins`, `cacheTtl`. Keep `sideEffectPolicy` and `cliMappings`. Bump version.

- [ ] **Step 1: Update `packages/router/openclaw.plugin.json`**

Replace the `configSchema` to contain only the v2 fields:

```json
{
  "id": "knowledge-work-router",
  "name": "Knowledge Work Router",
  "description": "Registry-based capability router for knowledge-work packs. Discovers providers at enrollment time via scanners (builtin, Composio, MCP, CLI, Lobster, skill). Side effects declared in pack contracts.",
  "version": "0.3.0",
  "configSchema": {
    "sideEffectPolicy": "confirm_destructive",
    "cliMappings": {}
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/router/openclaw.plugin.json
git commit -m "feat(router): update plugin manifest for v2 config schema"
```

---

### Task 11: Update deploy.sh

**Files:**
- Modify: `scripts/deploy.sh`

**Context:** Add one line after the `pack-manifest.yaml` copy to also copy `capabilities.yaml` to the deployment target.

- [ ] **Step 1: Add capabilities.yaml copy**

After the line:
```bash
  [ -f "$pkg_dir/pack-manifest.yaml" ] && cp "$pkg_dir/pack-manifest.yaml" "$dest/pack-manifest.yaml"
```

Add:
```bash
  [ -f "$pkg_dir/capabilities.yaml" ] && cp "$pkg_dir/capabilities.yaml" "$dest/capabilities.yaml"
```

- [ ] **Step 2: Commit**

```bash
git add scripts/deploy.sh
git commit -m "feat(deploy): copy capabilities.yaml alongside pack manifests"
```

---

## Chunk 7: Tests + Cleanup

### Task 12: Delete v1 source files

**Files:**
- Delete: 13 source files and 7 test files
- Delete: 5 empty directories

- [ ] **Step 1: Delete v1 source files**

```bash
cd /Users/hashwarlock/Projects/Clawdi/clawdi-plugins/packages/router/src
rm -f router.ts
rm -f adapters/composio.ts adapters/openclaw-tool.ts adapters/lobster.ts adapters/cli.ts adapters/mcporter.ts adapters/types.ts
rm -f capabilities/types.ts
rm -f discovery/engine.ts discovery/intent.ts
rm -f policy/side-effects.ts
rm -f onboarding/check-setup.ts onboarding/connect-apps.ts
```

- [ ] **Step 2: Delete old test files**

```bash
cd /Users/hashwarlock/Projects/Clawdi/clawdi-plugins/packages/router/src/__tests__
rm -f engine.test.ts integration.test.ts side-effects.test.ts adapters.test.ts composio.test.ts intent.test.ts openclaw-tool.test.ts
```

- [ ] **Step 3: Remove empty directories**

```bash
cd /Users/hashwarlock/Projects/Clawdi/clawdi-plugins/packages/router/src
rmdir adapters capabilities discovery policy onboarding 2>/dev/null || true
```

- [ ] **Step 4: Verify no dangling imports**

Run: `cd /Users/hashwarlock/Projects/Clawdi/clawdi-plugins/packages/router && npx tsc --noEmit`
Expected: No errors from the v2 source files.

- [ ] **Step 5: Commit**

```bash
cd /Users/hashwarlock/Projects/Clawdi/clawdi-plugins
git add -u packages/router/src/
git commit -m "refactor(router): remove v1 adapter/discovery/policy files"
```

---

### Task 13: Create v2 test suite

**Files:**
- Create: `packages/router/src/__tests__/contract.test.ts`
- Create: `packages/router/src/__tests__/scanners.test.ts`
- Create: `packages/router/src/__tests__/resolve.test.ts`

**Context:** Ports behavioral coverage from v1's 7 test files into 3 focused files. Uses same vitest/vi.fn() patterns. Adapts assertions for v2 types (ProviderEntry, ResolutionResult instead of ProbeResult, AdapterResult).

- [ ] **Step 1: Create `packages/router/src/__tests__/contract.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { validateContract } from "../contract.js";
import type { PackContract } from "../types.js";

describe("validateContract", () => {
  const validContract: PackContract = {
    packId: "sales",
    version: "1",
    capabilities: [
      { id: "calendar.read_events", required: true, sideEffect: "read" },
      { id: "crm.create_note", required: false, sideEffect: "write" },
    ],
  };

  it("accepts a valid contract", () => {
    expect(validateContract(validContract)).toEqual([]);
  });

  it("rejects missing packId", () => {
    const c = { ...validContract, packId: "" };
    expect(validateContract(c)).toContainEqual(expect.stringContaining("packId"));
  });

  it("rejects missing version", () => {
    const c = { ...validContract, version: "" };
    expect(validateContract(c)).toContainEqual(expect.stringContaining("version"));
  });

  it("rejects empty capabilities", () => {
    const c = { ...validContract, capabilities: [] };
    expect(validateContract(c)).toContainEqual(expect.stringContaining("non-empty"));
  });

  it("rejects duplicate capability IDs", () => {
    const c = {
      ...validContract,
      capabilities: [
        { id: "x.y", required: true, sideEffect: "read" as const },
        { id: "x.y", required: false, sideEffect: "read" as const },
      ],
    };
    expect(validateContract(c)).toContainEqual(expect.stringContaining("Duplicate"));
  });

  it("rejects invalid sideEffect", () => {
    const c = {
      ...validContract,
      capabilities: [{ id: "x.y", required: true, sideEffect: "maybe" as any }],
    };
    expect(validateContract(c)).toContainEqual(expect.stringContaining("sideEffect"));
  });
});
```

- [ ] **Step 2: Create `packages/router/src/__tests__/scanners.test.ts`**

```typescript
import { describe, it, expect, vi } from "vitest";
import { scanBuiltins, scanComposio, scanMcpServers, scanCliMappings, scanLobster } from "../scanners.js";
import type { PackCapability, RuntimeCallbacks } from "../types.js";

const caps: PackCapability[] = [
  { id: "research.web_search", required: true, sideEffect: "read" },
  { id: "calendar.read_events", required: true, sideEffect: "read" },
  { id: "crm.create_note", required: false, sideEffect: "write" },
];

function mockCallbacks(overrides: Partial<RuntimeCallbacks> = {}): RuntimeCallbacks {
  return {
    callBuiltinTool: vi.fn().mockResolvedValue(null),
    callMcpTool: vi.fn().mockResolvedValue(null),
    listBuiltinTools: vi.fn().mockReturnValue([]),
    listMcpServers: vi.fn().mockResolvedValue([]),
    listLobsterWorkflows: vi.fn().mockResolvedValue([]),
    runLobsterWorkflow: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe("scanBuiltins", () => {
  it("returns entries for matching builtin tools", () => {
    const cb = mockCallbacks({ listBuiltinTools: vi.fn().mockReturnValue(["web_search", "read_file"]) });
    const entries = scanBuiltins(caps, cb);
    expect(entries).toHaveLength(1);
    expect(entries[0].capabilityId).toBe("research.web_search");
    expect(entries[0].target).toEqual({ kind: "builtin_tool", name: "web_search" });
    expect(entries[0].ready).toBe(true);
  });

  it("returns empty for no matches", () => {
    const cb = mockCallbacks({ listBuiltinTools: vi.fn().mockReturnValue(["glob"]) });
    expect(scanBuiltins(caps, cb)).toHaveLength(0);
  });
});

describe("scanComposio", () => {
  it("returns ready entry when toolkit is active", async () => {
    const cb = mockCallbacks({
      callMcpTool: vi.fn().mockResolvedValue({
        primary_tool_slugs: ["googlesuper_read_calendar"],
        toolkit_connection_statuses: { googlesuper: "active" },
      }),
    });
    const entries = await scanComposio([caps[1]], cb);
    expect(entries).toHaveLength(1);
    expect(entries[0].ready).toBe(true);
    expect(entries[0].target).toEqual({
      kind: "composio",
      action: "googlesuper_read_calendar",
      toolkit: "googlesuper",
    });
  });

  it("returns unready entry with setupHint when toolkit is inactive", async () => {
    const cb = mockCallbacks({
      callMcpTool: vi.fn().mockResolvedValue({
        primary_tool_slugs: ["hubspot_create_note"],
        toolkit_connection_statuses: { hubspot: "inactive" },
      }),
    });
    const entries = await scanComposio([caps[2]], cb);
    expect(entries).toHaveLength(1);
    expect(entries[0].ready).toBe(false);
    expect(entries[0].setupHint).toBe("Connect via OAuth");
  });

  it("returns empty when Composio search throws", async () => {
    const cb = mockCallbacks({
      callMcpTool: vi.fn().mockRejectedValue(new Error("timeout")),
    });
    const entries = await scanComposio(caps, cb);
    expect(entries).toHaveLength(0);
  });

  it("prefers preferred providers", async () => {
    const cb = mockCallbacks({
      callMcpTool: vi.fn().mockResolvedValue({
        primary_tool_slugs: ["hubspot_create_note", "salesforce_create_note"],
        toolkit_connection_statuses: { hubspot: "active", salesforce: "active" },
      }),
    });
    const entries = await scanComposio([caps[2]], cb, { "crm.*": ["salesforce"] });
    expect(entries[0].target).toHaveProperty("action", "salesforce_create_note");
  });
});

describe("scanMcpServers", () => {
  it("matches intent keywords against tool names", async () => {
    const cb = mockCallbacks({
      listMcpServers: vi.fn().mockResolvedValue([
        { name: "my-server", tools: [{ name: "web_search", description: "Search the web" }] },
      ]),
    });
    const entries = await scanMcpServers([caps[0]], cb);
    expect(entries).toHaveLength(1);
    expect(entries[0].target).toEqual({ kind: "mcp_tool", server: "my-server", tool: "web_search" });
  });

  it("returns empty when no tools match", async () => {
    const cb = mockCallbacks({
      listMcpServers: vi.fn().mockResolvedValue([
        { name: "server", tools: [{ name: "unrelated_thing" }] },
      ]),
    });
    const entries = await scanMcpServers(caps, cb);
    expect(entries).toHaveLength(0);
  });
});

describe("scanCliMappings", () => {
  it("matches capability to CLI mapping and checks binary", async () => {
    // `which ls` should succeed on any unix system
    const entries = await scanCliMappings(
      [{ id: "docs.convert_pdf", required: false, sideEffect: "read" }],
      { "docs.convert_*": "ls" }
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].ready).toBe(true);
    expect(entries[0].target).toEqual({ kind: "cli", command: "ls" });
  });

  it("returns unready when binary not found", async () => {
    const entries = await scanCliMappings(
      [{ id: "docs.convert_pdf", required: false, sideEffect: "read" }],
      { "docs.convert_*": "nonexistent_binary_xyz" }
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].ready).toBe(false);
    expect(entries[0].setupHint).toBe("Install nonexistent_binary_xyz");
  });
});

describe("scanLobster", () => {
  it("matches _workflow capabilities to workflow IDs", async () => {
    const cb = mockCallbacks({
      listLobsterWorkflows: vi.fn().mockResolvedValue(["offer-letter", "onboarding-flow"]),
    });
    const entries = await scanLobster(
      [{ id: "recruiting.offer_workflow", required: false, sideEffect: "write" }],
      cb
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].target).toEqual({ kind: "lobster", workflowId: "offer-letter" });
  });

  it("skips non-workflow capabilities", async () => {
    const cb = mockCallbacks({
      listLobsterWorkflows: vi.fn().mockResolvedValue(["some-flow"]),
    });
    const entries = await scanLobster(caps, cb);
    expect(entries).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Create `packages/router/src/__tests__/resolve.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolve } from "../resolve.js";
import { createRegistry, populate } from "../registry.js";
import type { PackContract, ProviderEntry, RuntimeCallbacks } from "../types.js";
import type { Registry } from "../registry.js";

function mockCallbacks(overrides: Partial<RuntimeCallbacks> = {}): RuntimeCallbacks {
  return {
    callBuiltinTool: vi.fn().mockResolvedValue({ result: "ok" }),
    callMcpTool: vi.fn().mockResolvedValue({ result: "ok" }),
    listBuiltinTools: vi.fn().mockReturnValue([]),
    listMcpServers: vi.fn().mockResolvedValue([]),
    listLobsterWorkflows: vi.fn().mockResolvedValue([]),
    runLobsterWorkflow: vi.fn().mockResolvedValue({ result: "ok" }),
    ...overrides,
  };
}

const salesContract: PackContract = {
  packId: "sales",
  version: "1",
  capabilities: [
    { id: "calendar.read_events", required: true, sideEffect: "read" },
    { id: "crm.create_note", required: true, sideEffect: "write" },
    { id: "mail.read_inbox", required: true, sideEffect: "read" },
  ],
  preferredProviders: { "crm.*": ["salesforce"] },
};

const readyEntry: ProviderEntry = {
  providerId: "composio:googlesuper",
  capabilityId: "calendar.read_events",
  target: { kind: "composio", action: "googlesuper_read_cal", toolkit: "googlesuper" },
  ready: true,
  source: "composio",
};

const writeEntry: ProviderEntry = {
  providerId: "composio:salesforce",
  capabilityId: "crm.create_note",
  target: { kind: "composio", action: "salesforce_create_note", toolkit: "salesforce" },
  ready: true,
  source: "composio",
};

const unreadyEntry: ProviderEntry = {
  providerId: "composio:hubspot",
  capabilityId: "mail.read_inbox",
  target: { kind: "composio", action: "hubspot_read_inbox", toolkit: "hubspot" },
  ready: false,
  setupHint: "Connect via OAuth",
  setupUrl: "https://example.com/oauth",
  source: "composio",
};

let registry: Registry;
let contracts: Map<string, PackContract>;
let cb: RuntimeCallbacks;

beforeEach(() => {
  registry = createRegistry();
  contracts = new Map([["sales", salesContract]]);
  cb = mockCallbacks();
});

describe("resolve", () => {
  it("executes a read capability through a ready provider", async () => {
    populate(registry, [readyEntry]);
    const result = await resolve("sales", "calendar.read_events", {}, registry, contracts, cb, "confirm_destructive");
    expect(result.status).toBe("executed");
  });

  it("returns unavailable when pack not found", async () => {
    const result = await resolve("unknown", "calendar.read_events", {}, registry, contracts, cb, "confirm_destructive");
    expect(result.status).toBe("unavailable");
  });

  it("returns unavailable when capability not in contract", async () => {
    const result = await resolve("sales", "unknown.thing", {}, registry, contracts, cb, "confirm_destructive");
    expect(result.status).toBe("unavailable");
  });

  it("returns unavailable when no providers in registry", async () => {
    const result = await resolve("sales", "calendar.read_events", {}, registry, contracts, cb, "confirm_destructive");
    expect(result.status).toBe("unavailable");
  });

  it("returns needs_setup when no provider is ready", async () => {
    populate(registry, [unreadyEntry]);
    const result = await resolve("sales", "mail.read_inbox", {}, registry, contracts, cb, "confirm_destructive");
    expect(result.status).toBe("needs_setup");
    if (result.status === "needs_setup") {
      expect(result.setupHint).toBe("Connect via OAuth");
    }
  });

  it("blocks write capabilities with confirm_destructive policy", async () => {
    populate(registry, [writeEntry]);
    const result = await resolve("sales", "crm.create_note", {}, registry, contracts, cb, "confirm_destructive");
    expect(result.status).toBe("blocked");
    if (result.status === "blocked") {
      expect(result.confirmationToken).toBeTruthy();
    }
  });

  it("does not block write capabilities with never_confirm policy", async () => {
    populate(registry, [writeEntry]);
    const result = await resolve("sales", "crm.create_note", {}, registry, contracts, cb, "never_confirm");
    expect(result.status).toBe("executed");
  });

  it("blocks all capabilities with always_confirm policy", async () => {
    populate(registry, [readyEntry]);
    const result = await resolve("sales", "calendar.read_events", {}, registry, contracts, cb, "always_confirm");
    expect(result.status).toBe("blocked");
  });

  it("confirmation token round-trip works", async () => {
    populate(registry, [writeEntry]);
    const blocked = await resolve("sales", "crm.create_note", {}, registry, contracts, cb, "confirm_destructive");
    expect(blocked.status).toBe("blocked");
    if (blocked.status !== "blocked") return;

    const confirmed = await resolve("sales", "crm.create_note", {}, registry, contracts, cb, "confirm_destructive", blocked.confirmationToken);
    expect(confirmed.status).toBe("executed");
  });

  it("rejects invalid confirmation token", async () => {
    const result = await resolve("sales", "crm.create_note", {}, registry, contracts, cb, "confirm_destructive", "bad-token");
    expect(result.status).toBe("unavailable");
  });

  it("returns skill_context for skill targets", async () => {
    const skillEntry: ProviderEntry = {
      providerId: "skill:protonmail",
      capabilityId: "mail.read_inbox",
      target: { kind: "skill", skillName: "protonmail" },
      ready: true,
      source: "skill",
    };
    populate(registry, [skillEntry]);
    const result = await resolve("sales", "mail.read_inbox", {}, registry, contracts, cb, "confirm_destructive");
    expect(result.status).toBe("skill_context");
    if (result.status === "skill_context") {
      expect(result.skillName).toBe("protonmail");
    }
  });
});
```

- [ ] **Step 4: Run the test suite**

Run: `cd /Users/hashwarlock/Projects/Clawdi/clawdi-plugins && pnpm test`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/router/src/__tests__/
git commit -m "test(router): add v2 test suite for contract, scanners, and resolve"
```

---

### Task 14: Full verification

- [ ] **Step 1: Type-check**

Run: `cd /Users/hashwarlock/Projects/Clawdi/clawdi-plugins/packages/router && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Build**

Run: `cd /Users/hashwarlock/Projects/Clawdi/clawdi-plugins && pnpm -r build`
Expected: All packages build without errors.

- [ ] **Step 3: Run all tests**

Run: `cd /Users/hashwarlock/Projects/Clawdi/clawdi-plugins && pnpm test`
Expected: All tests pass (contract, scanners, resolve).

- [ ] **Step 4: Test deploy**

Run:
```bash
cd /Users/hashwarlock/Projects/Clawdi/clawdi-plugins
./scripts/deploy.sh /tmp/v2-verify
ls /tmp/v2-verify/pack-sales/capabilities.yaml && echo "capabilities.yaml deployed OK"
rm -rf /tmp/v2-verify
```
Expected: `capabilities.yaml deployed OK`.

- [ ] **Step 5: Verify file counts**

Run:
```bash
ls /Users/hashwarlock/Projects/Clawdi/clawdi-plugins/packages/router/src/*.ts | wc -l
```
Expected: 7 files (types, contract, registry, scanners, resolve, index, check-setup).

Run:
```bash
ls /Users/hashwarlock/Projects/Clawdi/clawdi-plugins/packages/router/src/__tests__/*.test.ts | wc -l
```
Expected: 3 files (contract, scanners, resolve).

Run:
```bash
wc -l /Users/hashwarlock/Projects/Clawdi/clawdi-plugins/packages/router/src/*.ts | tail -1
```
Expected: ~600 lines total (down from ~1,460).
