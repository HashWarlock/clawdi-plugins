# Dynamic Discovery Refactor Design

Date: 2026-03-20
Status: Validated design draft
Supersedes: Hardcoded adapter mappings in `packages/router/src/adapters/*.ts` and `KNOWN_CAPABILITIES` in `router.ts`

## Problem

The current router has 35 hardcoded capability-to-provider mappings across 5 adapters (178 LOC of static data). This forces specific services on users — for example, `calendar.read_events` is permanently wired to `GOOGLESUPER_LIST_EVENTS` even if the user uses Outlook or has a different calendar tool connected.

Meanwhile, the runtime environment already supports dynamic discovery:

- Composio provides `COMPOSIO_SEARCH_TOOLS` — a use-case intent search returning ranked tool slugs, connection statuses, and schemas
- OpenClaw exposes built-in tools at runtime
- MCPorter can scan configured MCP servers and their exposed tools
- Local CLIs can be detected on PATH
- Lobster workflows can be queried at runtime

The router should use these discovery mechanisms instead of maintaining a parallel static mapping that must be manually updated for every new service.

## Goals

1. Eliminate all hardcoded capability-to-provider mappings
2. Discover available services dynamically from the user's actual environment
3. Reduce router code by ~50% (from ~1,382 to ~700 LOC)
4. Make the system self-healing — when services are added, connected, or removed, the router adapts without code changes
5. Add a README documenting installation, usage, and extension for both deployers and developers

## Non-Goals

- Changing the pack manifest format (packs still declare capability IDs)
- Changing the skill content (SKILL.md files stay the same)
- Changing the `capability_execute` tool interface
- Adding new adapters beyond the existing 5

## Architecture

### Before (Current)

```
Router.KNOWN_CAPABILITIES (35 static entries)
     ↓
CapabilityRegistry (static map)
     ↓
FallbackResolver → Adapter.CAPABILITY_MAP (hardcoded per adapter)
     ↓
Execute
```

### After (Refactored)

```
Router.resolve(capabilityId)
     ↓
DiscoveryEngine.resolve(capabilityId)
     ↓ cache miss?
Probe adapters in fallback order:
  adapter.probe(capabilityId, intent) → ProbeResult | null
     ↓ cache hit
Execute via adapter.execute(capabilityId, providerDetails, args)
```

The DiscoveryEngine is the single new component. It replaces the CapabilityRegistry, FallbackResolver, all adapter mapping tables, and the APP_COVERAGE onboarding map.

## DiscoveryEngine

### Responsibilities

- Accept a capability ID (e.g., `calendar.read_events`)
- Convert the ID to a search intent string (`"read events"` with domain hint `"calendar"`)
- Probe adapters in fallback order, asking each "can you handle this?"
- Cache successful resolutions with configurable TTL (default 10 minutes)
- Invalidate cache entries on failed execution (service disconnected)
- Expose `invalidate(capabilityId)` for manual refresh
- Expose `probeAll(capabilityId)` for onboarding (returns results from ALL adapters, not just first match)

### Cache Entry

```ts
interface CacheEntry {
  adapterId: string;
  providerDetails: unknown;
  resolvedAt: number;
  ttl: number;
}
```

### Intent Extraction

Capability IDs follow the `domain.verb_noun` pattern. The engine extracts a search intent:

- `calendar.read_events` → intent: `"read events"`, domain: `"calendar"`
- `crm.lookup_account` → intent: `"lookup account"`, domain: `"crm"`
- `mail.send_followup` → intent: `"send followup"`, domain: `"mail"`

The intent string is passed to adapters that support semantic search (Composio). Adapters that match structurally (OpenClaw tools, CLI) use the capability ID directly.

### Resolution Flow

The DiscoveryEngine replaces both the CapabilityRegistry and FallbackResolver. It owns adapter ordering, probing, caching, and first-match selection — the same responsibilities FallbackResolver had, but driven by dynamic probes instead of static maps.

```
resolve(capabilityId, packId):
  1. Check capability pins (from router config) — if pinned, probe only that adapter
  2. Check cache — if valid entry exists and not expired, return it
  3. Look up packManifest from registered packs by packId (stored during gateway_start discovery)
  4. Check pack fallbackOverrides — if present, use that adapter order
  5. Check pack preferredApps — if present, pass as hint to Composio probe
  6. Extract intent from capabilityId
  7. For each adapter in fallback order (with per-probe timeout of 5 seconds):
     a. Call adapter.probe(capabilityId, intent, hints?)
     b. If probe returns non-null with connectionReady=true → cache and return
     c. If probe returns non-null with connectionReady=false → store as fallback
  8. If no ready adapter found but fallback exists → return with needs_setup status
  9. If nothing found → return null
```

