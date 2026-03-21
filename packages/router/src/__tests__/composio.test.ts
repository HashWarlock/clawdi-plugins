import { describe, it, expect, vi } from "vitest";
import { ComposioAdapter } from "../adapters/composio.js";
import type { McpCallFn } from "../adapters/composio.js";

function mockCallMcp(response: unknown = {}): McpCallFn {
  return vi.fn().mockResolvedValue(response);
}

const SEARCH_RESPONSE = {
  primary_tool_slugs: ["GOOGLESUPER_LIST_EVENTS"],
  related_tool_slugs: ["GOOGLESUPER_GET_EVENT"],
  toolkit_connection_statuses: { googlesuper: "active" },
  tool_schemas: {},
};

const UNCONNECTED_RESPONSE = {
  primary_tool_slugs: ["HUBSPOT_SEARCH_CONTACTS"],
  related_tool_slugs: [],
  toolkit_connection_statuses: { hubspot: "inactive" },
  tool_schemas: {},
};

describe("ComposioAdapter", () => {
  describe("probe", () => {
    it("returns ready probe when Composio finds a connected tool", async () => {
      const adapter = new ComposioAdapter(mockCallMcp(SEARCH_RESPONSE));
      const result = await adapter.probe(
        "calendar.read_events",
        "read events"
      );
      expect(result).not.toBeNull();
      expect(result!.connectionReady).toBe(true);
      expect(result!.displayName).toBe("Google Workspace");
      expect(result!.providerDetails).toEqual({
        toolkit: "googlesuper",
        action: "GOOGLESUPER_LIST_EVENTS",
      });
    });

    it("returns unready probe with setupHint and setupUrl when toolkit not connected", async () => {
      const callMcp = vi.fn()
        .mockResolvedValueOnce(UNCONNECTED_RESPONSE) // COMPOSIO_SEARCH_TOOLS
        .mockResolvedValueOnce({ redirect_url: "https://oauth.example.com" }); // COMPOSIO_MANAGE_CONNECTIONS
      const adapter = new ComposioAdapter(callMcp);
      const result = await adapter.probe(
        "crm.lookup_account",
        "lookup account"
      );
      expect(result).not.toBeNull();
      expect(result!.connectionReady).toBe(false);
      expect(result!.setupHint).toBe("Connect via OAuth");
      expect(result!.setupUrl).toBe("https://oauth.example.com");
    });

    it("returns null when Composio returns no slugs", async () => {
      const adapter = new ComposioAdapter(
        mockCallMcp({ primary_tool_slugs: [] })
      );
      const result = await adapter.probe("unknown.cap", "unknown cap");
      expect(result).toBeNull();
    });

    it("returns null when MCP call throws", async () => {
      const callMcp = vi.fn().mockRejectedValue(new Error("timeout"));
      const adapter = new ComposioAdapter(callMcp);
      const result = await adapter.probe(
        "calendar.read_events",
        "read events"
      );
      expect(result).toBeNull();
    });

    it("prefers toolkit from hints.preferredApps", async () => {
      const response = {
        primary_tool_slugs: [
          "GOOGLESUPER_LIST_EVENTS",
          "OUTLOOK_LIST_EVENTS",
        ],
        related_tool_slugs: [],
        toolkit_connection_statuses: {
          googlesuper: "active",
          outlook: "active",
        },
        tool_schemas: {},
      };
      const adapter = new ComposioAdapter(mockCallMcp(response));
      const result = await adapter.probe(
        "calendar.read_events",
        "read events",
        { preferredApps: ["outlook"] }
      );
      expect(result!.providerDetails).toEqual(
        expect.objectContaining({ toolkit: "outlook" })
      );
    });
  });

  describe("execute", () => {
    it("calls COMPOSIO_MULTI_EXECUTE_TOOL with the action slug", async () => {
      const callMcp = vi
        .fn()
        .mockResolvedValue({ result: "meeting data" });
      const adapter = new ComposioAdapter(callMcp);
      const result = await adapter.execute(
        "calendar.read_events",
        { toolkit: "googlesuper", action: "GOOGLESUPER_LIST_EVENTS" },
        { date: "2026-03-20" },
        "sales"
      );
      expect(result.status).toBe("ok");
      expect(callMcp).toHaveBeenCalledWith(
        "clawdi-mcp",
        "COMPOSIO_MULTI_EXECUTE_TOOL",
        expect.objectContaining({
          tool_slug: "GOOGLESUPER_LIST_EVENTS",
          date: "2026-03-20",
        })
      );
    });

    it("returns error on execution failure", async () => {
      const callMcp = vi
        .fn()
        .mockRejectedValue(new Error("connection lost"));
      const adapter = new ComposioAdapter(callMcp);
      const result = await adapter.execute(
        "calendar.read_events",
        { toolkit: "googlesuper", action: "LIST_EVENTS" },
        {},
        "sales"
      );
      expect(result.status).toBe("error");
      expect(result.notes?.[0]).toContain("connection lost");
    });
  });
});
