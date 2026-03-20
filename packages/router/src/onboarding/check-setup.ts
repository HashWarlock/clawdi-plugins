import type { PackManifest, CapabilityId } from "../capabilities/types.js";
import type { CapabilityAdapter } from "../adapters/types.js";

export interface SetupStatus {
  packStatuses: Array<{
    packId: string;
    displayName: string;
    capabilities: Array<{
      id: CapabilityId;
      required: boolean;
      status: "ready" | "needs_setup";
      resolvedAdapter?: string;
      resolvedApp?: string;
    }>;
  }>;
  adapterStatuses: Array<{
    id: string;
    loaded: boolean;
    notes?: string[];
  }>;
}

export async function runCheckSetup(
  packs: PackManifest[],
  adapters: CapabilityAdapter[],
  disabledAdapters: string[]
): Promise<SetupStatus> {
  const disabled = new Set(disabledAdapters);

  const packStatuses: SetupStatus["packStatuses"] = [];

  for (const pack of packs) {
    const allCaps = [
      ...pack.capabilities.required.map((c) => ({ id: c, required: true })),
      ...pack.capabilities.optional.map((c) => ({ id: c, required: false })),
    ];

    const capabilities: SetupStatus["packStatuses"][0]["capabilities"] = [];

    for (const { id: capId, required } of allCaps) {
      let resolved = false;
      let resolvedAdapter: string | undefined;

      for (const adapter of adapters) {
        if (disabled.has(adapter.id)) continue;
        const caps = await adapter.providesCapabilities();
        if (!caps.includes(capId)) continue;

        const readiness = await adapter.checkReadiness({
          packId: pack.packId,
          capabilityId: capId,
        });
        if (readiness.ready) {
          resolved = true;
          resolvedAdapter = adapter.id;
          break;
        }
      }

      capabilities.push({
        id: capId,
        required,
        status: resolved ? "ready" : "needs_setup",
        resolvedAdapter,
      });
    }

    packStatuses.push({
      packId: pack.packId,
      displayName: pack.displayName,
      capabilities,
    });
  }

  const adapterStatuses = adapters.map((a) => ({
    id: a.id,
    loaded: !disabled.has(a.id),
    notes: disabled.has(a.id) ? ["Disabled by config"] : undefined,
  }));

  return { packStatuses, adapterStatuses };
}

export function formatCheckSetup(status: SetupStatus): string {
  const lines: string[] = [];

  for (const pack of status.packStatuses) {
    lines.push(`\n${pack.displayName}`);
    for (const cap of pack.capabilities) {
      const icon = cap.status === "ready" ? "+" : cap.required ? "X" : "?";
      const suffix = cap.resolvedAdapter ? ` -> ${cap.resolvedAdapter}` : " -> needs setup";
      const optLabel = cap.required ? "" : " (optional)";
      lines.push(`  [${icon}] ${cap.id}${suffix}${optLabel}`);
    }
  }

  lines.push("\nRouter adapters:");
  for (const adapter of status.adapterStatuses) {
    const icon = adapter.loaded ? "+" : "-";
    const note = adapter.notes?.length ? ` (${adapter.notes.join(", ")})` : "";
    lines.push(`  [${icon}] ${adapter.id}${note}`);
  }

  return lines.join("\n");
}
