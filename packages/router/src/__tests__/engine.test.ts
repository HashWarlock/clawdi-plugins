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
