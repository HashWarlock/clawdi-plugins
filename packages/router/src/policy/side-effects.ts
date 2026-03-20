import { randomUUID } from "node:crypto";
import type { CapabilityId, AdapterId, PendingConfirmation, PackId } from "../capabilities/types.js";

export type SideEffectPolicy = "always_confirm" | "confirm_destructive" | "never_confirm";

export interface SideEffectCheckResult {
  blocked: boolean;
  confirmationToken?: string;
  message?: string;
}

export class SideEffectGuard {
  private policy: SideEffectPolicy;
  private pending = new Map<string, PendingConfirmation>();
  private readonly TOKEN_TTL = 300_000; // 5 minutes

  constructor(policy: SideEffectPolicy) {
    this.policy = policy;
  }

  setPolicy(policy: SideEffectPolicy): void {
    this.policy = policy;
  }

  check(input: {
    capabilityId: CapabilityId;
    packId: PackId;
    args: Record<string, unknown>;
    isSideEffect: boolean;
    adapterId: AdapterId;
    resolvedApp: string;
  }): SideEffectCheckResult {
    const shouldBlock =
      this.policy === "always_confirm" ||
      (this.policy === "confirm_destructive" && input.isSideEffect);

    if (!shouldBlock) {
      return { blocked: false };
    }

    const token = randomUUID();
    this.pending.set(token, {
      capabilityId: input.capabilityId,
      packId: input.packId,
      args: input.args,
      adapterId: input.adapterId,
      expiresAt: Date.now() + this.TOKEN_TTL,
    });

    return {
      blocked: true,
      confirmationToken: token,
      message: `About to perform ${input.capabilityId} via ${input.resolvedApp}. Proceed?`,
    };
  }

  validateToken(token: string): PendingConfirmation | undefined {
    const pending = this.pending.get(token);
    if (!pending) return undefined;

    if (Date.now() > pending.expiresAt) {
      this.pending.delete(token);
      return undefined;
    }

    this.pending.delete(token); // consume token
    return pending;
  }

  expireToken(token: string): void {
    this.pending.delete(token);
  }

  cleanupExpired(): void {
    const now = Date.now();
    for (const [token, pending] of this.pending) {
      if (now > pending.expiresAt) {
        this.pending.delete(token);
      }
    }
  }
}
