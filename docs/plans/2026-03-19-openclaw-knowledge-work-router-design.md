# OpenClaw-Compatible Knowledge Work Packs + Router Design

Date: 2026-03-19
Status: Validated design draft

## Problem

We want an OpenClaw-compatible version of Anthropic's `knowledge-work-plugins` that preserves the value of the original role packs while fitting OpenClaw's plugin, skill, bundle, workflow, and multi-agent model.

The design must satisfy these constraints:

- Preserve the job-function pack UX from the original repository.
- Avoid making the product feel MCP-centric.
- Prefer existing OpenClaw runtime surfaces over rebuilding backend systems.
- Support multiple backend types, including Composio, Lobster, local CLIs, native OpenClaw tools, and `mcporter`.
- Allow automatic fallback between adapters.
- Support pack-scoped onboarding rather than a single global setup flow.
- Work well in enterprise or team environments where predictability matters.

## Core Decision

The right architecture is not a pure bundle port and not a full native rewrite.

The recommended shape is:

1. Preserve each job-function pack as an OpenClaw-compatible bundle.
2. Add one separate native OpenClaw router plugin.
3. Let pack skills call capabilities, not providers.
4. Let the router resolve capabilities through an ordered adapter chain.
5. Keep onboarding and health checks in the native plugin.

This keeps the Anthropic-style pack UX portable while giving us native OpenClaw runtime control where bundle compatibility is not enough.

## Why This Shape

OpenClaw compatible bundles are strong enough to preserve the role-pack content model:

- `skills/` are loaded as skills.
- `commands/` are treated like skill content.
- compatible bundle metadata is recognized.
- compatible bundle settings can be mapped into OpenClaw's embedded Pi settings.

But compatible bundles do not give us enough runtime control for the connector problem:

- bundle-only ports do not give us native typed config schemas.
- Claude-specific `hooks/hooks.json` automation is not executed by OpenClaw.
- connector readiness, fallback policy, and onboarding logic need a native control plane.

That is why the router must be a native plugin, and it must live separately from the compatible bundles.

## Packaging Model

The repository should contain at least two kinds of package roots:

- role-pack bundle roots
- one native router plugin root

Recommended layout:

```text
packs/
  sales/
  productivity/
  recruiting/
plugins/
  knowledge-work-router/
docs/
  plans/
```

Important constraint:

- Do not place `openclaw.plugin.json` inside a compatible bundle root.
- If a package root contains `openclaw.plugin.json`, OpenClaw will treat it as a native plugin rather than a compatible bundle.

The native router plugin should therefore be a separate package, not a file added to a bundle root.

## User Experience Model

### Primary Mental Model

Users should think in terms of:

- role packs
- tasks
- apps they connect

Users should not need to think in terms of:

- MCP
- raw Composio tool slugs
- adapter internals
- backend routing

### User-Facing Commands

Recommended initial commands:

- `/connect_apps`
- `/check_setup`

`/connect_apps` is the single onboarding command across all packs. It should be pack-aware behind the scenes.

`/check_setup` is an optional status/debug command that reports missing connections, missing local tools, and any unresolved pack requirements.

We should avoid internal names like:

- `/kw_setup`
- `/connector_setup`
- `/configure_integrations`

The user-facing command should describe the user's goal, not the architecture.

## Pack Model

Each role pack remains the home of:

- role-specific skills
- prompt conventions
- task framing
- slash-command UX
- pack metadata

Each pack should describe:

- required capabilities
- optional capabilities
- preferred app labels
- provider preferences
- fallback allowances
- onboarding suggestions
- first-use workflow defaults

This should be stored in a pack-scoped setup manifest owned by the router plugin.

Examples:

- `sales`
- `productivity`
- `recruiting`

Pack-scoped onboarding matters because not every user will install or use every pack.

## Capability-First Design

The router should resolve capabilities, not providers.

Good capability examples:

- `calendar.read_events`
- `calendar.prepare_meeting_context`
- `mail.send_followup`
- `crm.lookup_account`
- `crm.create_note`
- `docs.create_brief`
- `research.collect_sources`

Bad API shape:

