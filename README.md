# Clawdi Knowledge Work Plugins

Modular knowledge-work plugins for OpenClaw with dynamic service discovery.

The system consists of a **router plugin** that discovers available services in your environment, and **pack plugins** that provide role-specific skills (sales, recruiting, marketing, etc.).

## Quick Start

1. Clone and build:

```bash
git clone <repo-url>
cd clawdi-plugins
pnpm install
pnpm build
```

2. Enable the router and your desired packs in `openclaw.json`:

```json
{
  "plugins": {
    "@clawdi-ai/knowledge-work-router": { "enabled": true },
    "@clawdi-ai/pack-sales": { "enabled": true },
    "@clawdi-ai/pack-productivity": { "enabled": true }
  }
}
```

3. Run `/connect_apps` to discover and connect services.

## Available Packs

| Pack | Skills | What It Does |
|------|--------|-------------|
| sales | 8 | Meeting prep, CRM updates, follow-ups, research |
| productivity | 4 | Calendar management, task tracking, email triage |
| recruiting | 4 | Pipeline management, interview prep, offers |
| marketing | 8 | Campaign planning, SEO, content, analytics |
| operations | 9 | Process management, reporting, documentation |
| customer-support | 5 | Ticket triage, knowledge base, escalation |
| engineering | 6 | Sprint planning, code review prep, incident response |
| enterprise-search | 4 | Cross-system search, knowledge retrieval |
| human-resources | 7 | Reviews, comp analysis, onboarding, policy |
| product-management | 8 | Roadmap, specs, user research, metrics |

**Total: 63 skills across 10 packs**

## Connecting Services

Run `/connect_apps` to see what services are available in your environment:

```
/connect_apps
```

The router dynamically discovers services from:
- **Composio** — SaaS integrations (Google Workspace, HubSpot, Slack, etc.)
- **Built-in OpenClaw tools** — Native tools (web_search, read_file, etc.)
- **Lobster workflows** — Multi-step orchestrated flows
- **CLI tools** — Local binaries (pandoc, jq, etc.)
- **MCP servers** — Any configured MCP server tools

No hardcoded service list — the router adapts to whatever you have connected.

## Configuration

### Plugin Enable/Disable

In `openclaw.json`:

```json
{
  "plugins": {
    "@clawdi-ai/knowledge-work-router": { "enabled": true },
    "@clawdi-ai/pack-sales": { "enabled": true },
    "@clawdi-ai/pack-recruiting": { "enabled": false }
  }
}
```

### Router Config

```json
{
  "plugins": {
    "@clawdi-ai/knowledge-work-router": {
      "enabled": true,
      "config": {
        "adapterOrder": ["composio", "openclaw_tool", "lobster", "cli", "mcporter"],
        "disabledAdapters": [],
        "sideEffectPolicy": "confirm_destructive",
        "cacheTtl": 600000,
        "capabilityPins": {
          "seo.*": "mcporter"
        },
        "cliMappings": {
          "docs.convert_*": "pandoc",
          "data.query_*": "jq"
        }
      }
    }
  }
}
```

| Field | Description | Default |
|-------|-------------|---------|
| `adapterOrder` | Fallback order for adapter probing | All 5 in order |
| `disabledAdapters` | Adapters to skip entirely | `[]` |
| `sideEffectPolicy` | `always_confirm`, `confirm_destructive`, `never_confirm` | `confirm_destructive` |
| `cacheTtl` | Discovery cache TTL in ms | `600000` (10 min) |
| `capabilityPins` | Pin capabilities to specific adapters | `{}` |
| `cliMappings` | Map capability patterns to CLI binaries | `{}` |

## Checking Status

```
/check_setup
```

Shows the status of all capabilities across all installed packs, which adapter resolves each one, and which adapters are enabled.

---

## Architecture

