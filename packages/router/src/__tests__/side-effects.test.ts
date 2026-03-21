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
      expect(guard.isSideEffect("docs.convert_format")).toBe(false);
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
      expect(guard.validateToken(result.confirmationToken!)).toBeUndefined();
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
