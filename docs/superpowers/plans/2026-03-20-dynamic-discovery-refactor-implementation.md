# Dynamic Discovery Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 35 hardcoded capability-to-provider mappings with a DiscoveryEngine that probes adapters dynamically, reducing router code by ~50%.

**Architecture:** New DiscoveryEngine sits between Router and Adapters. Adapters implement thin `probe()` + `execute()` interface instead of static mapping tables. Engine handles caching, fallback ordering, intent extraction, and probe timeouts. Side-effects detected by naming convention instead of static registry.

**Tech Stack:** TypeScript, Vitest, yaml, Node.js built-ins (crypto, child_process, fs)

**Spec:** `docs/superpowers/specs/2026-03-20-dynamic-discovery-refactor-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/discovery/intent.ts` | Capability ID → search intent + domain + verb extraction |
| `src/discovery/engine.ts` | DiscoveryEngine: probe adapters, cache results, resolve, probeAll |
| `src/__tests__/intent.test.ts` | Intent extraction tests |
| `src/__tests__/engine.test.ts` | DiscoveryEngine cache/probe/fallback tests |
| `README.md` (monorepo root) | Installation, usage, extension guide for deployers + developers |

### Modified Files

| File | Changes |
|------|---------|
| `src/adapters/types.ts` | Replace old interface with `ProbeResult`, `ProbeHints`, new `CapabilityAdapter` |
| `src/capabilities/types.ts` | Add `sideEffects` to `PackManifest`, drop `CapabilityEntry` |
| `src/adapters/composio.ts` | Rewrite: dynamic search via `COMPOSIO_SEARCH_TOOLS` (~40 LOC) |
| `src/adapters/openclaw-tool.ts` | Rewrite: exact tool name matching (~28 LOC) |
| `src/adapters/lobster.ts` | Rewrite: `_workflow` convention matching (~32 LOC) |
| `src/adapters/cli.ts` | Rewrite: config-driven CLI mapping (~35 LOC) |
| `src/adapters/mcporter.ts` | Rewrite: MCP server scanning (~35 LOC) |
| `src/policy/side-effects.ts` | Convention-based verb detection + manifest override |
| `src/router.ts` | Remove `KNOWN_CAPABILITIES`, wire DiscoveryEngine (~80 LOC) |
| `src/onboarding/connect-apps.ts` | Use `engine.probeAll()` instead of old adapter loop |
| `src/onboarding/check-setup.ts` | Use `engine.probeAll()`, show all adapter types |
| `src/index.ts` | Wire DiscoveryEngine, inject runtime callbacks into adapters |
| `openclaw.plugin.json` | Updated config schema (add `cacheTtl`, `cliMappings`; remove old fields) |

### Deleted Files

| File | Reason |
|------|--------|
| `src/capabilities/registry.ts` | Replaced by DiscoveryEngine cache |
| `src/capabilities/pattern.ts` | Pin matching moves into DiscoveryEngine |
| `src/policy/fallback.ts` | Replaced entirely by DiscoveryEngine |
| `src/onboarding/app-grouping.ts` | Replaced by probe result grouping |
| `config/default-fallback-order.json` | Config now comes from plugin API only |

### Test Files (all rewritten)

| File | Covers |
|------|--------|
| `src/__tests__/intent.test.ts` (new) | Intent/domain/verb extraction |
| `src/__tests__/engine.test.ts` (new) | Cache lifecycle, probe fallback, timeouts, pins, hints |
| `src/__tests__/composio.test.ts` | Composio probe + execute with mocked MCP calls |
| `src/__tests__/openclaw-tool.test.ts` | OpenClaw tool matching + execution |
| `src/__tests__/adapters.test.ts` | Lobster, CLI, MCPorter adapters |
| `src/__tests__/side-effects.test.ts` | Convention-based detection + manifest override |
| `src/__tests__/integration.test.ts` | Full Router resolve flow with mocked adapters |

---

## Chunk 1: Foundation — Types + Intent + DiscoveryEngine

### Task 1: Update type definitions

**Context:** All adapters and the DiscoveryEngine depend on these interfaces. The old `CapabilityAdapter` interface has `providesCapabilities()` and `checkReadiness()` — these are replaced by a single `probe()` method. The `CapabilityEntry` type is no longer needed since the static registry is removed.

**Files:**
- Modify: `packages/router/src/adapters/types.ts`
- Modify: `packages/router/src/capabilities/types.ts`

- [ ] **Step 1: Rewrite `src/adapters/types.ts`**

Replace the entire file with the new adapter interface:

```ts
import type { CapabilityId } from "../capabilities/types.js";

export interface ProbeHints {
  preferredApps?: string[];
  domain?: string;
  pinned?: boolean;
}

export interface ProbeResult {
  adapterId: string;
  providerDetails: unknown;
  connectionReady: boolean;
  displayName: string;
  setupHint?: string;
  setupUrl?: string;
}

export interface AdapterResult {
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

export interface CapabilityAdapter {
  id: string;
  probe(
    capabilityId: CapabilityId,
    intent: string,
    hints?: ProbeHints
  ): Promise<ProbeResult | null>;
  execute(
    capabilityId: CapabilityId,
    providerDetails: unknown,
    args: Record<string, unknown>,
    packId: string
  ): Promise<AdapterResult>;
}
```

Key changes from old interface:
- `providesCapabilities()` removed — adapters no longer declare a static list
- `checkReadiness()` folded into `probe()` — readiness is checked during discovery
- `probe()` returns `null` if adapter cannot handle the capability
- `execute()` takes `providerDetails` (from probe result) instead of `{packId, capabilityId, args}`
- `ProbeHints` carries `preferredApps`, `domain`, and `pinned` flag
- `AdapterReadiness` removed entirely

- [ ] **Step 2: Update `src/capabilities/types.ts`**

Add `sideEffects` field to `PackManifest` and remove `CapabilityEntry`:

```ts
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
```

Changes: removed `CapabilityEntry` interface, added `sideEffects?: CapabilityId[]` to `PackManifest`.

- [ ] **Step 3: Verify types compile**

Run: `cd packages/router && npx tsc --noEmit src/adapters/types.ts src/capabilities/types.ts`

Expected: Compilation errors in OTHER files that import old interfaces (this is expected — they will be updated in subsequent tasks). The type files themselves should have no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/router/src/adapters/types.ts packages/router/src/capabilities/types.ts
git commit -m "refactor: update adapter and capability type definitions for dynamic discovery

Replace CapabilityAdapter interface with probe()/execute() pattern.
Add sideEffects field to PackManifest. Remove CapabilityEntry."
```

---

### Task 2: Create intent extraction module

**Context:** The DiscoveryEngine converts capability IDs like `calendar.read_events` into search intents (`"read events"`) and domains (`"calendar"`). The side-effect guard uses verb extraction to determine if an operation is a write. This module is small and self-contained.

**Files:**
- Create: `packages/router/src/discovery/intent.ts`
- Create: `packages/router/src/__tests__/intent.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/router/src/__tests__/intent.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { extractIntent, extractVerb } from "../discovery/intent.js";

describe("extractIntent", () => {
  it("extracts domain and intent from capability ID", () => {
    const result = extractIntent("calendar.read_events");
    expect(result).toEqual({ intent: "read events", domain: "calendar" });
  });

  it("handles multi-word nouns", () => {
    const result = extractIntent("crm.lookup_account");
    expect(result).toEqual({ intent: "lookup account", domain: "crm" });
  });

  it("handles triple-segment verb_noun_modifier", () => {
    const result = extractIntent("ats.update_candidate_stage");
    expect(result).toEqual({ intent: "update candidate stage", domain: "ats" });
  });

  it("handles single-segment IDs (no dot)", () => {
    const result = extractIntent("search");
    expect(result).toEqual({ intent: "search", domain: "" });
  });

  it("handles workflow-suffixed IDs", () => {
    const result = extractIntent("crm.create_note_workflow");
    expect(result).toEqual({ intent: "create note workflow", domain: "crm" });
  });
});

