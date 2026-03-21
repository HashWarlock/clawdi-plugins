import { describe, it, expect, vi } from "vitest";
import { OpenClawToolAdapter } from "../adapters/openclaw-tool.js";

const BUILTIN_TOOLS = ["web_search", "read_file", "write_file", "glob"];

function makeAdapter(tools = BUILTIN_TOOLS) {
  return new OpenClawToolAdapter(
    () => tools,
    vi.fn().mockResolvedValue({ result: "data" })
  );
}

describe("OpenClawToolAdapter", () => {
  describe("probe", () => {
    it("matches exact tool name from capability ID", async () => {
      const adapter = makeAdapter();
      const result = await adapter.probe(
        "research.web_search",
        "web search"
      );
      expect(result).not.toBeNull();
      expect(result!.connectionReady).toBe(true);
      expect(result!.displayName).toBe("web_search");
      expect(result!.providerDetails).toEqual({
        toolName: "web_search",
      });
    });

    it("returns null for unmatched capabilities", async () => {
      const adapter = makeAdapter();
      const result = await adapter.probe(
        "crm.lookup_account",
        "lookup account"
      );
      expect(result).toBeNull();
    });

    it("always reports connectionReady=true", async () => {
      const adapter = makeAdapter();
      const result = await adapter.probe(
        "docs.read_file",
        "read file"
      );
      expect(result!.connectionReady).toBe(true);
    });
  });

  describe("execute", () => {
    it("calls the built-in tool with args", async () => {
      const callTool = vi
        .fn()
        .mockResolvedValue({ results: ["file.ts"] });
      const adapter = new OpenClawToolAdapter(
        () => BUILTIN_TOOLS,
        callTool
      );
      const result = await adapter.execute(
        "docs.read_file",
        { toolName: "read_file" },
        { path: "/src/index.ts" },
        "sales"
      );
      expect(result.status).toBe("ok");
      expect(callTool).toHaveBeenCalledWith("read_file", {
        path: "/src/index.ts",
      });
    });

    it("returns error on failure", async () => {
      const callTool = vi
        .fn()
        .mockRejectedValue(new Error("not found"));
      const adapter = new OpenClawToolAdapter(
        () => BUILTIN_TOOLS,
        callTool
      );
      const result = await adapter.execute(
        "docs.read_file",
        { toolName: "read_file" },
        {},
        "sales"
      );
      expect(result.status).toBe("error");
    });
  });
});