- `composio.salesforce.search_accounts`
- `mcporter.call_tool`
- `googlesuper.calendar.list`

Provider-first design would leak implementation details into pack UX and make future backend changes expensive.

Capability-first design keeps packs stable while backend options evolve.

## App Labels, Connector Paths, and Capability Slices

The system should track three separate concepts:

1. User-facing app label
2. Connector path
3. Capability slice

Example:

- user-facing app label: `Google Workspace`
- connector path: `composio.googlesuper`
- capability slice: `calendar.read_events`

This distinction matters because the user may think they are connecting "Google Calendar" when the actual best connector path is `googlesuper`, which also unlocks Gmail, Docs, Drive, and Sheets.

Recommended UI wording:

- `Connect Google Workspace`
- `Implemented via Googlesuper`
- `This enables Calendar, Gmail, Docs, and Drive workflows`

Toolkit names like `googlesuper` should appear as secondary labels, not the primary thing the user must understand.

## Router Responsibilities

The native router plugin owns:

- capability resolution
- adapter selection
- automatic fallback
- readiness checks
- onboarding handoff
- health checks
- result normalization
- error normalization
- side-effect policy enforcement
- app label presentation
- pack-scoped setup state

It should not own:

- reimplementing Composio
- reimplementing Lobster
- reimplementing `mcporter`
- reimplementing native OpenClaw tools
- reimplementing local CLIs

The router is a policy and orchestration layer, not a replacement backend.

## Adapter Layer

We should implement an adapter layer, not the underlying backend systems.

Each adapter should be a thin wrapper around an existing runtime surface.

Expected v1 adapters:

- `composio`
- `openclaw_tool`
- `lobster`
- `cli`
- `mcporter`

Possible later adapter:

- `agent`

### Adapter Contract

Adapters should implement a small typed contract so the router can work with them predictably.

Suggested contract:

