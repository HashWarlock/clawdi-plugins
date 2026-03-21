import { describe, it, expect, vi } from "vitest";
import { LobsterAdapter } from "../adapters/lobster.js";

const WORKFLOWS = [
  "create-note-with-approval",
  "brief-from-research",
  "offer-approval-chain",
];

describe("LobsterAdapter", () => {
  function makeAdapter(workflows = WORKFLOWS) {
    return new LobsterAdapter(
      vi.fn().mockResolvedValue(workflows),
      vi.fn().mockResolvedValue({ result: "done" })
    );
  }

  describe("probe", () => {
    it("matches capabilities ending in _workflow", async () => {
      const adapter = makeAdapter();
      const result = await adapter.probe(
        "crm.create_note_workflow",
        "create note workflow"
      );
      expect(result).not.toBeNull();
      expect(result!.providerDetails).toEqual({
        workflowId: "create-note-with-approval",
      });
    });

    it("returns null for capabilities without _workflow suffix", async () => {
      const adapter = makeAdapter();
      const result = await adapter.probe(
        "crm.create_note",
        "create note"
      );
      expect(result).toBeNull();
    });

    it("skips _workflow check when pinned and matches by name", async () => {
      const adapter = makeAdapter();
      const result = await adapter.probe(
        "crm.create_note",
        "create note",
        { pinned: true }
      );
      // "create_note" → search term "create-note" matches "create-note-with-approval"
      expect(result).not.toBeNull();
      expect(result!.providerDetails).toEqual({
        workflowId: "create-note-with-approval",
      });
    });

    it("returns null when no workflow matches", async () => {
      const adapter = makeAdapter();
      const result = await adapter.probe(
        "unknown.do_thing_workflow",
        "do thing workflow"
      );
      expect(result).toBeNull();
    });
  });

  describe("execute", () => {
    it("runs the matched workflow", async () => {
      const runWorkflow = vi
        .fn()
        .mockResolvedValue({ approved: true });
      const adapter = new LobsterAdapter(
        vi.fn().mockResolvedValue(WORKFLOWS),
        runWorkflow
      );
      const result = await adapter.execute(
        "crm.create_note_workflow",
        { workflowId: "create-note-with-approval" },
        { note: "test" },
        "sales"
      );
      expect(result.status).toBe("ok");
      expect(runWorkflow).toHaveBeenCalledWith(
        "create-note-with-approval",
        { note: "test" }
      );
    });
  });
});
