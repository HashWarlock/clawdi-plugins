import { describe, it, expect, vi } from "vitest";
import { LobsterAdapter } from "../adapters/lobster.js";
import { CliAdapter } from "../adapters/cli.js";
import { McporterAdapter } from "../adapters/mcporter.js";
import type { McpServer } from "../adapters/mcporter.js";

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

describe("CliAdapter", () => {
  describe("probe", () => {
    it("matches capability against cliMappings config", async () => {
      const adapter = new CliAdapter({
        "docs.convert_*": "pandoc",
      });
      const result = await adapter.probe(
        "docs.convert_format",
        "convert format"
      );
      // Result depends on whether pandoc is installed
      if (result) {
        expect(result.adapterId).toBe("cli");
        expect(result.providerDetails).toEqual({ bin: "pandoc" });
      }
    });

    it("returns null for unmapped capabilities", async () => {
      const adapter = new CliAdapter({
        "docs.convert_*": "pandoc",
      });
      const result = await adapter.probe(
        "crm.lookup_account",
        "lookup account"
      );
      expect(result).toBeNull();
    });

    it("matches exact capability patterns", async () => {
      const adapter = new CliAdapter({
        "data.query_json": "jq",
      });
      const result = await adapter.probe(
        "data.query_json",
        "query json"
      );
      if (result) {
        expect(result.providerDetails).toEqual({ bin: "jq" });
      }
    });
  });

  describe("execute", () => {
    it("returns error structure on failure", async () => {
      const adapter = new CliAdapter({});
      const result = await adapter.execute(
        "docs.convert_format",
        { bin: "nonexistent_binary_xyz" },
        { args: ["--help"] },
        "sales"
      );
      expect(result.status).toBe("error");
    });
  });
});

const MOCK_SERVERS: McpServer[] = [
  {
    name: "ahrefs",
    tools: [
      { name: "site_audit", description: "Audit a website for SEO" },
      { name: "keyword_research", description: "Research keywords" },
    ],
  },
  {
    name: "clearbit",
    tools: [
      { name: "company_lookup", description: "Look up company data" },
    ],
  },
];

describe("McporterAdapter", () => {
  function makeAdapter(servers = MOCK_SERVERS) {
    return new McporterAdapter(
      vi.fn().mockResolvedValue(servers),
      vi.fn().mockResolvedValue({ data: "result" })
    );
  }

  describe("probe", () => {
    it("matches intent keywords against tool names/descriptions", async () => {
      const adapter = makeAdapter();
      const result = await adapter.probe(
        "seo.audit_page",
        "audit page"
      );
      expect(result).not.toBeNull();
      expect(result!.providerDetails).toEqual({
        server: "ahrefs",
        tool: "site_audit",
      });
    });

    it("returns null when no tool matches", async () => {
      const adapter = makeAdapter();
      const result = await adapter.probe(
        "crm.lookup_account",
        "lookup account"
      );
      expect(result).toBeNull();
    });

    it("returns null when listServers throws", async () => {
      const adapter = new McporterAdapter(
        vi.fn().mockRejectedValue(new Error("unreachable")),
        vi.fn()
      );
      const result = await adapter.probe(
        "seo.audit_page",
        "audit page"
      );
      expect(result).toBeNull();
    });

    it("matches across tool description text", async () => {
      const adapter = makeAdapter();
      const result = await adapter.probe(
        "enrichment.lookup_company",
        "lookup company"
      );
      expect(result).not.toBeNull();
      expect(result!.providerDetails).toEqual({
        server: "clearbit",
        tool: "company_lookup",
      });
    });
  });

  describe("execute", () => {
    it("calls the matched MCP server tool", async () => {
      const callTool = vi
        .fn()
        .mockResolvedValue({ score: 85 });
      const adapter = new McporterAdapter(
        vi.fn().mockResolvedValue(MOCK_SERVERS),
        callTool
      );
      const result = await adapter.execute(
        "seo.audit_page",
        { server: "ahrefs", tool: "site_audit" },
        { url: "https://example.com" },
        "marketing"
      );
      expect(result.status).toBe("ok");
      expect(callTool).toHaveBeenCalledWith(
        "ahrefs",
        "site_audit",
        { url: "https://example.com" }
      );
    });
  });
});
