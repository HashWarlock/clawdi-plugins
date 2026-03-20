# Knowledge Work Router Plugin Design

Date: 2026-03-20
Status: Validated design
Supersedes: `docs/plans/2026-03-19-openclaw-knowledge-work-router-design.md`

## Problem

We need an OpenClaw plugin that provides AI-powered knowledge-work workflows (sales, recruiting, productivity) with runtime capability resolution, onboarding, and adapter fallback. The plugin must be simple to install on any OpenClaw deployment and scale to new packs without router changes.

### Why the Prior Design Falls Short

The prior design proposed compatible bundles for role packs plus a native router plugin. Compatible bundles cannot run code, register tools, or hook lifecycle events. This means packs cannot self-describe their capability requirements, forcing the router to hardcode knowledge of every pack. The result is a fragile coupling between separately-installed packages.

### Why PR #48 Falls Short

PR #48 takes a static injection approach: a `connectors.json` file maps `~~category` placeholders to providers, injected into every prompt via a `before_prompt_build` hook. The LLM resolves connectors by reading the prompt table. This approach has four problems:

1. No runtime fallback or discovery. Users with different tool stacks must manually edit `connectors.json`.
2. Implicit dispatch. The LLM interprets a text table rather than calling typed tools, with no way to check readiness before attempting execution.
3. No onboarding. Users get no guidance on what to connect or how.
4. Skills are scattered. Individual skill directories are not bundled as installable units.

## Architecture

### Core Decision

Every package is a native OpenClaw plugin. Packs are plugins, not compatible bundles. The router discovers packs by naming convention.

### Packages

| Package | Type | Purpose |
|---|---|---|
| `@clawdi-ai/knowledge-work-router` | Native plugin | Capability resolution, adapter chain, onboarding, config |
| `@clawdi-ai/pack-sales` | Native plugin | Sales workflows: account research, call prep, pipeline, outreach |
| `@clawdi-ai/pack-productivity` | Native plugin | Daily planning, meeting prep, task management, weekly reviews |
| `@clawdi-ai/pack-recruiting` | Native plugin | Recruiting pipeline, interview prep, org planning, offers |
| `@clawdi-ai/pack-marketing` | Native plugin | Campaigns, SEO, content creation, email sequences, brand review |
| `@clawdi-ai/pack-operations` | Native plugin | Status reports, runbooks, risk assessment, compliance, vendor review |
| `@clawdi-ai/pack-customer-support` | Native plugin | Ticket triage, customer research, draft responses, KB articles |
| `@clawdi-ai/pack-engineering` | Native plugin | Code review prep, incident response, architecture review, retros |
| `@clawdi-ai/pack-enterprise-search` | Native plugin | Cross-source search, knowledge synthesis, digests |
| `@clawdi-ai/pack-human-resources` | Native plugin | Performance reviews, comp analysis, people reports, policy, onboarding |
| `@clawdi-ai/pack-product-management` | Native plugin | Specs, sprint planning, roadmaps, metrics, stakeholder updates |

### Discovery Convention

The router discovers packs automatically using two rules:

1. Pack plugin ID starts with `@clawdi-ai/pack-`
2. Pack root contains `pack-manifest.yaml`

At startup the router queries enabled plugins, filters by prefix, and reads each pack's manifest. Install a pack and the router finds it. Uninstall it and the router stops seeing it. No wiring required.

```ts
api.on("gateway_start", async () => {
  const allPlugins = api.getEnabledPlugins();
  const packs = allPlugins.filter(p => p.id.startsWith("@clawdi-ai/pack-"));

  for (const pack of packs) {
    const manifest = await readYaml(pack.installPath + "/pack-manifest.yaml");
    router.registerPack(manifest);
  }

  logger.info(`Router discovered ${packs.length} pack(s)`);
});
```

### Install Experience

```bash
openclaw plugins install @clawdi-ai/knowledge-work-router
openclaw plugins install @clawdi-ai/pack-sales
# Router auto-discovers the sales pack
# User runs /connect_apps to set up connections
```

## Repository Layout

