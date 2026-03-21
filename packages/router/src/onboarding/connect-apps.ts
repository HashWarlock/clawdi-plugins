import type {
  PackManifest,
  CapabilityId,
} from "../capabilities/types.js";
import type { DiscoveryEngine } from "../discovery/engine.js";

export interface ConnectAppsReport {
  packReports: Array<{
    packId: string;
    displayName: string;
    ready: Array<{
      capabilityId: CapabilityId;
      displayName: string;
      adapterId: string;
    }>;
    needsSetup: Array<{
      capabilityId: CapabilityId;
      displayName: string;
      setupHint?: string;
      setupUrl?: string;
    }>;
    notFound: CapabilityId[];
    allRequiredReady: boolean;
  }>;
}

export async function runConnectApps(
  packs: PackManifest[],
  engine: DiscoveryEngine
): Promise<ConnectAppsReport> {
  const packReports: ConnectAppsReport["packReports"] = [];

  for (const pack of packs) {
    const allCaps = [
      ...pack.capabilities.required,
      ...pack.capabilities.optional,
    ];
    const ready: ConnectAppsReport["packReports"][0]["ready"] = [];
    const needsSetup: ConnectAppsReport["packReports"][0]["needsSetup"] =
      [];
    const notFound: CapabilityId[] = [];

    for (const capId of allCaps) {
      const probes = await engine.probeAll(capId, pack.packId);
      const readyProbe = probes.find((p) => p.connectionReady);

      if (readyProbe) {
        ready.push({
          capabilityId: capId,
          displayName: readyProbe.displayName,
          adapterId: readyProbe.adapterId,
        });
      } else if (probes.length > 0) {
        const best = probes[0];
        needsSetup.push({
          capabilityId: capId,
          displayName: best.displayName,
          setupHint: best.setupHint,
          setupUrl: best.setupUrl,
        });
      } else {
        notFound.push(capId);
      }
    }

    const allRequiredReady = pack.capabilities.required.every((c) =>
      ready.some((r) => r.capabilityId === c)
    );

    packReports.push({
      packId: pack.packId,
      displayName: pack.displayName,
      ready,
      needsSetup,
      notFound,
      allRequiredReady,
    });
  }

  return { packReports };
}