**Cache validation at execution time:** When the Router calls `execute()`, it first checks if the cached entry has expired. If so, it re-probes before executing. This prevents stale cache entries from causing failures for long-running sessions.

**Error handling in probes:** If an adapter's `probe()` throws or times out (5-second limit), the engine logs a warning and skips to the next adapter. A Composio API outage does not block resolution — the engine falls through to OpenClaw tools, MCPorter, etc.

## Adapter Interface

All 5 adapters implement this interface:

```ts
interface ProbeHints {
  preferredApps?: string[];    // from pack manifest preferredApps
  domain?: string;             // extracted domain hint (e.g., "calendar")
}

interface ProbeResult {
  adapterId: string;
  providerDetails: unknown;    // adapter-specific execution context
  connectionReady: boolean;    // can execute right now?
  displayName: string;         // human-readable: "Google Workspace", "pandoc", etc.
  setupHint?: string;          // "Connect via OAuth", "install pandoc", etc.
  setupUrl?: string;           // OAuth redirect URL if applicable
}

interface CapabilityAdapter {
  id: string;
  probe(capabilityId: string, intent: string, hints?: ProbeHints): Promise<ProbeResult | null>;
  execute(
    capabilityId: string,
    providerDetails: unknown,
    args: Record<string, unknown>,
    packId: string
  ): Promise<AdapterResult>;
}
```

Key changes from current interface:
- `providesCapabilities()` is removed — adapters no longer declare a static list
- `checkReadiness()` is folded into `probe()` — readiness is checked during discovery
- `probe()` returns `null` if the adapter cannot handle the capability
- `probe()` accepts optional `hints` (preferred apps from pack manifest, domain context)
- `execute()` receives `packId` for pack-scoped behavior (preferences, logging)
- `confidence` field removed — resolution uses first-match-wins in fallback order, which is simpler and more predictable than confidence ranking

### Composio Adapter (~40 LOC)

- `probe()`: Calls `COMPOSIO_SEARCH_TOOLS` via the OpenClaw Composio MCP integration with `queries=[{"use_case": intent}]`
- **Transport:** Uses `mcporter call clawdi-mcp.COMPOSIO_SEARCH_TOOLS` — this is OpenClaw's built-in Composio MCP server, NOT the MCPorter adapter. Composio's MCP server is always available if the Composio plugin is installed, independent of whether the `mcporter` adapter is enabled.
- **Response parsing:** `COMPOSIO_SEARCH_TOOLS` returns `{ primary_tool_slugs, related_tool_slugs, toolkit_connection_statuses, tool_schemas }`. The adapter uses `primary_tool_slugs[0]` as the action and `toolkit_connection_statuses` to check if the toolkit has an active connection.
- `providerDetails`: `{ toolkit: string, action: string }`
- `execute()`: Calls `COMPOSIO_MULTI_EXECUTE_TOOL` with the discovered slug
- `displayName`: Derived from toolkit name (e.g., `googlesuper` → "Google Workspace")
- If not connected: calls `COMPOSIO_MANAGE_CONNECTIONS` with `toolkits=[toolkit]` to get OAuth `redirect_url`, stores as `setupUrl`
- If `hints.preferredApps` is set, the adapter filters Composio results to prefer those toolkits
- **Error handling:** If Composio search fails (network error, timeout), `probe()` returns `null` — does not throw

### OpenClaw Tool Adapter (~30 LOC)

- `probe()`: Matches capability ID against the list of built-in OpenClaw tools
- **Matching strategy:** Extract the `verb_noun` portion of the capability ID (after the dot), check if it exactly matches a built-in tool name. For example: `research.web_search` → matches `web_search`, `docs.read_file` → matches `read_file`. If no exact match, returns `null`.
- `providerDetails`: `{ toolName: string }`
- `execute()`: Calls the native OpenClaw tool directly
- Always `connectionReady: true` (built-in tools are always available)
- **No fuzzy matching.** Only exact tool name matches. This keeps the adapter predictable and fast (no network calls).

### Lobster Adapter (~30 LOC)

