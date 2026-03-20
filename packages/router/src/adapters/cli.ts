import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CapabilityAdapter, AdapterReadiness, AdapterResult } from "./types.js";
import type { CapabilityId, PackId } from "../capabilities/types.js";

const execFileAsync = promisify(execFile);

interface CliMapping {
  bin: string;
  buildCommand: (args: Record<string, unknown>) => string[];
}

const CAPABILITY_TO_CLI: Record<string, CliMapping> = {
  "docs.convert_format": {
    bin: "pandoc",
    buildCommand: (args) => [
      "-f", String(args.from ?? "docx"),
      "-t", String(args.to ?? "md"),
      String(args.input ?? "-"),
    ],
  },
  "data.query_json": {
    bin: "jq",
    buildCommand: (args) => [String(args.filter ?? "."), String(args.input ?? "-")],
  },
};

async function which(bin: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("which", [bin]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export class CliAdapter implements CapabilityAdapter {
  readonly id = "cli";
  private allowedBinaries: Set<string>;

  constructor(allowedBinaries?: string[]) {
    this.allowedBinaries = new Set(allowedBinaries ?? Object.values(CAPABILITY_TO_CLI).map((m) => m.bin));
  }

  setAllowedBinaries(bins: string[]): void {
    this.allowedBinaries = new Set(bins);
  }

  async providesCapabilities(): Promise<CapabilityId[]> {
    return Object.keys(CAPABILITY_TO_CLI);
  }

  async checkReadiness(input: {
    packId: PackId;
    capabilityId: CapabilityId;
  }): Promise<AdapterReadiness> {
    const mapping = CAPABILITY_TO_CLI[input.capabilityId];
    if (!mapping) {
      return { ready: false, setupAction: "none" };
    }

    if (!this.allowedBinaries.has(mapping.bin)) {
      return { ready: false, setupAction: "configure" };
    }

    const binPath = await which(mapping.bin);
    return {
      ready: !!binPath,
      missingBins: binPath ? [] : [mapping.bin],
      setupAction: binPath ? "none" : "install",
    };
  }

  async execute(input: {
    packId: PackId;
    capabilityId: CapabilityId;
    args: Record<string, unknown>;
  }): Promise<AdapterResult> {
    const mapping = CAPABILITY_TO_CLI[input.capabilityId];
    if (!mapping) {
      return { status: "error", notes: [`No CLI mapping for ${input.capabilityId}`] };
    }

    try {
      const cmdArgs = mapping.buildCommand(input.args);
      const { stdout } = await execFileAsync(mapping.bin, cmdArgs, { timeout: 30_000 });
      return { status: "ok", data: stdout };
    } catch (err) {
      return {
        status: "error",
        notes: [`CLI execution failed: ${err instanceof Error ? err.message : String(err)}`],
      };
    }
  }
}