```
clawdi-plugins/
  packages/
    router/                            # @clawdi-ai/knowledge-work-router
      openclaw.plugin.json
      package.json
      src/
        index.ts                       # register(api) entry point
        adapters/
          types.ts                     # CapabilityAdapter contract
          composio.ts
          openclaw-tool.ts
          lobster.ts
          cli.ts
          mcporter.ts
        capabilities/
          registry.ts                  # capability registry + resolution
          types.ts                     # CapabilityId, PackId, etc.
        onboarding/
          connect-apps.ts              # /connect_apps command handler
          check-setup.ts              # /check_setup command handler
        policy/
          fallback.ts                  # ordered adapter chain logic
          side-effects.ts              # confirmation policy
      config/
        default-fallback-order.json

    pack-sales/                        # @clawdi-ai/pack-sales
      openclaw.plugin.json
      package.json
      pack-manifest.yaml
      src/
        index.ts                       # minimal register(api)
      skills/
        account-research/SKILL.md
        call-prep/SKILL.md
        call-summary/SKILL.md
        competitive-intelligence/SKILL.md
        daily-briefing/SKILL.md
        draft-outreach/SKILL.md
        forecast/SKILL.md
        pipeline-review/SKILL.md

    pack-productivity/                 # @clawdi-ai/pack-productivity
      openclaw.plugin.json
      package.json
      pack-manifest.yaml
      src/
        index.ts
      skills/
        ...

    pack-recruiting/                   # @clawdi-ai/pack-recruiting
      openclaw.plugin.json
      package.json
      pack-manifest.yaml
      src/
        index.ts
      skills/
        ...

  docs/
    plans/
    superpowers/
      specs/
```

## Capability Resolution Model

### Flow

```
Pack skill invokes:     capability_execute("calendar.read_events", "sales", {...})
        |
Router receives:        capabilityId + packId + args
        |
Registry resolves:      Which adapters provide this capability?
        |
Fallback chain:         composio -> openclaw_tool -> lobster -> cli -> mcporter
        |
Readiness check:        First adapter that reports ready=true wins
        |
Execute or onboard:     Ready? Execute. Not ready? Return needs_setup.
```

### The Router Registers a Tool

The router exposes capabilities as a single OpenClaw tool via `api.registerTool()`. Pack skills invoke capabilities through this tool, never through adapter-specific tools.

```ts
api.registerTool({
  name: "capability_execute",
  description: "Execute a capability through the knowledge-work router",
  parameters: {
    capabilityId: { type: "string", description: "e.g. calendar.read_events" },
    packId: { type: "string", description: "e.g. sales" },
    args: { type: "object", description: "Capability-specific arguments" }
  },
  handler: async ({ capabilityId, packId, args }) => {
    return router.resolve(capabilityId, packId, args);
  }
});
```

### Pack Manifest

Each pack declares its capability requirements in `pack-manifest.yaml`:

```yaml
packId: sales
displayName: "Sales Pack"
capabilities:
  required:
    - calendar.read_events
    - calendar.prepare_meeting_context
    - crm.lookup_account
    - crm.create_note
    - mail.send_followup
  optional:
    - docs.create_brief
    - research.collect_sources
preferredApps:
  calendar.*:
    - google_workspace
    - outlook
  crm.*:
    - salesforce
    - hubspot
fallbackOverrides:
  crm.lookup_account:
    adapters: [composio, openclaw_tool, lobster, mcporter]
preferences:
  preferredCrm:
    type: enum
    values: [salesforce, hubspot, pipedrive]
    label: "Primary CRM"
    description: "Which CRM should be used for account lookups and note creation?"
    captureAt: first_use
onboarding:
  welcomeMessage: "The Sales pack helps you prep for calls, research accounts, and manage your pipeline."
  suggestedFirstTask: "Try: 'Prep me for my next meeting'"
```

The `preferences` block defines user choices that affect routing. The router reads these from the manifest, presents them to the user during onboarding or at first use (`captureAt: first_use`), and stores the user's selections in the router's own config under `packPreferences.<packId>`. This keeps all runtime state in one place without cross-plugin config dependencies.

### Pack Plugin Manifest

```json
{
  "id": "@clawdi-ai/pack-sales",
  "name": "Sales Pack",
  "description": "AI-powered sales workflows: account research, call prep, pipeline review, and more",
  "version": "1.0.0",
  "skills": ["./skills"],
  "configSchema": {}
}
```

Pack plugins have an empty `configSchema`. All user-facing preferences that affect routing live in `pack-manifest.yaml`, which the router reads at discovery time. This avoids the cross-plugin config problem — the router does not need to read another plugin's config; it reads the pack's manifest file directly from `installPath`.

