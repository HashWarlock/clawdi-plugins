import { describe, it, expect, vi, beforeEach } from "vitest";
import { ComposioAdapter } from "../adapters/composio.js";

describe("ComposioAdapter", () => {
  let adapter: ComposioAdapter;

  beforeEach(() => {
    adapter = new ComposioAdapter();
  });

  it("has id 'composio'", () => {
    expect(adapter.id).toBe("composio");
  });

  it("provides known capabilities", async () => {
    const caps = await adapter.providesCapabilities();
    expect(caps).toContain("calendar.read_events");
    expect(caps).toContain("crm.lookup_account");
    expect(caps).toContain("mail.send_followup");
  });

  it("reports not ready when composio client is unavailable", async () => {
    // Default state: no composio client injected
    const readiness = await adapter.checkReadiness({
      packId: "sales",
      capabilityId: "crm.lookup_account",
    });
    expect(readiness.ready).toBe(false);
    expect(readiness.setupAction).toBe("connect");
  });

  it("reports ready when composio client is available and connected", async () => {
    const mockClient = {
      checkConnection: vi.fn().mockResolvedValue(true),
      executeAction: vi.fn().mockResolvedValue({ data: "test" }),
      searchActions: vi.fn().mockResolvedValue([]),
    };
    adapter = new ComposioAdapter(mockClient as any);

    const readiness = await adapter.checkReadiness({
      packId: "sales",
      capabilityId: "crm.lookup_account",
    });
    expect(readiness.ready).toBe(true);
  });

  it("executes via composio client", async () => {
    const mockClient = {
      checkConnection: vi.fn().mockResolvedValue(true),
      executeAction: vi.fn().mockResolvedValue({
        data: { accounts: [{ name: "Acme" }] },
      }),
      searchActions: vi.fn().mockResolvedValue([]),
    };
    adapter = new ComposioAdapter(mockClient as any);

    const result = await adapter.execute({
      packId: "sales",
      capabilityId: "crm.lookup_account",
      args: { query: "Acme" },
    });
    expect(result.status).toBe("ok");
    expect(result.data).toEqual({ accounts: [{ name: "Acme" }] });
  });
});
