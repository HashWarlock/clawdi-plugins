import type {
  CapabilityAdapter,
  ProbeResult,
  ProbeHints,
} from "../adapters/types.js";
import type {
  PackManifest,
  CapabilityId,
  PackId,
  AdapterId,
} from "../capabilities/types.js";
import { extractIntent } from "./intent.js";

interface CacheEntry {
  probe: ProbeResult;
  resolvedAt: number;
  ttl: number;
}

export interface DiscoveryEngineConfig {
  adapterOrder: AdapterId[];
  disabledAdapters: AdapterId[];
  capabilityPins: Record<string, AdapterId>;
  cacheTtl: number;
  probeTimeoutMs: number;
}

const DEFAULT_CONFIG: DiscoveryEngineConfig = {
  adapterOrder: [
    "composio",
    "openclaw_tool",
    "lobster",
    "cli",
    "mcporter",
  ],
  disabledAdapters: [],
  capabilityPins: {},
  cacheTtl: 600_000,
  probeTimeoutMs: 5_000,
};

function matchPattern(pattern: string, capabilityId: string): boolean {
  if (pattern === capabilityId) return true;
  if (pattern.endsWith(".*")) {
    return capabilityId.startsWith(pattern.slice(0, -1));
  }
  return false;
}

export class DiscoveryEngine {
  private cache = new Map<CapabilityId, CacheEntry>();
  private packs = new Map<PackId, PackManifest>();
  private adapterMap = new Map<AdapterId, CapabilityAdapter>();
  private config: DiscoveryEngineConfig;

  constructor(
    adapters: CapabilityAdapter[],
    config: Partial<DiscoveryEngineConfig> = {}
  ) {
    this.config = {
      adapterOrder:
        config.adapterOrder ?? DEFAULT_CONFIG.adapterOrder,
      disabledAdapters:
        config.disabledAdapters ?? DEFAULT_CONFIG.disabledAdapters,
      capabilityPins:
        config.capabilityPins ?? DEFAULT_CONFIG.capabilityPins,
      cacheTtl: config.cacheTtl ?? DEFAULT_CONFIG.cacheTtl,
      probeTimeoutMs:
        config.probeTimeoutMs ?? DEFAULT_CONFIG.probeTimeoutMs,
    };
    for (const adapter of adapters) {
      this.adapterMap.set(adapter.id, adapter);
    }
  }

  registerPack(manifest: PackManifest): void {
    this.packs.set(manifest.packId, manifest);
  }

  async resolve(
    capabilityId: CapabilityId,
    packId: PackId
  ): Promise<ProbeResult | null> {
    // Check cache
    const cached = this.cache.get(capabilityId);
    if (cached && Date.now() - cached.resolvedAt < cached.ttl) {
      return cached.probe;
    }

    // Build adapter order and hints
    const { adapters: adapterOrder, pinned } =
      this.getAdapterOrder(capabilityId, packId);
    const { intent, domain } = extractIntent(capabilityId);
    const hints = this.buildHints(capabilityId, packId, domain);
    if (pinned) hints.pinned = true;

    // Probe adapters in order
    let fallback: ProbeResult | null = null;
    for (const adapterId of adapterOrder) {
      if (this.config.disabledAdapters.includes(adapterId)) continue;
      const adapter = this.adapterMap.get(adapterId);
      if (!adapter) continue;

      try {
        const probe = await this.probeWithTimeout(
          adapter,
          capabilityId,
          intent,
          hints
        );
        if (!probe) continue;

        if (probe.connectionReady) {
          this.cache.set(capabilityId, {
            probe,
            resolvedAt: Date.now(),
            ttl: this.config.cacheTtl,
          });
          return probe;
        } else if (!fallback) {
          fallback = probe;
        }
      } catch {
        // Probe threw — skip to next adapter
      }
    }

    return fallback;
  }

  async probeAll(
    capabilityId: CapabilityId,
    packId: PackId
  ): Promise<ProbeResult[]> {
    const { intent, domain } = extractIntent(capabilityId);
    const hints = this.buildHints(capabilityId, packId, domain);
    const results: ProbeResult[] = [];

    const promises = Array.from(this.adapterMap.values())
      .filter((a) => !this.config.disabledAdapters.includes(a.id))
      .map(async (adapter) => {
        try {
          const probe = await this.probeWithTimeout(
            adapter,
            capabilityId,
            intent,
            hints
          );
          if (probe) results.push(probe);
        } catch {
          // Skip failed probes
        }
      });

    await Promise.all(promises);

    // Warm cache with first ready result
    for (const probe of results) {
      if (probe.connectionReady && !this.cache.has(capabilityId)) {
        this.cache.set(capabilityId, {
          probe,
          resolvedAt: Date.now(),
          ttl: this.config.cacheTtl,
        });
      }
    }

    return results;
  }

  invalidate(capabilityId: CapabilityId): void {
    this.cache.delete(capabilityId);
  }

  clearCache(): void {
    this.cache.clear();
  }

  private getAdapterOrder(
    capabilityId: CapabilityId,
    packId: PackId
  ): { adapters: AdapterId[]; pinned: boolean } {
    for (const [pattern, adapterId] of Object.entries(
      this.config.capabilityPins
    )) {
      if (matchPattern(pattern, capabilityId)) {
        return { adapters: [adapterId], pinned: true };
      }
    }

    const pack = this.packs.get(packId);
    if (pack?.fallbackOverrides) {
      for (const [pattern, override] of Object.entries(
        pack.fallbackOverrides
      )) {
        if (matchPattern(pattern, capabilityId)) {
          return { adapters: override.adapters, pinned: false };
        }
      }
    }

    return { adapters: this.config.adapterOrder, pinned: false };
  }

  private buildHints(
    capabilityId: CapabilityId,
    packId: PackId,
    domain: string
  ): ProbeHints {
    const pack = this.packs.get(packId);
    const hints: ProbeHints = { domain };

    if (pack?.preferredApps) {
      for (const [pattern, apps] of Object.entries(
        pack.preferredApps
      )) {
        if (matchPattern(pattern, capabilityId)) {
          hints.preferredApps = apps;
          break;
        }
      }
    }

    return hints;
  }

  private async probeWithTimeout(
    adapter: CapabilityAdapter,
    capabilityId: CapabilityId,
    intent: string,
    hints: ProbeHints
  ): Promise<ProbeResult | null> {
    return Promise.race([
      adapter.probe(capabilityId, intent, hints),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), this.config.probeTimeoutMs)
      ),
    ]);
  }
}
