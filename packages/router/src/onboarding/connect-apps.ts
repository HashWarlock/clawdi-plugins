import type { PackManifest, CapabilityId } from "../capabilities/types.js";
import type { CapabilityAdapter } from "../adapters/types.js";
import { suggestBroadestApps } from "./app-grouping.js";

export interface ConnectAppsContext {
  packs: PackManifest[];
  adapters: CapabilityAdapter[];
  adapterOrder: string[];
  disabledAdapters: string[];
}

export interface ConnectAppsReport {
  packReports: Array<{
    packId: string;
    displayName: string;
    readyCapabilities: CapabilityId[];
    unreadyRequired: CapabilityId[];
    unreadyOptional: CapabilityId[];
    suggestions: Array<{
      appName: string;
      coversCapabilities: CapabilityId[];
    }>;
    allRequiredReady: boolean;
  }>;
}

export async function runConnectApps(ctx: ConnectAppsContext): Promise<ConnectAppsReport> {
  const disabled = new Set(ctx.disabledAdapters);
  const activeAdapters = ctx.adapters.filter((a) => !disabled.has(a.id));

  const packReports: ConnectAppsReport["packReports"] = [];

  for (const pack of ctx.packs) {
    const allCaps = [...pack.capabilities.required, ...pack.capabilities.optional];
    const readyCapabilities: CapabilityId[] = [];
    const unreadyRequired: CapabilityId[] = [];
    const unreadyOptional: CapabilityId[] = [];

    for (const capId of allCaps) {
      let isReady = false;

      for (const adapter of activeAdapters) {
        const caps = await adapter.providesCapabilities();
        if (!caps.includes(capId)) continue;

        const readiness = await adapter.checkReadiness({
          packId: pack.packId,
          capabilityId: capId,
        });
        if (readiness.ready) {
          isReady = true;
          break;
        }
      }

      if (isReady) {
        readyCapabilities.push(capId);
      } else if (pack.capabilities.required.includes(capId)) {
        unreadyRequired.push(capId);
      } else {
        unreadyOptional.push(capId);
      }
    }

    const suggestions = suggestBroadestApps(unreadyRequired);

    packReports.push({
      packId: pack.packId,
      displayName: pack.displayName,
      readyCapabilities,
      unreadyRequired,
      unreadyOptional,
      suggestions: suggestions.map((s) => ({
        appName: s.appName,
        coversCapabilities: s.coversCapabilities,
      })),
      allRequiredReady: unreadyRequired.length === 0,
    });
  }

  return { packReports };
}