```ts
type CapabilityId = string;
type PackId = string;

interface AdapterReadiness {
  ready: boolean;
  missingBins?: string[];
  missingEnv?: string[];
  missingConnections?: string[];
  suggestedApps?: string[];
  setupAction?: "connect" | "install" | "configure" | "none";
  notes?: string[];
}

interface AdapterResult {
  status: "ok" | "needs_setup" | "blocked" | "error";
  data?: unknown;
  artifacts?: Array<{
    kind: "file" | "link" | "text" | "structured";
    name?: string;
    mimeType?: string;
    path?: string;
    url?: string;
    value?: unknown;
  }>;
  sideEffects?: Array<{
    type: string;
    target?: string;
    confirmed: boolean;
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
  suggestSetup(input: {
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

The contract should stay intentionally small. Product-specific intelligence belongs in the capability registry and policy layer, not in backend-specific wrappers.

## Automatic Fallback Policy

Normal service execution should use this ordered chain:

1. `composio`
2. `openclaw_tool`
3. `lobster`
4. `cli`
5. `mcporter`

This order reflects the desired product feel:

- Composio is the preferred high-level service connector.
- Native OpenClaw tools should be used when a built-in tool directly satisfies the capability.
- Lobster should handle deterministic multi-step flows.
- Local CLIs should support advanced or local-only setups.
- Direct `mcporter` calls remain available as a fallback for MCP-shaped integrations without making the product MCP-centric.

Automatic fallback should stop when:

- a side effect requires confirmation
- a policy forbids the next adapter
- the capability is marked direct-only
- the capability is marked provider-pinned

## Composio Policy

Composio is the primary service connector path.

The pinned `composio` skill makes several policy decisions explicit:

- prefer Composio over service-specific skills unless the user asks otherwise
- search first rather than guessing tool names
- manage missing connections before execution
- avoid `COMPOSIO_REMOTE_BASH_TOOL`
- avoid `COMPOSIO_REMOTE_WORKBENCH`
- prefer `googlesuper` for Google services where possible
- confirm side-effecting actions before executing them

The router should absorb these rules rather than exposing raw Composio behavior to role skills.

That means:

- role skills do not call raw Composio slugs directly
- the router owns tool discovery and schema lookup
- the router owns connection checks and auth handoff
- Composio slugs should mainly appear in logs, admin views, or adapter internals

## Lobster Policy

Lobster is appropriate when the workflow is:

- deterministic
- multi-step
- approval-gated
- resumable
- known in advance

Examples:

- update a CRM record after a meeting summary is approved
- create a brief from fetched inputs and wait for final approval
- perform a multi-step sync with one structured result

Lobster should not be treated as the universal runtime for all work. It is best as a workflow adapter for known procedures.

## CLI Policy

The CLI adapter is for local tools that already exist in the user's environment or are easy to install.

The CLI adapter should:

- validate required binaries before first use
- normalize outputs into router result shapes
- expose clear installation guidance
- stay behind explicit policy and allowlists

This adapter is important for flexible enterprise setups where teams already rely on local tools.

## MCPorter Policy

`mcporter` should exist as a backend adapter, but not as the primary product framing.

Use it when:

- a capability is only available via an MCP-shaped integration
- Composio is not the right path
- an organization already has MCP tooling it wants to preserve

Do not expose raw MCP mechanics in normal pack UX unless the user is in an admin or debug flow.

## Agent Delegation Policy

Agent delegation should not be part of the normal automatic fallback chain for service work.

Why:

- OpenClaw agents are isolated brains with their own workspaces, sessions, skills, and policies.
- agent-to-agent messaging is explicitly gated and disabled by default
- cross-agent work introduces more latency and more policy complexity than direct tool execution

Recommended policy:

- agent delegation is disabled by default globally
- only capabilities marked `agentic_allowed` may use agents
- delegated work should use `sessions_spawn`, not `sessions_send`
- delegated agents should be dedicated worker agents, not arbitrary user agents
- delegated agents should return drafts, analysis, or plans rather than perform final side effects

This keeps enterprise behavior predictable and auditable.

## Onboarding Model

Onboarding should be:

- automatic when a requested capability cannot run
- pack-scoped
- progressive rather than fully front-loaded
- focused first on making the pack runnable

The single user-facing onboarding command is:

- `/connect_apps`

Behavior:

- detect the current pack context
- inspect required and optional capabilities for that pack
- check connection and tool readiness
- propose the broadest useful app first
- walk the user through connection or installation
- resume the original task when possible

If the exact requested app is unavailable, onboarding should suggest nearby supported alternatives instead of failing cold.

Example:

- a sales workflow needs calendar context
- the system cannot satisfy it yet
- the system offers `Google Workspace` first because it covers Calendar, Gmail, Docs, and Drive
- if Google is not an option, it may suggest Outlook or another supported app

## Workflow Setup UX

Workflow setup should be hybrid:

- core connectivity is established during onboarding
- only a few high-value defaults are captured early
- most workflow-specific tuning is deferred to first use

Good early defaults:

- preferred calendar source
- preferred CRM
- approval mode for side effects

Everything else should be captured lazily at the point of need.

Best-practice UX rule:

- infer when safe
- ask when choice matters
- explain only at decision points

The system should be silent for obvious, reversible defaults and explicit when saving a sticky preference or enabling a side-effecting path.

## Pack-Scoped Setup Manifest

Each pack should have a setup manifest consumed by the router.

Suggested contents:

```yaml
packId: sales
requiredCapabilities:
  - calendar.prepare_meeting_context
  - crm.lookup_account
optionalCapabilities:
  - docs.create_brief
preferredApps:
  calendar.prepare_meeting_context:
    - google_workspace
    - outlook
fallbackPolicy:
  calendar.prepare_meeting_context:
    adapters:
      - composio
      - openclaw_tool
      - lobster
      - cli
      - mcporter
workflowDefaults:
  approvalMode:
    type: enum
    values: [always, side_effects_only]
    default: side_effects_only
