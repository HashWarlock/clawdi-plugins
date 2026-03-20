import type { CapabilityId, CapabilityEntry, AdapterId } from "./types.js";

export class CapabilityRegistry {
  private entries = new Map<CapabilityId, CapabilityEntry>();
  private adapterMap = new Map<CapabilityId, AdapterId[]>();

  register(entry: CapabilityEntry): void {
    this.entries.set(entry.id, entry);
    if (!this.adapterMap.has(entry.id)) {
      this.adapterMap.set(entry.id, []);
    }
  }

  get(id: CapabilityId): CapabilityEntry | undefined {
    return this.entries.get(id);
  }

  allIds(): CapabilityId[] {
    return [...this.entries.keys()];
  }

  mapAdapter(capabilityId: CapabilityId, adapterId: AdapterId): void {
    const adapters = this.adapterMap.get(capabilityId) ?? [];
    if (!adapters.includes(adapterId)) {
      adapters.push(adapterId);
      this.adapterMap.set(capabilityId, adapters);
    }
  }

  adaptersFor(capabilityId: CapabilityId): AdapterId[] {
    return this.adapterMap.get(capabilityId) ?? [];
  }
}
