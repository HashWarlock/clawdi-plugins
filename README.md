# Clawdi Knowledge Work Plugins

Modular knowledge-work plugins for OpenClaw with dynamic service discovery.

The system consists of a **router plugin** that discovers available services in your environment, and **pack plugins** that provide role-specific skills (sales, recruiting, marketing, etc.).

## Quick Start

1. Clone and install:

```bash
git clone <repo-url>
cd clawdi-plugins
pnpm install
```

2. Deploy to your OpenClaw extensions directory:

```bash
./scripts/deploy.sh /data/openclaw/extensions
```

This builds all packages, copies them with correct plugin ID directory names, and installs runtime dependencies.

3. Enable in your `openclaw.json`:

```json
{
  "plugins": {
    "knowledge-work-router": { "enabled": true },
    "pack-sales": { "enabled": true },
    "pack-productivity": { "enabled": true }
  }
}
```

4. Restart the agent and run `/connect_apps` to discover and connect services.

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

In `openclaw.json` (plugin IDs are **unscoped** — no `@clawdi-ai/` prefix):

```json
{
  "plugins": {
    "knowledge-work-router": { "enabled": true },
    "pack-sales": { "enabled": true },
    "pack-recruiting": { "enabled": false }
  }
}
```

### Router Config

```json
{
  "plugins": {
    "knowledge-work-router": {
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

The router also supports **filesystem-based pack discovery** — if the plugin API registry is unavailable, it scans `/data/openclaw/extensions/pack-*` for pack directories.

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
4. Add `openclaw.plugin.json` (use **unscoped** ID):

```json
{
  "id": "pack-yourpack",
  "name": "Your Pack",
  "description": "Description of your pack",
  "version": "0.1.0",
  "skills": ["./skills"]
}
```

5. Add `src/index.ts` to register slash commands. Command handlers return `{ text: "..." }`:

```ts
export function register(api: any) {
  api.registerCommand({
    name: "your_command",
    description: "Does something useful",
    handler: async () => {
      return { text: "Command output here" };
    },
  });
}
```

6. Add `tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"],
  "exclude": ["src/__tests__"]
}
```

7. Run `./scripts/deploy.sh` to deploy all plugins, or manually copy the built pack to `/data/openclaw/extensions/pack-yourpack` and run `npm install --omit=dev --ignore-scripts --legacy-peer-deps` if it has runtime dependencies. Enable in `openclaw.json`.

## Pack Manifest Reference

All fields for `pack-manifest.yaml`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `packId` | string | yes | Unique pack identifier |
| `displayName` | string | yes | Human-readable name |
| `capabilities.required` | string[] | yes | Capabilities the pack needs to function (keep minimal — only free/universally available) |
| `capabilities.optional` | string[] | yes | Capabilities that enhance the pack (paid integrations go here) |
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

## Deployment

### Deploy Script

The `scripts/deploy.sh` script automates deployment following OpenClaw conventions:

```bash
# On the remote machine
git clone <repo-url> /root/.openclaw/clawdi-plugins
cd /root/.openclaw/clawdi-plugins
pnpm install
./scripts/deploy.sh /data/openclaw/extensions
```

The script:
- Builds all packages
- Reads each plugin's `id` from `openclaw.plugin.json`
- Copies only deployment files (`dist/`, `package.json`, `openclaw.plugin.json`, `skills/`, `pack-manifest.yaml`)
- Installs runtime dependencies per-plugin (`npm install --omit=dev --ignore-scripts --legacy-peer-deps`)
- Safe to re-run — replaces each plugin directory on every run

To deploy a subset of packs, copy only the desired pack directories manually after building, or modify `plugins.allow` in `openclaw.json` to control which plugins load.

### Plugin ID Convention

OpenClaw uses **unscoped** plugin IDs. The directory name under `/data/openclaw/extensions/` should match the `id` field in `openclaw.plugin.json`:

```
/data/openclaw/extensions/
  knowledge-work-router/    → id: "knowledge-work-router"
  pack-sales/               → id: "pack-sales"
  pack-marketing/           → id: "pack-marketing"
```

## Development

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests
```

Monorepo layout:

    packages/
      router/           # Knowledge work router plugin (id: knowledge-work-router)
      pack-sales/       # Sales pack (id: pack-sales)
      pack-productivity/ # Productivity pack (id: pack-productivity)
      ...               # 8 more packs
    docs/
      superpowers/      # Specs and plans
