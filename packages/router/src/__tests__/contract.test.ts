import { describe, it, expect } from "vitest";
import { validateContract } from "../contract.js";
import type { PackContract } from "../types.js";

describe("validateContract", () => {
  const validContract: PackContract = {
    packId: "sales",
    version: "1",
    capabilities: [
      { id: "calendar.read_events", required: true, sideEffect: "read" },
      { id: "crm.create_note", required: false, sideEffect: "write" },
    ],
  };

  it("accepts a valid contract", () => {
    expect(validateContract(validContract)).toEqual([]);
  });

  it("rejects missing packId", () => {
    const c = { ...validContract, packId: "" };
    expect(validateContract(c)).toContainEqual(expect.stringContaining("packId"));
  });

  it("rejects missing version", () => {
    const c = { ...validContract, version: "" };
    expect(validateContract(c)).toContainEqual(expect.stringContaining("version"));
  });

  it("rejects empty capabilities", () => {
    const c = { ...validContract, capabilities: [] };
    expect(validateContract(c)).toContainEqual(expect.stringContaining("non-empty"));
  });

  it("rejects duplicate capability IDs", () => {
    const c = {
      ...validContract,
      capabilities: [
        { id: "x.y", required: true, sideEffect: "read" as const },
        { id: "x.y", required: false, sideEffect: "read" as const },
      ],
    };
    expect(validateContract(c)).toContainEqual(expect.stringContaining("Duplicate"));
  });

  it("rejects invalid sideEffect", () => {
    const c = {
      ...validContract,
      capabilities: [{ id: "x.y", required: true, sideEffect: "maybe" as any }],
    };
    expect(validateContract(c)).toContainEqual(expect.stringContaining("sideEffect"));
  });
});
