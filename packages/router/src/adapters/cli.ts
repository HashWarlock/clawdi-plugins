import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
  CapabilityAdapter,
  ProbeResult,
  AdapterResult,
} from "./types.js";

const execFileAsync = promisify(execFile);

function matchMapping(
  mappings: Record<string, string>,
  capabilityId: string
): string | undefined {
  for (const [pattern, bin] of Object.entries(mappings)) {
    if (pattern === capabilityId) return bin;
    if (
      pattern.endsWith("*") &&
      capabilityId.startsWith(pattern.slice(0, -1))
    )
      return bin;
  }
  return undefined;
}

export class CliAdapter implements CapabilityAdapter {
  readonly id = "cli";

  constructor(private cliMappings: Record<string, string>) {}

  async probe(capabilityId: string): Promise<ProbeResult | null> {
    const bin = matchMapping(this.cliMappings, capabilityId);
    if (!bin) return null;

    try {
      await execFileAsync("which", [bin]);
      return {
        adapterId: this.id,
        providerDetails: { bin },
        connectionReady: true,
        displayName: bin,
      };
    } catch {
      return {
        adapterId: this.id,
        providerDetails: { bin },
        connectionReady: false,
        displayName: bin,
        setupHint: `Install ${bin}`,
      };
    }
  }

  async execute(
    _capabilityId: string,
    providerDetails: unknown,
    args: Record<string, unknown>,
    _packId: string
  ): Promise<AdapterResult> {
    const { bin } = providerDetails as { bin: string };
    const cliArgs = (args.args as string[]) ?? [];
    try {
      const { stdout } = await execFileAsync(bin, cliArgs, {
        timeout: 30_000,
      });
      return { status: "ok", data: stdout };
    } catch (err) {
      return {
        status: "error",
        notes: [
          `CLI execution failed: ${err instanceof Error ? err.message : String(err)}`,
        ],
      };
    }
  }
}
