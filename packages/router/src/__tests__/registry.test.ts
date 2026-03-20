import { describe, it, expect } from "vitest";
import { CapabilityRegistry } from "../capabilities/registry.js";

describe("CapabilityRegistry", () => {
  it("registers and looks up capabilities", () => {
    const registry = new CapabilityRegistry();
    registry.register({ id: "crm.lookup_account", sideEffect: false });
    registry.register({ id: "crm.create_note", sideEffect: true });
    expect(registry.get("crm.lookup_account")).toEqual({ id: "crm.lookup_account", sideEffect: false });
    expect(registry.get("crm.create_note")?.sideEffect).toBe(true);
  });
  it("returns undefined for unknown capabilities", () => {
    const registry = new CapabilityRegistry();
    expect(registry.get("unknown.thing")).toBeUndefined();
  });
  it("lists all capability IDs", () => {
    const registry = new CapabilityRegistry();
    registry.register({ id: "crm.lookup_account", sideEffect: false });
    registry.register({ id: "calendar.read_events", sideEffect: false });
    const ids = registry.allIds();
    expect(ids).toContain("crm.lookup_account");
    expect(ids).toContain("calendar.read_events");
    expect(ids).toHaveLength(2);
  });
  it("tracks which adapters provide each capability", () => {
    const registry = new CapabilityRegistry();
    registry.register({ id: "crm.lookup_account", sideEffect: false });
    registry.mapAdapter("crm.lookup_account", "composio");
    registry.mapAdapter("crm.lookup_account", "cli");
    expect(registry.adaptersFor("crm.lookup_account")).toEqual(["composio", "cli"]);
  });
});
