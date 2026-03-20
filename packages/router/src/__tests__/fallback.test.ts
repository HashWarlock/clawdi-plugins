import { describe, it, expect, vi } from "vitest";
import { FallbackResolver } from "../policy/fallback.js";
import type { CapabilityAdapter } from "../adapters/types.js";

function mockAdapter(id: string, caps: string[], ready: boolean): CapabilityAdapter {
  return {
    id,
    providesCapabilities: vi.fn().mockResolvedValue(caps),
    checkReadiness: vi.fn().mockResolvedValue({ ready, setupAction: ready ? "none" : "connect" }),
    execute: vi.fn().mockResolvedValue({ status: "ok", data: { from: id } }),
  };
}

describe("FallbackResolver", () => {
  it("resolves to first ready adapter", async () => {
    const adapters = [
      mockAdapter("composio", ["crm.lookup_account"], false),
      mockAdapter("openclaw_tool", ["crm.lookup_account"], true),
    ];
    const resolver = new FallbackResolver(adapters, {});

    const result = await resolver.resolve("crm.lookup_account", "sales", {});
    expect(result.status).toBe("ok");
    expect(result.data).toEqual({ from: "openclaw_tool" });
  });

  it("returns needs_setup when no adapter is ready", async () => {
    const adapters = [
      mockAdapter("composio", ["crm.lookup_account"], false),
    ];
    const resolver = new FallbackResolver(adapters, {});

    const result = await resolver.resolve("crm.lookup_account", "sales", {});
    expect(result.status).toBe("needs_setup");
  });

  it("skips adapters that do not provide the capability", async () => {
    const adapters = [
      mockAdapter("composio", ["calendar.read_events"], true),
      mockAdapter("openclaw_tool", ["crm.lookup_account"], true),
    ];
    const resolver = new FallbackResolver(adapters, {});

    const result = await resolver.resolve("crm.lookup_account", "sales", {});
    expect(result.data).toEqual({ from: "openclaw_tool" });
    expect(adapters[0].checkReadiness).not.toHaveBeenCalled();
  });

  it("respects disabled adapters", async () => {
    const adapters = [
      mockAdapter("composio", ["crm.lookup_account"], true),
    ];
    const resolver = new FallbackResolver(adapters, { disabledAdapters: ["composio"] });

    const result = await resolver.resolve("crm.lookup_account", "sales", {});
    expect(result.status).toBe("needs_setup");
  });

  it("respects capability pins", async () => {
    const adapters = [
      mockAdapter("composio", ["crm.lookup_account"], true),
      mockAdapter("cli", ["crm.lookup_account"], true),
    ];
    const resolver = new FallbackResolver(adapters, {
      capabilityPins: { "crm.*": "cli" },
    });

    const result = await resolver.resolve("crm.lookup_account", "sales", {});
    expect(result.data).toEqual({ from: "cli" });
  });

  it("wraps execution with timeout", async () => {
    const slowAdapter: CapabilityAdapter = {
      id: "slow",
      providesCapabilities: vi.fn().mockResolvedValue(["crm.lookup_account"]),
      checkReadiness: vi.fn().mockResolvedValue({ ready: true }),
      execute: vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ status: "ok" }), 60_000))
      ),
    };
    const resolver = new FallbackResolver([slowAdapter], { executionTimeoutMs: 100 });

    const result = await resolver.resolve("crm.lookup_account", "sales", {});
    expect(result.status).toBe("error");
    expect(result.notes?.[0]).toContain("timeout");
  });
});