- `probe()`: Queries available Lobster workflows via runtime API or config
- **Matching strategy:** Only matches capabilities where the ID ends with `_workflow` (e.g., `crm.create_note_workflow`, `recruiting.offer_workflow`). Strips the `_workflow` suffix and the domain prefix, then checks if a Lobster workflow with a matching ID exists. This convention keeps Lobster for multi-step orchestrated flows, not simple lookups.
- Note: capabilities like `mail.send_sequence` that are conceptually workflow-like but lack the `_workflow` suffix will NOT match Lobster's `probe()`. If they should use Lobster, the pack manifest should use a `_workflow` suffixed capability ID.
- **Exception:** If a capability is explicitly pinned to Lobster via `capabilityPins` or `fallbackOverrides`, the Lobster adapter skips the `_workflow` suffix check and probes by workflow name matching instead.
- `providerDetails`: `{ workflowId: string }`
- `execute()`: Triggers the Lobster workflow
- `connectionReady` depends on whether the workflow is registered

### CLI Adapter (~35 LOC)

- `probe()`: Checks if a relevant binary exists on PATH (using `which`)
- **Matching strategy:** The router config includes a `cliMappings` object that maps capability patterns to binaries:
  ```json
  "cliMappings": {
    "docs.convert_*": "pandoc",
    "data.query_*": "jq"
  }
  ```
  The adapter checks if the capability ID matches any pattern in `cliMappings`, then verifies the binary exists on PATH. No heuristic guessing — the admin explicitly declares which capabilities map to which CLI tools.
- `providerDetails`: `{ bin: string }`
- `execute()`: Spawns the CLI process with args from the capability_execute call
- `connectionReady`: `true` if binary exists on PATH, `false` if not (with `setupHint: "install [binary]"`)
- CLI adapter is last in default fallback order — only used when no other adapter matches

### MCPorter Adapter (~35 LOC)

- `probe()`: Scans configured MCP servers and their exposed tool lists
- **Matching strategy:** Iterates over all configured MCP servers, requests their tool list, and checks if any tool name contains keywords from the capability's intent string. For example, intent `"audit page"` would match a tool named `site_audit` on an `ahrefs` server. Uses simple substring matching on tool names and descriptions.
- `providerDetails`: `{ server: string, tool: string }`
- `execute()`: Calls `mcporter call server.tool` with the args
- Uses whatever MCP servers the user has configured — no hardcoded server list
- `connectionReady` depends on whether the server is responding
- **Error handling:** If an MCP server is unreachable, skip it and try the next server. Log a warning.

## Side-Effect Detection

Currently, side-effects are hardcoded per capability in `KNOWN_CAPABILITIES`. With dynamic discovery, the router determines side-effects through:

### Convention-Based Inference

Capability IDs containing these verbs are treated as side-effects by default:

- `create`, `send`, `update`, `delete`, `write`, `post`, `remove`, `modify`

Additional write-like verbs also treated as side-effects:

- `archive`, `approve`, `reject`, `cancel`, `close`, `merge`, `assign`, `move`

Read-like verbs are safe by default:

- `read`, `get`, `list`, `search`, `lookup`, `fetch`, `query`, `audit`, `collect`

**Unlisted verbs default to safe** (no side-effect). Packs should use the `sideEffects` manifest field for any capability with an ambiguous or unlisted verb.

### Pack Manifest Override

Packs can explicitly declare side-effect capabilities in `pack-manifest.yaml`:

```yaml
sideEffects:
  - crm.create_note
  - mail.send_followup
  - ats.update_candidate_stage
```

This overrides the convention. A capability listed in `sideEffects` is always treated as a side-effect. A capability NOT listed follows the naming convention.

### SideEffectGuard Changes

The guard's `check()` method changes from looking up a registry entry to:

1. Check pack manifest `sideEffects` list → if listed, it's a side-effect
2. Check capability ID against verb conventions → infer
3. Apply the configured policy (`always_confirm`, `confirm_destructive`, `never_confirm`)

## Onboarding Changes

### /connect_apps

Probes ALL adapters for ALL pack capabilities, not just Composio:

1. Read pack's `pack-manifest.yaml` for required/optional capabilities
2. Call `DiscoveryEngine.probeAll(capabilityId)` for each capability
3. Group results by status across all adapters:

```
✅ Ready
  calendar.read_events → Google Workspace (via Composio)
  research.web_search → web_search (built-in OpenClaw tool)
  seo.audit_page → ahrefs (via MCP server)
  docs.convert_format → pandoc (local CLI)

⚠️ Available — needs setup
  crm.lookup_account → HubSpot (via Composio) — Connect: [OAuth URL]
  analytics.get_metrics → google-analytics (MCP server not running)
  data.process_csv → csvkit (CLI not installed — run: pip install csvkit)

❌ No provider found
  compensation.get_benchmarks — no adapter can handle this yet
```

