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

The router discovers providers at startup via six scanners:
- **Built-in OpenClaw tools** — Native tools (web_search, read_file, etc.)
- **Composio** — SaaS integrations (Google Workspace, HubSpot, Slack, etc.)
- **MCP servers** — Any configured MCP server tools
- **CLI tools** — Local binaries (pandoc, jq, etc.)
- **Lobster workflows** — Multi-step orchestrated flows
- **Skills** — Pack skills that declare `metadata.router.provides.capabilities` in SKILL.md frontmatter

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
        "sideEffectPolicy": "confirm_destructive",
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
| `sideEffectPolicy` | `always_confirm`, `confirm_destructive`, `never_confirm` | `confirm_destructive` |
| `cliMappings` | Map capability patterns to CLI binaries | `{}` |

## Checking Status

```
/check_setup
```

Shows the status of all capabilities across all installed packs, which provider resolves each one, and which scanner sources are active.

---

## Architecture

```
Startup (gateway_start):
  For each pack:
    Load capabilities.yaml (pack contract)
    Load pack-manifest.yaml (onboarding metadata)
    Run 6 scanners in parallel → ProviderEntry[]
    Populate registry: Map<CapabilityId, ProviderEntry[]>

Runtime (capability_execute tool call):
  Pack Skill → capability_execute { packId, capabilityId, args }
                      ↓
                 resolve()
                      ↓
         Registry lookup → sort by preferredProviders
                      ↓
         Side-effect check (from contract, not verb parsing)
                      ↓
         executeTarget() — exhaustive switch on ProviderTarget.kind
```

At startup, the router loads each pack's `capabilities.yaml` contract and runs all six scanners in parallel to discover available providers. Results are stored in a registry map. At runtime, `resolve()` does a map lookup, sorts by the pack's `preferredProviders`, checks the capability's declared `sideEffect`, and dispatches to the chosen provider.

The router also supports **filesystem-based pack discovery** — if the plugin API registry is unavailable, it scans `/data/openclaw/extensions/pack-*` for pack directories.

## Creating a Pack

1. Create directory: `packages/pack-yourpack/`
2. Add `capabilities.yaml` (the router contract):

```yaml
packId: yourpack
version: "1"

capabilities:
  - id: calendar.read_events
    required: true
    sideEffect: read
  - id: docs.create_brief
    required: false
    sideEffect: write

preferredProviders:
  calendar.*:
    - google_workspace
```

Side-effect classification:
- `read` — lookup, search, list, get, audit operations
- `write` — create, send, update operations
- `destructive` — delete, revoke, destroy operations

3. Add `pack-manifest.yaml` (onboarding metadata):

```yaml
packId: yourpack
displayName: "Your Pack"
onboarding:
  welcomeMessage: "Your pack is ready."
  suggestedFirstTask: "Try: 'do something cool'"
```

4. Add skills in `skills/your-skill/SKILL.md`
5. Add `openclaw.plugin.json` (use **unscoped** ID):

```json
{
  "id": "pack-yourpack",
  "name": "Your Pack",
  "description": "Description of your pack",
  "version": "0.1.0",
  "skills": ["./skills"]
}
```

6. Add `src/index.ts` to register slash commands. Command handlers return `{ text: "..." }`:

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

7. Add `tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"],
  "exclude": ["src/__tests__"]
}
```

8. Run `./scripts/deploy.sh` to deploy all plugins, or manually copy the built pack to `/data/openclaw/extensions/pack-yourpack` and run `npm install --omit=dev --ignore-scripts --legacy-peer-deps` if it has runtime dependencies. Enable in `openclaw.json`.

## Pack Contract Reference

### `capabilities.yaml` (router contract)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `packId` | string | yes | Unique pack identifier (must match `pack-manifest.yaml`) |
| `version` | string | yes | Contract version (currently `"1"`) |
| `capabilities` | array | yes | Non-empty list of capability declarations |
| `capabilities[].id` | string | yes | Capability ID (e.g. `calendar.read_events`) |
| `capabilities[].required` | boolean | yes | Whether the pack needs this to function |
| `capabilities[].sideEffect` | string | yes | `read`, `write`, or `destructive` |
| `preferredProviders` | Record\<pattern, string[]\> | no | Preferred provider per capability pattern (e.g. `crm.*: [salesforce, hubspot]`) |

### `pack-manifest.yaml` (onboarding metadata)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `packId` | string | yes | Unique pack identifier |
| `displayName` | string | yes | Human-readable name |
| `preferences` | Record\<string, PackPreference\> | no | User-configurable preferences captured at first use or onboarding |
| `onboarding.welcomeMessage` | string | yes | Shown when pack is first activated |
| `onboarding.suggestedFirstTask` | string | yes | Suggested prompt to try |

The router reads `capabilities.yaml` for resolution logic and `pack-manifest.yaml` for display names and onboarding. Both files are required.

## How Discovery Works

Six scanner functions run at startup, each returning `ProviderEntry[]`:

- **`scanBuiltins`**: Strips the domain prefix from each capability ID (e.g. `research.web_search` → `web_search`) and matches against `listBuiltinTools()`.
- **`scanComposio`**: Calls `COMPOSIO_SEARCH_TOOLS` via the `clawdi-mcp` server with the capability's intent string. Honors `preferredProviders` when multiple toolkits match. Checks connection status via `toolkit_connection_statuses` and fetches OAuth setup URLs for unconnected toolkits.
- **`scanMcpServers`**: Lists all configured MCP servers and their tools. Matches capability intent keywords against tool names and descriptions.
- **`scanCliMappings`**: Pattern-matches capabilities against the `cliMappings` config, then verifies the binary exists via `which`.
- **`scanLobster`**: Only matches capabilities ending in `_workflow`. Converts underscore-separated names to hyphen-case and searches registered Lobster workflow IDs.
- **`scanSkills`**: Reads `SKILL.md` frontmatter in pack skill directories. Skills that declare `metadata.router.provides.capabilities` are registered as providers. Checks binary and environment variable requirements before marking as ready.

All scanners run in parallel via `Promise.all`. Results are stored in the registry for the lifetime of the process.

## Adding a Scanner

To add a new provider source:

1. Add a scanner function in `src/scanners.ts`:

    - Takes `capabilities: PackCapability[]` and any source-specific args
    - Returns `ProviderEntry[]` with the appropriate `source` and `target.kind`
    - Wraps external calls in try/catch, returning `[]` on failure

2. Add the new `target.kind` to the `ProviderTarget` union in `src/types.ts`
3. Add a case to the `executeTarget` switch in `src/resolve.ts`
4. Add the scanner call to `runAllScanners` in `src/scanners.ts`
5. Write tests in `src/__tests__/scanners.test.ts`

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
- Copies only deployment files (`dist/`, `package.json`, `openclaw.plugin.json`, `skills/`, `pack-manifest.yaml`, `capabilities.yaml`)
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
