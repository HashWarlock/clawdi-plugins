import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { PackContract, PackCapability, SideEffect } from "./types.js";

const VALID_SIDE_EFFECTS = new Set<SideEffect>(["read", "write", "destructive"]);

export async function loadContract(installPath: string): Promise<PackContract> {
  const raw = await readFile(join(installPath, "capabilities.yaml"), "utf-8");
  const parsed = parseYaml(raw) as PackContract;
  const errors = validateContract(parsed);
  if (errors.length) {
    throw new Error(`Invalid capabilities.yaml at ${installPath}:\n  ${errors.join("\n  ")}`);
  }
  return parsed;
}

export function validateContract(contract: PackContract): string[] {
  const errors: string[] = [];

  if (!contract.packId || typeof contract.packId !== "string") {
    errors.push("Missing or invalid packId");
  }
  if (!contract.version) {
    errors.push("Missing version");
  }
  if (!Array.isArray(contract.capabilities) || contract.capabilities.length === 0) {
    errors.push("capabilities must be a non-empty array");
  }

  const seen = new Set<string>();
  for (const cap of contract.capabilities ?? []) {
    if (!cap.id || typeof cap.id !== "string") {
      errors.push("Capability missing id");
      continue;
    }
    if (seen.has(cap.id)) {
      errors.push(`Duplicate capability: ${cap.id}`);
    }
    seen.add(cap.id);
    if (!VALID_SIDE_EFFECTS.has(cap.sideEffect)) {
      errors.push(`${cap.id}: invalid sideEffect "${cap.sideEffect}" (must be read, write, or destructive)`);
    }
    if (typeof cap.required !== "boolean") {
      errors.push(`${cap.id}: required must be a boolean`);
    }
  }

  return errors;
}
