# Clawdi Router v2 — Design Proposal

## Status

Final. Ready for implementation.

## Problem

The current router (v1) has five problems:

1. **No contract validation.** Skills reference capabilities in prose (`capability_execute` with capabilityId "calendar.read_events") and pack manifests declare capabilities in a separate YAML list. Nothing enforces that they match. A typo in a SKILL.md is discovered only when a user triggers it and gets "no adapter found."

2. **Side effects guessed from verb strings.** The `SideEffectGuard` extracts the first token from a capability ID (e.g., `create` from `crm.create_note`), checks it against a hardcoded set of 15 verbs. Ambiguous verbs like `prepare`, `merge`, `assign` may or may not be classified correctly. The pack author — who knows the semantics — has no say.

3. **Runtime probing on every call.** Each `capability_execute` invocation triggers an ordered probe across up to five adapters. Composio calls its search API. MCP scans all server tool lists. This happens on every call, with results cached for 10 minutes. Resolution behavior is non-deterministic from the user's perspective.

4. **Skills that provide integration capabilities are invisible.** If a user installs a standalone ProtonMail skill that handles email, and a sales pack calls `capability_execute("mail.read_inbox")`, the router returns "no adapter found." The model has both skills in context but the router doesn't know the ProtonMail skill provides that capability. The skill degrades to manual fallback.

5. **Adapter classes mix concerns.** Each adapter implements both `probe()` (discovery + readiness) and `execute()` (runtime execution) in one class. These are different phases with different responsibilities, different error modes, and different timing requirements.

## Solution

Replace the current probe-based adapter architecture with a registry-based design:

- **One pack contract** (`capabilities.yaml`) as the single source of truth
- **One provider registry** (a Map) populated at enrollment time, not per-call
- **Six scanner functions** that discover providers from different sources
- **One resolve function** that does a map lookup, not a probe chain
- **One executor function** with an exhaustive switch over six target kinds
- **Skills as a target kind** — skills that declare capability metadata appear in the registry alongside Composio, MCP, and other providers

## Architecture

```
                    ┌─────────────────────────┐
                    │    capability_execute    │  ← LLM tool call
                    │  (packId, capabilityId,  │
                    │   args)                  │
                    └───────────┬──────────────┘
                                │
                    ┌───────────▼──────────────┐
                    │     resolve()            │
                    │  1. validate vs contract │
                    │  2. registry lookup      │
                    │  3. sort by preference   │
                    │  4. side-effect check    │
                    │  5. execute or respond   │
                    └───────────┬──────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                  │
     ┌────────▼───────┐  ┌─────▼──────┐  ┌───────▼────────┐
     │   execute()    │  │ skill_ctx  │  │  needs_setup / │
     │   switch on    │  │  response  │  │  unavailable   │
     │   target.kind  │  │            │  │                │
     └────────────────┘  └────────────┘  └────────────────┘
```

### Enrollment (where providers come from)

```
  /connect_apps  or  gateway_start
              │
   ┌──────────▼──────────┐
   │  Run all scanners   │
   │                     │
   │  scanBuiltins()     │ ← api.runtime.listBuiltinTools()
   │  scanComposio()     │ ← COMPOSIO_SEARCH_TOOLS via MCP
   │  scanMcpServers()   │ ← api.runtime.listMcpServers()
   │  scanCliMappings()  │ ← config + `which` binary check
   │  scanLobster()      │ ← api.runtime.listLobsterWorkflows()
   │  scanSkills()       │ ← filesystem: SKILL.md frontmatter
   │                     │
   └──────────┬──────────┘
              │
   ┌──────────▼──────────┐
   │  Merge into         │
   │  registry           │
   │  Map<capId,         │
   │    ProviderEntry[]>  │
   └─────────────────────┘
```

## Types

```typescript
// types.ts — the complete type surface

export type CapabilityId = string;
export type PackId = string;
export type ProviderId = string;
export type SideEffect = "read" | "write" | "destructive";

// --- Pack contract ---

export interface PackCapability {
  id: CapabilityId;
  required: boolean;
  sideEffect: SideEffect;
}

export interface PackContract {
  packId: PackId;
  version: number;
  capabilities: PackCapability[];
  preferredProviders?: Record<string, ProviderId[]>;
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
```

## Pack Contract

Each pack ships a `capabilities.yaml` as the single router-facing source of truth.