```
Pack Skill → capability_execute tool
                    ↓
               Router.resolve()
                    ↓
          DiscoveryEngine.resolve()
                    ↓
      Probe adapters in fallback order:
        Composio → OpenClaw Tool → Lobster → CLI → MCPorter
                    ↓
           Cache result, execute via adapter
```

The **DiscoveryEngine** probes each adapter asking "can you handle this capability?" Adapters search their runtime (Composio's search API, MCP server tool lists, built-in tool names, Lobster workflow registry, PATH binaries) and return a probe result or null.

## Creating a Pack

1. Create directory: `packages/pack-yourpack/`
2. Add `pack-manifest.yaml`:

```yaml
packId: yourpack
displayName: "Your Pack"
capabilities:
  required:
    - calendar.read_events
  optional:
    - docs.create_brief
preferredApps:
  calendar.*:
    - google_workspace
onboarding:
  welcomeMessage: "Your pack is ready."
  suggestedFirstTask: "Try: 'do something cool'"
```

3. Add skills in `skills/your-skill/SKILL.md`
4. Add `openclaw.plugin.json`:

```json
{
  "id": "@clawdi-ai/pack-yourpack",
  "name": "Your Pack",
  "description": "Description of your pack",
  "version": "0.1.0",
  "skills": ["./skills"]
}
```

5. Add `src/index.ts` to register slash commands
6. Enable in `openclaw.json`

## Pack Manifest Reference

All fields for `pack-manifest.yaml`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `packId` | string | yes | Unique pack identifier |
| `displayName` | string | yes | Human-readable name |
| `capabilities.required` | string[] | yes | Capabilities the pack needs to function |
| `capabilities.optional` | string[] | yes | Capabilities that enhance the pack |
| `preferredApps` | Record\<pattern, string[]\> | no | Preferred app/toolkit per capability pattern |
| `fallbackOverrides` | Record\<pattern, {adapters}\> | no | Override adapter order for specific capabilities |
| `preferences` | Record\<string, PackPreference\> | no | User-configurable preferences captured at first use or onboarding |
| `sideEffects` | string[] | no | Capabilities that should always be treated as side-effects |
| `onboarding.welcomeMessage` | string | yes | Shown when pack is first activated |
| `onboarding.suggestedFirstTask` | string | yes | Suggested prompt to try |

## How Discovery Works

Each adapter implements `probe()` and `execute()`:

- **Composio**: Calls `COMPOSIO_SEARCH_TOOLS` with the capability's intent string. Returns the best matching toolkit and action.
- **OpenClaw Tool**: Matches the capability's `verb_noun` against built-in tool names. Exact match only.
- **Lobster**: Matches capabilities with `_workflow` suffix against registered Lobster workflows.
- **CLI**: Checks `cliMappings` config for pattern match, then verifies binary exists via `which`.
- **MCPorter**: Scans all configured MCP server tool lists for keyword matches.

Results are cached for 10 minutes (configurable). Cache is invalidated on execution failure.

## Adding an Adapter

To add a new adapter:

1. Create `src/adapters/your-adapter.ts` implementing `CapabilityAdapter`:

    - `probe(capabilityId, intent, hints?)` — return a `ProbeResult` if you can handle this capability, or `null`
    - `execute(capabilityId, providerDetails, args, packId)` — run the capability using the details from your probe result

2. Register it in `src/index.ts` — add to the `adapters` array
3. Add its ID to the `adapterOrder` enum in `openclaw.plugin.json`
4. Write tests in `src/__tests__/your-adapter.test.ts`

The `probe()` method should be fast (no side-effects, <5s). Return `connectionReady: false` with a `setupHint` if the service needs configuration.

## Development

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm --filter @clawdi-ai/knowledge-work-router test  # Router tests only
```

Monorepo layout:

    packages/
      router/           # Knowledge work router plugin
      pack-sales/       # Sales pack
      pack-productivity/ # Productivity pack
      ...               # 8 more packs
    docs/
      superpowers/      # Specs and plans