Side-effect policy is owned exclusively by the router's `sideEffectPolicy` config. Packs do not define their own approval mode.
```

### Pack Registration Code

Pack `index.ts` is minimal. Discovery is convention-based so packs do not need to register themselves with the router.

```ts
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";

export function register(api: OpenClawPluginApi) {
  // Pack-specific slash commands (optional)
  api.registerCommand({
    name: "sales_briefing",
    description: "Generate a daily sales briefing",
    handler: async () => ({
      systemPrompt: "Use the sales-daily-briefing skill to generate today's briefing."
    })
  });
}
```

### Skill Structure

Skills reference capability IDs, never adapter-specific tools:

```markdown
---
name: sales-call-prep
description: Prepare a comprehensive briefing for an upcoming sales call
metadata:
  openclaw:
    tags: [sales, meetings]
---

## Call Prep Workflow

When the user asks to prepare for a call or meeting:

1. Use `capability_execute` with capabilityId "calendar.read_events"
   to find the upcoming meeting and its attendees
2. Use `capability_execute` with capabilityId "crm.lookup_account"
   to pull account context for each attendee's company
3. Use `capability_execute` with capabilityId "research.collect_sources"
   to find recent news about the company
4. Synthesize into a briefing with:
   - Attendee profiles
   - Account history and open opportunities
   - Recent company news
   - Suggested talking points
```

## Adapter Layer

### Contract

```ts
type CapabilityId = string;
type PackId = string;

interface AdapterReadiness {
  ready: boolean;
  missingBins?: string[];
  missingEnv?: string[];
  missingConnections?: string[];
  suggestedApps?: string[];  // user-facing app labels this adapter could satisfy
  setupAction?: "connect" | "install" | "configure" | "none";
}

interface AdapterResult {
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

interface CapabilityAdapter {
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
```

### Adapters

**Composio** — primary service connector for OAuth-connected SaaS tools. Maps capabilities to Composio toolkit and action slugs internally. Prefers `googlesuper` for Google services. Never exposes raw Composio slugs to pack skills.

**OpenClaw Tool** — for capabilities satisfied by native OpenClaw tools or built-in skills. Checks tool availability in the current session.

**Lobster** — for deterministic, multi-step, approval-gated workflows. Maps capabilities to Lobster workflow IDs. Appropriate when the workflow is known in advance and may require approval gates.

**CLI** — for local tools. Validates required binaries exist before claiming readiness. Scoped to an explicit allowlist.

**MCPorter** — fallback for MCP-shaped integrations. Available but not central to UX. Scoped to an allowed server list.

### Fallback Chain

Default order: `composio -> openclaw_tool -> lobster -> cli -> mcporter`

```ts
async resolve(capabilityId, packId, args) {
  const packOrder = getPackFallbackOrder(packId, capabilityId) ?? defaultOrder;

  for (const adapterId of packOrder) {
    const adapter = this.adapters.get(adapterId);
    const caps = await adapter.providesCapabilities();
    if (!caps.includes(capabilityId)) continue;

    const readiness = await adapter.checkReadiness({ packId, capabilityId });
    if (readiness.ready) {
      return adapter.execute({ packId, capabilityId, args });
    }
  }

  return { status: "needs_setup", data: { capabilityId, packId } };
}
```

The fallback loop shown above handles the happy path. Additional logic applied outside the loop:

- **Side-effect confirmation:** After a ready adapter is found but before execution, the router checks the side-effect policy. If confirmation is required, the router returns `blocked` without executing. See the Side-Effect Confirmation section.
- **Capability pins:** Before entering the loop, the router checks `capabilityPins` config. If the capability is pinned, only that adapter is tried.
- **Disabled adapters:** Adapters in `disabledAdapters` are filtered from the chain before the loop.
- **Execution errors:** If `execute()` throws or returns `status: "error"`, the router does NOT try the next adapter. It surfaces the error immediately. Silent fallback on errors would mask broken adapters.
- **Timeouts:** Each adapter `execute()` call is wrapped in a 30-second timeout. On timeout, the router returns `status: "error"` with a timeout note. Timeout duration is configurable via router config.

## Onboarding

### `/connect_apps`

The primary onboarding command. Behavior:

1. Discover installed packs via convention
2. Read each pack's `pack-manifest.yaml` for required and optional capabilities
3. For each required capability, run readiness checks across the adapter chain
4. Group unresolved capabilities by the broadest app that covers them
5. Walk the user through connections one app at a time, broadest first
6. Resume the original task when possible

Example:

```
> /connect_apps

Sales pack detected. Checking connections...