```yaml
# packages/pack-sales/capabilities.yaml
packId: sales
version: 1

capabilities:
  - id: calendar.read_events
    required: true
    sideEffect: read

  - id: crm.lookup_account
    required: true
    sideEffect: read

  - id: crm.create_note
    required: false
    sideEffect: write

  - id: mail.read_inbox
    required: true
    sideEffect: read

  - id: mail.send_followup
    required: false
    sideEffect: write

  - id: research.web_search
    required: true
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
  calendar.*: [google_workspace, outlook]
  crm.*: [salesforce, hubspot]
  mail.*: [google_workspace, outlook]
```

Rules:

- `capabilities.yaml` is the only file the router reads from a pack
- Every capability referenced in any SKILL.md must exist here
- Side-effect classification comes from the contract, not from verb parsing
- `pack-manifest.yaml` continues to exist for onboarding UX (welcome message, suggested first task) but is not used by the router for resolution

## Skill Metadata Convention

Skills that provide integration capabilities declare them in frontmatter:

```yaml
---
name: protonmail
description: ProtonMail email access via bridge
metadata:
  openclaw:
    requires:
      bins: [protonmail-bridge]
      env: [PROTONMAIL_BRIDGE_URL]
  router:
    provides:
      capabilities:
        - mail.read_inbox
        - mail.send_followup
---

## ProtonMail Email

When the user needs to read or send email via ProtonMail:

1. Use exec to call protonmail-bridge ...
...
```

- `metadata.openclaw.requires` uses OpenClaw's existing gating model
- `metadata.router.provides.capabilities` is the convention this router defines
- If a SKILL.md has no `metadata.router.provides.capabilities`, the skill scanner ignores it
- Eligibility is checked by verifying required binaries exist (via `which`) and required env vars are set (via `process.env`)

## Scanners

Six pure functions. Each takes its dependencies as arguments. Each returns `ProviderEntry[]`.

### scanBuiltins

Calls `api.runtime.listBuiltinTools()`. For each capability declared across all packs, strips the domain prefix (`research.web_search` → `web_search`) and checks for an exact match in the builtin tool list. Emits entries with `kind: "builtin_tool"`, always `ready: true`.

### scanComposio

For each capability declared across all packs, calls `COMPOSIO_SEARCH_TOOLS` via `api.runtime.callMcpTool("clawdi-mcp", ...)` with the intent string (underscores → spaces). Checks `toolkit_connection_statuses` for readiness. Emits entries with `kind: "composio"`. If not connected, attempts to get OAuth setup URL via `COMPOSIO_MANAGE_CONNECTIONS`.

Respects pack `preferredProviders`: if a pack prefers `google_workspace` for `calendar.*`, the scanner prefers matching Composio toolkit slugs.

### scanMcpServers

Calls `api.runtime.listMcpServers()`. For each capability, does keyword matching against server tool names and descriptions (same logic as current McporterAdapter). Emits entries with `kind: "mcp_tool"`, always `ready: true`.

### scanCliMappings

Reads `cliMappings` from router config. For each mapping, checks binary exists via `which`. Emits entries with `kind: "cli"`, `ready` based on binary availability.

### scanLobster

Calls `api.runtime.listLobsterWorkflows()`. Matches capabilities with `_workflow` suffix against workflow IDs. Emits entries with `kind: "lobster"`, always `ready: true`.

### scanSkills

Scans filesystem directories for SKILL.md files:
- Each pack's `skills/` directory (known from pack install paths)
- `~/.openclaw/skills/` (managed/local skills)

For each SKILL.md with `metadata.router.provides.capabilities`:
1. Parse frontmatter
2. Read `requires.bins` — check each via `which`
3. Read `requires.env` — check each via `process.env`
4. Emit one `ProviderEntry` per declared capability with `kind: "skill"`, `ready` based on gate checks

## Registry

```typescript
// registry.ts

const registry = new Map<CapabilityId, ProviderEntry[]>();

function populate(entries: ProviderEntry[]): void {
  registry.clear();
  for (const entry of entries) {
    const list = registry.get(entry.capabilityId) ?? [];
    list.push(entry);
    registry.set(entry.capabilityId, list);
  }
}

function lookup(capabilityId: CapabilityId): ProviderEntry[] {
  return registry.get(capabilityId) ?? [];
}
```

## Resolution

