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

    const blocked = await router.resolve(
      "crm.create_note",
      "sales",
      { note: "test" }
    );
    expect(blocked.status).toBe("blocked");
    const token = (blocked.data as any).confirmationToken;

    const confirmed = await router.executeConfirmed(token);
    expect(confirmed.status).toBe("ok");
    expect(adapter.execute).toHaveBeenCalled();

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

    const r1 = await router.resolve(
      "calendar.read_events",
      "sales",
      {}
    );
    expect(r1.status).toBe("error");

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
    // composio returns unready for all capabilities
    const composio = mockAdapter("composio", unreadyProbe);
    // openclaw_tool returns ready only for some capabilities (null for others)
    const oclaw: CapabilityAdapter = {
      id: "openclaw_tool",
      probe: vi.fn().mockImplementation((capId: string) => {
        // Only return a ready probe for calendar capabilities
        if (capId.startsWith("calendar.")) {
          return Promise.resolve(readyProbe);
        }
        return Promise.resolve(null);
      }),
      execute: vi.fn().mockResolvedValue({ status: "ok" as const, data: {} }),
    };
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