  CRM (Hubspot via Composio) — connected
  Calendar — not connected
  Email — not connected

Google Workspace would cover both Calendar and Email.
Would you like to connect Google Workspace?
> yes

Opening Composio auth flow for Google Workspace...
Google Workspace connected. Calendar and Email are now available.

All required capabilities for Sales are ready.
```

### `/check_setup`

Diagnostic command. Shows per-pack capability status, resolved adapters, and router adapter health.

```
> /check_setup

Sales pack
  calendar.read_events        -> composio (google_workspace)
  crm.lookup_account          -> composio (hubspot)
  docs.create_brief           -> no adapter ready (optional)
  mail.send_followup          -> composio (google_workspace)

Recruiting pack
  ats.search_candidates       -> needs setup
  calendar.read_events        -> needs setup

Router adapters:
  composio      loaded
  openclaw_tool loaded
  lobster       loaded
  cli           missing binary: pandoc
  mcporter      loaded
```

### Automatic Onboarding at Point of Need

When a skill invokes a capability that is not ready, the router returns `needs_setup` with guidance:

```ts
if (!readiness.ready) {
  return {
    status: "needs_setup",
    data: {
      message: `${capabilityId} requires ${readiness.setupAction}. Run /connect_apps to set up.`,
      missingConnections: readiness.missingConnections,
      suggestedApp: lookupBroadestApp(capabilityId, packId)
    }
  };
}
```

The LLM sees the result and guides the user naturally.

### Onboarding Principles

- No front-loaded setup wizard. Users connect apps when they need them.
- Broadest app first. Suggest Google Workspace instead of asking about Calendar, Gmail, and Docs separately.
- Pack-scoped. Only check capabilities for installed packs.
- Graceful for optional capabilities. Warnings, never blockers.
- No internal jargon. Users see "Google Workspace" and "Calendar", never "composio.googlesuper".

## Configuration and Enterprise Customization

All customization flows through the router's config schema. Pack skills and manifests never change.

### Router Config Schema

```json
{
  "configSchema": {
    "type": "object",
    "properties": {
      "adapterOrder": {
        "type": "array",
        "items": { "type": "string", "enum": ["composio", "openclaw_tool", "lobster", "cli", "mcporter"] },
        "default": ["composio", "openclaw_tool", "lobster", "cli", "mcporter"]
      },
      "disabledAdapters": {
        "type": "array",
        "items": { "type": "string" },
        "default": []
      },
      "capabilityPins": {
        "type": "object",
        "additionalProperties": { "type": "string" },
        "default": {}
      },
      "appLabels": {
        "type": "object",
        "additionalProperties": { "type": "string" },
        "default": {}
      },
      "sideEffectPolicy": {
        "type": "string",
        "enum": ["always_confirm", "confirm_destructive", "never_confirm"],
        "default": "confirm_destructive"
      },
      "composio": {
        "type": "object",
        "properties": {
          "apiKey": { "type": "string" },
          "preferGooglesuper": { "type": "boolean", "default": true }
        }
      },
      "mcporter": {
        "type": "object",
        "properties": {
          "allowedServers": { "type": "array", "items": { "type": "string" }, "default": [] }
        }
      },
      "cli": {
        "type": "object",
        "properties": {
          "allowedBinaries": { "type": "array", "items": { "type": "string" }, "default": [] }
        }
      }
    }
  }
}
```

### Enterprise Customization Examples

| Need | Config |
|---|---|
| Only use Composio | `disabledAdapters: ["lobster", "cli", "mcporter"]` |
| Pin CRM to Composio | `capabilityPins: { "crm.*": "composio" }` |
| Prefer local CLI tools | `adapterOrder: ["cli", "composio", ...]` |
| Rename app labels | `appLabels: { "google_workspace": "Corporate Google" }` |
| Restrict MCP servers | `mcporter.allowedServers: ["ahrefs", "jira"]` |
| Restrict local binaries | `cli.allowedBinaries: ["pandoc", "jq"]` |
| Always confirm side effects | `sideEffectPolicy: "always_confirm"` |

### Pattern Matching for Capability Keys

Both `capabilityPins` in router config and `preferredApps` / `fallbackOverrides` in pack manifests support prefix-glob patterns using `*`. Matching rules:

- `crm.*` matches `crm.lookup_account`, `crm.create_note`, etc.
- `calendar.read_events` matches only that exact capability
- More specific patterns take precedence over broader ones
- Exact matches always win over globs

The router implements this as simple prefix matching: strip the trailing `*`, check if the capability ID starts with the prefix.

### Side-Effect Confirmation

Capabilities are classified as read or write via a `sideEffect` flag in the capability registry:

```ts
interface CapabilityEntry {
  id: CapabilityId;
  sideEffect: boolean;  // true for write operations (crm.create_note, mail.send_followup)
  adapters: AdapterId[];
}
```

When the router resolves a write capability, it checks the side-effect policy before executing:

```ts
const entry = registry.get(capabilityId);
if (entry.sideEffect && config.sideEffectPolicy !== "never_confirm") {
  const token = crypto.randomUUID();
  pendingConfirmations.set(token, { capabilityId, packId, args, adapterId, expiresAt: Date.now() + 300_000 });
  return {
    status: "blocked",
    data: {
      message: `About to create a note in ${resolvedApp}. Proceed?`,
      confirmationToken: token
    }
  };
}
```

The `capability_execute` tool accepts an optional `confirmationToken` parameter:

```ts
api.registerTool({
  name: "capability_execute",
  parameters: {
    capabilityId: { type: "string" },
    packId: { type: "string" },
    args: { type: "object" },
    confirmationToken: { type: "string", description: "Token from a prior blocked result, provided after user approval" }
  },
  handler: async ({ capabilityId, packId, args, confirmationToken }) => {
    if (confirmationToken) {
      return router.executeConfirmed(confirmationToken);
    }
    return router.resolve(capabilityId, packId, args);
  }
});
```

**Round-trip protocol:**
1. Skill calls `capability_execute` with a write capability
2. Router returns `status: "blocked"` with a `confirmationToken` and human-readable message
3. LLM presents the message to the user and asks for approval
4. User approves
5. LLM re-calls `capability_execute` with the same `capabilityId` plus the `confirmationToken`
6. Router validates the token (exists, not expired, matches capability), executes, and removes the token
7. Tokens expire after 5 minutes if unused

## Decisions Locked In

- All packages are native OpenClaw plugins. No compatible bundles.
- Router discovers packs by `@clawdi-ai/pack-*` naming convention + `pack-manifest.yaml`.
- Capability-first routing. Skills reference capability IDs, never providers.
- Composio is the preferred service connector.
- MCPorter is available but not central to UX.
- All five adapters ship in v1.
- Single `/connect_apps` onboarding command, pack-scoped and progressive.
- Automatic onboarding at point of need when a capability is not ready.
- All enterprise customization through router config, zero pack edits.
- Side-effect confirmation is policy-driven and configurable.

## Deferred to v2

- **Agent adapter.** Agent delegation introduces significant complexity (isolated workspaces, cross-agent messaging policy, session spawning). Deferred until the five core adapters are stable. When added, the agent adapter should only serve capabilities explicitly marked `agentic_allowed`, use `sessions_spawn` (not `sessions_send`), and delegate to dedicated worker agents that return drafts rather than perform final side effects.
- **Versioning strategy** for pack manifests and capability IDs. For v1, we treat the manifest schema and capability ID namespace as unstable. Versioning should be defined before the first breaking change.

## Open Questions for Implementation

- What initial set of capability IDs should the registry define? (We need a canonical list.)
- How should the Composio adapter discover available actions dynamically vs. using a static capability map?
- Should the router cache adapter readiness state, or check fresh on every resolve?
- What is the minimum Lobster workflow set for the sales pack?
- Verify that `api.getEnabledPlugins()` returns objects with an `installPath` property (or equivalent) for reading `pack-manifest.yaml`. If not, identify an alternative mechanism for locating pack files at runtime.
- Verify that `"skills": ["./skills"]` in the plugin manifest correctly resolves a directory of skill subdirectories. If OpenClaw expects individual skill paths, list them explicitly.
