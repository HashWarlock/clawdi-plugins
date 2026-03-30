import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { lookup } from "./registry.js";
import type {
  CapabilityId,
  PackId,
  PackContract,
  ProviderEntry,
  ProviderTarget,
  ResolutionResult,
  PendingConfirmation,
  RuntimeCallbacks,
  SideEffectPolicy,
} from "./types.js";
import type { Registry } from "./registry.js";

const execFileAsync = promisify(execFile);

const TOKEN_TTL = 300_000; // 5 minutes
const EXEC_TIMEOUT = 30_000; // 30 seconds

const pendingConfirmations = new Map<string, PendingConfirmation>();

function matchPattern(pattern: string, capabilityId: string): boolean {
  if (pattern === capabilityId) return true;
  if (pattern.endsWith(".*")) return capabilityId.startsWith(pattern.slice(0, -1));
  if (pattern.endsWith("*")) return capabilityId.startsWith(pattern.slice(0, -1));
  return false;
}

function sortByPreference(
  candidates: ProviderEntry[],
  preferredProviders: Record<string, string[]> | undefined,
  capabilityId: CapabilityId
): ProviderEntry[] {
  if (!preferredProviders) return candidates;

  let preferred: string[] = [];
  for (const [pattern, providers] of Object.entries(preferredProviders)) {
    if (matchPattern(pattern, capabilityId)) {
      preferred = providers;
      break;
    }
  }

  if (!preferred.length) return candidates;

  return [...candidates].sort((a, b) => {
    const aIdx = preferred.findIndex((p) => a.providerId.toLowerCase().includes(p.toLowerCase()));
    const bIdx = preferred.findIndex((p) => b.providerId.toLowerCase().includes(p.toLowerCase()));
    const aRank = aIdx === -1 ? Infinity : aIdx;
    const bRank = bIdx === -1 ? Infinity : bIdx;
    return aRank - bRank;
  });
}

export async function resolve(
  packId: PackId,
  capabilityId: CapabilityId,
  args: Record<string, unknown>,
  registry: Registry,
  contracts: Map<PackId, PackContract>,
  callbacks: RuntimeCallbacks,
  sideEffectPolicy: SideEffectPolicy,
  confirmationToken?: string
): Promise<ResolutionResult> {
  // 0. Handle confirmation flow
  if (confirmationToken) {
    const pending = validateToken(confirmationToken);
    if (!pending) return { status: "unavailable" };
    return executeTarget(pending.target, args, callbacks, pending.provider);
  }

  // 1. Verify capability is declared by this pack
  const contract = contracts.get(packId);
  if (!contract) return { status: "unavailable" };

  const cap = contract.capabilities.find((c) => c.id === capabilityId);
  if (!cap) return { status: "unavailable" };

  // 2. Look up providers
  let candidates = lookup(registry, capabilityId);
  if (!candidates.length) return { status: "unavailable" };

  // 3. Sort by pack's preferredProviders
  candidates = sortByPreference(candidates, contract.preferredProviders, capabilityId);

  // 4. Find best candidate (ready first)
  const ready = candidates.filter((c) => c.ready);
  if (!ready.length) {
    const best = candidates[0];
    return {
      status: "needs_setup",
      provider: best.providerId,
      setupHint: best.setupHint,
      setupUrl: best.setupUrl,
    };
  }

  const chosen = ready[0];

  // 5. Side-effect check
  {
    const shouldBlock =
      sideEffectPolicy === "always_confirm" ||
      (sideEffectPolicy === "confirm_destructive" &&
        (cap.sideEffect === "write" || cap.sideEffect === "destructive"));

    if (shouldBlock) {
      const token = randomUUID();
      pendingConfirmations.set(token, {
        capabilityId,
        packId,
        args,
        provider: chosen.providerId,
        target: chosen.target,
        expiresAt: Date.now() + TOKEN_TTL,
      });
      return {
        status: "blocked",
        message: `About to perform ${capabilityId} via ${chosen.providerId}. Proceed?`,
        confirmationToken: token,
      };
    }
  }

  // 6. Execute or return skill_context
  return executeTarget(chosen.target, args, callbacks, chosen.providerId);
}

async function executeTarget(
  target: ProviderTarget,
  args: Record<string, unknown>,
  callbacks: RuntimeCallbacks,
  providerId: string
): Promise<ResolutionResult> {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Execution timeout (30s)")), EXEC_TIMEOUT);
  });

  try {
    const execPromise = (async (): Promise<ResolutionResult> => {
      switch (target.kind) {
        case "builtin_tool":
          return {
            status: "executed",
            provider: providerId,
            data: await callbacks.callBuiltinTool(target.name, args),
          };

        case "mcp_tool":
          return {
            status: "executed",
            provider: providerId,
            data: await callbacks.callMcpTool(target.server, target.tool, args),
          };

        case "composio":
          return {
            status: "executed",
            provider: providerId,
            data: await callbacks.callMcpTool("clawdi-mcp", "COMPOSIO_MULTI_EXECUTE_TOOL", {
              tool_slug: target.action,
              ...args,
            }),
          };

        case "cli": {
          const cliArgs = (args.argv as string[]) ?? (args.args as string[]) ?? [];
          const { stdout } = await execFileAsync(target.command, cliArgs, { timeout: EXEC_TIMEOUT });
          return { status: "executed", provider: providerId, data: stdout };
        }

        case "lobster":
          return {
            status: "executed",
            provider: providerId,
            data: await callbacks.runLobsterWorkflow(target.workflowId, args),
          };

        case "skill":
          return { status: "skill_context", provider: providerId, skillName: target.skillName };
      }
    })();

    const result = await Promise.race([execPromise, timeoutPromise]);
    clearTimeout(timer!);
    return result;
  } catch (err) {
    clearTimeout(timer!);
    return { status: "unavailable" };
  }
}

function validateToken(token: string): PendingConfirmation | undefined {
  const pending = pendingConfirmations.get(token);
  if (!pending) return undefined;
  if (Date.now() > pending.expiresAt) {
    pendingConfirmations.delete(token);
    return undefined;
  }
  pendingConfirmations.delete(token); // Single-use
  return pending;
}

export function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [token, pending] of pendingConfirmations) {
    if (now > pending.expiresAt) pendingConfirmations.delete(token);
  }
}
