import { describe, it, expect, vi } from "vitest";
import { scanBuiltins, scanComposio, scanMcpServers, scanCliMappings, scanLobster } from "../scanners.js";
import type { PackCapability, RuntimeCallbacks } from "../types.js";

const caps: PackCapability[] = [
  { id: "research.web_search", required: true, sideEffect: "read" },
  { id: "calendar.read_events", required: true, sideEffect: "read" },
  { id: "crm.create_note", required: false, sideEffect: "write" },
];

function mockCallbacks(overrides: Partial<RuntimeCallbacks> = {}): RuntimeCallbacks {
  return {
    callBuiltinTool: vi.fn().mockResolvedValue(null),
    callMcpTool: vi.fn().mockResolvedValue(null),
    listBuiltinTools: vi.fn().mockReturnValue([]),
    listMcpServers: vi.fn().mockResolvedValue([]),
    listLobsterWorkflows: vi.fn().mockResolvedValue([]),
    runLobsterWorkflow: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe("scanBuiltins", () => {
  it("returns entries for matching builtin tools", () => {
    const cb = mockCallbacks({ listBuiltinTools: vi.fn().mockReturnValue(["web_search", "read_file"]) });
    const entries = scanBuiltins(caps, cb);
    expect(entries).toHaveLength(1);
    expect(entries[0].capabilityId).toBe("research.web_search");
    expect(entries[0].target).toEqual({ kind: "builtin_tool", name: "web_search" });
    expect(entries[0].ready).toBe(true);
  });

  it("returns empty for no matches", () => {
    const cb = mockCallbacks({ listBuiltinTools: vi.fn().mockReturnValue(["glob"]) });
    expect(scanBuiltins(caps, cb)).toHaveLength(0);
  });
});

describe("scanComposio", () => {
  it("returns ready entry when toolkit is active", async () => {
    const cb = mockCallbacks({
      callMcpTool: vi.fn().mockResolvedValue({
        primary_tool_slugs: ["googlesuper_read_calendar"],
        toolkit_connection_statuses: { googlesuper: "active" },
      }),
    });
    const entries = await scanComposio([caps[1]], cb);
    expect(entries).toHaveLength(1);
    expect(entries[0].ready).toBe(true);
    expect(entries[0].target).toEqual({
      kind: "composio",
      action: "googlesuper_read_calendar",
      toolkit: "googlesuper",
    });
  });

  it("returns unready entry with setupHint when toolkit is inactive", async () => {
    const cb = mockCallbacks({
      callMcpTool: vi.fn().mockResolvedValue({
        primary_tool_slugs: ["hubspot_create_note"],
        toolkit_connection_statuses: { hubspot: "inactive" },
      }),
    });
    const entries = await scanComposio([caps[2]], cb);
    expect(entries).toHaveLength(1);
    expect(entries[0].ready).toBe(false);
    expect(entries[0].setupHint).toBe("Connect via OAuth");
  });

  it("returns empty when Composio search throws", async () => {
    const cb = mockCallbacks({
      callMcpTool: vi.fn().mockRejectedValue(new Error("timeout")),
    });
    const entries = await scanComposio(caps, cb);
    expect(entries).toHaveLength(0);
  });

  it("prefers preferred providers", async () => {
    const cb = mockCallbacks({
      callMcpTool: vi.fn().mockResolvedValue({
        primary_tool_slugs: ["hubspot_create_note", "salesforce_create_note"],
        toolkit_connection_statuses: { hubspot: "active", salesforce: "active" },
      }),
    });
    const entries = await scanComposio([caps[2]], cb, { "crm.*": ["salesforce"] });
    expect(entries[0].target).toHaveProperty("action", "salesforce_create_note");
  });
});

describe("scanMcpServers", () => {
  it("matches intent keywords against tool names", async () => {
    const cb = mockCallbacks({
      listMcpServers: vi.fn().mockResolvedValue([
        { name: "my-server", tools: [{ name: "web_search", description: "Search the web" }] },
      ]),
    });
    const entries = await scanMcpServers([caps[0]], cb);
    expect(entries).toHaveLength(1);
    expect(entries[0].target).toEqual({ kind: "mcp_tool", server: "my-server", tool: "web_search" });
  });

  it("returns empty when no tools match", async () => {
    const cb = mockCallbacks({
      listMcpServers: vi.fn().mockResolvedValue([
        { name: "server", tools: [{ name: "unrelated_thing" }] },
      ]),
    });
    const entries = await scanMcpServers(caps, cb);
    expect(entries).toHaveLength(0);
  });
});

describe("scanCliMappings", () => {
  it("matches capability to CLI mapping and checks binary", async () => {
    // `which ls` should succeed on any unix system
    const entries = await scanCliMappings(
      [{ id: "docs.convert_pdf", required: false, sideEffect: "read" }],
      { "docs.convert_*": "ls" }
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].ready).toBe(true);
    expect(entries[0].target).toEqual({ kind: "cli", command: "ls" });
  });

  it("returns unready when binary not found", async () => {
    const entries = await scanCliMappings(
      [{ id: "docs.convert_pdf", required: false, sideEffect: "read" }],
      { "docs.convert_*": "nonexistent_binary_xyz" }
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].ready).toBe(false);
    expect(entries[0].setupHint).toBe("Install nonexistent_binary_xyz");
  });
});

describe("scanLobster", () => {
  it("matches _workflow capabilities to workflow IDs", async () => {
    const cb = mockCallbacks({
      listLobsterWorkflows: vi.fn().mockResolvedValue(["offer-letter", "onboarding-flow"]),
    });
    const entries = await scanLobster(
      [{ id: "recruiting.offer_workflow", required: false, sideEffect: "write" }],
      cb
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].target).toEqual({ kind: "lobster", workflowId: "offer-letter" });
  });

  it("skips non-workflow capabilities", async () => {
    const cb = mockCallbacks({
      listLobsterWorkflows: vi.fn().mockResolvedValue(["some-flow"]),
    });
    const entries = await scanLobster(caps, cb);
    expect(entries).toHaveLength(0);
  });
});