4. For Composio results: show OAuth URL
5. For MCPorter results: show "start server" or "add to config" guidance
6. For CLI results: show install command
7. Suggest broadest connections first (Composio toolkit that covers most unready capabilities)

### /check_setup

Same probe-all approach. Shows full environment state with adapter attribution.

### probeAll Performance

`/connect_apps` probes all adapters for all pack capabilities. With 10 packs and ~6 capabilities each, this could mean ~300 probe calls. Mitigation:

1. **Parallel probing per capability:** All 5 adapters are probed concurrently for each capability (Promise.all)
2. **Batch Composio searches:** Group all capability intents into a single `COMPOSIO_SEARCH_TOOLS` call with multiple queries (the API supports `queries: [{use_case: ...}, ...]` array)
3. **Cache warming:** probeAll results populate the discovery cache, so subsequent `resolve()` calls are instant
4. **Non-blocking adapters go first:** OpenClaw tool and CLI adapters do local-only checks (no network), so they resolve in <1ms. Composio and MCPorter are the only network-bound probes.

Expected total time for `/connect_apps`: 1-3 seconds (dominated by a single batched Composio search + one MCPorter server scan).

### APP_COVERAGE Deleted

The hardcoded `APP_COVERAGE` map in `app-grouping.ts` is deleted. Composio's search response already groups capabilities by toolkit. The `suggestBroadestApps()` algorithm is replaced by grouping probe results by toolkit/provider.

## Files Changed

### Deleted (4 files)

| File | Reason |
|------|--------|
| `src/capabilities/registry.ts` | Replaced by DiscoveryEngine cache |
| `src/capabilities/pattern.ts` | Capability pin matching moves into DiscoveryEngine |
| `src/policy/fallback.ts` | Replaced by DiscoveryEngine (which now owns adapter ordering, probing, and first-match selection) |
| `src/onboarding/app-grouping.ts` | Replaced by probe result grouping |

### New (2 files)

| File | Purpose |
|------|---------|
| `src/discovery/engine.ts` | DiscoveryEngine — probing, caching, resolution, fallback ordering |
| `src/discovery/intent.ts` | Capability ID → search intent conversion |

### New (monorepo root)

| File | Purpose |
|------|---------|
| `README.md` | Installation, usage, extension guide (at `clawdi-plugins/README.md`) |

### Rewritten from scratch (5 adapter files, much smaller)

These files are deleted and recreated with entirely new implementations:

| File | New LOC | Was |
|------|---------|-----|
| `src/adapters/composio.ts` | ~40 | 125 |
| `src/adapters/openclaw-tool.ts` | ~30 | 74 |
| `src/adapters/lobster.ts` | ~30 | 70 |
| `src/adapters/cli.ts` | ~35 | 95 |
| `src/adapters/mcporter.ts` | ~35 | 97 |

### Modified (8 files)

| File | Changes |
|------|---------|
| `src/router.ts` | Remove KNOWN_CAPABILITIES, wire DiscoveryEngine (~80 LOC, was 188) |
| `src/adapters/types.ts` | New interface: `probe()` + `execute()`, add `ProbeResult`, `ProbeHints`, remove old interfaces |
| `src/capabilities/types.ts` | PackManifest gains `sideEffects` field, drop `CapabilityEntry` |
| `src/policy/side-effects.ts` | Convention-based detection + pack manifest lookup |
| `src/onboarding/connect-apps.ts` | Use probeAll results instead of APP_COVERAGE |
| `src/onboarding/check-setup.ts` | Use probeAll results, show all adapter types |
| `src/index.ts` | Wire DiscoveryEngine, minor changes |
| `openclaw.plugin.json` | Config schema updated (add cacheTtl, cliMappings) |

### Unchanged

| File | Reason |
|------|--------|
| All pack directories | No changes to packs or skills |

### Tests Rewritten (8 files)

All test files rewritten to match new interfaces. Key test areas:

- Intent extraction from capability IDs
- DiscoveryEngine cache lifecycle (hit, miss, expiry, invalidation)
- DiscoveryEngine probe timeout handling (adapter probe exceeds 5s)
- Each adapter's probe behavior (mocked provider responses)
- Composio adapter error handling (API failure → returns null, not throw)
- Side-effect convention matching
- Onboarding probe-all aggregation and grouping
- Integration: full resolve flow with mocked adapters

## README Structure

Location: `clawdi-plugins/README.md`

### Users & Deployers (top)

