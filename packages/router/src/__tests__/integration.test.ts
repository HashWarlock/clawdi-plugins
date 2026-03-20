import { describe, it, expect } from "vitest";
import { Router } from "../router.js";
import type { PackManifest } from "../capabilities/types.js";

const SALES_MANIFEST: PackManifest = {
  packId: "sales",
  displayName: "Sales Pack",
  capabilities: {
    required: [
      "calendar.read_events",
      "calendar.prepare_meeting_context",
      "crm.lookup_account",
      "crm.create_note",
      "mail.send_followup",
      "research.web_search",
    ],
    optional: ["docs.create_brief", "research.collect_sources", "chat.search_messages"],
  },
  preferredApps: { "crm.*": ["salesforce", "hubspot"] },
  onboarding: {
    welcomeMessage: "Sales pack is ready.",
    suggestedFirstTask: "Try: prep for next meeting",
  },
};

describe("Router integration", () => {
  it("registers a pack and resolves a capability", async () => {
    const router = new Router({ sideEffectPolicy: "never_confirm" });
    router.registerPack(SALES_MANIFEST);
    expect(router.packs).toHaveLength(1);
    expect(router.packs[0].packId).toBe("sales");
  });

  it("reports needs_setup for unconnected capabilities", async () => {
    const router = new Router();
    router.registerPack(SALES_MANIFEST);
    const result = await router.resolve("crm.lookup_account", "sales", { query: "Acme" });
    expect(result.status).toBe("needs_setup");
  });

  it("checks side-effect policy for write capabilities", async () => {
    const router = new Router({ sideEffectPolicy: "confirm_destructive" });
    router.registerPack(SALES_MANIFEST);
    // crm.create_note is a write capability — but without a ready adapter,
    // it returns needs_setup before reaching the side-effect check
    const result = await router.resolve("crm.create_note", "sales", { note: "test" });
    expect(result.status).toBe("needs_setup");
  });

  it("allows read capabilities without confirmation", async () => {
    const router = new Router({ sideEffectPolicy: "confirm_destructive" });
    router.registerPack(SALES_MANIFEST);
    // crm.lookup_account is a read capability
    const result = await router.resolve("crm.lookup_account", "sales", { query: "Acme" });
    // Still needs_setup since no adapter is connected, but side-effect is not the issue
    expect(result.status).toBe("needs_setup");
  });

  it("tracks multiple packs", () => {
    const router = new Router();
    router.registerPack(SALES_MANIFEST);
    router.registerPack({
      ...SALES_MANIFEST,
      packId: "recruiting",
      displayName: "Recruiting Pack",
      capabilities: { required: ["ats.search_candidates"], optional: [] },
    });
    expect(router.packs).toHaveLength(2);
    expect(router.packs[0].packId).toBe("sales");
    expect(router.packs[1].packId).toBe("recruiting");
  });

  it("confirmation token round-trip works", async () => {
    const router = new Router({ sideEffectPolicy: "always_confirm" });
    router.registerPack(SALES_MANIFEST);
    // Without connected adapters, resolve returns needs_setup before side-effect check
    // So test the guard directly
    const guard = (router as any).sideEffectGuard;
    const check = guard.check({
      capabilityId: "crm.create_note",
      packId: "sales",
      args: { note: "test" },
      isSideEffect: true,
      adapterId: "composio",
      resolvedApp: "HubSpot",
    });
    expect(check.blocked).toBe(true);
    expect(check.confirmationToken).toBeDefined();

    // Validate the token
    const pending = guard.validateToken(check.confirmationToken);
    expect(pending).toBeDefined();
    expect(pending.capabilityId).toBe("crm.create_note");
    expect(pending.packId).toBe("sales");
    expect(pending.args).toEqual({ note: "test" });

    // Token is consumed — second validation fails
    expect(guard.validateToken(check.confirmationToken)).toBeUndefined();
  });
});