```

This manifest is the pack-to-router contract.

## Configuration and Customization

The system must be easy to customize for different work environments.

That flexibility should come from policy/config, not from editing role skills.

Admins or advanced users should be able to:

- disable adapters
- reorder adapter preference
- pin a capability to a specific adapter
- rename or override preferred app labels
- add org-specific onboarding notes
- mark capabilities as direct-only or agentic-allowed

This makes the design reactive to different user setups without making the skill layer unstable.

## Error Handling and Result Normalization

All adapters should normalize into a common result shape.

The router should distinguish at least these outcomes:

- `ok`
- `needs_setup`
- `blocked`
- `error`

Reasons to return `needs_setup`:

- missing OAuth connection
- missing binary
- missing env/config
- missing required pack preference

Reasons to return `blocked`:

- side effect needs explicit confirmation
- policy forbids this adapter
- capability is unsupported in current workspace

This result model lets pack skills stay simple and backend-agnostic.

## Security and Enterprise Considerations

Recommended baseline for enterprise use:

- pack-scoped onboarding rather than one global setup wizard
- direct adapters first, agent delegation only by explicit capability policy
- confirmation before side effects
- least-privilege adapter enablement where possible
- auditable setup and execution logs
- explicit fallback ordering that can be overridden by policy

The design should optimize for predictability before cleverness.

## Initial Implementation Direction

Phase 1:

- create pack-compatible bundle skeletons
- create native router plugin skeleton
- define capability registry format
- define pack setup manifest format
- implement `composio`, `openclaw_tool`, and `lobster` adapters
- implement `/connect_apps`
- implement `/check_setup`

Phase 2:

- add `cli` adapter
- add `mcporter` fallback adapter
- add result normalization for files and remote downloads
- add first-use preference capture

Phase 3:

- add policy overrides for enterprise customization
- add controlled `agent` adapter for explicitly agentic capabilities
- add richer admin/debug surfaces

## Decisions Locked In

- Use a hybrid architecture: compatible bundles plus one native router plugin.
- Keep the native router plugin separate from bundle roots.
- Use capability-first routing rather than provider-first routing.
- Make Composio the preferred service connector path.
- Keep `mcporter` available but not central to UX.
- Use a single `/connect_apps` onboarding command.
- Make onboarding automatic and pack-scoped.
- Suggest other supported apps when the exact app is unavailable.
- Prefer user-facing labels like `Google Workspace` over raw toolkit names.
- Allow automatic fallback between adapters.
- Do not include agent delegation in the normal automatic fallback chain.
- Enable agent delegation only per capability, disabled by default.

## Open Questions For Implementation

- What exact file format should the capability registry use inside the native plugin?
- Should pack setup manifests live inside the bundle roots or inside the router plugin package?
- How should the router persist pack-scoped setup state across workspaces and agents?
- What is the minimum useful admin/debug surface for adapter inspection in v1?
- Which initial packs should ship first: `sales`, `productivity`, both, or a narrower pilot subset?

## References

- OpenClaw Concepts Architecture: https://docs.openclaw.ai/concepts/architecture
- OpenClaw Plugin Architecture: https://docs.openclaw.ai/plugins/architecture
- OpenClaw Building Extensions: https://docs.openclaw.ai/plugins/building-extensions
- OpenClaw Plugin Bundles: https://docs.openclaw.ai/plugins/bundles
- OpenClaw Plugin Manifest: https://docs.openclaw.ai/plugins/manifest
- OpenClaw Plugins Tooling: https://docs.openclaw.ai/tools/plugin
- OpenClaw Skills: https://docs.openclaw.ai/tools/skills
- OpenClaw Slash Commands: https://docs.openclaw.ai/tools/slash-commands
- OpenClaw Automation Hooks: https://docs.openclaw.ai/automation/hooks
- OpenClaw Lobster: https://docs.openclaw.ai/tools/lobster
- OpenClaw ACP Agents: https://docs.openclaw.ai/tools/acp-agents
- OpenClaw Multi-Agent: https://docs.openclaw.ai/concepts/multi-agent
- OpenClaw Session Tools: https://docs.openclaw.ai/concepts/session-tool
- Anthropic Knowledge Work Plugins: https://github.com/anthropics/knowledge-work-plugins
- OpenClaw Composio Skill (pinned): https://raw.githubusercontent.com/Clawdi-AI/openclaw/12d967ae906fc1fbb0acf2b0f43563c8873cddab/skills/composio/SKILL.md