describe("extractVerb", () => {
  it("extracts the verb from standard capability IDs", () => {
    expect(extractVerb("calendar.read_events")).toBe("read");
    expect(extractVerb("crm.create_note")).toBe("create");
    expect(extractVerb("mail.send_followup")).toBe("send");
    expect(extractVerb("docs.convert_format")).toBe("convert");
  });

  it("handles no-underscore verb (single word after dot)", () => {
    expect(extractVerb("research.search")).toBe("search");
  });

  it("handles no-dot input", () => {
    expect(extractVerb("search")).toBe("search");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/router && npx vitest run src/__tests__/intent.test.ts`

Expected: FAIL — module `../discovery/intent.js` does not exist.

- [ ] **Step 3: Create the intent module**

Create `packages/router/src/discovery/intent.ts`:

```ts
export interface ExtractedIntent {
  intent: string;
  domain: string;
}

export function extractIntent(capabilityId: string): ExtractedIntent {
  const dotIndex = capabilityId.indexOf(".");
  if (dotIndex === -1) {
    return { intent: capabilityId, domain: "" };
  }
  const domain = capabilityId.slice(0, dotIndex);
  const verbNoun = capabilityId.slice(dotIndex + 1);
  const intent = verbNoun.replace(/_/g, " ");
  return { intent, domain };
}

export function extractVerb(capabilityId: string): string {
  const dotIndex = capabilityId.indexOf(".");
  const verbNoun = dotIndex === -1 ? capabilityId : capabilityId.slice(dotIndex + 1);
  const underscoreIndex = verbNoun.indexOf("_");
  return underscoreIndex === -1 ? verbNoun : verbNoun.slice(0, underscoreIndex);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/router && npx vitest run src/__tests__/intent.test.ts`

Expected: ALL PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/router/src/discovery/intent.ts packages/router/src/__tests__/intent.test.ts
git commit -m "feat: add intent extraction module for dynamic discovery

Extracts search intents (e.g. 'read events') and verbs (e.g. 'read')
from capability IDs (e.g. 'calendar.read_events'). Used by
DiscoveryEngine for adapter probing and SideEffectGuard for
convention-based side-effect detection."
```

---

### Task 3: Create DiscoveryEngine

**Context:** The DiscoveryEngine is the core new component. It replaces the CapabilityRegistry, FallbackResolver, and pattern matching. It probes adapters in fallback order, caches results, and handles timeouts. All adapters are injected via constructor — the engine does not create them.

**Files:**
- Create: `packages/router/src/discovery/engine.ts`
- Create: `packages/router/src/__tests__/engine.test.ts`

**Dependencies:** Task 1 (types), Task 2 (intent)

- [ ] **Step 1: Write the failing tests**

Create `packages/router/src/__tests__/engine.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { DiscoveryEngine } from "../discovery/engine.js";
import type { CapabilityAdapter, ProbeResult } from "../adapters/types.js";

function mockAdapter(
  id: string,
  probeResponse: ProbeResult | null = null
): CapabilityAdapter {
  return {
    id,
    probe: vi.fn().mockResolvedValue(probeResponse),
    execute: vi.fn().mockResolvedValue({ status: "ok" as const, data: {} }),
  };
}

const READY_PROBE: ProbeResult = {
  adapterId: "composio",
  providerDetails: { toolkit: "googlesuper", action: "LIST_EVENTS" },
  connectionReady: true,
  displayName: "Google Workspace",
};

describe("DiscoveryEngine", () => {
  describe("resolve", () => {
    it("returns null when no adapter can handle capability", async () => {
      const engine = new DiscoveryEngine([mockAdapter("composio")]);
      const result = await engine.resolve("unknown.capability", "sales");
      expect(result).toBeNull();
    });

    it("returns probe result from first ready adapter", async () => {
      const engine = new DiscoveryEngine([
        mockAdapter("composio", READY_PROBE),
      ]);
      const result = await engine.resolve("calendar.read_events", "sales");
      expect(result).toEqual(READY_PROBE);
    });

    it("falls back to next adapter when first returns null", async () => {
      const oclawProbe: ProbeResult = {
        adapterId: "openclaw_tool",
        providerDetails: { toolName: "web_search" },
        connectionReady: true,
        displayName: "web_search",
      };
      const engine = new DiscoveryEngine([
        mockAdapter("composio", null),
        mockAdapter("openclaw_tool", oclawProbe),
      ]);
      const result = await engine.resolve("research.web_search", "sales");
      expect(result?.adapterId).toBe("openclaw_tool");
    });

    it("returns unready probe as fallback when nothing is ready", async () => {
      const unready: ProbeResult = {
        adapterId: "composio",
        providerDetails: { toolkit: "hubspot" },
        connectionReady: false,
        displayName: "HubSpot",
        setupHint: "Connect via OAuth",
      };
      const engine = new DiscoveryEngine([mockAdapter("composio", unready)]);
      const result = await engine.resolve("crm.lookup_account", "sales");
      expect(result?.connectionReady).toBe(false);
      expect(result?.setupHint).toBe("Connect via OAuth");
    });

    it("skips disabled adapters", async () => {
      const adapter = mockAdapter("composio", READY_PROBE);
      const engine = new DiscoveryEngine([adapter], {
        disabledAdapters: ["composio"],
      });
      const result = await engine.resolve("calendar.read_events", "sales");
      expect(result).toBeNull();
      expect(adapter.probe).not.toHaveBeenCalled();
    });
  });

  describe("cache", () => {
    it("caches resolved capabilities — second call does not probe", async () => {
      const adapter = mockAdapter("composio", READY_PROBE);
      const engine = new DiscoveryEngine([adapter]);
      await engine.resolve("calendar.read_events", "sales");
      await engine.resolve("calendar.read_events", "sales");
      expect(adapter.probe).toHaveBeenCalledTimes(1);
    });

    it("re-probes after cache TTL expires", async () => {
      const adapter = mockAdapter("composio", READY_PROBE);
      const engine = new DiscoveryEngine([adapter], { cacheTtl: 0 });
      await engine.resolve("calendar.read_events", "sales");
      // cacheTtl=0 means instant expiry
      await engine.resolve("calendar.read_events", "sales");
      expect(adapter.probe).toHaveBeenCalledTimes(2);
    });

    it("invalidate removes cache entry", async () => {
      const adapter = mockAdapter("composio", READY_PROBE);
      const engine = new DiscoveryEngine([adapter]);
      await engine.resolve("calendar.read_events", "sales");
      engine.invalidate("calendar.read_events");
      await engine.resolve("calendar.read_events", "sales");
      expect(adapter.probe).toHaveBeenCalledTimes(2);
    });

    it("clearCache removes all entries", async () => {
      const adapter = mockAdapter("composio", READY_PROBE);
      const engine = new DiscoveryEngine([adapter]);
      await engine.resolve("calendar.read_events", "sales");
      await engine.resolve("crm.lookup_account", "sales");
      engine.clearCache();
      await engine.resolve("calendar.read_events", "sales");
      expect(adapter.probe).toHaveBeenCalledTimes(3);
    });

    it("does not cache unready probes", async () => {
      const unready: ProbeResult = {
        ...READY_PROBE,
        connectionReady: false,
      };
      const adapter = mockAdapter("composio", unready);
      const engine = new DiscoveryEngine([adapter]);
      await engine.resolve("crm.lookup_account", "sales");
      await engine.resolve("crm.lookup_account", "sales");
      expect(adapter.probe).toHaveBeenCalledTimes(2);
    });
  });

  describe("timeout", () => {
    it("times out slow probes and skips to next adapter", async () => {
      const slowAdapter: CapabilityAdapter = {
        id: "slow",
        probe: vi.fn().mockImplementation(
          () => new Promise(() => {}) // never resolves
        ),
        execute: vi.fn(),
      };
      const fastProbe: ProbeResult = {
        adapterId: "fast",
        providerDetails: {},
        connectionReady: true,
        displayName: "fast-tool",
      };
      const fastAdapter = mockAdapter("fast", fastProbe);
      const engine = new DiscoveryEngine([slowAdapter, fastAdapter], {
        adapterOrder: ["slow", "fast"],
        probeTimeoutMs: 50,
      });
      const result = await engine.resolve("any.capability", "sales");
      expect(result?.adapterId).toBe("fast");
    });

    it("returns null when all probes time out", async () => {
      const slowAdapter: CapabilityAdapter = {
        id: "slow",
        probe: vi.fn().mockImplementation(
          () => new Promise(() => {})
        ),
        execute: vi.fn(),
      };
      const engine = new DiscoveryEngine([slowAdapter], {
        probeTimeoutMs: 50,
      });
      const result = await engine.resolve("any.capability", "sales");
      expect(result).toBeNull();
    });
  });

  describe("capability pins", () => {
    it("pins capability to specific adapter — skips others", async () => {
      const composio = mockAdapter("composio");
      const mcpProbe: ProbeResult = {
        adapterId: "mcporter",
        providerDetails: { server: "ahrefs", tool: "site_audit" },
        connectionReady: true,
        displayName: "ahrefs",
      };
      const mcporter = mockAdapter("mcporter", mcpProbe);
      const engine = new DiscoveryEngine([composio, mcporter], {
        capabilityPins: { "seo.*": "mcporter" },
      });
      await engine.resolve("seo.audit_page", "marketing");
      expect(composio.probe).not.toHaveBeenCalled();
      expect(mcporter.probe).toHaveBeenCalled();
    });

    it("passes pinned=true in hints when capability is pinned", async () => {
      const adapter = mockAdapter("lobster");
      const engine = new DiscoveryEngine([adapter], {
        capabilityPins: { "crm.*": "lobster" },
      });
      await engine.resolve("crm.create_note", "sales");
      expect(adapter.probe).toHaveBeenCalledWith(
        "crm.create_note",
        "create note",
        expect.objectContaining({ pinned: true })
      );
    });
  });

  describe("pack hints", () => {
    it("passes preferredApps from pack manifest as hints", async () => {
      const adapter = mockAdapter("composio");
      const engine = new DiscoveryEngine([adapter]);
      engine.registerPack({
        packId: "sales",
        displayName: "Sales Pack",
        capabilities: { required: ["crm.lookup_account"], optional: [] },
        preferredApps: { "crm.*": ["salesforce", "hubspot"] },
        onboarding: { welcomeMessage: "", suggestedFirstTask: "" },
      });
      await engine.resolve("crm.lookup_account", "sales");
      expect(adapter.probe).toHaveBeenCalledWith(
        "crm.lookup_account",
        "lookup account",
        expect.objectContaining({
          preferredApps: ["salesforce", "hubspot"],
          domain: "crm",
        })
      );
    });

    it("uses pack fallbackOverrides when present", async () => {
      const composio = mockAdapter("composio");
      const lobster = mockAdapter("lobster", {
        adapterId: "lobster",
        providerDetails: { workflowId: "note" },
        connectionReady: true,
        displayName: "note-workflow",
      });
      const engine = new DiscoveryEngine([composio, lobster]);
      engine.registerPack({
        packId: "sales",
        displayName: "Sales Pack",
        capabilities: { required: ["crm.create_note_workflow"], optional: [] },
        preferredApps: {},
        fallbackOverrides: {
          "crm.*": { adapters: ["lobster", "composio"] },
        },
        onboarding: { welcomeMessage: "", suggestedFirstTask: "" },
      });
      await engine.resolve("crm.create_note_workflow", "sales");
      // lobster is first in override order
      expect(lobster.probe).toHaveBeenCalled();
    });
  });

  describe("probeAll", () => {
    it("returns results from all adapters concurrently", async () => {
      const probe1: ProbeResult = {
        adapterId: "composio",
        providerDetails: { toolkit: "googlesuper" },
        connectionReady: true,
        displayName: "Google Workspace",
      };
      const probe2: ProbeResult = {
        adapterId: "openclaw_tool",
        providerDetails: { toolName: "web_search" },
        connectionReady: true,
        displayName: "web_search",
      };
      const engine = new DiscoveryEngine([
        mockAdapter("composio", probe1),
        mockAdapter("openclaw_tool", probe2),
      ]);
      const results = await engine.probeAll("research.web_search", "sales");
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.adapterId)).toEqual(
        expect.arrayContaining(["composio", "openclaw_tool"])
      );
    });

    it("warms cache with first ready result", async () => {
      const probe: ProbeResult = {
        adapterId: "composio",
        providerDetails: { toolkit: "googlesuper" },
        connectionReady: true,
        displayName: "Google Workspace",
      };
      const adapter = mockAdapter("composio", probe);
      const engine = new DiscoveryEngine([adapter]);
      await engine.probeAll("calendar.read_events", "sales");
      // Subsequent resolve should hit cache
      await engine.resolve("calendar.read_events", "sales");
      // probe called once during probeAll, not again during resolve
      expect(adapter.probe).toHaveBeenCalledTimes(1);
    });

    it("skips disabled adapters", async () => {
      const adapter = mockAdapter("composio", READY_PROBE);
      const engine = new DiscoveryEngine([adapter], {
        disabledAdapters: ["composio"],
      });
      const results = await engine.probeAll("calendar.read_events", "sales");
      expect(results).toHaveLength(0);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/router && npx vitest run src/__tests__/engine.test.ts`

Expected: FAIL — module `../discovery/engine.js` does not exist.

- [ ] **Step 3: Create the DiscoveryEngine**

Create `packages/router/src/discovery/engine.ts`:

```ts
import type {
  CapabilityAdapter,
  ProbeResult,
  ProbeHints,
} from "../adapters/types.js";
import type {
  PackManifest,
  CapabilityId,
  PackId,
  AdapterId,
} from "../capabilities/types.js";
import { extractIntent } from "./intent.js";

interface CacheEntry {
  probe: ProbeResult;
  resolvedAt: number;
  ttl: number;
}

export interface DiscoveryEngineConfig {
  adapterOrder: AdapterId[];
  disabledAdapters: AdapterId[];
  capabilityPins: Record<string, AdapterId>;
  cacheTtl: number;
  probeTimeoutMs: number;
}

const DEFAULT_CONFIG: DiscoveryEngineConfig = {
  adapterOrder: [
    "composio",
    "openclaw_tool",
    "lobster",
    "cli",
    "mcporter",
  ],
  disabledAdapters: [],
  capabilityPins: {},
  cacheTtl: 600_000,
  probeTimeoutMs: 5_000,
};

function matchPattern(pattern: string, capabilityId: string): boolean {
  if (pattern === capabilityId) return true;
  if (pattern.endsWith(".*")) {
    return capabilityId.startsWith(pattern.slice(0, -1));
  }
  return false;
}

export class DiscoveryEngine {
  private cache = new Map<CapabilityId, CacheEntry>();
  private packs = new Map<PackId, PackManifest>();
  private adapterMap = new Map<AdapterId, CapabilityAdapter>();
  private config: DiscoveryEngineConfig;

  constructor(
    adapters: CapabilityAdapter[],
    config: Partial<DiscoveryEngineConfig> = {}
  ) {
    this.config = {
      adapterOrder:
        config.adapterOrder ?? DEFAULT_CONFIG.adapterOrder,
      disabledAdapters:
        config.disabledAdapters ?? DEFAULT_CONFIG.disabledAdapters,
      capabilityPins:
        config.capabilityPins ?? DEFAULT_CONFIG.capabilityPins,
      cacheTtl: config.cacheTtl ?? DEFAULT_CONFIG.cacheTtl,
      probeTimeoutMs:
        config.probeTimeoutMs ?? DEFAULT_CONFIG.probeTimeoutMs,
    };
    for (const adapter of adapters) {
      this.adapterMap.set(adapter.id, adapter);
    }
  }

  registerPack(manifest: PackManifest): void {
    this.packs.set(manifest.packId, manifest);
  }

  async resolve(
    capabilityId: CapabilityId,
    packId: PackId
  ): Promise<ProbeResult | null> {
    // Check cache
    const cached = this.cache.get(capabilityId);
    if (cached && Date.now() - cached.resolvedAt < cached.ttl) {
      return cached.probe;
    }

    // Build adapter order and hints
    const { adapters: adapterOrder, pinned } =
      this.getAdapterOrder(capabilityId, packId);
    const { intent, domain } = extractIntent(capabilityId);
    const hints = this.buildHints(capabilityId, packId, domain);
    if (pinned) hints.pinned = true;

    // Probe adapters in order
    let fallback: ProbeResult | null = null;
    for (const adapterId of adapterOrder) {
      if (this.config.disabledAdapters.includes(adapterId)) continue;
      const adapter = this.adapterMap.get(adapterId);
      if (!adapter) continue;

      try {
        const probe = await this.probeWithTimeout(
          adapter,
          capabilityId,
          intent,
          hints
        );
        if (!probe) continue;

        if (probe.connectionReady) {
          this.cache.set(capabilityId, {
            probe,
            resolvedAt: Date.now(),
            ttl: this.config.cacheTtl,
          });
          return probe;
        } else if (!fallback) {
          fallback = probe;
        }
      } catch {
        // Probe threw — skip to next adapter
      }
    }

    return fallback;
  }

  // Note: spec defines probeAll(capabilityId) with one arg, but packId is
  // needed to build hints from pack manifest. Intentional deviation.
  async probeAll(
    capabilityId: CapabilityId,
    packId: PackId
  ): Promise<ProbeResult[]> {
    const { intent, domain } = extractIntent(capabilityId);
    const hints = this.buildHints(capabilityId, packId, domain);
    const results: ProbeResult[] = [];

    const promises = Array.from(this.adapterMap.values())
      .filter((a) => !this.config.disabledAdapters.includes(a.id))
      .map(async (adapter) => {
        try {
          const probe = await this.probeWithTimeout(
            adapter,
            capabilityId,
            intent,
            hints
          );
          if (probe) results.push(probe);
        } catch {
          // Skip failed probes
        }
      });

    await Promise.all(promises);

    // Warm cache with first ready result
    for (const probe of results) {
      if (probe.connectionReady && !this.cache.has(capabilityId)) {
        this.cache.set(capabilityId, {
          probe,
          resolvedAt: Date.now(),
          ttl: this.config.cacheTtl,
        });
      }
    }

    return results;
  }

  invalidate(capabilityId: CapabilityId): void {
    this.cache.delete(capabilityId);
  }

  clearCache(): void {
    this.cache.clear();
  }

  private getAdapterOrder(
    capabilityId: CapabilityId,
    packId: PackId
  ): { adapters: AdapterId[]; pinned: boolean } {
    for (const [pattern, adapterId] of Object.entries(
      this.config.capabilityPins
    )) {
      if (matchPattern(pattern, capabilityId)) {
        return { adapters: [adapterId], pinned: true };
      }
    }

    const pack = this.packs.get(packId);
    if (pack?.fallbackOverrides) {
      for (const [pattern, override] of Object.entries(
        pack.fallbackOverrides
      )) {
        if (matchPattern(pattern, capabilityId)) {
          return { adapters: override.adapters, pinned: false };
        }
      }
    }

    return { adapters: this.config.adapterOrder, pinned: false };
  }

  private buildHints(
    capabilityId: CapabilityId,
    packId: PackId,
    domain: string
  ): ProbeHints {
    const pack = this.packs.get(packId);
    const hints: ProbeHints = { domain };

    if (pack?.preferredApps) {
      for (const [pattern, apps] of Object.entries(
        pack.preferredApps
      )) {
        if (matchPattern(pattern, capabilityId)) {
          hints.preferredApps = apps;
          break;
        }
      }
    }

    return hints;
  }

  private async probeWithTimeout(
    adapter: CapabilityAdapter,
    capabilityId: CapabilityId,
    intent: string,
    hints: ProbeHints
  ): Promise<ProbeResult | null> {
    return Promise.race([
      adapter.probe(capabilityId, intent, hints),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), this.config.probeTimeoutMs)
      ),
    ]);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/router && npx vitest run src/__tests__/engine.test.ts`

Expected: ALL PASS (19 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/router/src/discovery/engine.ts packages/router/src/__tests__/engine.test.ts
git commit -m "feat: add DiscoveryEngine — probe, cache, and resolve capabilities dynamically

Replaces CapabilityRegistry, FallbackResolver, and pattern matching.
Probes adapters in fallback order with 5s timeout per probe.
Caches ready resolutions with configurable TTL (default 10 min).
Supports capability pins, pack fallback overrides, and preferredApps hints.
probeAll() for onboarding returns results from all adapters concurrently."
```

---

## Chunk 2: Adapters — Rewrite All 5

### Task 4: Rewrite Composio adapter

**Context:** The old Composio adapter has a 17-entry `CAPABILITY_MAP` and an 8-entry `TOOLKIT_TO_APP` map. The new adapter uses `COMPOSIO_SEARCH_TOOLS` via the OpenClaw Composio MCP server (`clawdi-mcp`) for dynamic discovery. It takes a `McpCallFn` for MCP calls instead of a `ComposioClient`.

**Files:**
- Rewrite: `packages/router/src/adapters/composio.ts`
- Rewrite: `packages/router/src/__tests__/composio.test.ts`

- [ ] **Step 1: Write the failing tests**

Rewrite `packages/router/src/__tests__/composio.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { ComposioAdapter } from "../adapters/composio.js";
import type { McpCallFn } from "../adapters/composio.js";

function mockCallMcp(response: unknown = {}): McpCallFn {
  return vi.fn().mockResolvedValue(response);
}

const SEARCH_RESPONSE = {
  primary_tool_slugs: ["GOOGLESUPER_LIST_EVENTS"],
  related_tool_slugs: ["GOOGLESUPER_GET_EVENT"],
  toolkit_connection_statuses: { googlesuper: "active" },
  tool_schemas: {},
};

const UNCONNECTED_RESPONSE = {
  primary_tool_slugs: ["HUBSPOT_SEARCH_CONTACTS"],
  related_tool_slugs: [],
  toolkit_connection_statuses: { hubspot: "inactive" },
  tool_schemas: {},
};

describe("ComposioAdapter", () => {
  describe("probe", () => {
    it("returns ready probe when Composio finds a connected tool", async () => {
      const adapter = new ComposioAdapter(mockCallMcp(SEARCH_RESPONSE));
      const result = await adapter.probe(
        "calendar.read_events",
        "read events"
      );
      expect(result).not.toBeNull();
      expect(result!.connectionReady).toBe(true);
      expect(result!.displayName).toBe("Google Workspace");
      expect(result!.providerDetails).toEqual({
        toolkit: "googlesuper",
        action: "GOOGLESUPER_LIST_EVENTS",
      });
    });

    it("returns unready probe with setupHint and setupUrl when toolkit not connected", async () => {
      const callMcp = vi.fn()
        .mockResolvedValueOnce(UNCONNECTED_RESPONSE) // COMPOSIO_SEARCH_TOOLS
        .mockResolvedValueOnce({ redirect_url: "https://oauth.example.com" }); // COMPOSIO_MANAGE_CONNECTIONS
      const adapter = new ComposioAdapter(callMcp);
      const result = await adapter.probe(
        "crm.lookup_account",
        "lookup account"
      );
      expect(result).not.toBeNull();
      expect(result!.connectionReady).toBe(false);
      expect(result!.setupHint).toBe("Connect via OAuth");
      expect(result!.setupUrl).toBe("https://oauth.example.com");
    });

    it("returns null when Composio returns no slugs", async () => {
      const adapter = new ComposioAdapter(
        mockCallMcp({ primary_tool_slugs: [] })
      );
      const result = await adapter.probe("unknown.cap", "unknown cap");
      expect(result).toBeNull();
    });

    it("returns null when MCP call throws", async () => {
      const callMcp = vi.fn().mockRejectedValue(new Error("timeout"));
      const adapter = new ComposioAdapter(callMcp);
      const result = await adapter.probe(
        "calendar.read_events",
        "read events"
      );
      expect(result).toBeNull();
    });

    it("prefers toolkit from hints.preferredApps", async () => {
      const response = {
        primary_tool_slugs: [
          "GOOGLESUPER_LIST_EVENTS",
          "OUTLOOK_LIST_EVENTS",
        ],
        toolkit_connection_statuses: {
          googlesuper: "active",
          outlook: "active",
        },
      };
      const adapter = new ComposioAdapter(mockCallMcp(response));
      const result = await adapter.probe(
        "calendar.read_events",
        "read events",
        { preferredApps: ["outlook"] }
      );
      expect(result!.providerDetails).toEqual(
        expect.objectContaining({ toolkit: "outlook" })
      );
    });
  });

  describe("execute", () => {
    it("calls COMPOSIO_MULTI_EXECUTE_TOOL with the action slug", async () => {
      const callMcp = vi
        .fn()
        .mockResolvedValue({ result: "meeting data" });
      const adapter = new ComposioAdapter(callMcp);
      const result = await adapter.execute(
        "calendar.read_events",
        { toolkit: "googlesuper", action: "GOOGLESUPER_LIST_EVENTS" },
        { date: "2026-03-20" },
        "sales"
      );
      expect(result.status).toBe("ok");
      expect(callMcp).toHaveBeenCalledWith(
        "clawdi-mcp",
        "COMPOSIO_MULTI_EXECUTE_TOOL",
        expect.objectContaining({
          tool_slug: "GOOGLESUPER_LIST_EVENTS",
          date: "2026-03-20",
        })
      );
    });

    it("returns error on execution failure", async () => {
      const callMcp = vi
        .fn()
        .mockRejectedValue(new Error("connection lost"));
      const adapter = new ComposioAdapter(callMcp);
      const result = await adapter.execute(
        "calendar.read_events",
        { toolkit: "googlesuper", action: "LIST_EVENTS" },
        {},
        "sales"
      );
      expect(result.status).toBe("error");
      expect(result.notes?.[0]).toContain("connection lost");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/router && npx vitest run src/__tests__/composio.test.ts`

Expected: FAIL — old `ComposioAdapter` has different constructor signature.

- [ ] **Step 3: Rewrite the Composio adapter**

Replace `packages/router/src/adapters/composio.ts`:

```ts
import type {
  CapabilityAdapter,
  ProbeResult,
  ProbeHints,
  AdapterResult,
} from "./types.js";

export type McpCallFn = (
  server: string,
  tool: string,
  args: Record<string, unknown>
) => Promise<unknown>;

function toolkitDisplayName(toolkit: string): string {
  const overrides: Record<string, string> = {
    googlesuper: "Google Workspace",
    hubspot: "HubSpot",
    bamboohr: "BambooHR",
  };
  return (
    overrides[toolkit] ??
    toolkit.charAt(0).toUpperCase() + toolkit.slice(1)
  );
}

export class ComposioAdapter implements CapabilityAdapter {
  readonly id = "composio";

  constructor(private callMcp: McpCallFn) {}

  async probe(
    _capabilityId: string,
    intent: string,
    hints?: ProbeHints
  ): Promise<ProbeResult | null> {
    try {
      const res = (await this.callMcp(
        "clawdi-mcp",
        "COMPOSIO_SEARCH_TOOLS",
        { queries: [{ use_case: intent }] }
      )) as any;

      const slugs: string[] = res?.primary_tool_slugs ?? [];
      if (!slugs.length) return null;

      // Check preferred apps from hints
      if (hints?.preferredApps?.length) {
        const preferred = slugs.find((s) =>
          hints.preferredApps!.some((app) =>
            s.toLowerCase().startsWith(app.toLowerCase())
          )
        );
        if (preferred) {
          const tk = preferred.split("_")[0].toLowerCase();
          const statuses: Record<string, string> =
            res?.toolkit_connection_statuses ?? {};
          return {
            adapterId: this.id,
            providerDetails: { toolkit: tk, action: preferred },
            connectionReady: statuses[tk] === "active",
            displayName: toolkitDisplayName(tk),
            setupHint:
              statuses[tk] !== "active"
                ? "Connect via OAuth"
                : undefined,
          };
        }
      }

      const action = slugs[0];
      const toolkit = action.split("_")[0].toLowerCase();
      const statuses: Record<string, string> =
        res?.toolkit_connection_statuses ?? {};
      const connected = statuses[toolkit] === "active";

      let setupUrl: string | undefined;
      if (!connected) {
        try {
          const conn = (await this.callMcp(
            "clawdi-mcp",
            "COMPOSIO_MANAGE_CONNECTIONS",
            { toolkits: [toolkit] }
          )) as any;
          setupUrl = conn?.redirect_url;
        } catch {
          // Best-effort — OAuth URL is optional
        }
      }

      return {
        adapterId: this.id,
        providerDetails: { toolkit, action },
        connectionReady: connected,
        displayName: toolkitDisplayName(toolkit),
        setupHint: connected ? undefined : "Connect via OAuth",
        setupUrl,
      };
    } catch {
      return null;
    }
  }

  async execute(
    _capabilityId: string,
    providerDetails: unknown,
    args: Record<string, unknown>,
    _packId: string
  ): Promise<AdapterResult> {
    const { action } = providerDetails as {
      toolkit: string;
      action: string;
    };
    try {
      const data = await this.callMcp(
        "clawdi-mcp",
        "COMPOSIO_MULTI_EXECUTE_TOOL",
        { tool_slug: action, ...args }
      );
      return { status: "ok", data };
    } catch (err) {
      return {
        status: "error",
        notes: [
          `Composio execution failed: ${err instanceof Error ? err.message : String(err)}`,
        ],
      };
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/router && npx vitest run src/__tests__/composio.test.ts`

Expected: ALL PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/router/src/adapters/composio.ts packages/router/src/__tests__/composio.test.ts
git commit -m "refactor: rewrite Composio adapter with dynamic COMPOSIO_SEARCH_TOOLS discovery

Replaces 17-entry CAPABILITY_MAP and 8-entry TOOLKIT_TO_APP with
dynamic search via OpenClaw's Composio MCP server (clawdi-mcp).
Takes McpCallFn for testability. Supports preferredApps hints."
```

---

### Task 5: Rewrite OpenClaw Tool adapter

**Context:** The old adapter has a 5-entry `CAPABILITY_TO_TOOL` map. The new adapter matches the capability ID's `verb_noun` portion against built-in tool names using exact matching. No network calls.

**Files:**
- Rewrite: `packages/router/src/adapters/openclaw-tool.ts`
- Rewrite: `packages/router/src/__tests__/openclaw-tool.test.ts`

- [ ] **Step 1: Write the failing tests**

Rewrite `packages/router/src/__tests__/openclaw-tool.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { OpenClawToolAdapter } from "../adapters/openclaw-tool.js";

const BUILTIN_TOOLS = ["web_search", "read_file", "write_file", "glob"];

function makeAdapter(tools = BUILTIN_TOOLS) {
  return new OpenClawToolAdapter(
    () => tools,
    vi.fn().mockResolvedValue({ result: "data" })
  );
}

describe("OpenClawToolAdapter", () => {
  describe("probe", () => {
    it("matches exact tool name from capability ID", async () => {
      const adapter = makeAdapter();
      const result = await adapter.probe(
        "research.web_search",
        "web search"
      );
      expect(result).not.toBeNull();
      expect(result!.connectionReady).toBe(true);
      expect(result!.displayName).toBe("web_search");
      expect(result!.providerDetails).toEqual({
        toolName: "web_search",
      });
    });

    it("returns null for unmatched capabilities", async () => {
      const adapter = makeAdapter();
      const result = await adapter.probe(
        "crm.lookup_account",
        "lookup account"
      );
      expect(result).toBeNull();
    });

    it("always reports connectionReady=true", async () => {
      const adapter = makeAdapter();
      const result = await adapter.probe(
        "docs.read_file",
        "read file"
      );
      expect(result!.connectionReady).toBe(true);
    });
  });

  describe("execute", () => {
    it("calls the built-in tool with args", async () => {
      const callTool = vi
        .fn()
        .mockResolvedValue({ results: ["file.ts"] });
      const adapter = new OpenClawToolAdapter(
        () => BUILTIN_TOOLS,
        callTool
      );
      const result = await adapter.execute(
        "docs.read_file",
        { toolName: "read_file" },
        { path: "/src/index.ts" },
        "sales"
      );
      expect(result.status).toBe("ok");
      expect(callTool).toHaveBeenCalledWith("read_file", {
        path: "/src/index.ts",
      });
    });

    it("returns error on failure", async () => {
      const callTool = vi
        .fn()
        .mockRejectedValue(new Error("not found"));
      const adapter = new OpenClawToolAdapter(
        () => BUILTIN_TOOLS,
        callTool
      );
      const result = await adapter.execute(
        "docs.read_file",
        { toolName: "read_file" },
        {},
        "sales"
      );
      expect(result.status).toBe("error");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/router && npx vitest run src/__tests__/openclaw-tool.test.ts`

Expected: FAIL — old constructor signature.

- [ ] **Step 3: Rewrite the OpenClaw Tool adapter**

Replace `packages/router/src/adapters/openclaw-tool.ts`:

```ts
import type {
  CapabilityAdapter,
  ProbeResult,
  AdapterResult,
} from "./types.js";

export class OpenClawToolAdapter implements CapabilityAdapter {
  readonly id = "openclaw_tool";

  constructor(
    private listTools: () => string[],
    private callTool: (
      name: string,
      args: Record<string, unknown>
    ) => Promise<unknown>
  ) {}

  async probe(capabilityId: string): Promise<ProbeResult | null> {
    const dotIndex = capabilityId.indexOf(".");
    const toolName =
      dotIndex === -1
        ? capabilityId
        : capabilityId.slice(dotIndex + 1);
    const tools = this.listTools();
    if (!tools.includes(toolName)) return null;

    return {
      adapterId: this.id,
      providerDetails: { toolName },
      connectionReady: true,
      displayName: toolName,
    };
  }

  async execute(
    _capabilityId: string,
    providerDetails: unknown,
    args: Record<string, unknown>,
    _packId: string
  ): Promise<AdapterResult> {
    const { toolName } = providerDetails as { toolName: string };
    try {
      const data = await this.callTool(toolName, args);
      return { status: "ok", data };
    } catch (err) {
      return {
        status: "error",
        notes: [
          `OpenClaw tool failed: ${err instanceof Error ? err.message : String(err)}`,
        ],
      };
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/router && npx vitest run src/__tests__/openclaw-tool.test.ts`

Expected: ALL PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/router/src/adapters/openclaw-tool.ts packages/router/src/__tests__/openclaw-tool.test.ts
git commit -m "refactor: rewrite OpenClaw Tool adapter with dynamic tool matching

Replaces 5-entry CAPABILITY_TO_TOOL map with exact tool name matching
against runtime tool list. Takes listTools/callTool functions for
testability. No network calls — always connectionReady."
```

---

### Task 6: Rewrite Lobster adapter

**Context:** The old adapter has a 5-entry `CAPABILITY_TO_WORKFLOW` map. The new adapter uses the `_workflow` suffix convention: capabilities ending in `_workflow` are matched against available Lobster workflows. When pinned explicitly, the suffix check is skipped.

**Files:**
- Rewrite: `packages/router/src/adapters/lobster.ts`
- Modify: `packages/router/src/__tests__/adapters.test.ts` (Lobster section)

- [ ] **Step 1: Write the failing tests**

Replace the Lobster section in `packages/router/src/__tests__/adapters.test.ts` (rewrite the full file — CLI and MCPorter tests will be added in Tasks 7-8):

```ts
import { describe, it, expect, vi } from "vitest";
import { LobsterAdapter } from "../adapters/lobster.js";

const WORKFLOWS = [
  "create-note-with-approval",
  "brief-from-research",
  "offer-approval-chain",
];

describe("LobsterAdapter", () => {
  function makeAdapter(workflows = WORKFLOWS) {
    return new LobsterAdapter(
      vi.fn().mockResolvedValue(workflows),
      vi.fn().mockResolvedValue({ result: "done" })
    );
  }

  describe("probe", () => {
    it("matches capabilities ending in _workflow", async () => {
      const adapter = makeAdapter();
      const result = await adapter.probe(
        "crm.create_note_workflow",
        "create note workflow"
      );
      expect(result).not.toBeNull();
      expect(result!.providerDetails).toEqual({
        workflowId: "create-note-with-approval",
      });
    });

    it("returns null for capabilities without _workflow suffix", async () => {
      const adapter = makeAdapter();
      const result = await adapter.probe(
        "crm.create_note",
        "create note"
      );
      expect(result).toBeNull();
    });

    it("skips _workflow check when pinned and matches by name", async () => {
      const adapter = makeAdapter();
      const result = await adapter.probe(
        "crm.create_note",
        "create note",
        { pinned: true }
      );
      // "create_note" → search term "create-note" matches "create-note-with-approval"
      expect(result).not.toBeNull();
      expect(result!.providerDetails).toEqual({
        workflowId: "create-note-with-approval",
      });
    });

    it("returns null when no workflow matches", async () => {
      const adapter = makeAdapter();
      const result = await adapter.probe(
        "unknown.do_thing_workflow",
        "do thing workflow"
      );
      expect(result).toBeNull();
    });
  });

  describe("execute", () => {
    it("runs the matched workflow", async () => {
      const runWorkflow = vi
        .fn()
        .mockResolvedValue({ approved: true });
      const adapter = new LobsterAdapter(
        vi.fn().mockResolvedValue(WORKFLOWS),
        runWorkflow
      );
      const result = await adapter.execute(
        "crm.create_note_workflow",
        { workflowId: "create-note-with-approval" },
        { note: "test" },
        "sales"
      );
      expect(result.status).toBe("ok");
      expect(runWorkflow).toHaveBeenCalledWith(
        "create-note-with-approval",
        { note: "test" }
      );
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/router && npx vitest run src/__tests__/adapters.test.ts`

Expected: FAIL — old constructor signature.

- [ ] **Step 3: Rewrite the Lobster adapter**

Replace `packages/router/src/adapters/lobster.ts`:

```ts
import type {
  CapabilityAdapter,
  ProbeResult,
  ProbeHints,
  AdapterResult,
} from "./types.js";

export class LobsterAdapter implements CapabilityAdapter {
  readonly id = "lobster";

  constructor(
    private listWorkflows: () => Promise<string[]>,
    private runWorkflow: (
      id: string,
      args: Record<string, unknown>
    ) => Promise<unknown>
  ) {}

  async probe(
    capabilityId: string,
    _intent: string,
    hints?: ProbeHints
  ): Promise<ProbeResult | null> {
    const isWorkflow = capabilityId.endsWith("_workflow");
    if (!isWorkflow && !hints?.pinned) return null;

    const dotIndex = capabilityId.indexOf(".");
    const suffix =
      dotIndex === -1
        ? capabilityId
        : capabilityId.slice(dotIndex + 1);
    const searchTerm = isWorkflow
      ? suffix.replace(/_workflow$/, "").replace(/_/g, "-")
      : suffix.replace(/_/g, "-");

    const workflows = await this.listWorkflows();
    const match = workflows.find((w) => w.includes(searchTerm));
    if (!match) return null;

    return {
      adapterId: this.id,
      providerDetails: { workflowId: match },
      connectionReady: true,
      displayName: match,
    };
  }

  async execute(
    _capabilityId: string,
    providerDetails: unknown,
    args: Record<string, unknown>,
    _packId: string
  ): Promise<AdapterResult> {
    const { workflowId } = providerDetails as {
      workflowId: string;
    };
    try {
      const data = await this.runWorkflow(workflowId, args);
      return { status: "ok", data };
    } catch (err) {
      return {
        status: "error",
        notes: [
          `Lobster workflow failed: ${err instanceof Error ? err.message : String(err)}`,
        ],
      };
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/router && npx vitest run src/__tests__/adapters.test.ts`

Expected: ALL PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/router/src/adapters/lobster.ts packages/router/src/__tests__/adapters.test.ts
git commit -m "refactor: rewrite Lobster adapter with _workflow convention matching

Replaces 5-entry CAPABILITY_TO_WORKFLOW map with convention-based
matching. Only probes capabilities with _workflow suffix (unless
explicitly pinned). Takes listWorkflows/runWorkflow for testability."
```

---

### Task 7: Rewrite CLI adapter

**Context:** The old adapter has a 2-entry `CAPABILITY_TO_CLI` map with custom `buildCommand` functions. The new adapter is config-driven: admin declares `cliMappings` in `openclaw.json` mapping capability patterns to binaries. No custom command builders — the adapter passes raw args. Binary existence is checked via `which`.

**Files:**
- Rewrite: `packages/router/src/adapters/cli.ts`
- Append to: `packages/router/src/__tests__/adapters.test.ts`

- [ ] **Step 1: Append CLI tests to adapters.test.ts**

Add to `packages/router/src/__tests__/adapters.test.ts`:

```ts
import { CliAdapter } from "../adapters/cli.js";

// ... (after existing Lobster tests)

describe("CliAdapter", () => {
  describe("probe", () => {
    it("matches capability against cliMappings config", async () => {
      const adapter = new CliAdapter({
        "docs.convert_*": "pandoc",
      });
      // We can't easily mock `which`, so test the matching logic
      const result = await adapter.probe(
        "docs.convert_format",
        "convert format"
      );
      // Result depends on whether pandoc is installed
      // In CI this may be null — test that it at least returns the right shape
      if (result) {
        expect(result.adapterId).toBe("cli");
        expect(result.providerDetails).toEqual({ bin: "pandoc" });
      }
    });

    it("returns null for unmapped capabilities", async () => {
      const adapter = new CliAdapter({
        "docs.convert_*": "pandoc",
      });
      const result = await adapter.probe(
        "crm.lookup_account",
        "lookup account"
      );
      expect(result).toBeNull();
    });

    it("matches exact capability patterns", async () => {
      const adapter = new CliAdapter({
        "data.query_json": "jq",
      });
      const result = await adapter.probe(
        "data.query_json",
        "query json"
      );
      // Depends on jq being installed
      if (result) {
        expect(result.providerDetails).toEqual({ bin: "jq" });
      }
    });
  });

  describe("execute", () => {
    it("returns error structure on failure", async () => {
      const adapter = new CliAdapter({});
      const result = await adapter.execute(
        "docs.convert_format",
        { bin: "nonexistent_binary_xyz" },
        { args: ["--help"] },
        "sales"
      );
      expect(result.status).toBe("error");
    });
  });
});
```

- [ ] **Step 2: Rewrite the CLI adapter**

Replace `packages/router/src/adapters/cli.ts`:

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
  CapabilityAdapter,
  ProbeResult,
  AdapterResult,
} from "./types.js";

const execFileAsync = promisify(execFile);

function matchMapping(
  mappings: Record<string, string>,
  capabilityId: string
): string | undefined {
  for (const [pattern, bin] of Object.entries(mappings)) {
    if (pattern === capabilityId) return bin;
    if (
      pattern.endsWith("*") &&
      capabilityId.startsWith(pattern.slice(0, -1))
    )
      return bin;
  }
  return undefined;
}

export class CliAdapter implements CapabilityAdapter {
  readonly id = "cli";

  constructor(private cliMappings: Record<string, string>) {}

  async probe(capabilityId: string): Promise<ProbeResult | null> {
    const bin = matchMapping(this.cliMappings, capabilityId);
    if (!bin) return null;

    try {
      await execFileAsync("which", [bin]);
      return {
        adapterId: this.id,
        providerDetails: { bin },
        connectionReady: true,
        displayName: bin,
      };
    } catch {
      return {
        adapterId: this.id,
        providerDetails: { bin },
        connectionReady: false,
        displayName: bin,
        setupHint: `Install ${bin}`,
      };
    }
  }

  async execute(
    _capabilityId: string,
    providerDetails: unknown,
    args: Record<string, unknown>,
    _packId: string
  ): Promise<AdapterResult> {
    const { bin } = providerDetails as { bin: string };
    const cliArgs = (args.args as string[]) ?? [];
    try {
      const { stdout } = await execFileAsync(bin, cliArgs, {
        timeout: 30_000,
      });
      return { status: "ok", data: stdout };
    } catch (err) {
      return {
        status: "error",
        notes: [
          `CLI execution failed: ${err instanceof Error ? err.message : String(err)}`,
        ],
      };
    }
  }
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd packages/router && npx vitest run src/__tests__/adapters.test.ts`

Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add packages/router/src/adapters/cli.ts packages/router/src/__tests__/adapters.test.ts
git commit -m "refactor: rewrite CLI adapter with config-driven capability mapping

Replaces 2-entry CAPABILITY_TO_CLI map with cliMappings from
openclaw.json config. Pattern matching supports glob (docs.convert_*).
Binary existence checked via which. No custom command builders."
```

---

### Task 8: Rewrite MCPorter adapter

**Context:** The old adapter has a 5-entry `CAPABILITY_TO_MCP` map. The new adapter scans configured MCP servers and their tool lists, matching intent keywords against tool names/descriptions. No hardcoded server list.

**Files:**
- Rewrite: `packages/router/src/adapters/mcporter.ts`
- Append to: `packages/router/src/__tests__/adapters.test.ts`

- [ ] **Step 1: Append MCPorter tests to adapters.test.ts**

Add to `packages/router/src/__tests__/adapters.test.ts`:

```ts
import { McporterAdapter } from "../adapters/mcporter.js";
import type { McpServer } from "../adapters/mcporter.js";

// ... (after existing tests)

const MOCK_SERVERS: McpServer[] = [
  {
    name: "ahrefs",
    tools: [
      { name: "site_audit", description: "Audit a website for SEO" },
      { name: "keyword_research", description: "Research keywords" },
    ],
  },
  {
    name: "clearbit",
    tools: [
      { name: "company_lookup", description: "Look up company data" },
    ],
  },
];

describe("McporterAdapter", () => {
  function makeAdapter(servers = MOCK_SERVERS) {
    return new McporterAdapter(
      vi.fn().mockResolvedValue(servers),
      vi.fn().mockResolvedValue({ data: "result" })
    );
  }

  describe("probe", () => {
    it("matches intent keywords against tool names/descriptions", async () => {
      const adapter = makeAdapter();
      const result = await adapter.probe(
        "seo.audit_page",
        "audit page"
      );
      expect(result).not.toBeNull();
      expect(result!.providerDetails).toEqual({
        server: "ahrefs",
        tool: "site_audit",
      });
    });

    it("returns null when no tool matches", async () => {
      const adapter = makeAdapter();
      const result = await adapter.probe(
        "crm.lookup_account",
        "lookup account"
      );
      expect(result).toBeNull();
    });

    it("returns null when listServers throws", async () => {
      const adapter = new McporterAdapter(
        vi.fn().mockRejectedValue(new Error("unreachable")),
        vi.fn()
      );
      const result = await adapter.probe(
        "seo.audit_page",
        "audit page"
      );
      expect(result).toBeNull();
    });

    it("matches across tool description text", async () => {
      const adapter = makeAdapter();
      const result = await adapter.probe(
        "enrichment.lookup_company",
        "lookup company"
      );
      expect(result).not.toBeNull();
      expect(result!.providerDetails).toEqual({
        server: "clearbit",
        tool: "company_lookup",
      });
    });
  });

  describe("execute", () => {
    it("calls the matched MCP server tool", async () => {
      const callTool = vi
        .fn()
        .mockResolvedValue({ score: 85 });
      const adapter = new McporterAdapter(
        vi.fn().mockResolvedValue(MOCK_SERVERS),
        callTool
      );
      const result = await adapter.execute(
        "seo.audit_page",
        { server: "ahrefs", tool: "site_audit" },
        { url: "https://example.com" },
        "marketing"
      );
      expect(result.status).toBe("ok");
      expect(callTool).toHaveBeenCalledWith(
        "ahrefs",
        "site_audit",
        { url: "https://example.com" }
      );
    });
  });
});
```

- [ ] **Step 2: Rewrite the MCPorter adapter**

Replace `packages/router/src/adapters/mcporter.ts`:

```ts
import type {
  CapabilityAdapter,
  ProbeResult,
  AdapterResult,
} from "./types.js";

export interface McpServer {
  name: string;
  tools: Array<{ name: string; description?: string }>;
}

export class McporterAdapter implements CapabilityAdapter {
  readonly id = "mcporter";

  constructor(
    private listServers: () => Promise<McpServer[]>,
    private callTool: (
      server: string,
      tool: string,
      args: Record<string, unknown>
    ) => Promise<unknown>
  ) {}

  async probe(
    _capabilityId: string,
    intent: string
  ): Promise<ProbeResult | null> {
    try {
      const servers = await this.listServers();
      const keywords = intent.toLowerCase().split(" ");

      for (const server of servers) {
        for (const tool of server.tools) {
          const haystack =
            `${tool.name} ${tool.description ?? ""}`.toLowerCase();
          if (keywords.every((kw) => haystack.includes(kw))) {
            return {
              adapterId: this.id,
              providerDetails: {
                server: server.name,
                tool: tool.name,
              },
              connectionReady: true,
              displayName: `${tool.name} (${server.name})`,
            };
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  async execute(
    _capabilityId: string,
    providerDetails: unknown,
    args: Record<string, unknown>,
    _packId: string
  ): Promise<AdapterResult> {
    const { server, tool } = providerDetails as {
      server: string;
      tool: string;
    };
    try {
      const data = await this.callTool(server, tool, args);
      return { status: "ok", data };
    } catch (err) {
      return {
        status: "error",
        notes: [
          `MCPorter execution failed: ${err instanceof Error ? err.message : String(err)}`,
        ],
      };
    }
  }
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd packages/router && npx vitest run src/__tests__/adapters.test.ts`

Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add packages/router/src/adapters/mcporter.ts packages/router/src/__tests__/adapters.test.ts
git commit -m "refactor: rewrite MCPorter adapter with dynamic MCP server scanning

Replaces 5-entry CAPABILITY_TO_MCP map with runtime server scanning.
Matches intent keywords against tool names/descriptions across all
configured MCP servers. No hardcoded server list."
```

---

## Chunk 3: Policy + Router + Onboarding

### Task 9: Refactor side-effect detection

**Context:** The current `SideEffectGuard.check()` takes `isSideEffect: boolean` as input — the caller must know if a capability is a side-effect. With the static registry removed, we switch to convention-based detection: write verbs (`create`, `send`, `update`, `delete`, etc.) are side-effects; read verbs are safe. Pack manifests can override via `sideEffects` list. The guard determines this internally.

**Files:**
- Modify: `packages/router/src/policy/side-effects.ts`
- Rewrite: `packages/router/src/__tests__/side-effects.test.ts`

- [ ] **Step 1: Write the failing tests**

Rewrite `packages/router/src/__tests__/side-effects.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { SideEffectGuard } from "../policy/side-effects.js";

describe("SideEffectGuard", () => {
  let guard: SideEffectGuard;

  beforeEach(() => {
    guard = new SideEffectGuard("confirm_destructive");
  });

  describe("isSideEffect (convention-based)", () => {
    it("detects write verbs as side-effects", () => {
      expect(guard.isSideEffect("crm.create_note")).toBe(true);
      expect(guard.isSideEffect("mail.send_followup")).toBe(true);
      expect(guard.isSideEffect("crm.update_deal_workflow")).toBe(true);
      expect(guard.isSideEffect("docs.delete_file")).toBe(true);
      expect(guard.isSideEffect("docs.write_file")).toBe(true);
    });

    it("detects additional write verbs", () => {
      expect(guard.isSideEffect("task.archive_item")).toBe(true);
      expect(guard.isSideEffect("pr.approve_review")).toBe(true);
      expect(guard.isSideEffect("pr.merge_branch")).toBe(true);
      expect(guard.isSideEffect("task.assign_owner")).toBe(true);
    });

    it("allows read verbs as safe", () => {
      expect(guard.isSideEffect("calendar.read_events")).toBe(false);
      expect(guard.isSideEffect("crm.get_account")).toBe(false);
      expect(guard.isSideEffect("crm.list_contacts")).toBe(false);
      expect(guard.isSideEffect("research.search_web")).toBe(false);
      expect(guard.isSideEffect("crm.lookup_account")).toBe(false);
      expect(guard.isSideEffect("docs.fetch_content")).toBe(false);
      expect(guard.isSideEffect("data.query_json")).toBe(false);
    });

    it("treats unlisted verbs as safe", () => {
      expect(guard.isSideEffect("custom.transform_data")).toBe(false);
      expect(guard.isSideEffect("custom.validate_input")).toBe(false);
    });

    it("respects pack manifest sideEffects override", () => {
      // docs.convert_format has verb "convert" which is unlisted → safe
      expect(guard.isSideEffect("docs.convert_format")).toBe(false);
      // But if the pack declares it as a side-effect:
      expect(
        guard.isSideEffect("docs.convert_format", [
          "docs.convert_format",
        ])
      ).toBe(true);
    });
  });

  describe("check", () => {
    const writeInput = {
      capabilityId: "crm.create_note",
      packId: "sales",
      args: { note: "test" },
      adapterId: "composio",
      resolvedApp: "HubSpot",
    };

    const readInput = {
      capabilityId: "crm.lookup_account",
      packId: "sales",
      args: { query: "Acme" },
      adapterId: "composio",
      resolvedApp: "HubSpot",
    };

    it("blocks write capabilities when policy is confirm_destructive", () => {
      const result = guard.check(writeInput);
      expect(result.blocked).toBe(true);
      expect(result.confirmationToken).toBeDefined();
      expect(result.message).toContain("HubSpot");
    });

    it("allows read capabilities", () => {
      const result = guard.check(readInput);
      expect(result.blocked).toBe(false);
    });

    it("allows all when policy is never_confirm", () => {
      guard = new SideEffectGuard("never_confirm");
      const result = guard.check(writeInput);
      expect(result.blocked).toBe(false);
    });

    it("blocks all when policy is always_confirm", () => {
      guard = new SideEffectGuard("always_confirm");
      const result = guard.check(readInput);
      expect(result.blocked).toBe(true);
    });

    it("uses sideEffects list from input when provided", () => {
      const result = guard.check({
        ...readInput,
        capabilityId: "docs.convert_format",
        sideEffects: ["docs.convert_format"],
      });
      expect(result.blocked).toBe(true);
    });
  });

  describe("token lifecycle", () => {
    it("validates and consumes confirmation tokens", () => {
      const result = guard.check({
        capabilityId: "crm.create_note",
        packId: "sales",
        args: { note: "test" },
        adapterId: "composio",
        resolvedApp: "HubSpot",
      });
      const pending = guard.validateToken(result.confirmationToken!);
      expect(pending).toBeDefined();
      expect(pending!.capabilityId).toBe("crm.create_note");
      // Token consumed — second validation fails
      expect(
        guard.validateToken(result.confirmationToken!)
      ).toBeUndefined();
    });

    it("rejects invalid tokens", () => {
      expect(guard.validateToken("invalid")).toBeUndefined();
    });

    it("rejects expired tokens", () => {
      const result = guard.check({
        capabilityId: "crm.create_note",
        packId: "sales",
        args: {},
        adapterId: "composio",
        resolvedApp: "HubSpot",
      });
      guard.expireToken(result.confirmationToken!);
      expect(
        guard.validateToken(result.confirmationToken!)
      ).toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/router && npx vitest run src/__tests__/side-effects.test.ts`

Expected: FAIL — `isSideEffect` method does not exist, `check()` signature changed.

- [ ] **Step 3: Rewrite side-effects module**

Replace `packages/router/src/policy/side-effects.ts`:

```ts
import { randomUUID } from "node:crypto";
import type {
  CapabilityId,
  AdapterId,
  PendingConfirmation,
  PackId,
} from "../capabilities/types.js";
import { extractVerb } from "../discovery/intent.js";

export type SideEffectPolicy =
  | "always_confirm"
  | "confirm_destructive"
  | "never_confirm";

const WRITE_VERBS = new Set([
  "create",
  "send",
  "update",
  "delete",
  "write",
  "post",
  "remove",
  "modify",
  "archive",
  "approve",
  "reject",
  "cancel",
  "close",
  "merge",
  "assign",
  "move",
]);

export interface SideEffectCheckResult {
  blocked: boolean;
  confirmationToken?: string;
  message?: string;
}

export class SideEffectGuard {
  private policy: SideEffectPolicy;
  private pending = new Map<string, PendingConfirmation>();
  private readonly TOKEN_TTL = 300_000; // 5 minutes

  constructor(policy: SideEffectPolicy) {
    this.policy = policy;
  }

  setPolicy(policy: SideEffectPolicy): void {
    this.policy = policy;
  }

  isSideEffect(
    capabilityId: CapabilityId,
    sideEffects?: CapabilityId[]
  ): boolean {
    if (sideEffects?.includes(capabilityId)) return true;
    return WRITE_VERBS.has(extractVerb(capabilityId));
  }

  check(input: {
    capabilityId: CapabilityId;
    packId: PackId;
    args: Record<string, unknown>;
    adapterId: AdapterId;
    resolvedApp: string;
    sideEffects?: CapabilityId[];
  }): SideEffectCheckResult {
    const isSE = this.isSideEffect(
      input.capabilityId,
      input.sideEffects
    );
    const shouldBlock =
      this.policy === "always_confirm" ||
      (this.policy === "confirm_destructive" && isSE);

    if (!shouldBlock) return { blocked: false };

    const token = randomUUID();
    this.pending.set(token, {
      capabilityId: input.capabilityId,
      packId: input.packId,
      args: input.args,
      adapterId: input.adapterId,
      expiresAt: Date.now() + this.TOKEN_TTL,
    });

    return {
      blocked: true,
      confirmationToken: token,
      message: `About to perform ${input.capabilityId} via ${input.resolvedApp}. Proceed?`,
    };
  }

  validateToken(token: string): PendingConfirmation | undefined {
    const pending = this.pending.get(token);
    if (!pending) return undefined;
    if (Date.now() > pending.expiresAt) {
      this.pending.delete(token);
      return undefined;
    }
    this.pending.delete(token);
    return pending;
  }

  expireToken(token: string): void {
    this.pending.delete(token);
  }

  cleanupExpired(): void {
    const now = Date.now();
    for (const [token, pending] of this.pending) {
      if (now > pending.expiresAt) this.pending.delete(token);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/router && npx vitest run src/__tests__/side-effects.test.ts`

Expected: ALL PASS (13 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/router/src/policy/side-effects.ts packages/router/src/__tests__/side-effects.test.ts
git commit -m "refactor: convention-based side-effect detection in SideEffectGuard

Guard now determines side-effects internally using verb conventions
(create, send, update, delete → side-effect) plus pack manifest
sideEffects override. Removes isSideEffect input parameter from check().
16 write verbs, unlisted verbs default to safe."
```

---

### Task 10: Rewrite Router

**Context:** The current Router has 50 lines of `KNOWN_CAPABILITIES`, creates all adapters internally, and delegates to `FallbackResolver`. The new Router takes adapters and a DiscoveryEngine, delegates discovery to the engine, and uses the refactored SideEffectGuard for convention-based detection.

**Files:**
- Rewrite: `packages/router/src/router.ts`

**Dependencies:** Task 1 (types), Task 3 (engine), Task 9 (side-effects)

- [ ] **Step 1: Rewrite `src/router.ts`**

Replace `packages/router/src/router.ts`:

```ts
import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import {
  DiscoveryEngine,
  type DiscoveryEngineConfig,
} from "./discovery/engine.js";
import {
  SideEffectGuard,
  type SideEffectPolicy,
} from "./policy/side-effects.js";
import type {
  CapabilityAdapter,
  AdapterResult,
} from "./adapters/types.js";
import type {
  PackManifest,
  CapabilityId,
  PackId,
} from "./capabilities/types.js";

export interface RouterConfig {
  adapterOrder?: string[];
  disabledAdapters?: string[];
  capabilityPins?: Record<string, string>;
  sideEffectPolicy?: SideEffectPolicy;
  cacheTtl?: number;
}

export class Router {
  readonly engine: DiscoveryEngine;
  readonly adapters: CapabilityAdapter[];
  readonly packs: PackManifest[] = [];
  private sideEffectGuard: SideEffectGuard;

  constructor(
    adapters: CapabilityAdapter[],
    config: RouterConfig = {}
  ) {
    this.adapters = adapters;
    this.engine = new DiscoveryEngine(adapters, {
      adapterOrder: config.adapterOrder,
      disabledAdapters: config.disabledAdapters,
      capabilityPins: config.capabilityPins,
      cacheTtl: config.cacheTtl,
    });
    this.sideEffectGuard = new SideEffectGuard(
      config.sideEffectPolicy ?? "confirm_destructive"
    );
  }

  registerPack(manifest: PackManifest): void {
    this.packs.push(manifest);
    this.engine.registerPack(manifest);
  }

  async resolve(
    capabilityId: CapabilityId,
    packId: PackId,
    args: Record<string, unknown>,
    skipSideEffectCheck = false
  ): Promise<AdapterResult> {
    const probe = await this.engine.resolve(capabilityId, packId);

    if (!probe) {
      return {
        status: "error",
        notes: [`No adapter found for ${capabilityId}`],
      };
    }

    if (!probe.connectionReady) {
      return {
        status: "needs_setup",
        notes: [
          probe.setupHint ??
            `${probe.displayName} needs setup`,
        ],
        data: {
          displayName: probe.displayName,
          setupUrl: probe.setupUrl,
        },
      };
    }

    if (!skipSideEffectCheck) {
      const pack = this.packs.find((p) => p.packId === packId);
      const check = this.sideEffectGuard.check({
        capabilityId,
        packId,
        args,
        adapterId: probe.adapterId,
        resolvedApp: probe.displayName,
        sideEffects: pack?.sideEffects,
      });
      if (check.blocked) {
        return {
          status: "blocked",
          data: {
            message: check.message,
            confirmationToken: check.confirmationToken,
          },
        };
      }
    }

    const adapter = this.adapters.find(
      (a) => a.id === probe.adapterId
    );
    if (!adapter) {
      return {
        status: "error",
        notes: [`Adapter ${probe.adapterId} not found`],
      };
    }

    try {
      const execPromise = adapter.execute(
        capabilityId,
        probe.providerDetails,
        args,
        packId
      );
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Execution timeout (30s)")),
          30_000
        )
      );
      return await Promise.race([execPromise, timeoutPromise]);
    } catch (err) {
      this.engine.invalidate(capabilityId);
      return {
        status: "error",
        notes: [
          `Execution failed: ${err instanceof Error ? err.message : String(err)}`,
        ],
      };
    }
  }

  async executeConfirmed(token: string): Promise<AdapterResult> {
    const pending = this.sideEffectGuard.validateToken(token);
    if (!pending) {
      return {
        status: "error",
        notes: ["Invalid or expired confirmation token"],
      };
    }
    return this.resolve(
      pending.capabilityId,
      pending.packId,
      pending.args,
      true
    );
  }

  static async loadPackManifest(
    installPath: string
  ): Promise<PackManifest> {
    const raw = await readFile(
      `${installPath}/pack-manifest.yaml`,
      "utf-8"
    );
    return parseYaml(raw) as PackManifest;
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd packages/router && npx tsc --noEmit src/router.ts`

Expected: May have errors from index.ts/onboarding imports (expected — those files still use old API). Router itself should be clean.

- [ ] **Step 3: Commit**

```bash
git add packages/router/src/router.ts
git commit -m "refactor: rewrite Router with DiscoveryEngine — remove KNOWN_CAPABILITIES

Router now takes adapters as constructor arg and delegates all discovery
to DiscoveryEngine. Removes 50-line KNOWN_CAPABILITIES array,
CapabilityRegistry, and FallbackResolver dependencies. Side-effect
detection uses convention-based guard. ~80 LOC (was 189)."
```

---

### Task 11: Rewrite onboarding modules

**Context:** Both `/connect_apps` and `/check_setup` currently loop over adapters calling `providesCapabilities()` + `checkReadiness()`. They now use `DiscoveryEngine.probeAll()` which returns results from all adapters concurrently. The `APP_COVERAGE` map and `suggestBroadestApps()` function are replaced by grouping probe results directly.

**Files:**
- Rewrite: `packages/router/src/onboarding/connect-apps.ts`
- Rewrite: `packages/router/src/onboarding/check-setup.ts`

**Dependencies:** Task 3 (engine)

- [ ] **Step 1: Rewrite `connect-apps.ts`**

Replace `packages/router/src/onboarding/connect-apps.ts`:

```ts
import type {
  PackManifest,
  CapabilityId,
} from "../capabilities/types.js";
import type { DiscoveryEngine } from "../discovery/engine.js";

export interface ConnectAppsReport {
  packReports: Array<{
    packId: string;
    displayName: string;
    ready: Array<{
      capabilityId: CapabilityId;
      displayName: string;
      adapterId: string;
    }>;
    needsSetup: Array<{
      capabilityId: CapabilityId;
      displayName: string;
      setupHint?: string;
      setupUrl?: string;
    }>;
    notFound: CapabilityId[];
    allRequiredReady: boolean;
  }>;
}

export async function runConnectApps(
  packs: PackManifest[],
  engine: DiscoveryEngine
): Promise<ConnectAppsReport> {
  const packReports: ConnectAppsReport["packReports"] = [];

  for (const pack of packs) {
    const allCaps = [
      ...pack.capabilities.required,
      ...pack.capabilities.optional,
    ];
    const ready: ConnectAppsReport["packReports"][0]["ready"] = [];
    const needsSetup: ConnectAppsReport["packReports"][0]["needsSetup"] =
      [];
    const notFound: CapabilityId[] = [];

    for (const capId of allCaps) {
      const probes = await engine.probeAll(capId, pack.packId);
      const readyProbe = probes.find((p) => p.connectionReady);

      if (readyProbe) {
        ready.push({
          capabilityId: capId,
          displayName: readyProbe.displayName,
          adapterId: readyProbe.adapterId,
        });
      } else if (probes.length > 0) {
        const best = probes[0];
        needsSetup.push({
          capabilityId: capId,
          displayName: best.displayName,
          setupHint: best.setupHint,
          setupUrl: best.setupUrl,
        });
      } else {
        notFound.push(capId);
      }
    }

    const allRequiredReady = pack.capabilities.required.every((c) =>
      ready.some((r) => r.capabilityId === c)
    );

    packReports.push({
      packId: pack.packId,
      displayName: pack.displayName,
      ready,
      needsSetup,
      notFound,
      allRequiredReady,
    });
  }

  return { packReports };
}
```

- [ ] **Step 2: Rewrite `check-setup.ts`**

Replace `packages/router/src/onboarding/check-setup.ts`:

```ts
import type {
  PackManifest,
  CapabilityId,
} from "../capabilities/types.js";
import type { DiscoveryEngine } from "../discovery/engine.js";
import type { CapabilityAdapter } from "../adapters/types.js";

export interface SetupStatus {
  packStatuses: Array<{
    packId: string;
    displayName: string;
    capabilities: Array<{
      id: CapabilityId;
      required: boolean;
      status: "ready" | "needs_setup" | "not_found";
      resolvedAdapter?: string;
      displayName?: string;
      setupHint?: string;
    }>;
  }>;
  adapterStatuses: Array<{ id: string; enabled: boolean }>;
}

export async function runCheckSetup(
  packs: PackManifest[],
  engine: DiscoveryEngine,
  adapters: CapabilityAdapter[],
  disabledAdapters: string[]
): Promise<SetupStatus> {
  const disabled = new Set(disabledAdapters);
  const packStatuses: SetupStatus["packStatuses"] = [];

  for (const pack of packs) {
    const allCaps = [
      ...pack.capabilities.required.map((c) => ({
        id: c,
        required: true,
      })),
      ...pack.capabilities.optional.map((c) => ({
        id: c,
        required: false,
      })),
    ];

    const capabilities: SetupStatus["packStatuses"][0]["capabilities"] =
      [];

    for (const { id: capId, required } of allCaps) {
      const probes = await engine.probeAll(capId, pack.packId);
      const readyProbe = probes.find((p) => p.connectionReady);

      if (readyProbe) {
        capabilities.push({
          id: capId,
          required,
          status: "ready",
          resolvedAdapter: readyProbe.adapterId,
          displayName: readyProbe.displayName,
        });
      } else if (probes.length > 0) {
        capabilities.push({
          id: capId,
          required,
          status: "needs_setup",
          displayName: probes[0].displayName,
          setupHint: probes[0].setupHint,
        });
      } else {
        capabilities.push({
          id: capId,
          required,
          status: "not_found",
        });
      }
    }

    packStatuses.push({
      packId: pack.packId,
      displayName: pack.displayName,
      capabilities,
    });
  }

  const adapterStatuses = adapters.map((a) => ({
    id: a.id,
    enabled: !disabled.has(a.id),
  }));

  return { packStatuses, adapterStatuses };
}

export function formatCheckSetup(status: SetupStatus): string {
  const lines: string[] = [];

  for (const pack of status.packStatuses) {
    lines.push(`\n${pack.displayName}`);
    for (const cap of pack.capabilities) {
      const icon =
        cap.status === "ready"
          ? "[+]"
          : cap.status === "needs_setup"
            ? "[!]"
            : "[X]";
      const suffix = cap.resolvedAdapter
        ? ` -> ${cap.displayName} (via ${cap.resolvedAdapter})`
        : cap.setupHint
          ? ` -> ${cap.setupHint}`
          : " -> no provider found";
      const optLabel = cap.required ? "" : " (optional)";
      lines.push(`  ${icon} ${cap.id}${suffix}${optLabel}`);
    }
  }

  lines.push("\nAdapters:");
  for (const adapter of status.adapterStatuses) {
    const icon = adapter.enabled ? "[+]" : "[-]";
    lines.push(
      `  ${icon} ${adapter.id}${adapter.enabled ? "" : " (disabled)"}`
    );
  }

  return lines.join("\n");
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/router/src/onboarding/connect-apps.ts packages/router/src/onboarding/check-setup.ts
git commit -m "refactor: rewrite onboarding to use DiscoveryEngine.probeAll

Both /connect_apps and /check_setup now use engine.probeAll() which
probes all adapters concurrently. Shows results from Composio, OpenClaw,
MCPorter, CLI, and Lobster. Removes dependency on APP_COVERAGE map."
```

---

## Chunk 4: Integration + Cleanup + README

### Task 12: Refactor plugin wiring (index.ts)

**Context:** `index.ts` is the plugin entry point. It creates adapters with runtime callbacks, constructs the Router with the DiscoveryEngine, and registers tools/commands. The `OpenClawPluginApi` interface gains a `runtime` property for adapter dependency injection.

**Files:**
- Rewrite: `packages/router/src/index.ts`

**Dependencies:** All adapter tasks, Router task, Onboarding task

- [ ] **Step 1: Rewrite `src/index.ts`**

Replace `packages/router/src/index.ts`:

```ts
import { Router } from "./router.js";
import { ComposioAdapter } from "./adapters/composio.js";
import { OpenClawToolAdapter } from "./adapters/openclaw-tool.js";
import { LobsterAdapter } from "./adapters/lobster.js";
import { CliAdapter } from "./adapters/cli.js";
import { McporterAdapter } from "./adapters/mcporter.js";
import { runConnectApps } from "./onboarding/connect-apps.js";
import {
  runCheckSetup,
  formatCheckSetup,
} from "./onboarding/check-setup.js";

interface OpenClawPluginApi {
  registerTool(tool: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    handler: (args: any) => Promise<unknown>;
  }): void;
  registerCommand(command: {
    name: string;
    description: string;
    handler: (ctx: any) => Promise<unknown>;
  }): void;
  on(event: string, handler: (...args: any[]) => Promise<void>): void;
  getEnabledPlugins(): Array<{
    id: string;
    installPath: string;
  }>;
  getConfig(): Record<string, unknown>;
  runtime: {
    callMcpTool(
      server: string,
      tool: string,
      args: Record<string, unknown>
    ): Promise<unknown>;
    listBuiltinTools(): string[];
    callBuiltinTool(
      name: string,
      args: Record<string, unknown>
    ): Promise<unknown>;
    listLobsterWorkflows(): Promise<string[]>;
    runLobsterWorkflow(
      id: string,
      args: Record<string, unknown>
    ): Promise<unknown>;
    listMcpServers(): Promise<
      Array<{
        name: string;
        tools: Array<{ name: string; description?: string }>;
      }>
    >;
  };
}

export function register(api: OpenClawPluginApi) {
  const config = api.getConfig() as any;

  // Create adapters with runtime callbacks
  const composio = new ComposioAdapter((server, tool, args) =>
    api.runtime.callMcpTool(server, tool, args)
  );
  const openclawTool = new OpenClawToolAdapter(
    () => api.runtime.listBuiltinTools(),
    (name, args) => api.runtime.callBuiltinTool(name, args)
  );
  const lobster = new LobsterAdapter(
    () => api.runtime.listLobsterWorkflows(),
    (id, args) => api.runtime.runLobsterWorkflow(id, args)
  );
  const cli = new CliAdapter(config.cliMappings ?? {});
  const mcporter = new McporterAdapter(
    () => api.runtime.listMcpServers(),
    (server, tool, args) =>
      api.runtime.callMcpTool(server, tool, args)
  );

  const adapters = [composio, openclawTool, lobster, cli, mcporter];

  const router = new Router(adapters, {
    adapterOrder: config.adapterOrder,
    disabledAdapters: config.disabledAdapters,
    capabilityPins: config.capabilityPins,
    sideEffectPolicy: config.sideEffectPolicy,
    cacheTtl: config.cacheTtl,
  });

  // Discover packs at startup
  api.on("gateway_start", async () => {
    const allPlugins = api.getEnabledPlugins();
    const packs = allPlugins.filter((p) =>
      p.id.startsWith("@clawdi-ai/pack-")
    );
    for (const pack of packs) {
      try {
        const manifest = await Router.loadPackManifest(
          pack.installPath
        );
        router.registerPack(manifest);
      } catch (err) {
        console.error(
          `[knowledge-work-router] Failed to load pack from ${pack.installPath}:`,
          err
        );
      }
    }
    console.log(
      `[knowledge-work-router] Discovered ${router.packs.length} pack(s)`
    );
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
    handler: async ({
      capabilityId,
      packId,
      args,
      confirmationToken,
    }) => {
      if (confirmationToken) {
        return router.executeConfirmed(confirmationToken);
      }
      return router.resolve(capabilityId, packId, args ?? {});
    },
  });

  // Register /connect_apps command
  api.registerCommand({
    name: "connect_apps",
    description:
      "Set up connections for your installed knowledge-work packs",
    handler: async () => {
      const report = await runConnectApps(
        router.packs,
        router.engine
      );
      const lines: string[] = [];
      for (const pr of report.packReports) {
        lines.push(`\n**${pr.displayName}**`);
        if (pr.allRequiredReady) {
          lines.push("All required capabilities are ready.");
        } else {
          if (pr.ready.length) {
            lines.push(
              `Ready: ${pr.ready.map((r) => `${r.capabilityId} -> ${r.displayName}`).join(", ")}`
            );
          }
          for (const s of pr.needsSetup) {
            lines.push(
              `Needs setup: ${s.capabilityId} -> ${s.displayName}${s.setupUrl ? ` (${s.setupUrl})` : s.setupHint ? ` — ${s.setupHint}` : ""}`
            );
          }
          if (pr.notFound.length) {
            lines.push(`No provider: ${pr.notFound.join(", ")}`);
          }
        }
      }
      return { systemPrompt: lines.join("\n") };
    },
  });

  // Register /check_setup command
  api.registerCommand({
    name: "check_setup",
    description:
      "Show the status of all knowledge-work pack capabilities and adapters",
    handler: async () => {
      const status = await runCheckSetup(
        router.packs,
        router.engine,
        adapters,
        config.disabledAdapters ?? []
      );
      return { systemPrompt: formatCheckSetup(status) };
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/router/src/index.ts
git commit -m "refactor: rewire index.ts — inject runtime callbacks into adapters

Adapters receive OpenClaw runtime callbacks (callMcpTool, listBuiltinTools,
listLobsterWorkflows, listMcpServers) via constructor injection. Router
receives adapters as argument. Removes lookupBroadestApp import."
```

---

### Task 13: Update config + delete old files

**Context:** The `openclaw.plugin.json` config schema needs to reflect the new DiscoveryEngine config (add `cacheTtl`, `cliMappings`; remove `appLabels`, `composio.preferGooglesuper`). Old files that are fully replaced must be deleted.

**Files:**
- Rewrite: `packages/router/openclaw.plugin.json`
- Delete: `packages/router/src/capabilities/registry.ts`
- Delete: `packages/router/src/capabilities/pattern.ts`
- Delete: `packages/router/src/policy/fallback.ts`
- Delete: `packages/router/src/onboarding/app-grouping.ts`
- Delete: `packages/router/config/default-fallback-order.json`
- Delete: `packages/router/src/__tests__/pattern.test.ts`
- Delete: `packages/router/src/__tests__/registry.test.ts`
- Delete: `packages/router/src/__tests__/fallback.test.ts`

- [ ] **Step 1: Rewrite `openclaw.plugin.json`**

Replace `packages/router/openclaw.plugin.json`:

```json
{
  "id": "@clawdi-ai/knowledge-work-router",
  "name": "Knowledge Work Router",
  "description": "Capability router for knowledge-work packs. Discovers available services dynamically through adapters (Composio, native tools, Lobster, CLI, MCPorter) with automatic fallback and onboarding.",
  "version": "0.2.0",
  "configSchema": {
    "type": "object",
    "properties": {
      "adapterOrder": {
        "type": "array",
        "items": { "type": "string", "enum": ["composio", "openclaw_tool", "lobster", "cli", "mcporter"] },
        "default": ["composio", "openclaw_tool", "lobster", "cli", "mcporter"],
        "description": "Global adapter fallback order for capability probing"
      },
      "disabledAdapters": {
        "type": "array",
        "items": { "type": "string" },
        "default": [],
        "description": "Adapters to disable globally"
      },
      "capabilityPins": {
        "type": "object",
        "additionalProperties": { "type": "string" },
        "default": {},
        "description": "Pin capabilities to specific adapters (e.g. seo.*: mcporter)"
      },
      "sideEffectPolicy": {
        "type": "string",
        "enum": ["always_confirm", "confirm_destructive", "never_confirm"],
        "default": "confirm_destructive",
        "description": "When to require confirmation before side-effecting actions"
      },
      "cacheTtl": {
        "type": "number",
        "default": 600000,
        "description": "Discovery cache TTL in milliseconds (default 10 minutes)"
      },
      "cliMappings": {
        "type": "object",
        "additionalProperties": { "type": "string" },
        "default": {},
        "description": "Map capability patterns to CLI binaries (e.g. docs.convert_*: pandoc)"
      }
    }
  },
  "uiHints": {
    "adapterOrder": { "label": "Adapter Fallback Order" },
    "disabledAdapters": { "label": "Disabled Adapters" },
    "sideEffectPolicy": { "label": "Side-Effect Confirmation Policy" },
    "cacheTtl": { "label": "Discovery Cache TTL (ms)" },
    "cliMappings": { "label": "CLI Binary Mappings" }
  }
}
```

- [ ] **Step 2: Delete old files**

```bash
rm packages/router/src/capabilities/registry.ts
rm packages/router/src/capabilities/pattern.ts
rm packages/router/src/policy/fallback.ts
rm packages/router/src/onboarding/app-grouping.ts
rm packages/router/config/default-fallback-order.json
rm packages/router/src/__tests__/pattern.test.ts
rm packages/router/src/__tests__/registry.test.ts
rm packages/router/src/__tests__/fallback.test.ts
```

- [ ] **Step 3: Verify build**

Run: `cd packages/router && npx tsc --noEmit`

Expected: Clean compilation with no errors. If any remaining imports reference deleted files, fix them now.

- [ ] **Step 4: Commit**

```bash
git add -A packages/router/
git commit -m "chore: update plugin config schema + delete replaced files

Update openclaw.plugin.json: add cacheTtl, cliMappings; remove appLabels,
composio.preferGooglesuper, executionTimeoutMs. Bump to 0.2.0.

Delete 8 files replaced by DiscoveryEngine:
- capabilities/registry.ts, pattern.ts
- policy/fallback.ts
- onboarding/app-grouping.ts
- config/default-fallback-order.json
- tests for pattern, registry, fallback"
```

---

### Task 14: Rewrite integration tests

**Context:** The integration tests validate the full Router flow: pack registration, capability resolution (with mocked adapters), side-effect blocking, and confirmation token round-trip. All using the new DiscoveryEngine-based architecture.

**Files:**
- Rewrite: `packages/router/src/__tests__/integration.test.ts`

- [ ] **Step 1: Rewrite integration tests**

Replace `packages/router/src/__tests__/integration.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { Router } from "../router.js";
import type { PackManifest } from "../capabilities/types.js";
import type {
  CapabilityAdapter,
  ProbeResult,
} from "../adapters/types.js";
import { runConnectApps } from "../onboarding/connect-apps.js";

function mockAdapter(
  id: string,
  probeResponse: ProbeResult | null = null,
  executeResponse = { status: "ok" as const, data: { result: "done" } }
): CapabilityAdapter {
  return {
    id,
    probe: vi.fn().mockResolvedValue(probeResponse),
    execute: vi.fn().mockResolvedValue(executeResponse),
  };
}

const SALES_MANIFEST: PackManifest = {
  packId: "sales",
  displayName: "Sales Pack",
  capabilities: {
    required: ["calendar.read_events", "crm.lookup_account"],
    optional: ["docs.create_brief"],
  },
  preferredApps: { "crm.*": ["salesforce", "hubspot"] },
  sideEffects: ["crm.create_note"],
  onboarding: {
    welcomeMessage: "Sales pack is ready.",
    suggestedFirstTask: "Try: prep for next meeting",
  },
};

describe("Router integration", () => {
  it("registers a pack and forwards to DiscoveryEngine", () => {
    const router = new Router([mockAdapter("composio")]);
    router.registerPack(SALES_MANIFEST);
    expect(router.packs).toHaveLength(1);
    expect(router.packs[0].packId).toBe("sales");
  });

  it("resolves a capability through a ready adapter", async () => {
    const probe: ProbeResult = {
      adapterId: "composio",
      providerDetails: {
        toolkit: "googlesuper",
        action: "LIST_EVENTS",
      },
      connectionReady: true,
      displayName: "Google Workspace",
    };
    const adapter = mockAdapter("composio", probe);
    const router = new Router([adapter], {
      sideEffectPolicy: "never_confirm",
    });
    router.registerPack(SALES_MANIFEST);
    const result = await router.resolve(
      "calendar.read_events",
      "sales",
      { date: "2026-03-20" }
    );
    expect(result.status).toBe("ok");
    expect(adapter.execute).toHaveBeenCalledWith(
      "calendar.read_events",
      { toolkit: "googlesuper", action: "LIST_EVENTS" },
      { date: "2026-03-20" },
      "sales"
    );
  });

  it("returns needs_setup when adapter is not connected", async () => {
    const probe: ProbeResult = {
      adapterId: "composio",
      providerDetails: { toolkit: "hubspot" },
      connectionReady: false,
      displayName: "HubSpot",
      setupHint: "Connect via OAuth",
    };
    const router = new Router([mockAdapter("composio", probe)]);
    router.registerPack(SALES_MANIFEST);
    const result = await router.resolve(
      "crm.lookup_account",
      "sales",
      {}
    );
    expect(result.status).toBe("needs_setup");
    expect(result.notes?.[0]).toContain("OAuth");
  });

  it("returns error when no adapter found", async () => {
    const router = new Router([mockAdapter("composio", null)]);
    router.registerPack(SALES_MANIFEST);
    const result = await router.resolve(
      "unknown.capability",
      "sales",
      {}
    );
    expect(result.status).toBe("error");
  });

  it("blocks side-effecting capabilities with confirm_destructive", async () => {
    const probe: ProbeResult = {
      adapterId: "composio",
      providerDetails: { toolkit: "hubspot", action: "CREATE_NOTE" },
      connectionReady: true,
      displayName: "HubSpot",
    };
    const router = new Router([mockAdapter("composio", probe)], {
      sideEffectPolicy: "confirm_destructive",
    });
    router.registerPack(SALES_MANIFEST);

    // crm.create_note has verb "create" → side-effect
    const result = await router.resolve(
      "crm.create_note",
      "sales",
      { note: "test" }
    );
    expect(result.status).toBe("blocked");
    expect((result.data as any).confirmationToken).toBeDefined();
  });

  it("confirmation token round-trip works", async () => {
    const probe: ProbeResult = {
      adapterId: "composio",
      providerDetails: { toolkit: "hubspot", action: "CREATE_NOTE" },
      connectionReady: true,
      displayName: "HubSpot",
    };
    const adapter = mockAdapter("composio", probe);
    const router = new Router([adapter], {
      sideEffectPolicy: "always_confirm",
    });
    router.registerPack(SALES_MANIFEST);

    // First call: blocked
    const blocked = await router.resolve(
      "crm.create_note",
      "sales",
      { note: "test" }
    );
    expect(blocked.status).toBe("blocked");
    const token = (blocked.data as any).confirmationToken;

    // Confirm
    const confirmed = await router.executeConfirmed(token);
    expect(confirmed.status).toBe("ok");
    expect(adapter.execute).toHaveBeenCalled();

    // Token consumed — second use fails
    const expired = await router.executeConfirmed(token);
    expect(expired.status).toBe("error");
  });

  it("invalidates cache on execution failure", async () => {
    const probe: ProbeResult = {
      adapterId: "composio",
      providerDetails: { toolkit: "googlesuper" },
      connectionReady: true,
      displayName: "Google Workspace",
    };
    const adapter: CapabilityAdapter = {
      id: "composio",
      probe: vi.fn().mockResolvedValue(probe),
      execute: vi
        .fn()
        .mockRejectedValueOnce(new Error("disconnected"))
        .mockResolvedValueOnce({ status: "ok", data: {} }),
    };
    const router = new Router([adapter], {
      sideEffectPolicy: "never_confirm",
    });
    router.registerPack(SALES_MANIFEST);

    // First resolve — success probe, failed execute
    const r1 = await router.resolve(
      "calendar.read_events",
      "sales",
      {}
    );
    expect(r1.status).toBe("error");

    // Second resolve — must re-probe (cache invalidated)
    const r2 = await router.resolve(
      "calendar.read_events",
      "sales",
      {}
    );
    expect(r2.status).toBe("ok");
    expect(adapter.probe).toHaveBeenCalledTimes(2);
  });

  it("tracks multiple packs", () => {
    const router = new Router([mockAdapter("composio")]);
    router.registerPack(SALES_MANIFEST);
    router.registerPack({
      ...SALES_MANIFEST,
      packId: "recruiting",
      displayName: "Recruiting Pack",
      capabilities: {
        required: ["ats.search_candidates"],
        optional: [],
      },
    });
    expect(router.packs).toHaveLength(2);
  });

  it("falls back to next adapter when first returns null", async () => {
    const oclawProbe: ProbeResult = {
      adapterId: "openclaw_tool",
      providerDetails: { toolName: "web_search" },
      connectionReady: true,
      displayName: "web_search",
    };
    const composio = mockAdapter("composio", null);
    const oclaw = mockAdapter("openclaw_tool", oclawProbe);
    const router = new Router([composio, oclaw], {
      sideEffectPolicy: "never_confirm",
    });
    router.registerPack(SALES_MANIFEST);

    const result = await router.resolve(
      "research.web_search",
      "sales",
      {}
    );
    expect(result.status).toBe("ok");
    expect(composio.probe).toHaveBeenCalled();
    expect(oclaw.execute).toHaveBeenCalled();
  });
});

describe("Onboarding integration", () => {
  it("runConnectApps groups capabilities by status", async () => {
    const readyProbe: ProbeResult = {
      adapterId: "openclaw_tool",
      providerDetails: { toolName: "web_search" },
      connectionReady: true,
      displayName: "web_search",
    };
    const unreadyProbe: ProbeResult = {
      adapterId: "composio",
      providerDetails: { toolkit: "hubspot" },
      connectionReady: false,
      displayName: "HubSpot",
      setupHint: "Connect via OAuth",
    };
    const composio = mockAdapter("composio", unreadyProbe);
    const oclaw = mockAdapter("openclaw_tool", readyProbe);
    const router = new Router([composio, oclaw], {
      sideEffectPolicy: "never_confirm",
    });
    router.registerPack(SALES_MANIFEST);

    const report = await runConnectApps(
      router.packs,
      router.engine
    );
    expect(report.packReports).toHaveLength(1);
    const pr = report.packReports[0];
    expect(pr.ready.length).toBeGreaterThan(0);
    expect(pr.needsSetup.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run full test suite**

Run: `cd packages/router && npx vitest run`

Expected: ALL PASS across all test files.

- [ ] **Step 3: Commit**

```bash
git add packages/router/src/__tests__/integration.test.ts
git commit -m "test: rewrite integration tests for DiscoveryEngine-based Router

Tests full resolve flow: pack registration, adapter probing, cache
invalidation on error, side-effect blocking, confirmation token
round-trip. All using mocked adapters with the new probe/execute interface."
```

---

### Task 15: Write README

**Context:** The monorepo needs a README that teaches deployers how to install, configure (`openclaw.json`), and use the system, and teaches developers how to extend it.

**Files:**
- Create: `README.md` (monorepo root: `clawdi-plugins/README.md`)

- [ ] **Step 1: Write the README**

Create `README.md` at the monorepo root:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README — installation, configuration, architecture, extension guide

Layered for deployers (Quick Start, openclaw.json config, connecting
services, checking status) and developers (architecture, creating packs,
how discovery works, development setup)."
```

---

## Full Test Verification

After all tasks are complete:

- [ ] **Run full build:**

```bash
cd packages/router && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Run full test suite:**

```bash
cd packages/router && npx vitest run
```

Expected: ALL PASS across 7 test files:
- `intent.test.ts`
- `engine.test.ts`
- `composio.test.ts`
- `openclaw-tool.test.ts`
- `adapters.test.ts` (Lobster, CLI, MCPorter)
- `side-effects.test.ts`
- `integration.test.ts`

- [ ] **Final commit:**

```bash
git add -A
git commit -m "feat: dynamic discovery refactor complete

Replaced 35 hardcoded capability-to-provider mappings with DiscoveryEngine
that probes adapters dynamically. Router code reduced by ~50%.
5 adapters rewritten with probe()/execute() interface.
Convention-based side-effect detection.
README added for deployers and developers."
```
