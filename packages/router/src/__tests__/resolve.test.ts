import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolve } from "../resolve.js";
import { createRegistry, populate } from "../registry.js";
import type { PackContract, ProviderEntry, RuntimeCallbacks } from "../types.js";
import type { Registry } from "../registry.js";

function mockCallbacks(overrides: Partial<RuntimeCallbacks> = {}): RuntimeCallbacks {
  return {
    callBuiltinTool: vi.fn().mockResolvedValue({ result: "ok" }),
    callMcpTool: vi.fn().mockResolvedValue({ result: "ok" }),
    listBuiltinTools: vi.fn().mockReturnValue([]),
    listMcpServers: vi.fn().mockResolvedValue([]),
    listLobsterWorkflows: vi.fn().mockResolvedValue([]),
    runLobsterWorkflow: vi.fn().mockResolvedValue({ result: "ok" }),
    ...overrides,
  };
}

const salesContract: PackContract = {
  packId: "sales",
  version: "1",
  capabilities: [
    { id: "calendar.read_events", required: true, sideEffect: "read" },
    { id: "crm.create_note", required: true, sideEffect: "write" },
    { id: "mail.read_inbox", required: true, sideEffect: "read" },
  ],
  preferredProviders: { "crm.*": ["salesforce"] },
};

const readyEntry: ProviderEntry = {
  providerId: "composio:googlesuper",
  capabilityId: "calendar.read_events",
  target: { kind: "composio", action: "googlesuper_read_cal", toolkit: "googlesuper" },
  ready: true,
  source: "composio",
};

const writeEntry: ProviderEntry = {
  providerId: "composio:salesforce",
  capabilityId: "crm.create_note",
  target: { kind: "composio", action: "salesforce_create_note", toolkit: "salesforce" },
  ready: true,
  source: "composio",
};

const unreadyEntry: ProviderEntry = {
  providerId: "composio:hubspot",
  capabilityId: "mail.read_inbox",
  target: { kind: "composio", action: "hubspot_read_inbox", toolkit: "hubspot" },
  ready: false,
  setupHint: "Connect via OAuth",
  setupUrl: "https://example.com/oauth",
  source: "composio",
};

let registry: Registry;
let contracts: Map<string, PackContract>;
let cb: RuntimeCallbacks;

beforeEach(() => {
  registry = createRegistry();
  contracts = new Map([["sales", salesContract]]);
  cb = mockCallbacks();
});

describe("resolve", () => {
  it("executes a read capability through a ready provider", async () => {
    populate(registry, [readyEntry]);
    const result = await resolve("sales", "calendar.read_events", {}, registry, contracts, cb, "confirm_destructive");
    expect(result.status).toBe("executed");
  });

  it("returns unavailable when pack not found", async () => {
    const result = await resolve("unknown", "calendar.read_events", {}, registry, contracts, cb, "confirm_destructive");
    expect(result.status).toBe("unavailable");
  });

  it("returns unavailable when capability not in contract", async () => {
    const result = await resolve("sales", "unknown.thing", {}, registry, contracts, cb, "confirm_destructive");
    expect(result.status).toBe("unavailable");
  });

  it("returns unavailable when no providers in registry", async () => {
    const result = await resolve("sales", "calendar.read_events", {}, registry, contracts, cb, "confirm_destructive");
    expect(result.status).toBe("unavailable");
  });

  it("returns needs_setup when no provider is ready", async () => {
    populate(registry, [unreadyEntry]);
    const result = await resolve("sales", "mail.read_inbox", {}, registry, contracts, cb, "confirm_destructive");
    expect(result.status).toBe("needs_setup");
    if (result.status === "needs_setup") {
      expect(result.setupHint).toBe("Connect via OAuth");
    }
  });

  it("blocks write capabilities with confirm_destructive policy", async () => {
    populate(registry, [writeEntry]);
    const result = await resolve("sales", "crm.create_note", {}, registry, contracts, cb, "confirm_destructive");
    expect(result.status).toBe("blocked");
    if (result.status === "blocked") {
      expect(result.confirmationToken).toBeTruthy();
    }
  });

  it("does not block write capabilities with never_confirm policy", async () => {
    populate(registry, [writeEntry]);
    const result = await resolve("sales", "crm.create_note", {}, registry, contracts, cb, "never_confirm");
    expect(result.status).toBe("executed");
  });

  it("blocks all capabilities with always_confirm policy", async () => {
    populate(registry, [readyEntry]);
    const result = await resolve("sales", "calendar.read_events", {}, registry, contracts, cb, "always_confirm");
    expect(result.status).toBe("blocked");
  });

  it("confirmation token round-trip works", async () => {
    populate(registry, [writeEntry]);
    const blocked = await resolve("sales", "crm.create_note", {}, registry, contracts, cb, "confirm_destructive");
    expect(blocked.status).toBe("blocked");
    if (blocked.status !== "blocked") return;

    const confirmed = await resolve("sales", "crm.create_note", {}, registry, contracts, cb, "confirm_destructive", blocked.confirmationToken);
    expect(confirmed.status).toBe("executed");
  });

  it("rejects invalid confirmation token", async () => {
    const result = await resolve("sales", "crm.create_note", {}, registry, contracts, cb, "confirm_destructive", "bad-token");
    expect(result.status).toBe("unavailable");
  });

  it("returns skill_context for skill targets", async () => {
    const skillEntry: ProviderEntry = {
      providerId: "skill:protonmail",
      capabilityId: "mail.read_inbox",
      target: { kind: "skill", skillName: "protonmail" },
      ready: true,
      source: "skill",
    };
    populate(registry, [skillEntry]);
    const result = await resolve("sales", "mail.read_inbox", {}, registry, contracts, cb, "confirm_destructive");
    expect(result.status).toBe("skill_context");
    if (result.status === "skill_context") {
      expect(result.skillName).toBe("protonmail");
    }
  });
});
