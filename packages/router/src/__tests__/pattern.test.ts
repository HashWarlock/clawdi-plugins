import { describe, it, expect } from "vitest";
import { matchCapabilityPattern, findBestMatch } from "../capabilities/pattern.js";

describe("matchCapabilityPattern", () => {
  it("matches exact capability IDs", () => {
    expect(matchCapabilityPattern("crm.lookup_account", "crm.lookup_account")).toBe(true);
  });
  it("matches glob patterns", () => {
    expect(matchCapabilityPattern("crm.*", "crm.lookup_account")).toBe(true);
    expect(matchCapabilityPattern("crm.*", "crm.create_note")).toBe(true);
  });
  it("rejects non-matching patterns", () => {
    expect(matchCapabilityPattern("crm.*", "calendar.read_events")).toBe(false);
    expect(matchCapabilityPattern("crm.lookup_account", "crm.create_note")).toBe(false);
  });
  it("handles patterns without glob", () => {
    expect(matchCapabilityPattern("calendar.read_events", "calendar.read_events")).toBe(true);
    expect(matchCapabilityPattern("calendar.read_events", "calendar.write_events")).toBe(false);
  });
});

describe("findBestMatch", () => {
  it("prefers exact matches over globs", () => {
    const patterns = { "crm.*": "composio", "crm.lookup_account": "cli" };
    expect(findBestMatch(patterns, "crm.lookup_account")).toBe("cli");
  });
  it("falls back to glob when no exact match", () => {
    const patterns = { "crm.*": "composio" };
    expect(findBestMatch(patterns, "crm.create_note")).toBe("composio");
  });
  it("returns undefined when nothing matches", () => {
    const patterns = { "crm.*": "composio" };
    expect(findBestMatch(patterns, "calendar.read_events")).toBeUndefined();
  });
});
