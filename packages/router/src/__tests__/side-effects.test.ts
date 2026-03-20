import { describe, it, expect, beforeEach } from "vitest";
import { SideEffectGuard } from "../policy/side-effects.js";

describe("SideEffectGuard", () => {
  let guard: SideEffectGuard;

  beforeEach(() => {
    guard = new SideEffectGuard("confirm_destructive");
  });

  const writeInput = {
    capabilityId: "crm.create_note",
    packId: "sales",
    args: { note: "test" },
    isSideEffect: true,
    adapterId: "composio",
    resolvedApp: "HubSpot",
  };

  const readInput = {
    capabilityId: "crm.lookup_account",
    packId: "sales",
    args: { query: "Acme" },
    isSideEffect: false,
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

  it("validates confirmation tokens and stores packId/args", () => {
    const result = guard.check(writeInput);
    expect(result.confirmationToken).toBeDefined();

    const pending = guard.validateToken(result.confirmationToken!);
    expect(pending).toBeDefined();
    expect(pending!.capabilityId).toBe("crm.create_note");
    expect(pending!.packId).toBe("sales");
    expect(pending!.args).toEqual({ note: "test" });
    expect(pending!.adapterId).toBe("composio");
  });

  it("rejects invalid tokens", () => {
    expect(guard.validateToken("invalid-token")).toBeUndefined();
  });

  it("rejects expired tokens", () => {
    const result = guard.check(writeInput);
    guard.expireToken(result.confirmationToken!);
    expect(guard.validateToken(result.confirmationToken!)).toBeUndefined();
  });

  it("consumes token on validation", () => {
    const result = guard.check(writeInput);
    guard.validateToken(result.confirmationToken!);
    expect(guard.validateToken(result.confirmationToken!)).toBeUndefined();
  });
});
