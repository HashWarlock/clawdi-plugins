import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import {
  DiscoveryEngine,
  type DiscoveryEngineConfig,
} from "./discovery/engine.js";
import {
  SideEffectGuard,
  type SideEffectPolicy,
} from "./policy/side-effects.js";
import type {
  CapabilityAdapter,
  AdapterResult,
} from "./adapters/types.js";
import type {
  PackManifest,
  CapabilityId,
  PackId,
} from "./capabilities/types.js";

export interface RouterConfig {
  adapterOrder?: string[];
  disabledAdapters?: string[];
  capabilityPins?: Record<string, string>;
  sideEffectPolicy?: SideEffectPolicy;
  cacheTtl?: number;
}

export class Router {
  readonly engine: DiscoveryEngine;
  readonly adapters: CapabilityAdapter[];
  readonly packs: PackManifest[] = [];
  private sideEffectGuard: SideEffectGuard;

  constructor(
    adapters: CapabilityAdapter[],
    config: RouterConfig = {}
  ) {
    this.adapters = adapters;
    this.engine = new DiscoveryEngine(adapters, {
      adapterOrder: config.adapterOrder,
      disabledAdapters: config.disabledAdapters,
      capabilityPins: config.capabilityPins,
      cacheTtl: config.cacheTtl,
    });
    this.sideEffectGuard = new SideEffectGuard(
      config.sideEffectPolicy ?? "confirm_destructive"
    );
  }

  registerPack(manifest: PackManifest): void {
    this.packs.push(manifest);
    this.engine.registerPack(manifest);
  }

  async resolve(
    capabilityId: CapabilityId,
    packId: PackId,
    args: Record<string, unknown>,
    skipSideEffectCheck = false
  ): Promise<AdapterResult> {
    const probe = await this.engine.resolve(capabilityId, packId);

    if (!probe) {
      return {
        status: "error",
        notes: [`No adapter found for ${capabilityId}`],
      };
    }

    if (!probe.connectionReady) {
      return {
        status: "needs_setup",
        notes: [
          probe.setupHint ??
            `${probe.displayName} needs setup`,
        ],
        data: {
          displayName: probe.displayName,
          setupUrl: probe.setupUrl,
        },
      };
    }

    if (!skipSideEffectCheck) {
      const pack = this.packs.find((p) => p.packId === packId);
      const check = this.sideEffectGuard.check({
        capabilityId,
        packId,
        args,
        adapterId: probe.adapterId,
        resolvedApp: probe.displayName,
        sideEffects: pack?.sideEffects,
      });
      if (check.blocked) {
        return {
          status: "blocked",
          data: {
            message: check.message,
            confirmationToken: check.confirmationToken,
          },
        };
      }
    }

    const adapter = this.adapters.find(
      (a) => a.id === probe.adapterId
    );
    if (!adapter) {
      return {
        status: "error",
        notes: [`Adapter ${probe.adapterId} not found`],
      };
    }

    try {
      const execPromise = adapter.execute(
        capabilityId,
        probe.providerDetails,
        args,
        packId
      );
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Execution timeout (30s)")),
          30_000
        )
      );
      return await Promise.race([execPromise, timeoutPromise]);
    } catch (err) {
      this.engine.invalidate(capabilityId);
      return {
        status: "error",
        notes: [
          `Execution failed: ${err instanceof Error ? err.message : String(err)}`,
        ],
      };
    }
  }

  async executeConfirmed(token: string): Promise<AdapterResult> {
    const pending = this.sideEffectGuard.validateToken(token);
    if (!pending) {
      return {
        status: "error",
        notes: ["Invalid or expired confirmation token"],
      };
    }
    return this.resolve(
      pending.capabilityId,
      pending.packId,
      pending.args,
      true
    );
  }

  static async loadPackManifest(
    installPath: string
  ): Promise<PackManifest> {
    const raw = await readFile(
      `${installPath}/pack-manifest.yaml`,
      "utf-8"
    );
    return parseYaml(raw) as PackManifest;
  }
}
