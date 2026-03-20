import { describe, it, expect, vi } from "vitest";
import { OpenClawToolAdapter } from "../adapters/openclaw-tool.js";

describe("OpenClawToolAdapter", () => {
  it("has id 'openclaw_tool'", () => {
    const adapter = new OpenClawToolAdapter();
    expect(adapter.id).toBe("openclaw_tool");
  });

  it("provides known capabilities", async () => {
    const adapter = new OpenClawToolAdapter();
    const caps = await adapter.providesCapabilities();
    expect(caps).toContain("research.collect_sources");
    expect(caps).toContain("research.web_search");
  });

  it("reports ready when tool is available", async () => {
    const mockApi = {
      isToolAvailable: vi.fn().mockResolvedValue(true),
      invokeTool: vi.fn(),
    };
    const adapter = new OpenClawToolAdapter(mockApi as any);

    const readiness = await adapter.checkReadiness({
      packId: "sales",
      capabilityId: "research.web_search",
    });
    expect(readiness.ready).toBe(true);
  });

  it("reports not ready when tool is unavailable", async () => {
    const mockApi = {
      isToolAvailable: vi.fn().mockResolvedValue(false),
      invokeTool: vi.fn(),
    };
    const adapter = new OpenClawToolAdapter(mockApi as any);

    const readiness = await adapter.checkReadiness({
      packId: "sales",
      capabilityId: "research.web_search",
    });
    expect(readiness.ready).toBe(false);
    expect(readiness.setupAction).toBe("configure");
  });
});
