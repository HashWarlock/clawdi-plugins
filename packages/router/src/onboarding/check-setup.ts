import type {
  PackManifest,
  CapabilityId,
} from "../capabilities/types.js";
import type { DiscoveryEngine } from "../discovery/engine.js";
import type { CapabilityAdapter } from "../adapters/types.js";

export interface SetupStatus {
  packStatuses: Array<{
    packId: string;
    displayName: string;
    capabilities: Array<{
      id: CapabilityId;
      required: boolean;
      status: "ready" | "needs_setup" | "not_found";
      resolvedAdapter?: string;
      displayName?: string;
      setupHint?: string;
    }>;
  }>;
  adapterStatuses: Array<{ id: string; enabled: boolean }>;
}

export async function runCheckSetup(
  packs: PackManifest[],
  engine: DiscoveryEngine,
  adapters: CapabilityAdapter[],
  disabledAdapters: string[]
): Promise<SetupStatus> {
  const disabled = new Set(disabledAdapters);
  const packStatuses: SetupStatus["packStatuses"] = [];

  for (const pack of packs) {
    const allCaps = [
      ...pack.capabilities.required.map((c) => ({
        id: c,
        required: true,
      })),
      ...pack.capabilities.optional.map((c) => ({
        id: c,
        required: false,
      })),
    ];

    const capabilities: SetupStatus["packStatuses"][0]["capabilities"] =
      [];

    for (const { id: capId, required } of allCaps) {
      const probes = await engine.probeAll(capId, pack.packId);
      const readyProbe = probes.find((p) => p.connectionReady);

      if (readyProbe) {
        capabilities.push({
          id: capId,
          required,
          status: "ready",
          resolvedAdapter: readyProbe.adapterId,
          displayName: readyProbe.displayName,
        });
      } else if (probes.length > 0) {
        capabilities.push({
          id: capId,
          required,
          status: "needs_setup",
          displayName: probes[0].displayName,
          setupHint: probes[0].setupHint,
        });
      } else {
        capabilities.push({
          id: capId,
          required,
          status: "not_found",
        });
      }
    }

    packStatuses.push({
      packId: pack.packId,
      displayName: pack.displayName,
      capabilities,
    });
  }

  const adapterStatuses = adapters.map((a) => ({
    id: a.id,
    enabled: !disabled.has(a.id),
  }));

  return { packStatuses, adapterStatuses };
}

export function formatCheckSetup(status: SetupStatus): string {
  const lines: string[] = [];

  for (const pack of status.packStatuses) {
    lines.push(`\n${pack.displayName}`);
    for (const cap of pack.capabilities) {
      const icon =
        cap.status === "ready"
          ? "[+]"
          : cap.status === "needs_setup"
            ? "[!]"
            : "[X]";
      const suffix = cap.resolvedAdapter
        ? ` -> ${cap.displayName} (via ${cap.resolvedAdapter})`
        : cap.setupHint
          ? ` -> ${cap.setupHint}`
          : " -> no provider found";
      const optLabel = cap.required ? "" : " (optional)";
      lines.push(`  ${icon} ${cap.id}${suffix}${optLabel}`);
    }
  }

  lines.push("\nAdapters:");
  for (const adapter of status.adapterStatuses) {
    const icon = adapter.enabled ? "[+]" : "[-]";
    lines.push(
      `  ${icon} ${adapter.id}${adapter.enabled ? "" : " (disabled)"}`
    );
  }

  return lines.join("\n");
}
