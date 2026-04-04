import { lookup, type Registry } from "./registry.js";
import type { PackContract, PackManifest } from "./types.js";

export interface SetupStatus {
  packStatuses: Array<{
    packId: string;
    displayName: string;
    capabilities: Array<{
      id: string;
      required: boolean;
      status: "ready" | "needs_setup" | "not_found";
      provider?: string;
      displayName?: string;
      setupHint?: string;
      setupUrl?: string;
      source?: string;
    }>;
  }>;
  scannerSources: string[];
}

export function buildCheckSetup(
  contracts: Map<string, PackContract>,
  manifests: Map<string, PackManifest>,
  registry: Registry
): SetupStatus {
  const packStatuses: SetupStatus["packStatuses"] = [];

  for (const [packId, contract] of contracts) {
    const manifest = manifests.get(packId);
    const capabilities: SetupStatus["packStatuses"][0]["capabilities"] = [];

    for (const cap of contract.capabilities) {
      const providers = lookup(registry, cap.id);
      const readyProvider = providers.find((p) => p.ready);

      if (readyProvider) {
        capabilities.push({
          id: cap.id,
          required: cap.required,
          status: "ready",
          provider: readyProvider.providerId,
          displayName: readyProvider.providerId,
          source: readyProvider.source,
        });
      } else if (providers.length > 0) {
        const best = providers[0];
        capabilities.push({
          id: cap.id,
          required: cap.required,
          status: "needs_setup",
          provider: best.providerId,
          displayName: best.providerId,
          setupHint: best.setupHint,
          setupUrl: best.setupUrl,
        });
      } else {
        capabilities.push({
          id: cap.id,
          required: cap.required,
          status: "not_found",
        });
      }
    }

    packStatuses.push({
      packId,
      displayName: manifest?.displayName ?? packId,
      capabilities,
    });
  }

  return {
    packStatuses,
    scannerSources: ["builtin", "composio", "mcp", "cli", "lobster", "skill"],
  };
}

export function formatCheckSetup(status: SetupStatus): string {
  const lines: string[] = [];

  for (const pack of status.packStatuses) {
    lines.push(`\n${pack.displayName}`);
    for (const cap of pack.capabilities) {
      const icon =
        cap.status === "ready" ? "[+]" : cap.status === "needs_setup" ? "[!]" : "[X]";
      const suffix = cap.provider
        ? ` -> ${cap.displayName}${cap.source ? ` (via ${cap.source})` : ""}`
        : cap.setupHint
          ? ` -> ${cap.setupHint}`
          : " -> no provider found";
      const optLabel = cap.required ? "" : " (optional)";
      lines.push(`  ${icon} ${cap.id}${suffix}${optLabel}`);
    }
  }

  lines.push(`\nAdapters scanned: ${status.scannerSources.join(", ")}`);

  return lines.join("\n");
}

export function formatConnectApps(status: SetupStatus): string {
  const lines: string[] = [];

  for (const pack of status.packStatuses) {
    lines.push(`\n**${pack.displayName}**`);

    const ready = pack.capabilities.filter((c) => c.status === "ready");
    const needsSetup = pack.capabilities.filter((c) => c.status === "needs_setup");
    const notFound = pack.capabilities.filter((c) => c.status === "not_found");
    const allRequiredReady = pack.capabilities
      .filter((c) => c.required)
      .every((c) => c.status === "ready");

    if (allRequiredReady) {
      lines.push("All required capabilities are ready.");
    }

    if (ready.length) {
      lines.push(`Ready: ${ready.map((r) => `${r.id} -> ${r.displayName}`).join(", ")}`);
    }
    for (const s of needsSetup) {
      lines.push(
        `Needs setup: ${s.id} -> ${s.displayName}${s.setupUrl ? ` (${s.setupUrl})` : s.setupHint ? ` — ${s.setupHint}` : ""}`
      );
    }
    if (notFound.length) {
      lines.push(`No provider: ${notFound.map((c) => c.id).join(", ")}`);
    }
  }

  return lines.join("\n") || "No packs discovered.";
}
