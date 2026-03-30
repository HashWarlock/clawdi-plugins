import type { CapabilityId, ProviderEntry } from "./types.js";

export type Registry = Map<CapabilityId, ProviderEntry[]>;

export function createRegistry(): Registry {
  return new Map();
}

export function populate(registry: Registry, entries: ProviderEntry[]): void {
  for (const entry of entries) {
    const list = registry.get(entry.capabilityId) ?? [];
    list.push(entry);
    registry.set(entry.capabilityId, list);
  }
}

export function lookup(registry: Registry, capabilityId: CapabilityId): ProviderEntry[] {
  return registry.get(capabilityId) ?? [];
}
