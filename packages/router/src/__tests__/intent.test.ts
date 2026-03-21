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