```typescript
// resolve.ts (pseudocode)

async function resolve(
  packId: PackId,
  capabilityId: CapabilityId,
  args: Record<string, unknown>,
  contract: PackContract,
  runtime: RuntimeCallbacks,
  confirmationToken?: string
): Promise<ResolutionResult> {

  // 0. Handle confirmation flow
  if (confirmationToken) {
    const pending = validateToken(confirmationToken);
    if (!pending) return { status: "unavailable" };
    return executeTarget(pending.target, args, runtime, pending.provider);
  }

  // 1. Verify capability is declared by this pack
  const cap = contract.capabilities.find(c => c.id === capabilityId);
  if (!cap) return { status: "unavailable" };

  // 2. Look up providers
  let candidates = lookup(capabilityId);
  if (!candidates.length) return { status: "unavailable" };

  // 3. Sort by pack's preferredProviders
  candidates = sortByPreference(candidates, contract.preferredProviders, capabilityId);

  // 4. Find best candidate
  const ready = candidates.find(c => c.ready);
  if (!ready) {
    const best = candidates[0];
    return { status: "needs_setup", provider: best.providerId, setupHint: best.setupHint, setupUrl: best.setupUrl };
  }

  // 5. Side-effect check
  if (cap.sideEffect === "write" || cap.sideEffect === "destructive") {
    const token = createConfirmationToken(capabilityId, packId, args, ready);
    return { status: "blocked", message: `About to ${capabilityId} via ${ready.providerId}. Proceed?`, confirmationToken: token };
  }

  // 6. Execute or return skill_context
  return executeTarget(ready.target, args, runtime, ready.providerId);
}

async function executeTarget(
  target: ProviderTarget,
  args: Record<string, unknown>,
  runtime: RuntimeCallbacks,
  providerId: ProviderId
): Promise<ResolutionResult> {
  switch (target.kind) {
    case "builtin_tool":
      return { status: "executed", provider: providerId, data: await runtime.callBuiltinTool(target.name, args) };

    case "mcp_tool":
      return { status: "executed", provider: providerId, data: await runtime.callMcpTool(target.server, target.tool, args) };

    case "composio":
      return { status: "executed", provider: providerId,
        data: await runtime.callMcpTool("clawdi-mcp", "COMPOSIO_MULTI_EXECUTE_TOOL", { tool_slug: target.action, ...args }) };

    case "cli": {
      const { stdout } = await execFileAsync(target.command, (args.argv as string[]) ?? [], { timeout: 30_000 });
      return { status: "executed", provider: providerId, data: stdout };
    }

    case "lobster":
      return { status: "executed", provider: providerId, data: await runtime.runLobsterWorkflow(target.workflowId, args) };

    case "skill":
      return { status: "skill_context", provider: providerId, skillName: target.skillName };
  }
}
```

## Side-Effect Policy

Side effects are declared in the pack contract:

```yaml
- id: mail.send_followup
  sideEffect: write
```

Policy rules:
- `read` → execute without confirmation
- `write` → require confirmation (under default `confirm_destructive` policy)
- `destructive` → always require confirmation

Confirmation tokens bind to: packId, capabilityId, providerId, target, args hash. Tokens expire after 5 minutes.

The `sideEffectPolicy` config setting (`always_confirm`, `confirm_destructive`, `never_confirm`) continues to work as in v1.

## Startup Validation

At `gateway_start`, for each discovered pack:

1. Parse `capabilities.yaml` — reject if malformed
2. For each SKILL.md in the pack's `skills/` directory, extract `capability_execute` references (simple regex: `capabilityId[:\s]*"([a-z_]+\.[a-z_]+)"`)
3. Log error for any referenced capability not declared in the contract
4. Warn if `preferredProviders` references a provider ID not yet in the registry (soft warning — registry may be populated later by `/connect_apps`)

Validation errors are logged, not fatal. The router continues to function with whatever is valid.

## Commands

### /connect_apps

Runs all six scanners. Populates the registry. Reports per-pack status:

```
Sales Pack
  [+] calendar.read_events -> Google Workspace (via composio)
  [+] crm.lookup_account -> HubSpot (via composio)
  [+] mail.read_inbox -> protonmail (via skill)
  [!] mail.send_followup -> protonmail (missing: PROTONMAIL_BRIDGE_URL)
  [X] chat.search_messages -> no provider found

Adapters scanned: builtin, composio, mcp, cli, lobster, skill
```

### /check_setup

