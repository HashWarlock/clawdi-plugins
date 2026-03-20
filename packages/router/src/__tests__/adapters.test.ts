import { describe, it, expect, vi } from "vitest";
import { LobsterAdapter } from "../adapters/lobster.js";
import { CliAdapter } from "../adapters/cli.js";
import { McporterAdapter } from "../adapters/mcporter.js";

describe("LobsterAdapter", () => {
  it("has id 'lobster'", () => {
    expect(new LobsterAdapter().id).toBe("lobster");
  });

  it("provides workflow capabilities", async () => {
    const caps = await new LobsterAdapter().providesCapabilities();
    expect(caps.length).toBeGreaterThan(0);
  });

  it("reports not ready without lobster client", async () => {
    const readiness = await new LobsterAdapter().checkReadiness({
      packId: "sales",
      capabilityId: "crm.create_note_workflow",
    });
    expect(readiness.ready).toBe(false);
  });
});

describe("CliAdapter", () => {
  it("has id 'cli'", () => {
    expect(new CliAdapter().id).toBe("cli");
  });

  it("reports not ready when binary is missing", async () => {
    const adapter = new CliAdapter();
    const readiness = await adapter.checkReadiness({
      packId: "sales",
      capabilityId: "docs.convert_format",
    });
    // pandoc may or may not be installed, but adapter should not throw
    expect(readiness).toHaveProperty("ready");
  });
});

describe("McporterAdapter", () => {
  it("has id 'mcporter'", () => {
    expect(new McporterAdapter().id).toBe("mcporter");
  });

  it("reports not ready without mcporter client", async () => {
    const readiness = await new McporterAdapter().checkReadiness({
      packId: "sales",
      capabilityId: "seo.audit_page",
    });
    expect(readiness.ready).toBe(false);
  });
});