1. **Overview** — One paragraph: modular knowledge-work plugins for OpenClaw with dynamic service discovery
2. **Quick Start** — Clone, build, install router + packs, enable in `openclaw.json`:
   ```json
   {
     "plugins": {
       "@clawdi-ai/knowledge-work-router": { "enabled": true },
       "@clawdi-ai/pack-sales": { "enabled": true }
     }
   }
   ```
3. **Available Packs** — Table: pack name, skill count, what it does
4. **Connecting Services** — `/connect_apps` walkthrough, explain dynamic discovery
5. **Configuration** — `openclaw.json` plugin enable/disable, router config (adapter order, disabled adapters, side-effect policy, cache TTL, CLI allowlist), how to install/uninstall individual packs
6. **Checking Status** — `/check_setup` walkthrough

### Developers & Extenders (bottom)

7. **Architecture** — Router → DiscoveryEngine → Adapters diagram
8. **Creating a Pack** — Step-by-step: directory structure, `pack-manifest.yaml`, skills, `openclaw.plugin.json`, `src/index.ts`
9. **Pack Manifest Reference** — All fields with examples
10. **How Discovery Works** — Probe → cache → execute flow, each adapter's discovery method
11. **Adding an Adapter** — Implement `probe()` and `execute()`, register in router
12. **Development** — `pnpm install`, `pnpm build`, `pnpm test`, monorepo layout

## Configuration

### Router Config (in `openclaw.json`)

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
        "capabilityPins": {},
        "cliMappings": {
          "docs.convert_*": "pandoc",
          "data.query_*": "jq"
        }
      }
    }
  }
}
```

**Config fields:**
- `adapterOrder`: Fallback order for adapter probing
- `disabledAdapters`: Adapters to skip entirely
- `sideEffectPolicy`: `"always_confirm"` | `"confirm_destructive"` | `"never_confirm"`
- `cacheTtl`: Discovery cache TTL in ms (default 600000 = 10 min)
- `capabilityPins`: Pin specific capabilities to specific adapters (e.g., `{"crm.*": "composio"}`)
- `cliMappings`: Map capability patterns to CLI binaries (only way CLI adapter resolves)

**Removed from original config:**
- `composio.preferGooglesuper` — no longer needed; Composio's `COMPOSIO_SEARCH_TOOLS` returns the best toolkit automatically, and pack `preferredApps` can hint toward specific toolkits
- `appLabels` — display names now come from each adapter's `ProbeResult.displayName`; admin overrides are not needed for v1 (can be added later if requested)
- `executionTimeoutMs` — probe timeout is now 5s (built into DiscoveryEngine); execution timeout remains at 30s (enforced in Router.resolve before calling adapter.execute)

### Pack Config

```json
{
  "plugins": {
    "@clawdi-ai/pack-sales": { "enabled": true },
    "@clawdi-ai/pack-productivity": { "enabled": true }
  }
}
```

Users enable only the packs they want. Router discovers them automatically by `@clawdi-ai/pack-*` convention.

## Interaction with Pack preferredApps

Packs declare `preferredApps` in their manifest (e.g., `calendar.*: [google_workspace, outlook]`). This field is NOT removed — it becomes a hint to the DiscoveryEngine:

1. When resolving a capability, the engine passes `preferredApps` to adapters via `ProbeHints`
2. The Composio adapter uses this to filter/rank search results — if the pack prefers `google_workspace`, Composio results from the `googlesuper` toolkit are prioritized
3. Other adapters ignore the hint (they match structurally, not by app preference)
4. If the preferred app is not connected, the engine still falls through to other options — preferences are soft, not hard constraints

This preserves the original design's intent (packs can express app preferences) without hardcoding those preferences into the router.

## Migration

This is a non-breaking refactor from the user's perspective:

- `capability_execute` tool interface unchanged
- Pack manifests unchanged (optional `sideEffects` field added)
- `/connect_apps` and `/check_setup` commands unchanged (output format improved)
- Router config schema gains `cacheTtl` and `cliMappings` (with defaults)

The only observable change: the router now discovers providers dynamically instead of using hardcoded mappings. Capabilities that previously had no mapping may now resolve if the user has a matching service connected.

## Decisions

- Lazy discovery with cache (not startup scan or per-call discovery)
- Capability IDs remain the stable contract between packs and router
- Side-effects detected by naming convention + pack manifest override
- CapabilityRegistry removed — DiscoveryEngine cache replaces it
- APP_COVERAGE removed — probe results replace it
- Onboarding shows all adapter types, not just Composio
- Single README at monorepo root, layered for both audiences
- README includes `openclaw.json` configuration instructions