Reports capability status for all installed packs without re-running scanners. Reads current registry state. Shows source for each resolved provider.

## Tool Registration

```typescript
api.registerTool({
  name: "capability_execute",
  description: "Execute a capability through the knowledge-work router.",
  parameters: {
    type: "object",
    properties: {
      capabilityId: { type: "string", description: "e.g. 'calendar.read_events'" },
      packId: { type: "string", description: "e.g. 'sales'" },
      args: { type: "object", description: "Arguments for the capability" },
      confirmationToken: { type: "string", description: "Token from a prior blocked result" },
    },
    required: ["capabilityId", "packId"],
  },
  handler: async ({ capabilityId, packId, args, confirmationToken }) => {
    return resolve(packId, capabilityId, args ?? {}, getContract(packId), runtime, confirmationToken);
  },
});
```

The tool contract is identical to v1. No pack changes required. No SKILL.md changes required (except adding `capabilities.yaml` to each pack).

## Skill Authoring Pattern

Skills that call `capability_execute` should handle three response states:

```markdown
## Step 1: Get email context

Use `capability_execute` with capabilityId "mail.read_inbox":
- If the result contains data, use it directly
- If the result status is "skill_context", follow the referenced
  skill's instructions for reading email

**Without any provider:**
Ask the user for their recent emails about the topic.
```

The scaffolding generator should produce this pattern. Pack authors should not invent it.

## File Structure

```
packages/router/src/
  types.ts          ~45 lines    Type definitions
  contract.ts       ~60 lines    Load + validate capabilities.yaml
  registry.ts       ~30 lines    Map + populate + lookup
  scanners.ts       ~180 lines   6 scanner functions
  resolve.ts        ~120 lines   resolve + executeTarget + side-effect check
  index.ts          ~100 lines   register(), gateway_start, tool + commands
  check-setup.ts    ~80 lines    /check_setup formatting
  __tests__/                     Port from v1 test suite
```

Estimated total: ~600 lines. Down from 1,446.

Zero subdirectories. Zero adapter classes. Zero generic type parameters.

## What v2 Removes

| v1 Concept | Status | Reason |
|---|---|---|
| 5 adapter classes (probe + execute) | Removed | Replaced by scanner functions + one executor switch |
| `DiscoveryEngine` with cache TTL | Removed | Registry populated at enrollment, not per-call |
| `extractIntent()` / `extractVerb()` | Removed | Side effects from contract, not verb parsing |
| Ordered adapter probing at execution time | Removed | One map lookup replaces ordered probe chain |
| `pack-manifest.yaml` as router input | Removed | `capabilities.yaml` is the sole contract |
| Capability pins and fallback overrides | Removed | `preferredProviders` in the contract is sufficient |
| Suffix-based builtin tool guessing | Removed | Explicit registry entries from scanner |
| 10-minute in-memory probe cache | Removed | Registry is persistent until `/connect_apps` re-runs |

## What v2 Preserves

| Concept | Status |
|---|---|
| `capability_execute` tool interface | Identical — no pack or skill changes needed |
| Composio discovery value | Runs at enrollment time via scanner, not per-call |
| MCP / Lobster / CLI / builtin support | Same functionality, cleaner implementation |
| Side-effect confirmation flow | Same UX, policy from contract instead of verb parsing |
| `/connect_apps` and `/check_setup` | Same commands, better output |
| All 10 packs and 63 skills | Zero changes required (add `capabilities.yaml` per pack) |

## Migration

1. Add `capabilities.yaml` to each of the 10 packs (generated from existing `pack-manifest.yaml`)
2. Replace `packages/router/src/` contents with v2 implementation
3. Port test expectations from v1 test suite to v2
4. Run `/connect_apps` after deployment to populate registry
5. Remove `pack-manifest.yaml` router dependency (keep file for onboarding UX)

## Future Work (explicitly deferred)

- **Scaffolding generator** — `create-pack` command that generates `capabilities.yaml`, `openclaw.plugin.json`, and SKILL.md templates from a jobs-and-capabilities input. Build after the core ships.
- **Background registry refresh** — periodic re-scan without requiring `/connect_apps`. Add if users request it.
- **`api.runtime.listEligibleSkills()`** — if OpenClaw upstream adds skill introspection to the plugin API, replace the filesystem-based skill scanner with it. Until then, filesystem scanning is correct and consistent with the router's existing patterns.
