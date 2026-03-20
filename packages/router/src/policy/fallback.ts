import type { CapabilityAdapter, AdapterResult } from "../adapters/types.js";
import type { CapabilityId, PackId, AdapterId } from "../capabilities/types.js";
import { findBestMatch } from "../capabilities/pattern.js";

export interface FallbackConfig {
  adapterOrder?: AdapterId[];
  disabledAdapters?: AdapterId[];
  capabilityPins?: Record<string, AdapterId>;
  executionTimeoutMs?: number;
}

const DEFAULT_ORDER: AdapterId[] = [
  "composio",
  "openclaw_tool",
  "lobster",
  "cli",
  "mcporter",
];

export class FallbackResolver {
  private adapterMap: Map<string, CapabilityAdapter>;
  private adapterIds: AdapterId[];
  private config: FallbackConfig;

  constructor(adapters: CapabilityAdapter[], config: FallbackConfig) {
    this.adapterMap = new Map(adapters.map((a) => [a.id, a]));
    this.adapterIds = adapters.map((a) => a.id);
    this.config = config;
  }

  /**
   * Find the first ready adapter and execute. Returns result + adapterId.
   * Does NOT check side-effect policy — that's the Router's job.
   */
  async resolve(
    capabilityId: CapabilityId,
    packId: PackId,
    args: Record<string, unknown>,
    packFallbackOverrides?: Record<string, { adapters: AdapterId[] }>
  ): Promise<AdapterResult & { resolvedAdapterId?: AdapterId }> {
    const disabled = new Set(this.config.disabledAdapters ?? []);
    const timeoutMs = this.config.executionTimeoutMs ?? 30_000;

    // Check capability pins
    const pinnedAdapter = this.config.capabilityPins
      ? findBestMatch(this.config.capabilityPins, capabilityId)
      : undefined;

    const defaultOrder = this.config.adapterOrder ?? this.adapterIds;

    let order: AdapterId[];
    if (pinnedAdapter) {
      order = [pinnedAdapter];
    } else if (packFallbackOverrides) {
      const override = findBestMatch(packFallbackOverrides, capabilityId);
      order = override?.adapters ?? defaultOrder;
    } else {
      order = defaultOrder;
    }

    for (const adapterId of order) {
      if (disabled.has(adapterId)) continue;

      const adapter = this.adapterMap.get(adapterId);
      if (!adapter) continue;

      const caps = await adapter.providesCapabilities();
      if (!caps.includes(capabilityId)) continue;

      const readiness = await adapter.checkReadiness({ packId, capabilityId });
      if (!readiness.ready) continue;

      // Execute with timeout
      try {
        const result = await Promise.race([
          adapter.execute({ packId, capabilityId, args }),
          new Promise<AdapterResult>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), timeoutMs)
          ),
        ]);
        return { ...result, resolvedAdapterId: adapterId };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message === "timeout") {
          return {
            status: "error",
            notes: [`Adapter ${adapterId} execution timeout after ${timeoutMs}ms`],
          };
        }
        return {
          status: "error",
          notes: [`Adapter ${adapterId} failed: ${message}`],
        };
      }
    }

    return {
      status: "needs_setup",
      data: { capabilityId, packId },
      notes: ["No adapter is ready for this capability"],
    };
  }
}
