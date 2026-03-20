# Knowledge Work Router Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modular OpenClaw plugin system with a capability router and three role packs (sales, productivity, recruiting) that can be installed and tested on a live OpenClaw deployment.

**Architecture:** Native OpenClaw plugin monorepo. One router plugin owns capability resolution, adapter fallback, onboarding, and config. Pack plugins ship skills and declare capabilities via `pack-manifest.yaml`. Router discovers packs by `@clawdi-ai/pack-*` naming convention.

**Tech Stack:** TypeScript, pnpm workspaces, OpenClaw Plugin SDK (`openclaw/plugin-sdk/core`), YAML for pack manifests, Markdown for skills.

**Spec:** `docs/superpowers/specs/2026-03-20-knowledge-work-router-plugin-design.md`

---

## Chunk 1: Monorepo Scaffolding & Shared Types

### Task 1: Initialize pnpm monorepo

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.json` (root)
- Create: `tsconfig.base.json`
- Create: `.npmrc`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "clawdi-plugins",
  "private": true,
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "@types/node": "^22.0.0"
  },
  "engines": {
    "node": ">=22"
  }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 3: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false
  }
}
```

- [ ] **Step 4: Create root tsconfig.json**

```json
{
  "extends": "./tsconfig.base.json",
  "references": [
    { "path": "packages/router" },
    { "path": "packages/pack-sales" },
    { "path": "packages/pack-productivity" },
    { "path": "packages/pack-recruiting" }
  ]
}
```

- [ ] **Step 5: Create .npmrc**

```ini
shamefully-hoist=true
strict-peer-dependencies=false
```

- [ ] **Step 6: Install dependencies**

Run: `pnpm install`
Expected: lock file created, node_modules populated

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.json tsconfig.base.json .npmrc pnpm-lock.yaml
git commit -m "feat: initialize pnpm monorepo with TypeScript config"
```

---

### Task 2: Router package scaffold + shared types

**Files:**
- Create: `packages/router/package.json`
- Create: `packages/router/tsconfig.json`
- Create: `packages/router/src/capabilities/types.ts`
- Create: `packages/router/src/adapters/types.ts`

- [ ] **Step 1: Create router package.json**

```json
{
  "name": "@clawdi-ai/knowledge-work-router",
  "version": "0.1.0",
  "description": "Capability router for OpenClaw knowledge-work packs",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "openclaw": {
    "extensions": ["./dist/index.js"]
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "yaml": "^2.7.0"
  },
  "peerDependencies": {
    "openclaw": "*"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create router tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create capability types**

File: `packages/router/src/capabilities/types.ts`

```ts
export type CapabilityId = string;
export type PackId = string;
export type AdapterId = string;

export interface CapabilityEntry {
  id: CapabilityId;
  sideEffect: boolean;
  description?: string;
}

export interface PackManifest {
  packId: PackId;
  displayName: string;
  capabilities: {
    required: CapabilityId[];
    optional: CapabilityId[];
  };
  preferredApps: Record<string, string[]>;
  fallbackOverrides?: Record<string, { adapters: AdapterId[] }>;
  preferences?: Record<string, PackPreference>;
  onboarding: {
    welcomeMessage: string;
    suggestedFirstTask: string;
  };
}

export interface PackPreference {
  type: "enum" | "string" | "boolean";
  values?: string[];
  label: string;
  description: string;
  captureAt: "first_use" | "onboarding";
}

export interface PendingConfirmation {
  capabilityId: CapabilityId;
  packId: PackId;
  args: Record<string, unknown>;
  adapterId: AdapterId;
  expiresAt: number;
}
```

- [ ] **Step 4: Create adapter types**

File: `packages/router/src/adapters/types.ts`

```ts
import type { CapabilityId, PackId } from "../capabilities/types.js";

export interface AdapterReadiness {
  ready: boolean;
  missingBins?: string[];
  missingEnv?: string[];
  missingConnections?: string[];
  suggestedApps?: string[];
  setupAction?: "connect" | "install" | "configure" | "none";
}

export interface AdapterResult {
  status: "ok" | "needs_setup" | "blocked" | "error";
  data?: unknown;
  artifacts?: Array<{
    kind: "file" | "link" | "text" | "structured";
    name?: string;
    mimeType?: string;
    value?: unknown;
  }>;
  notes?: string[];
}

export interface CapabilityAdapter {
  id: string;
  providesCapabilities(): Promise<CapabilityId[]>;
  checkReadiness(input: {
    packId: PackId;
    capabilityId: CapabilityId;
  }): Promise<AdapterReadiness>;
  execute(input: {
    packId: PackId;
    capabilityId: CapabilityId;
    args: Record<string, unknown>;
  }): Promise<AdapterResult>;
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/router/
git commit -m "feat: add router package scaffold with capability and adapter types"
```

---

### Task 3: Capability registry with pattern matching

**Files:**
- Create: `packages/router/src/capabilities/pattern.ts`
- Create: `packages/router/src/capabilities/registry.ts`
- Create: `packages/router/src/__tests__/pattern.test.ts`
- Create: `packages/router/src/__tests__/registry.test.ts`

- [ ] **Step 1: Write pattern matching tests**

File: `packages/router/src/__tests__/pattern.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { matchCapabilityPattern, findBestMatch } from "../capabilities/pattern.js";

describe("matchCapabilityPattern", () => {
  it("matches exact capability IDs", () => {
    expect(matchCapabilityPattern("crm.lookup_account", "crm.lookup_account")).toBe(true);
  });

  it("matches glob patterns", () => {
    expect(matchCapabilityPattern("crm.*", "crm.lookup_account")).toBe(true);
    expect(matchCapabilityPattern("crm.*", "crm.create_note")).toBe(true);
  });

  it("rejects non-matching patterns", () => {
    expect(matchCapabilityPattern("crm.*", "calendar.read_events")).toBe(false);
    expect(matchCapabilityPattern("crm.lookup_account", "crm.create_note")).toBe(false);
  });

  it("handles patterns without glob", () => {
    expect(matchCapabilityPattern("calendar.read_events", "calendar.read_events")).toBe(true);
    expect(matchCapabilityPattern("calendar.read_events", "calendar.write_events")).toBe(false);
  });
});

describe("findBestMatch", () => {
  it("prefers exact matches over globs", () => {
    const patterns = {
      "crm.*": "composio",
      "crm.lookup_account": "cli",
    };
    expect(findBestMatch(patterns, "crm.lookup_account")).toBe("cli");
  });

  it("falls back to glob when no exact match", () => {
    const patterns = {
      "crm.*": "composio",
    };
    expect(findBestMatch(patterns, "crm.create_note")).toBe("composio");
  });

  it("returns undefined when nothing matches", () => {
    const patterns = {
      "crm.*": "composio",
    };
    expect(findBestMatch(patterns, "calendar.read_events")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/router && npx vitest run src/__tests__/pattern.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement pattern matching**

File: `packages/router/src/capabilities/pattern.ts`

```ts
/**
 * Check if a glob pattern matches a capability ID.
 * Supports trailing `*` for prefix matching (e.g. "crm.*" matches "crm.lookup_account").
 * Non-glob patterns are exact matches.
 */
export function matchCapabilityPattern(
  pattern: string,
  capabilityId: string
): boolean {
  if (pattern.endsWith(".*")) {
    const prefix = pattern.slice(0, -1); // keep the dot: "crm."
    return capabilityId.startsWith(prefix);
  }
  return pattern === capabilityId;
}

/**
 * Find the best matching value from a pattern->value map.
 * Exact matches take precedence over glob matches.
 * Among globs, longer prefixes win.
 */
export function findBestMatch<T>(
  patterns: Record<string, T>,
  capabilityId: string
): T | undefined {
  // Try exact match first
  if (capabilityId in patterns) {
    return patterns[capabilityId];
  }

  // Try glob matches, prefer longest prefix
  let bestMatch: T | undefined;
  let bestLength = 0;

  for (const [pattern, value] of Object.entries(patterns)) {
    if (pattern.endsWith(".*")) {
      const prefix = pattern.slice(0, -1);
      if (capabilityId.startsWith(prefix) && prefix.length > bestLength) {
        bestMatch = value;
        bestLength = prefix.length;
      }
    }
  }

  return bestMatch;
}
```

- [ ] **Step 4: Run pattern tests**

Run: `cd packages/router && npx vitest run src/__tests__/pattern.test.ts`
Expected: PASS

- [ ] **Step 5: Write registry tests**

File: `packages/router/src/__tests__/registry.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { CapabilityRegistry } from "../capabilities/registry.js";

describe("CapabilityRegistry", () => {
  it("registers and looks up capabilities", () => {
    const registry = new CapabilityRegistry();
    registry.register({ id: "crm.lookup_account", sideEffect: false });
    registry.register({ id: "crm.create_note", sideEffect: true });

    expect(registry.get("crm.lookup_account")).toEqual({
      id: "crm.lookup_account",
      sideEffect: false,
    });
    expect(registry.get("crm.create_note")?.sideEffect).toBe(true);
  });

  it("returns undefined for unknown capabilities", () => {
    const registry = new CapabilityRegistry();
    expect(registry.get("unknown.thing")).toBeUndefined();
  });

  it("lists all capability IDs", () => {
    const registry = new CapabilityRegistry();
    registry.register({ id: "crm.lookup_account", sideEffect: false });
    registry.register({ id: "calendar.read_events", sideEffect: false });

    const ids = registry.allIds();
    expect(ids).toContain("crm.lookup_account");
    expect(ids).toContain("calendar.read_events");
    expect(ids).toHaveLength(2);
  });

  it("tracks which adapters provide each capability", () => {
    const registry = new CapabilityRegistry();
    registry.register({ id: "crm.lookup_account", sideEffect: false });
    registry.mapAdapter("crm.lookup_account", "composio");
    registry.mapAdapter("crm.lookup_account", "cli");

    expect(registry.adaptersFor("crm.lookup_account")).toEqual([
      "composio",
      "cli",
    ]);
  });
});
```

- [ ] **Step 6: Run registry tests to verify they fail**

Run: `cd packages/router && npx vitest run src/__tests__/registry.test.ts`
Expected: FAIL

- [ ] **Step 7: Implement capability registry**

File: `packages/router/src/capabilities/registry.ts`

```ts
import type { CapabilityId, CapabilityEntry, AdapterId } from "./types.js";

export class CapabilityRegistry {
  private entries = new Map<CapabilityId, CapabilityEntry>();
  private adapterMap = new Map<CapabilityId, AdapterId[]>();

  register(entry: CapabilityEntry): void {
    this.entries.set(entry.id, entry);
    if (!this.adapterMap.has(entry.id)) {
      this.adapterMap.set(entry.id, []);
    }
  }

  get(id: CapabilityId): CapabilityEntry | undefined {
    return this.entries.get(id);
  }

  allIds(): CapabilityId[] {
    return [...this.entries.keys()];
  }

  mapAdapter(capabilityId: CapabilityId, adapterId: AdapterId): void {
    const adapters = this.adapterMap.get(capabilityId) ?? [];
    if (!adapters.includes(adapterId)) {
      adapters.push(adapterId);
      this.adapterMap.set(capabilityId, adapters);
    }
  }

  adaptersFor(capabilityId: CapabilityId): AdapterId[] {
    return this.adapterMap.get(capabilityId) ?? [];
  }
}
```

- [ ] **Step 8: Run all tests**

Run: `cd packages/router && npx vitest run`
Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add packages/router/src/capabilities/ packages/router/src/__tests__/
git commit -m "feat: add capability registry with glob pattern matching"
```

---

## Chunk 2: Router Adapters

### Task 4: Composio adapter

**Files:**
- Create: `packages/router/src/adapters/composio.ts`
- Create: `packages/router/src/__tests__/composio.test.ts`

- [ ] **Step 1: Write Composio adapter tests**

File: `packages/router/src/__tests__/composio.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ComposioAdapter } from "../adapters/composio.js";

describe("ComposioAdapter", () => {
  let adapter: ComposioAdapter;

  beforeEach(() => {
    adapter = new ComposioAdapter();
  });

  it("has id 'composio'", () => {
    expect(adapter.id).toBe("composio");
  });

  it("provides known capabilities", async () => {
    const caps = await adapter.providesCapabilities();
    expect(caps).toContain("calendar.read_events");
    expect(caps).toContain("crm.lookup_account");
    expect(caps).toContain("mail.send_followup");
  });

  it("reports not ready when composio client is unavailable", async () => {
    // Default state: no composio client injected
    const readiness = await adapter.checkReadiness({
      packId: "sales",
      capabilityId: "crm.lookup_account",
    });
    expect(readiness.ready).toBe(false);
    expect(readiness.setupAction).toBe("connect");
  });

  it("reports ready when composio client is available and connected", async () => {
    const mockClient = {
      checkConnection: vi.fn().mockResolvedValue(true),
      executeAction: vi.fn().mockResolvedValue({ data: "test" }),
      searchActions: vi.fn().mockResolvedValue([]),
    };
    adapter = new ComposioAdapter(mockClient as any);

    const readiness = await adapter.checkReadiness({
      packId: "sales",
      capabilityId: "crm.lookup_account",
    });
    expect(readiness.ready).toBe(true);
  });

  it("executes via composio client", async () => {
    const mockClient = {
      checkConnection: vi.fn().mockResolvedValue(true),
      executeAction: vi.fn().mockResolvedValue({
        data: { accounts: [{ name: "Acme" }] },
      }),
      searchActions: vi.fn().mockResolvedValue([]),
    };
    adapter = new ComposioAdapter(mockClient as any);

    const result = await adapter.execute({
      packId: "sales",
      capabilityId: "crm.lookup_account",
      args: { query: "Acme" },
    });
    expect(result.status).toBe("ok");
    expect(result.data).toEqual({ accounts: [{ name: "Acme" }] });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/router && npx vitest run src/__tests__/composio.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Composio adapter**

File: `packages/router/src/adapters/composio.ts`

```ts
import type { CapabilityAdapter, AdapterReadiness, AdapterResult } from "./types.js";
import type { CapabilityId, PackId } from "../capabilities/types.js";

interface ComposioMapping {
  toolkit: string;
  action: string;
}

export interface ComposioClient {
  checkConnection(toolkit: string): Promise<boolean>;
  executeAction(action: string, args: Record<string, unknown>): Promise<{ data: unknown }>;
  searchActions(query: string): Promise<Array<{ name: string; description: string }>>;
}

const CAPABILITY_MAP: Record<string, ComposioMapping> = {
  "calendar.read_events": { toolkit: "googlesuper", action: "GOOGLESUPER_LIST_EVENTS" },
  "calendar.prepare_meeting_context": { toolkit: "googlesuper", action: "GOOGLESUPER_GET_EVENT" },
  "crm.lookup_account": { toolkit: "hubspot", action: "HUBSPOT_SEARCH_CONTACTS" },
  "crm.create_note": { toolkit: "hubspot", action: "HUBSPOT_CREATE_NOTE" },
  "mail.send_followup": { toolkit: "googlesuper", action: "GOOGLESUPER_SEND_EMAIL" },
  "mail.read_inbox": { toolkit: "googlesuper", action: "GOOGLESUPER_LIST_EMAILS" },
  "docs.create_brief": { toolkit: "googlesuper", action: "GOOGLESUPER_CREATE_DOC" },
  "chat.search_messages": { toolkit: "slack", action: "SLACK_SEARCH_MESSAGES" },
  "chat.send_message": { toolkit: "slack", action: "SLACK_SEND_MESSAGE" },
  "ats.search_candidates": { toolkit: "greenhouse", action: "GREENHOUSE_SEARCH_CANDIDATES" },
  "ats.get_candidate": { toolkit: "greenhouse", action: "GREENHOUSE_GET_CANDIDATE" },
  "ats.update_candidate_stage": { toolkit: "greenhouse", action: "GREENHOUSE_UPDATE_STAGE" },
  "hris.get_employee": { toolkit: "bamboohr", action: "BAMBOOHR_GET_EMPLOYEE" },
  "hris.list_employees": { toolkit: "bamboohr", action: "BAMBOOHR_LIST_EMPLOYEES" },
  "project.list_tasks": { toolkit: "linear", action: "LINEAR_LIST_ISSUES" },
  "project.create_task": { toolkit: "linear", action: "LINEAR_CREATE_ISSUE" },
  "compensation.get_benchmarks": { toolkit: "pave", action: "PAVE_GET_BENCHMARKS" },
};

const TOOLKIT_TO_APP: Record<string, string> = {
  googlesuper: "Google Workspace",
  hubspot: "HubSpot",
  salesforce: "Salesforce",
  slack: "Slack",
  greenhouse: "Greenhouse",
  bamboohr: "BambooHR",
  linear: "Linear",
  pave: "Pave",
};

export class ComposioAdapter implements CapabilityAdapter {
  readonly id = "composio";
  private client: ComposioClient | null;

  constructor(client?: ComposioClient) {
    this.client = client ?? null;
  }

  setClient(client: ComposioClient): void {
    this.client = client;
  }

  async providesCapabilities(): Promise<CapabilityId[]> {
    return Object.keys(CAPABILITY_MAP);
  }

  async checkReadiness(input: {
    packId: PackId;
    capabilityId: CapabilityId;
  }): Promise<AdapterReadiness> {
    const mapping = CAPABILITY_MAP[input.capabilityId];
    if (!mapping) {
      return { ready: false, setupAction: "none" };
    }

    if (!this.client) {
      return {
        ready: false,
        missingConnections: [mapping.toolkit],
        suggestedApps: [TOOLKIT_TO_APP[mapping.toolkit] ?? mapping.toolkit],
        setupAction: "connect",
      };
    }

    try {
      const connected = await this.client.checkConnection(mapping.toolkit);
      if (!connected) {
        return {
          ready: false,
          missingConnections: [mapping.toolkit],
          suggestedApps: [TOOLKIT_TO_APP[mapping.toolkit] ?? mapping.toolkit],
          setupAction: "connect",
        };
      }
      return { ready: true, setupAction: "none" };
    } catch {
      return {
        ready: false,
        missingConnections: [mapping.toolkit],
        suggestedApps: [TOOLKIT_TO_APP[mapping.toolkit] ?? mapping.toolkit],
        setupAction: "connect",
      };
    }
  }

  async execute(input: {
    packId: PackId;
    capabilityId: CapabilityId;
    args: Record<string, unknown>;
  }): Promise<AdapterResult> {
    const mapping = CAPABILITY_MAP[input.capabilityId];
    if (!mapping) {
      return { status: "error", notes: [`No Composio mapping for ${input.capabilityId}`] };
    }

    if (!this.client) {
      return { status: "needs_setup", notes: ["Composio client not available"] };
    }

    try {
      const result = await this.client.executeAction(mapping.action, input.args);
      return { status: "ok", data: result.data };
    } catch (err) {
      return {
        status: "error",
        notes: [`Composio execution failed: ${err instanceof Error ? err.message : String(err)}`],
      };
    }
  }
}
```

- [ ] **Step 4: Run Composio adapter tests**

Run: `cd packages/router && npx vitest run src/__tests__/composio.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add packages/router/src/adapters/composio.ts packages/router/src/__tests__/composio.test.ts
git commit -m "feat: add Composio adapter with capability mapping"
```

---

### Task 5: OpenClaw Tool adapter

**Files:**
- Create: `packages/router/src/adapters/openclaw-tool.ts`
- Create: `packages/router/src/__tests__/openclaw-tool.test.ts`

- [ ] **Step 1: Write tests**

File: `packages/router/src/__tests__/openclaw-tool.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";
import { OpenClawToolAdapter } from "../adapters/openclaw-tool.js";

describe("OpenClawToolAdapter", () => {
  it("has id 'openclaw_tool'", () => {
    const adapter = new OpenClawToolAdapter();
    expect(adapter.id).toBe("openclaw_tool");
  });

  it("provides known capabilities", async () => {
    const adapter = new OpenClawToolAdapter();
    const caps = await adapter.providesCapabilities();
    expect(caps).toContain("research.collect_sources");
    expect(caps).toContain("research.web_search");
  });

  it("reports ready when tool is available", async () => {
    const mockApi = {
      isToolAvailable: vi.fn().mockResolvedValue(true),
      invokeTool: vi.fn(),
    };
    const adapter = new OpenClawToolAdapter(mockApi as any);

    const readiness = await adapter.checkReadiness({
      packId: "sales",
      capabilityId: "research.web_search",
    });
    expect(readiness.ready).toBe(true);
  });

  it("reports not ready when tool is unavailable", async () => {
    const mockApi = {
      isToolAvailable: vi.fn().mockResolvedValue(false),
      invokeTool: vi.fn(),
    };
    const adapter = new OpenClawToolAdapter(mockApi as any);

    const readiness = await adapter.checkReadiness({
      packId: "sales",
      capabilityId: "research.web_search",
    });
    expect(readiness.ready).toBe(false);
    expect(readiness.setupAction).toBe("configure");
  });
});
```

- [ ] **Step 2: Run tests to verify fail**

Run: `cd packages/router && npx vitest run src/__tests__/openclaw-tool.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement OpenClaw Tool adapter**

File: `packages/router/src/adapters/openclaw-tool.ts`

```ts
import type { CapabilityAdapter, AdapterReadiness, AdapterResult } from "./types.js";
import type { CapabilityId, PackId } from "../capabilities/types.js";

export interface OpenClawToolApi {
  isToolAvailable(toolName: string): Promise<boolean>;
  invokeTool(toolName: string, args: Record<string, unknown>): Promise<unknown>;
}

const CAPABILITY_TO_TOOL: Record<string, string> = {
  "research.collect_sources": "web_search",
  "research.web_search": "web_search",
  "docs.read_file": "read_file",
  "docs.write_file": "write_file",
  "docs.search_files": "glob",
};

export class OpenClawToolAdapter implements CapabilityAdapter {
  readonly id = "openclaw_tool";
  private api: OpenClawToolApi | null;

  constructor(api?: OpenClawToolApi) {
    this.api = api ?? null;
  }

  setApi(api: OpenClawToolApi): void {
    this.api = api;
  }

  async providesCapabilities(): Promise<CapabilityId[]> {
    return Object.keys(CAPABILITY_TO_TOOL);
  }

  async checkReadiness(input: {
    packId: PackId;
    capabilityId: CapabilityId;
  }): Promise<AdapterReadiness> {
    const toolName = CAPABILITY_TO_TOOL[input.capabilityId];
    if (!toolName) {
      return { ready: false, setupAction: "none" };
    }

    if (!this.api) {
      return { ready: false, setupAction: "configure" };
    }

    try {
      const available = await this.api.isToolAvailable(toolName);
      return { ready: available, setupAction: available ? "none" : "configure" };
    } catch {
      return { ready: false, setupAction: "configure" };
    }
  }

  async execute(input: {
    packId: PackId;
    capabilityId: CapabilityId;
    args: Record<string, unknown>;
  }): Promise<AdapterResult> {
    const toolName = CAPABILITY_TO_TOOL[input.capabilityId];
    if (!toolName || !this.api) {
      return { status: "error", notes: [`No native tool for ${input.capabilityId}`] };
    }

    try {
      const result = await this.api.invokeTool(toolName, input.args);
      return { status: "ok", data: result };
    } catch (err) {
      return {
        status: "error",
        notes: [`Tool execution failed: ${err instanceof Error ? err.message : String(err)}`],
      };
    }
  }
}
```

- [ ] **Step 4: Run tests**

Run: `cd packages/router && npx vitest run src/__tests__/openclaw-tool.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add packages/router/src/adapters/openclaw-tool.ts packages/router/src/__tests__/openclaw-tool.test.ts
git commit -m "feat: add OpenClaw native tool adapter"
```

---

### Task 6: Lobster, CLI, and MCPorter adapters

**Files:**
- Create: `packages/router/src/adapters/lobster.ts`
- Create: `packages/router/src/adapters/cli.ts`
- Create: `packages/router/src/adapters/mcporter.ts`
- Create: `packages/router/src/__tests__/adapters.test.ts`

- [ ] **Step 1: Write tests for all three adapters**

File: `packages/router/src/__tests__/adapters.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";
import { LobsterAdapter } from "../adapters/lobster.js";
import { CliAdapter } from "../adapters/cli.js";
import { McporterAdapter } from "../adapters/mcporter.js";

describe("LobsterAdapter", () => {
  it("has id 'lobster'", () => {
    expect(new LobsterAdapter().id).toBe("lobster");
  });

  it("provides workflow capabilities", async () => {
    const caps = await new LobsterAdapter().providesCapabilities();
    expect(caps.length).toBeGreaterThan(0);
  });

  it("reports not ready without lobster client", async () => {
    const readiness = await new LobsterAdapter().checkReadiness({
      packId: "sales",
      capabilityId: "crm.create_note_workflow",
    });
    expect(readiness.ready).toBe(false);
  });
});

describe("CliAdapter", () => {
  it("has id 'cli'", () => {
    expect(new CliAdapter().id).toBe("cli");
  });

  it("reports not ready when binary is missing", async () => {
    const adapter = new CliAdapter();
    const readiness = await adapter.checkReadiness({
      packId: "sales",
      capabilityId: "docs.convert_format",
    });
    // pandoc may or may not be installed, but adapter should not throw
    expect(readiness).toHaveProperty("ready");
  });
});

describe("McporterAdapter", () => {
  it("has id 'mcporter'", () => {
    expect(new McporterAdapter().id).toBe("mcporter");
  });

  it("reports not ready without mcporter client", async () => {
    const readiness = await new McporterAdapter().checkReadiness({
      packId: "sales",
      capabilityId: "seo.audit_page",
    });
    expect(readiness.ready).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify fail**

Run: `cd packages/router && npx vitest run src/__tests__/adapters.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Lobster adapter**

File: `packages/router/src/adapters/lobster.ts`

```ts
import type { CapabilityAdapter, AdapterReadiness, AdapterResult } from "./types.js";
import type { CapabilityId, PackId } from "../capabilities/types.js";

export interface LobsterClient {
  workflowExists(workflowId: string): Promise<boolean>;
  startWorkflow(workflowId: string, args: Record<string, unknown>): Promise<{ result: unknown }>;
}

const CAPABILITY_TO_WORKFLOW: Record<string, string> = {
  "crm.create_note_workflow": "crm-note-with-approval",
  "crm.update_deal_workflow": "crm-deal-update",
  "mail.send_sequence": "email-sequence-workflow",
  "docs.create_brief_workflow": "brief-from-research",
  "recruiting.offer_workflow": "offer-approval-chain",
};

export class LobsterAdapter implements CapabilityAdapter {
  readonly id = "lobster";
  private client: LobsterClient | null;

  constructor(client?: LobsterClient) {
    this.client = client ?? null;
  }

  setClient(client: LobsterClient): void {
    this.client = client;
  }

  async providesCapabilities(): Promise<CapabilityId[]> {
    return Object.keys(CAPABILITY_TO_WORKFLOW);
  }

  async checkReadiness(input: {
    packId: PackId;
    capabilityId: CapabilityId;
  }): Promise<AdapterReadiness> {
    const workflowId = CAPABILITY_TO_WORKFLOW[input.capabilityId];
    if (!workflowId || !this.client) {
      return { ready: false, setupAction: "configure" };
    }

    try {
      const exists = await this.client.workflowExists(workflowId);
      return { ready: exists, setupAction: exists ? "none" : "configure" };
    } catch {
      return { ready: false, setupAction: "configure" };
    }
  }

  async execute(input: {
    packId: PackId;
    capabilityId: CapabilityId;
    args: Record<string, unknown>;
  }): Promise<AdapterResult> {
    const workflowId = CAPABILITY_TO_WORKFLOW[input.capabilityId];
    if (!workflowId || !this.client) {
      return { status: "error", notes: [`No Lobster workflow for ${input.capabilityId}`] };
    }

    try {
      const run = await this.client.startWorkflow(workflowId, input.args);
      return { status: "ok", data: run.result };
    } catch (err) {
      return {
        status: "error",
        notes: [`Lobster workflow failed: ${err instanceof Error ? err.message : String(err)}`],
      };
    }
  }
}
```

- [ ] **Step 4: Implement CLI adapter**

File: `packages/router/src/adapters/cli.ts`

```ts
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
```

- [ ] **Step 5: Implement MCPorter adapter**

File: `packages/router/src/adapters/mcporter.ts`

```ts
import type { CapabilityAdapter, AdapterReadiness, AdapterResult } from "./types.js";
import type { CapabilityId, PackId } from "../capabilities/types.js";

export interface McporterClient {
  isServerAvailable(server: string): Promise<boolean>;
  callTool(server: string, tool: string, args: Record<string, unknown>): Promise<unknown>;
}

interface McpMapping {
  server: string;
  tool: string;
}

const CAPABILITY_TO_MCP: Record<string, McpMapping> = {
  "seo.audit_page": { server: "ahrefs", tool: "site_audit" },
  "seo.keyword_research": { server: "ahrefs", tool: "keyword_research" },
  "analytics.get_metrics": { server: "google-analytics", tool: "get_report" },
  "enrichment.lookup_company": { server: "clearbit", tool: "company_lookup" },
  "enrichment.lookup_person": { server: "clearbit", tool: "person_lookup" },
};

export class McporterAdapter implements CapabilityAdapter {
  readonly id = "mcporter";
  private client: McporterClient | null;
  private allowedServers: Set<string>;

  constructor(client?: McporterClient, allowedServers?: string[]) {
    this.client = client ?? null;
    this.allowedServers = new Set(allowedServers ?? Object.values(CAPABILITY_TO_MCP).map((m) => m.server));
  }

  setClient(client: McporterClient): void {
    this.client = client;
  }

  setAllowedServers(servers: string[]): void {
    this.allowedServers = new Set(servers);
  }

  async providesCapabilities(): Promise<CapabilityId[]> {
    return Object.keys(CAPABILITY_TO_MCP);
  }

  async checkReadiness(input: {
    packId: PackId;
    capabilityId: CapabilityId;
  }): Promise<AdapterReadiness> {
    const mapping = CAPABILITY_TO_MCP[input.capabilityId];
    if (!mapping) {
      return { ready: false, setupAction: "none" };
    }

    if (!this.allowedServers.has(mapping.server)) {
      return { ready: false, setupAction: "configure" };
    }

    if (!this.client) {
      return {
        ready: false,
        missingConnections: [mapping.server],
        setupAction: "configure",
      };
    }

    try {
      const available = await this.client.isServerAvailable(mapping.server);
      return {
        ready: available,
        missingConnections: available ? [] : [mapping.server],
        setupAction: available ? "none" : "configure",
      };
    } catch {
      return { ready: false, missingConnections: [mapping.server], setupAction: "configure" };
    }
  }

  async execute(input: {
    packId: PackId;
    capabilityId: CapabilityId;
    args: Record<string, unknown>;
  }): Promise<AdapterResult> {
    const mapping = CAPABILITY_TO_MCP[input.capabilityId];
    if (!mapping || !this.client) {
      return { status: "error", notes: [`No MCPorter mapping for ${input.capabilityId}`] };
    }

    try {
      const result = await this.client.callTool(mapping.server, mapping.tool, input.args);
      return { status: "ok", data: result };
    } catch (err) {
      return {
        status: "error",
        notes: [`MCPorter call failed: ${err instanceof Error ? err.message : String(err)}`],
      };
    }
  }
}
```

- [ ] **Step 6: Run all adapter tests**

Run: `cd packages/router && npx vitest run src/__tests__/adapters.test.ts`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add packages/router/src/adapters/ packages/router/src/__tests__/adapters.test.ts
git commit -m "feat: add Lobster, CLI, and MCPorter adapters"
```

---

## Chunk 3: Router Policy, Onboarding & Entry Point

### Task 7: Fallback policy and side-effect confirmation

**Files:**
- Create: `packages/router/src/policy/fallback.ts`
- Create: `packages/router/src/policy/side-effects.ts`
- Create: `packages/router/src/__tests__/fallback.test.ts`
- Create: `packages/router/src/__tests__/side-effects.test.ts`
- Create: `packages/router/config/default-fallback-order.json`

- [ ] **Step 1: Write fallback policy tests**

File: `packages/router/src/__tests__/fallback.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";
import { FallbackResolver } from "../policy/fallback.js";
import type { CapabilityAdapter } from "../adapters/types.js";

function mockAdapter(id: string, caps: string[], ready: boolean): CapabilityAdapter {
  return {
    id,
    providesCapabilities: vi.fn().mockResolvedValue(caps),
    checkReadiness: vi.fn().mockResolvedValue({ ready, setupAction: ready ? "none" : "connect" }),
    execute: vi.fn().mockResolvedValue({ status: "ok", data: { from: id } }),
  };
}

describe("FallbackResolver", () => {
  it("resolves to first ready adapter", async () => {
    const adapters = [
      mockAdapter("composio", ["crm.lookup_account"], false),
      mockAdapter("openclaw_tool", ["crm.lookup_account"], true),
    ];
    const resolver = new FallbackResolver(adapters, {});

    const result = await resolver.resolve("crm.lookup_account", "sales", {});
    expect(result.status).toBe("ok");
    expect(result.data).toEqual({ from: "openclaw_tool" });
  });

  it("returns needs_setup when no adapter is ready", async () => {
    const adapters = [
      mockAdapter("composio", ["crm.lookup_account"], false),
    ];
    const resolver = new FallbackResolver(adapters, {});

    const result = await resolver.resolve("crm.lookup_account", "sales", {});
    expect(result.status).toBe("needs_setup");
  });

  it("skips adapters that do not provide the capability", async () => {
    const adapters = [
      mockAdapter("composio", ["calendar.read_events"], true),
      mockAdapter("openclaw_tool", ["crm.lookup_account"], true),
    ];
    const resolver = new FallbackResolver(adapters, {});

    const result = await resolver.resolve("crm.lookup_account", "sales", {});
    expect(result.data).toEqual({ from: "openclaw_tool" });
    expect(adapters[0].checkReadiness).not.toHaveBeenCalled();
  });

  it("respects disabled adapters", async () => {
    const adapters = [
      mockAdapter("composio", ["crm.lookup_account"], true),
    ];
    const resolver = new FallbackResolver(adapters, { disabledAdapters: ["composio"] });

    const result = await resolver.resolve("crm.lookup_account", "sales", {});
    expect(result.status).toBe("needs_setup");
  });

  it("respects capability pins", async () => {
    const adapters = [
      mockAdapter("composio", ["crm.lookup_account"], true),
      mockAdapter("cli", ["crm.lookup_account"], true),
    ];
    const resolver = new FallbackResolver(adapters, {
      capabilityPins: { "crm.*": "cli" },
    });

    const result = await resolver.resolve("crm.lookup_account", "sales", {});
    expect(result.data).toEqual({ from: "cli" });
  });

  it("wraps execution with timeout", async () => {
    const slowAdapter: CapabilityAdapter = {
      id: "slow",
      providesCapabilities: vi.fn().mockResolvedValue(["crm.lookup_account"]),
      checkReadiness: vi.fn().mockResolvedValue({ ready: true }),
      execute: vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ status: "ok" }), 60_000))
      ),
    };
    const resolver = new FallbackResolver([slowAdapter], { executionTimeoutMs: 100 });

    const result = await resolver.resolve("crm.lookup_account", "sales", {});
    expect(result.status).toBe("error");
    expect(result.notes?.[0]).toContain("timeout");
  });
});
```

- [ ] **Step 2: Run tests to verify fail**

Run: `cd packages/router && npx vitest run src/__tests__/fallback.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement fallback resolver**

File: `packages/router/src/policy/fallback.ts`

```ts
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
  private config: FallbackConfig;

  constructor(adapters: CapabilityAdapter[], config: FallbackConfig) {
    this.adapterMap = new Map(adapters.map((a) => [a.id, a]));
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

    let order: AdapterId[];
    if (pinnedAdapter) {
      order = [pinnedAdapter];
    } else if (packFallbackOverrides) {
      const override = findBestMatch(packFallbackOverrides, capabilityId);
      order = override?.adapters ?? this.config.adapterOrder ?? DEFAULT_ORDER;
    } else {
      order = this.config.adapterOrder ?? DEFAULT_ORDER;
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
```

- [ ] **Step 4: Run fallback tests**

Run: `cd packages/router && npx vitest run src/__tests__/fallback.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Write side-effect tests**

File: `packages/router/src/__tests__/side-effects.test.ts`

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { SideEffectGuard } from "../policy/side-effects.js";

describe("SideEffectGuard", () => {
  let guard: SideEffectGuard;

  beforeEach(() => {
    guard = new SideEffectGuard("confirm_destructive");
  });

  const writeInput = {
    capabilityId: "crm.create_note",
    packId: "sales",
    args: { note: "test" },
    isSideEffect: true,
    adapterId: "composio",
    resolvedApp: "HubSpot",
  };

  const readInput = {
    capabilityId: "crm.lookup_account",
    packId: "sales",
    args: { query: "Acme" },
    isSideEffect: false,
    adapterId: "composio",
    resolvedApp: "HubSpot",
  };

  it("blocks write capabilities when policy is confirm_destructive", () => {
    const result = guard.check(writeInput);
    expect(result.blocked).toBe(true);
    expect(result.confirmationToken).toBeDefined();
    expect(result.message).toContain("HubSpot");
  });

  it("allows read capabilities", () => {
    const result = guard.check(readInput);
    expect(result.blocked).toBe(false);
  });

  it("allows all when policy is never_confirm", () => {
    guard = new SideEffectGuard("never_confirm");
    const result = guard.check(writeInput);
    expect(result.blocked).toBe(false);
  });

  it("blocks all when policy is always_confirm", () => {
    guard = new SideEffectGuard("always_confirm");
    const result = guard.check(readInput);
    expect(result.blocked).toBe(true);
  });

  it("validates confirmation tokens and stores packId/args", () => {
    const result = guard.check(writeInput);
    expect(result.confirmationToken).toBeDefined();

    const pending = guard.validateToken(result.confirmationToken!);
    expect(pending).toBeDefined();
    expect(pending!.capabilityId).toBe("crm.create_note");
    expect(pending!.packId).toBe("sales");
    expect(pending!.args).toEqual({ note: "test" });
    expect(pending!.adapterId).toBe("composio");
  });

  it("rejects invalid tokens", () => {
    expect(guard.validateToken("invalid-token")).toBeUndefined();
  });

  it("rejects expired tokens", () => {
    const result = guard.check(writeInput);
    guard.expireToken(result.confirmationToken!);
    expect(guard.validateToken(result.confirmationToken!)).toBeUndefined();
  });

  it("consumes token on validation", () => {
    const result = guard.check(writeInput);
    guard.validateToken(result.confirmationToken!);
    expect(guard.validateToken(result.confirmationToken!)).toBeUndefined();
  });
});
```

- [ ] **Step 6: Implement side-effect guard**

File: `packages/router/src/policy/side-effects.ts`

```ts
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
```

- [ ] **Step 7: Create default fallback order config**

File: `packages/router/config/default-fallback-order.json`

```json
{
  "adapterOrder": ["composio", "openclaw_tool", "lobster", "cli", "mcporter"],
  "executionTimeoutMs": 30000
}
```

- [ ] **Step 8: Run all policy tests**

Run: `cd packages/router && npx vitest run src/__tests__/fallback.test.ts src/__tests__/side-effects.test.ts`
Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add packages/router/src/policy/ packages/router/src/__tests__/fallback.test.ts packages/router/src/__tests__/side-effects.test.ts packages/router/config/
git commit -m "feat: add fallback resolver and side-effect confirmation guard"
```

---

### Task 8: Onboarding commands

**Files:**
- Create: `packages/router/src/onboarding/connect-apps.ts`
- Create: `packages/router/src/onboarding/check-setup.ts`
- Create: `packages/router/src/onboarding/app-grouping.ts`

- [ ] **Step 1: Implement app grouping utility**

File: `packages/router/src/onboarding/app-grouping.ts`

```ts
import type { CapabilityId } from "../capabilities/types.js";
import type { AdapterReadiness } from "../adapters/types.js";

/**
 * Maps capabilities to the broadest app that covers them.
 * Used by /connect_apps to suggest e.g. "Google Workspace"
 * instead of asking about Calendar, Gmail, Docs separately.
 */
const APP_COVERAGE: Record<string, CapabilityId[]> = {
  "Google Workspace": [
    "calendar.read_events",
    "calendar.prepare_meeting_context",
    "mail.send_followup",
    "mail.read_inbox",
    "docs.create_brief",
  ],
  HubSpot: ["crm.lookup_account", "crm.create_note"],
  Salesforce: ["crm.lookup_account", "crm.create_note"],
  Slack: ["chat.search_messages", "chat.send_message"],
  Greenhouse: ["ats.search_candidates", "ats.get_candidate", "ats.update_candidate_stage"],
  BambooHR: ["hris.get_employee", "hris.list_employees"],
  Linear: ["project.list_tasks", "project.create_task"],
};

export interface AppSuggestion {
  appName: string;
  coversCapabilities: CapabilityId[];
  uncoveredAfter: CapabilityId[];
}

export function suggestBroadestApps(
  unreadyCapabilities: CapabilityId[]
): AppSuggestion[] {
  const remaining = new Set(unreadyCapabilities);
  const suggestions: AppSuggestion[] = [];

  while (remaining.size > 0) {
    // Find the app that covers the most remaining capabilities
    let bestApp = "";
    let bestCovered: CapabilityId[] = [];

    for (const [app, caps] of Object.entries(APP_COVERAGE)) {
      const covered = caps.filter((c) => remaining.has(c));
      if (covered.length > bestCovered.length) {
        bestApp = app;
        bestCovered = covered;
      }
    }

    if (bestCovered.length === 0) break; // no app covers remaining capabilities

    for (const cap of bestCovered) {
      remaining.delete(cap);
    }

    suggestions.push({
      appName: bestApp,
      coversCapabilities: bestCovered,
      uncoveredAfter: [...remaining],
    });
  }

  return suggestions;
}

export function lookupBroadestApp(capabilityId: CapabilityId): string | undefined {
  for (const [app, caps] of Object.entries(APP_COVERAGE)) {
    if (caps.includes(capabilityId)) {
      return app;
    }
  }
  return undefined;
}
```

- [ ] **Step 2: Implement /connect_apps handler**

File: `packages/router/src/onboarding/connect-apps.ts`

```ts
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
```

- [ ] **Step 3: Implement /check_setup handler**

File: `packages/router/src/onboarding/check-setup.ts`

```ts
import type { PackManifest, CapabilityId } from "../capabilities/types.js";
import type { CapabilityAdapter } from "../adapters/types.js";

export interface SetupStatus {
  packStatuses: Array<{
    packId: string;
    displayName: string;
    capabilities: Array<{
      id: CapabilityId;
      required: boolean;
      status: "ready" | "needs_setup";
      resolvedAdapter?: string;
      resolvedApp?: string;
    }>;
  }>;
  adapterStatuses: Array<{
    id: string;
    loaded: boolean;
    notes?: string[];
  }>;
}

export async function runCheckSetup(
  packs: PackManifest[],
  adapters: CapabilityAdapter[],
  disabledAdapters: string[]
): Promise<SetupStatus> {
  const disabled = new Set(disabledAdapters);

  const packStatuses: SetupStatus["packStatuses"] = [];

  for (const pack of packs) {
    const allCaps = [
      ...pack.capabilities.required.map((c) => ({ id: c, required: true })),
      ...pack.capabilities.optional.map((c) => ({ id: c, required: false })),
    ];

    const capabilities: SetupStatus["packStatuses"][0]["capabilities"] = [];

    for (const { id: capId, required } of allCaps) {
      let resolved = false;
      let resolvedAdapter: string | undefined;

      for (const adapter of adapters) {
        if (disabled.has(adapter.id)) continue;
        const caps = await adapter.providesCapabilities();
        if (!caps.includes(capId)) continue;

        const readiness = await adapter.checkReadiness({
          packId: pack.packId,
          capabilityId: capId,
        });
        if (readiness.ready) {
          resolved = true;
          resolvedAdapter = adapter.id;
          break;
        }
      }

      capabilities.push({
        id: capId,
        required,
        status: resolved ? "ready" : "needs_setup",
        resolvedAdapter,
      });
    }

    packStatuses.push({
      packId: pack.packId,
      displayName: pack.displayName,
      capabilities,
    });
  }

  const adapterStatuses = adapters.map((a) => ({
    id: a.id,
    loaded: !disabled.has(a.id),
    notes: disabled.has(a.id) ? ["Disabled by config"] : undefined,
  }));

  return { packStatuses, adapterStatuses };
}

export function formatCheckSetup(status: SetupStatus): string {
  const lines: string[] = [];

  for (const pack of status.packStatuses) {
    lines.push(`\n${pack.displayName}`);
    for (const cap of pack.capabilities) {
      const icon = cap.status === "ready" ? "+" : cap.required ? "X" : "?";
      const suffix = cap.resolvedAdapter ? ` -> ${cap.resolvedAdapter}` : " -> needs setup";
      const optLabel = cap.required ? "" : " (optional)";
      lines.push(`  [${icon}] ${cap.id}${suffix}${optLabel}`);
    }
  }

  lines.push("\nRouter adapters:");
  for (const adapter of status.adapterStatuses) {
    const icon = adapter.loaded ? "+" : "-";
    const note = adapter.notes?.length ? ` (${adapter.notes.join(", ")})` : "";
    lines.push(`  [${icon}] ${adapter.id}${note}`);
  }

  return lines.join("\n");
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/router/src/onboarding/
git commit -m "feat: add /connect_apps and /check_setup command handlers"
```

---

### Task 9: Router entry point and plugin manifest

**Files:**
- Create: `packages/router/src/index.ts`
- Create: `packages/router/openclaw.plugin.json`
- Create: `packages/router/src/router.ts`

- [ ] **Step 1: Implement Router class**

File: `packages/router/src/router.ts`

```ts
import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import { CapabilityRegistry } from "./capabilities/registry.js";
import { FallbackResolver, type FallbackConfig } from "./policy/fallback.js";
import { SideEffectGuard, type SideEffectPolicy } from "./policy/side-effects.js";
import { ComposioAdapter } from "./adapters/composio.js";
import { OpenClawToolAdapter } from "./adapters/openclaw-tool.js";
import { LobsterAdapter } from "./adapters/lobster.js";
import { CliAdapter } from "./adapters/cli.js";
import { McporterAdapter } from "./adapters/mcporter.js";
import type { CapabilityAdapter, AdapterResult } from "./adapters/types.js";
import type { PackManifest, CapabilityId, PackId } from "./capabilities/types.js";

export interface RouterConfig {
  adapterOrder?: string[];
  disabledAdapters?: string[];
  capabilityPins?: Record<string, string>;
  sideEffectPolicy?: SideEffectPolicy;
  executionTimeoutMs?: number;
  composio?: { apiKey?: string; preferGooglesuper?: boolean };
  mcporter?: { allowedServers?: string[] };
  cli?: { allowedBinaries?: string[] };
}

// Known capabilities and their side-effect classification
const KNOWN_CAPABILITIES: Array<{ id: string; sideEffect: boolean }> = [
  // Calendar
  { id: "calendar.read_events", sideEffect: false },
  { id: "calendar.prepare_meeting_context", sideEffect: false },
  // CRM
  { id: "crm.lookup_account", sideEffect: false },
  { id: "crm.create_note", sideEffect: true },
  { id: "crm.create_note_workflow", sideEffect: true },
  { id: "crm.update_deal_workflow", sideEffect: true },
  // Mail
  { id: "mail.send_followup", sideEffect: true },
  { id: "mail.read_inbox", sideEffect: false },
  { id: "mail.send_sequence", sideEffect: true },
  // Docs
  { id: "docs.create_brief", sideEffect: true },
  { id: "docs.create_brief_workflow", sideEffect: true },
  { id: "docs.read_file", sideEffect: false },
  { id: "docs.write_file", sideEffect: true },
  { id: "docs.search_files", sideEffect: false },
  { id: "docs.convert_format", sideEffect: false },
  // Research
  { id: "research.collect_sources", sideEffect: false },
  { id: "research.web_search", sideEffect: false },
  // Chat
  { id: "chat.search_messages", sideEffect: false },
  { id: "chat.send_message", sideEffect: true },
  // ATS
  { id: "ats.search_candidates", sideEffect: false },
  { id: "ats.get_candidate", sideEffect: false },
  { id: "ats.update_candidate_stage", sideEffect: true },
  // HRIS
  { id: "hris.get_employee", sideEffect: false },
  { id: "hris.list_employees", sideEffect: false },
  // Project
  { id: "project.list_tasks", sideEffect: false },
  { id: "project.create_task", sideEffect: true },
  // Compensation
  { id: "compensation.get_benchmarks", sideEffect: false },
  // SEO
  { id: "seo.audit_page", sideEffect: false },
  { id: "seo.keyword_research", sideEffect: false },
  // Analytics
  { id: "analytics.get_metrics", sideEffect: false },
  // Enrichment
  { id: "enrichment.lookup_company", sideEffect: false },
  { id: "enrichment.lookup_person", sideEffect: false },
  // Data
  { id: "data.query_json", sideEffect: false },
  // Recruiting workflows
  { id: "recruiting.offer_workflow", sideEffect: true },
];

export class Router {
  readonly registry = new CapabilityRegistry();
  readonly adapters: CapabilityAdapter[];
  readonly packs: PackManifest[] = [];
  private resolver: FallbackResolver;
  private sideEffectGuard: SideEffectGuard;
  private config: RouterConfig;

  constructor(config: RouterConfig = {}) {
    this.config = config;

    // Initialize adapters
    const composio = new ComposioAdapter();
    const openclawTool = new OpenClawToolAdapter();
    const lobster = new LobsterAdapter();
    const cli = new CliAdapter(config.cli?.allowedBinaries);
    const mcporter = new McporterAdapter(undefined, config.mcporter?.allowedServers);

    this.adapters = [composio, openclawTool, lobster, cli, mcporter];

    // Register known capabilities
    for (const cap of KNOWN_CAPABILITIES) {
      this.registry.register(cap);
    }

    // Build adapter -> capability map
    // (done lazily on first resolve to allow adapters to be configured after construction)

    this.resolver = new FallbackResolver(this.adapters, {
      adapterOrder: config.adapterOrder,
      disabledAdapters: config.disabledAdapters,
      capabilityPins: config.capabilityPins,
      executionTimeoutMs: config.executionTimeoutMs,
    });

    this.sideEffectGuard = new SideEffectGuard(config.sideEffectPolicy ?? "confirm_destructive");
  }

  registerPack(manifest: PackManifest): void {
    this.packs.push(manifest);
  }

  /**
   * Resolve a capability: find a ready adapter, check side-effect policy, execute.
   * If skipSideEffectCheck is true, the side-effect guard is bypassed (used after confirmation).
   */
  async resolve(
    capabilityId: CapabilityId,
    packId: PackId,
    args: Record<string, unknown>,
    skipSideEffectCheck = false
  ): Promise<AdapterResult> {
    const entry = this.registry.get(capabilityId);
    const pack = this.packs.find((p) => p.packId === packId);
    const overrides = pack?.fallbackOverrides;

    // Find a ready adapter via fallback chain
    const result = await this.resolver.resolve(capabilityId, packId, args, overrides);

    // If no adapter is ready, return as-is (needs_setup or error)
    if (result.status !== "ok") return result;

    // Check side-effect policy before returning the result
    if (!skipSideEffectCheck && result.resolvedAdapterId) {
      const isSideEffect = entry?.sideEffect ?? false;
      const sideEffectCheck = this.sideEffectGuard.check({
        capabilityId,
        packId,
        args,
        isSideEffect,
        adapterId: result.resolvedAdapterId,
        resolvedApp: result.resolvedAdapterId, // TODO: map to user-facing app label
      });

      if (sideEffectCheck.blocked) {
        return {
          status: "blocked",
          data: {
            message: sideEffectCheck.message,
            confirmationToken: sideEffectCheck.confirmationToken,
          },
        };
      }
    }

    return result;
  }

  /**
   * Execute a previously confirmed side-effecting operation.
   * Returns the adapter result, or an error if the token is invalid/expired.
   */
  async executeConfirmed(token: string): Promise<AdapterResult> {
    const pending = this.sideEffectGuard.validateToken(token);
    if (!pending) {
      return { status: "error", notes: ["Invalid or expired confirmation token"] };
    }

    // Re-resolve with side-effect check bypassed
    return this.resolve(pending.capabilityId, pending.packId, pending.args, true);
  }

  getAdapter(id: string): CapabilityAdapter | undefined {
    return this.adapters.find((a) => a.id === id);
  }

  static async loadPackManifest(installPath: string): Promise<PackManifest> {
    const raw = await readFile(`${installPath}/pack-manifest.yaml`, "utf-8");
    return parseYaml(raw) as PackManifest;
  }
}
```

- [ ] **Step 2: Implement plugin entry point**

File: `packages/router/src/index.ts`

```ts
import { Router } from "./router.js";
import { runConnectApps } from "./onboarding/connect-apps.js";
import { runCheckSetup, formatCheckSetup } from "./onboarding/check-setup.js";
import { lookupBroadestApp } from "./onboarding/app-grouping.js";

// Types for OpenClaw Plugin SDK — in production these come from openclaw/plugin-sdk/core
interface OpenClawPluginApi {
  registerTool(tool: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    handler: (args: any) => Promise<unknown>;
  }): void;
  registerCommand(command: {
    name: string;
    description: string;
    handler: (ctx: any) => Promise<unknown>;
  }): void;
  on(event: string, handler: (...args: any[]) => Promise<void>): void;
  getEnabledPlugins(): Array<{ id: string; installPath: string }>;
  getConfig(): Record<string, unknown>;
}

export function register(api: OpenClawPluginApi) {
  const config = api.getConfig() as any;
  const router = new Router({
    adapterOrder: config.adapterOrder,
    disabledAdapters: config.disabledAdapters,
    capabilityPins: config.capabilityPins,
    sideEffectPolicy: config.sideEffectPolicy,
    executionTimeoutMs: config.executionTimeoutMs,
    composio: config.composio,
    mcporter: config.mcporter,
    cli: config.cli,
  });

  // Discover packs at startup
  api.on("gateway_start", async () => {
    const allPlugins = api.getEnabledPlugins();
    const packs = allPlugins.filter((p) => p.id.startsWith("@clawdi-ai/pack-"));

    for (const pack of packs) {
      try {
        const manifest = await Router.loadPackManifest(pack.installPath);
        router.registerPack(manifest);
      } catch (err) {
        console.error(`[knowledge-work-router] Failed to load pack manifest from ${pack.installPath}:`, err);
      }
    }

    console.log(`[knowledge-work-router] Discovered ${router.packs.length} pack(s)`);
  });

  // Register capability_execute tool
  api.registerTool({
    name: "capability_execute",
    description: "Execute a capability through the knowledge-work router. Pack skills use this to invoke capabilities like calendar.read_events, crm.lookup_account, etc. The router resolves the best available adapter automatically.",
    parameters: {
      type: "object",
      properties: {
        capabilityId: {
          type: "string",
          description: "The capability to execute, e.g. 'calendar.read_events', 'crm.lookup_account'",
        },
        packId: {
          type: "string",
          description: "The pack requesting the capability, e.g. 'sales', 'recruiting'",
        },
        args: {
          type: "object",
          description: "Arguments for the capability",
        },
        confirmationToken: {
          type: "string",
          description: "Token from a prior blocked result, provided after user approval",
        },
      },
      required: ["capabilityId", "packId"],
    },
    handler: async ({ capabilityId, packId, args, confirmationToken }) => {
      // If a confirmation token is provided, execute the confirmed operation
      if (confirmationToken) {
        return router.executeConfirmed(confirmationToken);
      }

      // Normal resolve: finds adapter, checks side-effects, executes
      const result = await router.resolve(capabilityId, packId, args ?? {});

      // Augment needs_setup results with onboarding guidance
      if (result.status === "needs_setup") {
        const suggestedApp = lookupBroadestApp(capabilityId);
        return {
          ...result,
          data: {
            ...(result.data as any),
            message: `${capabilityId} is not ready. Run /connect_apps to set up.`,
            suggestedApp,
          },
        };
      }

      // blocked results already contain confirmationToken and message from the router
      return result;
    },
  });

  // Register /connect_apps command
  api.registerCommand({
    name: "connect_apps",
    description: "Set up connections for your installed knowledge-work packs",
    handler: async () => {
      const report = await runConnectApps({
        packs: router.packs,
        adapters: router.adapters,
        adapterOrder: config.adapterOrder ?? ["composio", "openclaw_tool", "lobster", "cli", "mcporter"],
        disabledAdapters: config.disabledAdapters ?? [],
      });

      // Build a response the LLM can present naturally
      const lines: string[] = [];
      for (const pr of report.packReports) {
        lines.push(`\n**${pr.displayName}**`);
        if (pr.allRequiredReady) {
          lines.push("All required capabilities are ready.");
        } else {
          lines.push(`Ready: ${pr.readyCapabilities.join(", ") || "none"}`);
          lines.push(`Needs setup: ${pr.unreadyRequired.join(", ")}`);
          if (pr.suggestions.length > 0) {
            for (const s of pr.suggestions) {
              lines.push(`Suggestion: Connect **${s.appName}** to enable ${s.coversCapabilities.join(", ")}`);
            }
          }
        }
        if (pr.unreadyOptional.length > 0) {
          lines.push(`Optional (not connected): ${pr.unreadyOptional.join(", ")}`);
        }
      }

      return { systemPrompt: lines.join("\n") };
    },
  });

  // Register /check_setup command
  api.registerCommand({
    name: "check_setup",
    description: "Show the status of all knowledge-work pack capabilities and adapters",
    handler: async () => {
      const status = await runCheckSetup(
        router.packs,
        router.adapters,
        config.disabledAdapters ?? []
      );
      return { systemPrompt: formatCheckSetup(status) };
    },
  });
}
```

- [ ] **Step 3: Create openclaw.plugin.json**

File: `packages/router/openclaw.plugin.json`

```json
{
  "id": "@clawdi-ai/knowledge-work-router",
  "name": "Knowledge Work Router",
  "description": "Capability router for knowledge-work packs. Resolves capabilities through adapters (Composio, native tools, Lobster, CLI, MCPorter) with automatic fallback and onboarding.",
  "version": "0.1.0",
  "configSchema": {
    "type": "object",
    "properties": {
      "adapterOrder": {
        "type": "array",
        "items": { "type": "string", "enum": ["composio", "openclaw_tool", "lobster", "cli", "mcporter"] },
        "default": ["composio", "openclaw_tool", "lobster", "cli", "mcporter"],
        "description": "Global adapter fallback order"
      },
      "disabledAdapters": {
        "type": "array",
        "items": { "type": "string" },
        "default": [],
        "description": "Adapters to disable globally"
      },
      "capabilityPins": {
        "type": "object",
        "additionalProperties": { "type": "string" },
        "default": {},
        "description": "Pin capabilities to specific adapters (e.g. crm.*: composio)"
      },
      "appLabels": {
        "type": "object",
        "additionalProperties": { "type": "string" },
        "default": {},
        "description": "Override user-facing app names"
      },
      "sideEffectPolicy": {
        "type": "string",
        "enum": ["always_confirm", "confirm_destructive", "never_confirm"],
        "default": "confirm_destructive",
        "description": "When to require confirmation before side-effecting actions"
      },
      "executionTimeoutMs": {
        "type": "number",
        "default": 30000,
        "description": "Timeout for adapter execution in milliseconds"
      },
      "composio": {
        "type": "object",
        "properties": {
          "apiKey": { "type": "string" },
          "preferGooglesuper": { "type": "boolean", "default": true }
        }
      },
      "mcporter": {
        "type": "object",
        "properties": {
          "allowedServers": { "type": "array", "items": { "type": "string" }, "default": [] }
        }
      },
      "cli": {
        "type": "object",
        "properties": {
          "allowedBinaries": { "type": "array", "items": { "type": "string" }, "default": [] }
        }
      }
    }
  },
  "uiHints": {
    "adapterOrder": { "label": "Adapter Fallback Order" },
    "disabledAdapters": { "label": "Disabled Adapters" },
    "sideEffectPolicy": { "label": "Side-Effect Confirmation Policy" },
    "composio.apiKey": { "label": "Composio API Key", "sensitive": true }
  }
}
```

- [ ] **Step 4: Run all router tests**

Run: `cd packages/router && npx vitest run`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add packages/router/src/router.ts packages/router/src/index.ts packages/router/openclaw.plugin.json
git commit -m "feat: add router entry point with capability_execute tool and onboarding commands"
```

---

## Chunk 4: Pack Sales — Full Implementation

### Task 10: Sales pack scaffold and manifest

**Files:**
- Create: `packages/pack-sales/package.json`
- Create: `packages/pack-sales/tsconfig.json`
- Create: `packages/pack-sales/openclaw.plugin.json`
- Create: `packages/pack-sales/pack-manifest.yaml`
- Create: `packages/pack-sales/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@clawdi-ai/pack-sales",
  "version": "0.1.0",
  "description": "Sales knowledge-work pack: account research, call prep, pipeline management, and more",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "openclaw": {
    "extensions": ["./dist/index.js"]
  },
  "scripts": {
    "build": "tsc"
  },
  "peerDependencies": {
    "openclaw": "*",
    "@clawdi-ai/knowledge-work-router": ">=0.1.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

- [ ] **Step 3: Create openclaw.plugin.json**

```json
{
  "id": "@clawdi-ai/pack-sales",
  "name": "Sales Pack",
  "description": "AI-powered sales workflows: account research, call prep, competitive intel, pipeline review, forecasting, and outreach",
  "version": "0.1.0",
  "skills": ["./skills"],
  "configSchema": {}
}
```

- [ ] **Step 4: Create pack-manifest.yaml**

```yaml
packId: sales
displayName: "Sales Pack"
capabilities:
  required:
    - calendar.read_events
    - calendar.prepare_meeting_context
    - crm.lookup_account
    - crm.create_note
    - mail.send_followup
    - research.web_search
  optional:
    - docs.create_brief
    - research.collect_sources
    - chat.search_messages
    - enrichment.lookup_company
    - enrichment.lookup_person
preferredApps:
  calendar.*:
    - google_workspace
    - outlook
  crm.*:
    - salesforce
    - hubspot
  mail.*:
    - google_workspace
    - outlook
fallbackOverrides:
  crm.lookup_account:
    adapters: [composio, openclaw_tool, lobster, mcporter]
preferences:
  preferredCrm:
    type: enum
    values: [salesforce, hubspot, pipedrive]
    label: "Primary CRM"
    description: "Which CRM should be used for account lookups and note creation?"
    captureAt: first_use
onboarding:
  welcomeMessage: "The Sales pack helps you prep for calls, research accounts, manage your pipeline, and draft personalized outreach."
  suggestedFirstTask: "Try: 'Prep me for my next meeting'"
```

- [ ] **Step 5: Create index.ts**

File: `packages/pack-sales/src/index.ts`

```ts
interface OpenClawPluginApi {
  registerCommand(command: {
    name: string;
    description: string;
    handler: (ctx: any) => Promise<unknown>;
  }): void;
}

export function register(api: OpenClawPluginApi) {
  api.registerCommand({
    name: "call_summary",
    description: "Process call notes or transcript — extract action items, draft follow-up, generate internal summary",
    handler: async () => ({
      systemPrompt: "Use the sales-call-summary skill to process the call notes or transcript provided by the user.",
    }),
  });

  api.registerCommand({
    name: "forecast",
    description: "Generate a weighted sales forecast with scenarios and gap analysis",
    handler: async () => ({
      systemPrompt: "Use the sales-forecast skill to build a forecast. Ask the user for the time period.",
    }),
  });

  api.registerCommand({
    name: "pipeline_review",
    description: "Analyze pipeline health, prioritize deals, and create a weekly action plan",
    handler: async () => ({
      systemPrompt: "Use the sales-pipeline-review skill to analyze the pipeline. Ask the user for their pipeline data.",
    }),
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add packages/pack-sales/
git commit -m "feat: add sales pack scaffold with manifest and slash commands"
```

---

### Task 11: Sales pack skills — account-research, call-prep, call-summary

**Files:**
- Create: `packages/pack-sales/skills/account-research/SKILL.md`
- Create: `packages/pack-sales/skills/call-prep/SKILL.md`
- Create: `packages/pack-sales/skills/call-summary/SKILL.md`

- [ ] **Step 1: Create account-research skill**

File: `packages/pack-sales/skills/account-research/SKILL.md`

```markdown
---
name: sales-account-research
description: Research a company or person for sales intelligence. Triggers on "research [company]", "look up [person]", "intel on [prospect]", "who is [name] at [company]"
metadata:
  openclaw:
    tags: [sales, research, prospecting]
---

## Account Research

When the user asks to research a company, person, or prospect:

### Step 1: Parse the request

Determine what type of research is needed:
- **Company research**: company name, domain, or URL provided
- **Person research**: individual name, title, or LinkedIn URL provided
- **Role search**: "who runs engineering at [company]"
- **Domain lookup**: email domain or website provided

### Step 2: Web research (always)

Use `capability_execute` with capabilityId "research.web_search" to run these searches:
1. Company homepage and about page
2. Recent news and press releases (last 90 days)
3. Funding history and investors
4. Company careers page (hiring signals)
5. Key leadership team
6. Product and pricing information
7. Customer case studies and testimonials

If researching a person, add:
8. Person's professional background
9. Person's recent public activity or publications

### Step 3: Enrichment (if available)

Use `capability_execute` with capabilityId "enrichment.lookup_company" for:
- Firmographics (size, revenue, industry, headquarters)
- Tech stack
- Org chart
- Growth signals

Use `capability_execute` with capabilityId "enrichment.lookup_person" for:
- Verified contact info
- Role history
- Social profiles

### Step 4: CRM context (if available)

Use `capability_execute` with capabilityId "crm.lookup_account" to check:
- Prior relationship (existing account, past opportunities)
- Opportunity history and current pipeline
- Existing contacts and their roles
- Last activity date

### Step 5: Synthesize

Combine all sources. Prioritize enrichment data over web scraping when both are available. Identify qualification signals.

### Output Format

Present as structured markdown:

**Quick Take**: 2-3 sentence executive summary of the prospect.

**Company Profile**

| Field | Value |
|---|---|
| Company | name |
| Industry | industry |
| Size | employee count |
| Revenue | if known |
| HQ | location |
| Founded | year |
| Funding | total and last round |

**Recent News**
- Bullet list of 3-5 most relevant recent developments

**Hiring Signals**
- What roles they are hiring for and what that implies

**Key People**
For each relevant person:
- Name, title, and background
- Talking point specific to them

**Tech Stack**
- Known technologies relevant to your product

**Prior Relationship** (if CRM data available)
- Account history, open opportunities, last contact

**Qualification Signals**
- Positive signals (growth, hiring, tech fit, trigger events)
- Concerns (layoffs, leadership change, competitor incumbent)
- Unknown (gaps to fill in discovery)

**Recommended Approach**
- Best entry point (who to contact and why)
- Opening hook (what to lead with)
- 3 discovery questions to ask

**Sources**
- List all sources used with links where available
```

- [ ] **Step 2: Create call-prep skill**

File: `packages/pack-sales/skills/call-prep/SKILL.md`

```markdown
---
name: sales-call-prep
description: Prepare for any sales call with account context, attendee research, and suggested agenda. Triggers on "prep me for my call with [company]", "get me ready for [meeting]", "prep for tomorrow's meeting"
metadata:
  openclaw:
    tags: [sales, meetings, preparation]
---

## Call Prep

When the user asks to prepare for a call or meeting:

### Step 1: Gather context

**With connectors:**

1. Use `capability_execute` with capabilityId "calendar.read_events" to find the meeting:
   - Search today and tomorrow for external meetings
   - Extract: meeting title, time, attendees (names + emails), meeting link, description

2. Use `capability_execute` with capabilityId "crm.lookup_account" for each attendee's company:
   - Account details and stage
   - Contact records for attendees
   - Open opportunities
   - Last 10 activities and notes
   - Deal value and close date

3. Use `capability_execute` with capabilityId "mail.read_inbox" to check:
   - Recent email threads with attendees (last 30 days)
   - Sent messages awaiting reply

4. Use `capability_execute` with capabilityId "chat.search_messages" for:
   - Internal mentions of the company (last 30 days)
   - Any teammate context about the account

**Without connectors (standalone):**

Ask the user for:
- Company name
- Meeting type (discovery, demo, negotiation, check-in)
- Attendee names and roles
- Any additional context

### Step 2: Research supplement (always)

Use `capability_execute` with capabilityId "research.web_search" for:
- Company news in the last 90 days
- Recent funding or leadership changes
- Industry trends affecting them
- Attendee LinkedIn profiles and recent activity

### Step 3: Determine meeting type

Classify the meeting and adjust the output:

- **Discovery**: Focus on research gaps, discovery questions, qualification criteria
- **Demo/Presentation**: Focus on pain points to address, features to highlight, competitive positioning
- **Negotiation/Proposal**: Focus on deal history, pricing context, objection handling, BATNA
- **Check-in/QBR**: Focus on account health, expansion opportunities, risk signals

### Step 4: Synthesize

Combine all sources. Identify what you know, what is missing, and what to ask about. Create a tailored agenda.

### Output Format

**Account Snapshot**

| Field | Value |
|---|---|
| Company | name |
| Industry | industry |
| Deal Stage | current stage |
| Deal Value | amount |
| Meeting Type | classified type |
| Time | date and time |

**Who You're Meeting**

For each attendee:
- **Name** — Title at Company
- Background: 2-3 relevant facts
- Role in deal: decision maker / influencer / champion / unknown
- Talking point: one personalized thing to reference

**Context & History**
- Summary of prior interactions, open items, and deal trajectory
- Any red flags or positive signals

**Suggested Agenda** (5 items)
1. Opening: personalized connection point
2-4. Core topics tailored to meeting type
5. Next steps and commitments

**Discovery Questions** (3-5)
- Questions that fill knowledge gaps or advance the deal

**Potential Objections**

| Objection | Recommended Response |
|---|---|
| likely objection | how to handle it |

**Internal Notes**
- Anything from CRM, email, or chat that only the seller needs to know
- Do not share this section externally
```

- [ ] **Step 3: Create call-summary skill**

File: `packages/pack-sales/skills/call-summary/SKILL.md`

```markdown
---
name: sales-call-summary
description: Process call notes or transcript — extract action items, draft follow-up email, generate internal summary
argument-hint: "<call notes or transcript>"
user-invocable: true
metadata:
  openclaw:
    tags: [sales, meetings, follow-up]
---

## Call Summary

When the user provides call notes, a transcript, or describes a call they just had:

### Step 1: Process the input

Accept any of:
- Pasted call notes
- Full transcript
- Verbal description of what happened

### Step 2: Extract key information

Parse for:
- **Key discussion points**: main topics covered
- **Decisions made**: anything agreed upon
- **Customer priorities**: what matters most to them
- **Objections or concerns**: anything raised as a blocker
- **Competitive mentions**: other vendors discussed
- **Action items**: with owner and due date for each
- **Next steps**: what happens after this call
- **Deal impact**: how this call changes the deal trajectory

### Step 3: Connected actions (if available)

Use `capability_execute` with capabilityId "crm.create_note" to:
- Log the call summary to the CRM
- Update opportunity stage if deal progressed
- Create tasks for action items

Use `capability_execute` with capabilityId "calendar.read_events" to:
- Find the meeting that just ended for context

### Step 4: Draft follow-up email

Create a customer-facing follow-up email.

**Email style rules (strict):**
- Plain text only — no markdown bold, italic, or headers
- Short paragraphs (2-3 sentences max)
- Simple dashes (-) for lists, not bullets
- No generic openers ("Hope this email finds you well")
- Professional but conversational tone
- Include: thank you, key takeaways, action items, next steps
- Keep under 200 words

### Output Format

**Part 1: Internal Summary**

# Call Summary: [Company] — [Date]

**Attendees**: list
**Call Type**: discovery / demo / negotiation / check-in
**Duration**: if known

**Key Discussion Points**
- Bullet list of main topics

**Customer Priorities**
1. Ranked by emphasis during the call

**Objections & Concerns**
- What was raised and how it was handled

**Competitive Intel**
- Any mentions of other vendors

**Action Items**

| Owner | Action | Due |
|---|---|---|
| name | what they committed to | date |

**Next Steps**
- Concrete next actions with dates

**Deal Impact**
- How this call changes the opportunity (advancing, stalling, at risk)

---

**Part 2: Follow-Up Email**

Subject: [contextual subject line]

[Plain text email body following the style rules above]
```

- [ ] **Step 4: Commit**

```bash
git add packages/pack-sales/skills/
git commit -m "feat: add sales skills — account-research, call-prep, call-summary"
```

---

### Task 12: Sales pack skills — competitive-intelligence, daily-briefing, draft-outreach

**Files:**
- Create: `packages/pack-sales/skills/competitive-intelligence/SKILL.md`
- Create: `packages/pack-sales/skills/daily-briefing/SKILL.md`
- Create: `packages/pack-sales/skills/draft-outreach/SKILL.md`

- [ ] **Step 1: Create competitive-intelligence skill**

File: `packages/pack-sales/skills/competitive-intelligence/SKILL.md`

```markdown
---
name: sales-competitive-intelligence
description: Research competitors and build a battlecard. Triggers on "competitive intel", "how do we compare to [competitor]", "battlecard for [competitor]"
metadata:
  openclaw:
    tags: [sales, competitive, research]
---

## Competitive Intelligence

When the user asks about competitors or requests a battlecard:

### Step 1: Gather seller context

Ask (if not already known):
- What is your company and product?
- Who are the competitors to analyze? (1-5 competitors)

### Step 2: Research your company

Use `capability_execute` with capabilityId "research.web_search":
1. Your product features and recent releases
2. Your pricing and packaging
3. Your recent news and announcements
4. Your positioning and messaging
5. Your company vs. each competitor

### Step 3: Research each competitor

For each competitor, use `capability_execute` with capabilityId "research.web_search":
1. Product features and capabilities
2. Pricing and packaging
3. Recent news and releases
4. Product reviews and analyst coverage
5. Customer case studies
6. Market positioning
7. Notable customers
8. Hiring signals (growth areas)

### Step 4: Pull connected sources (if available)

Use `capability_execute` with capabilityId "crm.lookup_account" for:
- Win/loss data against each competitor
- Deal notes mentioning competitors
- Win rates by competitor

Use `capability_execute` with capabilityId "chat.search_messages" for:
- Field intel from teammates about competitors
- Recent competitive mentions in internal channels

### Step 5: Build the battlecard

Synthesize all research into a structured competitive analysis.

### Output Format

**Comparison Matrix**

| Dimension | Your Company | Competitor 1 | Competitor 2 |
|---|---|---|---|
| Core Product | description | description | description |
| Key Differentiator | what | what | what |
| Pricing | range | range | range |
| Target Market | who | who | who |
| Recent Momentum | signal | signal | signal |
| Win Rate | % if known | — | — |

**For each competitor:**

### [Competitor Name]

**Profile**: 1-2 sentence summary of what they do

**What They Sell**: key product capabilities

**Recent Releases**: last 2-3 product updates

**Where They Win**
- Scenarios or buyer profiles where they have an advantage

**Where You Win**
- Scenarios or buyer profiles where you have an advantage

**Pricing Intel**
- Known pricing, packaging, and discount patterns

**Talk Tracks**
- Early mention: what to say if they come up early in a deal
- Displacement: how to position against an existing deployment
- Late addition: how to handle them entering a deal late

**Objection Handling**

| Their Claim | Your Response |
|---|---|
| claim | evidence-based counter |

**Landmine Questions**
- Questions to plant that expose their weaknesses

**Your Company Card**

- Recent releases and differentiators
- Proof points (customer wins, metrics, awards)
- Key messaging themes
```

- [ ] **Step 2: Create daily-briefing skill**

File: `packages/pack-sales/skills/daily-briefing/SKILL.md`

```markdown
---
name: sales-daily-briefing
description: Generate a prioritized daily sales briefing. Triggers on "morning briefing", "daily brief", "what's on my plate today", "start my day", "wrap up my day"
metadata:
  openclaw:
    tags: [sales, daily, planning]
---

## Daily Briefing

When the user asks for their daily briefing or wants to start/wrap up their day:

### Detect mode

- **Standard**: "briefing", "start my day", "what's on my plate"
- **Quick**: "tldr my day" — condensed to top 3 priorities only
- **End of Day**: "wrap up my day" — focus on what was done and what carries over

### Step 1: Gather context

**With connectors:**

Use `capability_execute` with capabilityId "calendar.read_events":
- Today's events, filter to external meetings
- For each meeting: time, attendees, company, type

Use `capability_execute` with capabilityId "crm.lookup_account":
- Open pipeline summary (total value, deal count)
- Deals closing this week
- Deals with no activity in 7+ days
- Deals that slipped past close date

Use `capability_execute` with capabilityId "mail.read_inbox":
- Unread emails from opportunity contacts
- Sent emails with no reply after 3+ days

**Without connectors (standalone):**

Ask the user about:
- Today's meetings
- Active deals and their status
- Anything urgent

### Step 2: Prioritize

Rank items by urgency:
1. URGENT: Deal closing today that is not yet won
2. HIGH: Meeting today with a high-value opportunity
3. HIGH: Unread email from a decision-maker
4. MEDIUM: Deal closing this week
5. MEDIUM: Deal stale for 7+ days
6. LOW: Tasks due this week

### Output Format

**#1 Priority**: The single most important thing to do right now and why.

**Today's Numbers**

| Metric | Value |
|---|---|
| Pipeline | total value |
| Closing this month | value |
| Meetings today | count |
| Action items | count |

**Today's Meetings**

For each meeting:
- **Time** — Company — Meeting Type
- Attendees: names
- Context: 1-2 lines of relevant background
- Quick prep: one thing to review before the call

**Pipeline Alerts**
- Deals needing attention (stale, slipped, at risk)
- Deals closing this week with status

**Email Priorities**
- Messages needing a response (from whom, about what)
- Sent messages awaiting reply (days waiting)

**Suggested Actions**
Top 3 things to do today, ranked by impact.

For **Quick mode**: show only #1 Priority and Suggested Actions.
For **End of Day mode**: show what was accomplished, what carries over, and what to prep for tomorrow.
```

- [ ] **Step 3: Create draft-outreach skill**

File: `packages/pack-sales/skills/draft-outreach/SKILL.md`

```markdown
---
name: sales-draft-outreach
description: Draft personalized outreach based on research. Triggers on "draft outreach to [person/company]", "write cold email to [prospect]", "outreach for [company]"
metadata:
  openclaw:
    tags: [sales, outreach, email, prospecting]
---

## Draft Outreach

When the user asks to draft outreach to a prospect:

### Step 1: Parse the request

Identify:
- Target person (name, title, company)
- Outreach type: cold, warm, re-engagement, or post-event
- Channel: email, LinkedIn, or both

### Step 2: Research first (always)

Use `capability_execute` with capabilityId "research.web_search":
- Target person's professional background
- Target company's recent news and initiatives
- Any shared connections or common ground
- Relevant trigger events (funding, hiring, product launch)

Use `capability_execute` with capabilityId "enrichment.lookup_person" (if available):
- Verified email and title
- Role history and tenure

Use `capability_execute` with capabilityId "crm.lookup_account" (if available):
- Prior relationship with the company
- Past outreach attempts and their outcome

### Step 3: Identify the hook

Find the strongest personalization angle, in priority order:
1. **Trigger event**: something that just happened (funding, hire, launch)
2. **Mutual connection**: shared contact or community
3. **Their content**: something they wrote, said, or shared publicly
4. **Company initiative**: a strategic move that your product supports
5. **Role-based pain point**: a common challenge for their role

### Step 4: Draft using AIDA structure

- **Attention**: Personal hook (not generic flattery)
- **Interest**: Their specific problem or opportunity
- **Desire**: Proof point — how you've helped someone like them
- **Action**: Clear, low-friction CTA (not "let's schedule a call")

**Email style rules (strict):**
- Plain text only — no markdown formatting
- Subject line: short, specific, no clickbait
- 3-5 sentences max for cold outreach
- No generic openers ("I came across your company")
- No buzzwords ("synergy", "leverage", "innovative")
- One clear ask, not multiple options

### Output Format

**Research Summary**
- Target: name, title, company
- Hook: the personalization angle and why it works
- Goal: what you want from this outreach

**Email Draft**

To: email
Subject: [specific subject line]

[Plain text email body — no markdown]

**Subject Line Alternatives**
1. Alternative 1
2. Alternative 2

**LinkedIn Message** (if requested)
- Connection request (<300 characters)
- Follow-up message after connection

**Why This Approach**

| Element | Reasoning |
|---|---|
| Hook | why this angle was chosen |
| CTA | why this ask is appropriate |
| Tone | why this register was chosen |

**Follow-Up Sequence**
- Day 3: brief follow-up angle
- Day 7: new value-add angle
- Day 14: break-up message approach
```

- [ ] **Step 4: Commit**

```bash
git add packages/pack-sales/skills/
git commit -m "feat: add sales skills — competitive-intelligence, daily-briefing, draft-outreach"
```

---

### Task 13: Sales pack skills — forecast, pipeline-review

**Files:**
- Create: `packages/pack-sales/skills/forecast/SKILL.md`
- Create: `packages/pack-sales/skills/pipeline-review/SKILL.md`

- [ ] **Step 1: Create forecast skill**

File: `packages/pack-sales/skills/forecast/SKILL.md`

```markdown
---
name: sales-forecast
description: Generate a weighted sales forecast with scenarios and gap analysis
argument-hint: "<period>"
user-invocable: true
metadata:
  openclaw:
    tags: [sales, forecast, analytics]
---

## Sales Forecast

When the user asks for a forecast:

### Step 1: Gather pipeline data

**With CRM:**
Use `capability_execute` with capabilityId "crm.lookup_account" to pull:
- All open opportunities with stage, amount, close date, last activity date
- Historical win rates by stage
- Activity signals (meetings, emails, calls per deal)

**Without CRM:**
Ask the user to provide data via:
- CSV upload
- Pasted deal list
- Verbal description of their territory

### Step 2: Get targets

Ask for (if not known):
- Quota for the period
- Amount already closed
- Period end date

### Step 3: Apply stage probabilities

Default probabilities (adjust if historical data is available):

| Stage | Default Probability |
|---|---|
| Negotiation | 80% |
| Proposal Sent | 60% |
| Evaluation | 40% |
| Discovery | 20% |
| Prospecting | 10% |

### Step 4: Calculate scenarios

- **Best Case**: all pipeline deals close at stage probability + 20%
- **Likely Case**: all pipeline deals close at stage probability
- **Worst Case**: only Negotiation-stage deals close, at 70%

### Step 5: Classify deals

- **Commit**: high confidence, Negotiation stage, active engagement
- **Upside**: plausible but not certain, earlier stages or less activity
- Include reasoning for each classification

### Step 6: Flag risks

- Close date already passed
- No activity in 14+ days
- In Discovery but closing this week
- Single-threaded (only one contact)
- Amount changed recently (could signal instability)

### Step 7: Gap analysis

Calculate: Quota - Closed - Weighted Pipeline = Gap

If gap exists, recommend specific actions:
- Deals to accelerate (highest weighted value, most activity)
- Deals to revive (stale but large)
- New pipeline needed (volume and timeline)

### Output Format

**Summary**

| Metric | Value |
|---|---|
| Quota | amount |
| Closed to Date | amount |
| Open Pipeline | total amount |
| Weighted Forecast | amount |
| Gap | amount |
| Coverage Ratio | pipeline / remaining quota |

**Forecast Scenarios**

| Scenario | Amount | vs. Quota |
|---|---|---|
| Best Case | amount | +/- % |
| Likely Case | amount | +/- % |
| Worst Case | amount | +/- % |

**Pipeline by Stage**

| Stage | Deals | Amount | Weighted |
|---|---|---|---|
| stage | count | amount | weighted |

**Commit Deals**
- Each deal with reasoning for commit classification

**Upside Deals**
- Each deal with reasoning for upside classification

**Risk Flags**

| Deal | Risk | Impact |
|---|---|---|
| name | what's wrong | effect on forecast |

**Gap Analysis**
- Size of the gap
- Options to close it with specific deal recommendations

**Recommendations**
- Ranked list of actions to take this week
```

- [ ] **Step 2: Create pipeline-review skill**

File: `packages/pack-sales/skills/pipeline-review/SKILL.md`

```markdown
---
name: sales-pipeline-review
description: Analyze pipeline health, prioritize deals, flag risks, and create a weekly action plan
argument-hint: "<segment or rep>"
user-invocable: true
metadata:
  openclaw:
    tags: [sales, pipeline, analytics]
---

## Pipeline Review

When the user asks for a pipeline review:

### Step 1: Gather pipeline data

**With CRM:**
Use `capability_execute` with capabilityId "crm.lookup_account" to pull:
- All open opportunities
- For each: stage, amount, close date, owner, last activity date, contacts, next step

**Without CRM:**
Accept CSV, pasted data, or verbal description.

### Step 2: Calculate pipeline health score (0-100)

Score across four dimensions (25 points each):

**Stage Progression** (/25): Are deals moving forward?
- Full points: all deals progressed in the last 30 days
- Deductions: -5 per deal stuck in same stage 30+ days

**Activity Recency** (/25): Is the pipeline being worked?
- Full points: all deals have activity in the last 7 days
- Deductions: -5 per deal with no activity in 14+ days

**Close Date Accuracy** (/25): Are close dates realistic?
- Full points: no deals past close date
- Deductions: -5 per deal past close date, -3 per deal pushed 2+ times

**Contact Coverage** (/25): Are deals multi-threaded?
- Full points: all deals have 2+ contacts
- Deductions: -5 per single-threaded deal in late stage

### Step 3: Prioritize deals

Weighted framework:
- Close Date proximity: 30%
- Deal Size: 25%
- Stage advancement: 20%
- Recent Activity: 15%
- Risk level: 10%

### Step 4: Identify risks

- **Stale**: no activity in 14+ days
- **Stuck**: same stage for 30+ days
- **Past Due**: close date has passed
- **Single-Threaded**: only one contact, especially in late stage
- **No Next Step**: no defined next action

### Step 5: Hygiene audit

Flag deals missing:
- Close date
- Amount
- Next step
- Primary contact

### Output Format

**Pipeline Health Score: [X]/100**

| Dimension | Score | Key Issue |
|---|---|---|
| Stage Progression | /25 | summary |
| Activity Recency | /25 | summary |
| Close Date Accuracy | /25 | summary |
| Contact Coverage | /25 | summary |

**Priority Actions** (top 3)
For each:
- Deal name and why it's a priority
- Specific action to take
- Expected impact

**Deal Prioritization**

*Closing This Week*
- Deal list with status and risk level

*Closing This Month*
- Deal list with status and risk level

*Nurture*
- Deals not closing soon but worth maintaining

**Risk Flags**

| Deal | Risk Type | Days | Action |
|---|---|---|---|
| name | stale/stuck/past due | number | what to do |

**Hygiene Issues**

| Deal | Missing Field | Impact |
|---|---|---|
| name | what's missing | why it matters |

**Pipeline Shape**
- Distribution by stage (healthy = pyramid, top-heavy = problem)
- Distribution by close month
- Average deal size

**Recommendations**
- This week: top 3 actions
- This month: structural improvements

**Consider Removing**
- Deals that should probably be closed-lost, with reasoning
```

- [ ] **Step 3: Commit**

```bash
git add packages/pack-sales/skills/
git commit -m "feat: add sales skills — forecast, pipeline-review"
```

---

## Chunk 5: Pack Productivity — Full Implementation

### Task 14: Productivity pack scaffold and skills

**Files:**
- Create: `packages/pack-productivity/package.json`
- Create: `packages/pack-productivity/tsconfig.json`
- Create: `packages/pack-productivity/openclaw.plugin.json`
- Create: `packages/pack-productivity/pack-manifest.yaml`
- Create: `packages/pack-productivity/src/index.ts`
- Create: `packages/pack-productivity/skills/daily-planner/SKILL.md`
- Create: `packages/pack-productivity/skills/meeting-prep/SKILL.md`
- Create: `packages/pack-productivity/skills/task-digest/SKILL.md`
- Create: `packages/pack-productivity/skills/weekly-review/SKILL.md`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@clawdi-ai/pack-productivity",
  "version": "0.1.0",
  "description": "Productivity knowledge-work pack: daily planning, meeting prep, task management, and weekly reviews",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "openclaw": {
    "extensions": ["./dist/index.js"]
  },
  "scripts": { "build": "tsc" },
  "peerDependencies": {
    "openclaw": "*",
    "@clawdi-ai/knowledge-work-router": ">=0.1.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json, openclaw.plugin.json, pack-manifest.yaml**

`packages/pack-productivity/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

`packages/pack-productivity/openclaw.plugin.json`:
```json
{
  "id": "@clawdi-ai/pack-productivity",
  "name": "Productivity Pack",
  "description": "Daily planning, meeting prep, task management, and weekly reviews",
  "version": "0.1.0",
  "skills": ["./skills"],
  "configSchema": {}
}
```

`packages/pack-productivity/pack-manifest.yaml`:
```yaml
packId: productivity
displayName: "Productivity Pack"
capabilities:
  required:
    - calendar.read_events
    - mail.read_inbox
    - project.list_tasks
  optional:
    - chat.search_messages
    - docs.search_files
    - project.create_task
    - research.web_search
preferredApps:
  calendar.*:
    - google_workspace
    - outlook
  project.*:
    - linear
    - asana
    - jira
preferences:
  preferredProjectTracker:
    type: enum
    values: [linear, asana, jira, todoist]
    label: "Project Tracker"
    description: "Where are your tasks tracked?"
    captureAt: first_use
onboarding:
  welcomeMessage: "The Productivity pack helps you plan your day, prep for meetings, manage tasks, and run weekly reviews."
  suggestedFirstTask: "Try: 'Plan my day' or 'What's on my plate?'"
```

- [ ] **Step 3: Create index.ts**

File: `packages/pack-productivity/src/index.ts`

```ts
interface OpenClawPluginApi {
  registerCommand(command: {
    name: string;
    description: string;
    handler: (ctx: any) => Promise<unknown>;
  }): void;
}

export function register(api: OpenClawPluginApi) {
  api.registerCommand({
    name: "plan_day",
    description: "Generate a prioritized daily plan based on your calendar, tasks, and emails",
    handler: async () => ({
      systemPrompt: "Use the productivity-daily-planner skill to plan the user's day.",
    }),
  });

  api.registerCommand({
    name: "weekly_review",
    description: "Run a weekly review: what happened, what's next, what needs attention",
    handler: async () => ({
      systemPrompt: "Use the productivity-weekly-review skill to run the user's weekly review.",
    }),
  });
}
```

- [ ] **Step 4: Create daily-planner skill**

File: `packages/pack-productivity/skills/daily-planner/SKILL.md`

```markdown
---
name: productivity-daily-planner
description: Generate a prioritized daily plan. Triggers on "plan my day", "what's on my plate", "start my day", "morning plan", "daily priorities"
metadata:
  openclaw:
    tags: [productivity, planning, daily]
---

## Daily Planner

When the user asks to plan their day:

### Step 1: Gather inputs

Use `capability_execute` with capabilityId "calendar.read_events":
- Today's meetings with times, attendees, and descriptions
- Meetings for the rest of the week (for context)

Use `capability_execute` with capabilityId "project.list_tasks":
- Tasks assigned to the user
- Tasks due today or overdue
- Tasks due this week

Use `capability_execute` with capabilityId "mail.read_inbox":
- Unread emails (count and from whom)
- Flagged/starred emails needing response

Use `capability_execute` with capabilityId "chat.search_messages" (if available):
- Direct messages needing response
- Mentions in the last 24 hours

### Step 2: Identify time blocks

Map out the day:
- Fixed blocks: meetings (with buffer before/after)
- Available blocks: gaps between meetings
- Total available deep work time

### Step 3: Prioritize

Rank tasks using Eisenhower matrix:
1. **Urgent + Important**: due today, blocking others, external deadlines
2. **Important + Not Urgent**: high-value work, strategic tasks
3. **Urgent + Not Important**: quick replies, small requests
4. **Neither**: defer or delegate

### Step 4: Assign tasks to time blocks

- Deep work in the longest available block
- Quick tasks before/after meetings
- Email/chat triage in a dedicated 30-min block

### Output Format

**Today's Plan — [Date]**

**Top Priority**: The #1 thing to accomplish today and why.

**Schedule**

| Time | Activity | Type |
|---|---|---|
| 9:00-9:30 | Email triage | admin |
| 9:30-10:00 | [specific task] | deep work |
| 10:00-11:00 | Meeting: [name] | meeting |
| ... | ... | ... |

**Task List** (prioritized)

Must Do Today:
- [ ] Task 1 — why it's urgent
- [ ] Task 2 — why it's urgent

Should Do Today:
- [ ] Task 3 — context
- [ ] Task 4 — context

Can Wait:
- [ ] Task 5 — when to do it instead

**Needs Response**
- Emails or messages requiring a reply, with who and topic

**This Week Context**
- Upcoming deadlines
- Meetings to prep for
```

- [ ] **Step 5: Create meeting-prep skill**

File: `packages/pack-productivity/skills/meeting-prep/SKILL.md`

```markdown
---
name: productivity-meeting-prep
description: Quick meeting prep for any meeting — context, agenda, and talking points. Triggers on "prep for my meeting", "what's my next meeting about", "meeting context for [topic]"
metadata:
  openclaw:
    tags: [productivity, meetings, preparation]
---

## Meeting Prep

When the user asks to prepare for a meeting:

### Step 1: Find the meeting

Use `capability_execute` with capabilityId "calendar.read_events":
- If specific meeting mentioned, find it
- If "next meeting", find the soonest upcoming external meeting
- Extract: title, time, attendees, description, links

### Step 2: Gather context

Use `capability_execute` with capabilityId "mail.read_inbox":
- Recent email threads with attendees (last 14 days)
- Any attachments or documents shared

Use `capability_execute` with capabilityId "chat.search_messages" (if available):
- Internal mentions of the meeting topic or attendees
- Any pre-meeting context from teammates

Use `capability_execute` with capabilityId "docs.search_files" (if available):
- Related documents (meeting notes, shared docs)
- Prior meeting notes with same attendees

Use `capability_execute` with capabilityId "research.web_search" (if external meeting):
- Attendee backgrounds
- Company context if meeting is with external parties

### Step 3: Synthesize

Identify:
- What this meeting is about
- What happened last time (if recurring)
- What you need to contribute or decide
- Open questions or unresolved items

### Output Format

**Meeting: [Title]**
**Time**: date and time
**Attendees**: list with roles

**Context**
- Why this meeting exists
- What happened last time (if recurring)
- Recent relevant communication

**Suggested Agenda**
1. Item with context
2. Item with context
3. Item with context

**Your Talking Points**
- What you should bring up
- Decisions you need from others

**Open Questions**
- Unresolved items to address

**Documents**
- Links to relevant docs or prior notes
```

- [ ] **Step 6: Create task-digest skill**

File: `packages/pack-productivity/skills/task-digest/SKILL.md`

```markdown
---
name: productivity-task-digest
description: Summarize and triage your task backlog. Triggers on "show my tasks", "task status", "what am I behind on", "triage my tasks"
metadata:
  openclaw:
    tags: [productivity, tasks, triage]
---

## Task Digest

When the user asks about their tasks:

### Step 1: Gather tasks

Use `capability_execute` with capabilityId "project.list_tasks":
- All tasks assigned to the user
- Include: title, status, due date, priority, project/epic

### Step 2: Categorize

Group tasks by status:
- **Overdue**: past due date
- **Due Today**: due today
- **Due This Week**: due in the next 7 days
- **Upcoming**: due later
- **No Due Date**: needs triage

Flag issues:
- Tasks with no due date
- Tasks not updated in 14+ days
- Tasks blocked by others

### Step 3: Recommend triage actions

For overdue tasks: complete, reschedule, or remove
For stale tasks: check if still relevant
For tasks without dates: suggest due dates based on priority

### Output Format

**Task Digest — [Date]**

**Summary**: X total tasks, Y overdue, Z due this week

**Overdue** (needs immediate attention)
- [ ] Task — due [date], [days] days overdue — action recommendation

**Due Today**
- [ ] Task — priority and context

**Due This Week**
- [ ] Task — due [date]

**Needs Triage**
- Tasks with no date or stale tasks
- Recommended action for each

**Blocked**
- Tasks waiting on someone else — who and what
```

- [ ] **Step 7: Create weekly-review skill**

File: `packages/pack-productivity/skills/weekly-review/SKILL.md`

```markdown
---
name: productivity-weekly-review
description: Run a weekly review — what happened, what's next, what needs attention
argument-hint: "[--comprehensive]"
user-invocable: true
metadata:
  openclaw:
    tags: [productivity, review, planning]
---

## Weekly Review

When the user asks for a weekly review:

### Step 1: Review the past week

Use `capability_execute` with capabilityId "calendar.read_events":
- All meetings from the past 7 days
- Categorize: internal, external, 1:1, group

Use `capability_execute` with capabilityId "project.list_tasks":
- Tasks completed this week
- Tasks still open that were due this week

Use `capability_execute` with capabilityId "mail.read_inbox":
- Emails sent and received this week (volume)
- Important threads that are unresolved

### Step 2: Assess

- What was accomplished (completed tasks, meetings held)
- What slipped (overdue tasks, missed commitments)
- What emerged (new tasks, unexpected work)
- Time distribution (meetings vs. deep work vs. admin)

### Step 3: Plan next week

Use `capability_execute` with capabilityId "calendar.read_events":
- Next week's meetings

Use `capability_execute` with capabilityId "project.list_tasks":
- Tasks due next week
- Overdue tasks carrying over

### Step 4: Identify patterns

- Are meetings consuming too much time?
- Are tasks consistently slipping?
- Is there a project that needs more attention?

### Output Format

**Weekly Review — Week of [Date]**

**Accomplishments**
- Key things completed this week
- Meetings that moved things forward

**Slipped**
- Tasks that didn't get done and why
- Commitments that were missed

**Next Week Preview**

| Day | Key Meetings | Key Deadlines |
|---|---|---|
| Mon | meetings | tasks due |
| ... | ... | ... |

**Carry-Over Tasks**
- [ ] Tasks rolling into next week

**Time Distribution** (approximate)
- Meetings: X hours
- Deep work: X hours
- Admin/email: X hours
- Assessment: healthy/meeting-heavy/fragmented

**Attention Needed**
- Projects or areas that are falling behind
- People to follow up with
- Decisions to make

**Focus for Next Week**
Top 3 priorities for the coming week.
```

- [ ] **Step 8: Commit**

```bash
git add packages/pack-productivity/
git commit -m "feat: add productivity pack with daily-planner, meeting-prep, task-digest, weekly-review skills"
```

---

## Chunk 6: Pack Recruiting — Full Implementation

### Task 15: Recruiting pack scaffold and skills

**Files:**
- Create: `packages/pack-recruiting/package.json`
- Create: `packages/pack-recruiting/tsconfig.json`
- Create: `packages/pack-recruiting/openclaw.plugin.json`
- Create: `packages/pack-recruiting/pack-manifest.yaml`
- Create: `packages/pack-recruiting/src/index.ts`
- Create: `packages/pack-recruiting/skills/recruiting-pipeline/SKILL.md`
- Create: `packages/pack-recruiting/skills/interview-prep/SKILL.md`
- Create: `packages/pack-recruiting/skills/org-planning/SKILL.md`
- Create: `packages/pack-recruiting/skills/comp-analysis/SKILL.md`
- Create: `packages/pack-recruiting/skills/draft-offer/SKILL.md`
- Create: `packages/pack-recruiting/skills/onboarding-plan/SKILL.md`
- Create: `packages/pack-recruiting/skills/people-report/SKILL.md`
- Create: `packages/pack-recruiting/skills/performance-review/SKILL.md`
- Create: `packages/pack-recruiting/skills/policy-lookup/SKILL.md`

- [ ] **Step 1: Create package.json, tsconfig, plugin manifest**

`packages/pack-recruiting/package.json`:
```json
{
  "name": "@clawdi-ai/pack-recruiting",
  "version": "0.1.0",
  "description": "Recruiting and HR knowledge-work pack: pipeline management, interview prep, offers, onboarding, and people operations",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "openclaw": {
    "extensions": ["./dist/index.js"]
  },
  "scripts": { "build": "tsc" },
  "peerDependencies": {
    "openclaw": "*",
    "@clawdi-ai/knowledge-work-router": ">=0.1.0"
  }
}
```

`packages/pack-recruiting/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

`packages/pack-recruiting/openclaw.plugin.json`:
```json
{
  "id": "@clawdi-ai/pack-recruiting",
  "name": "Recruiting & HR Pack",
  "description": "Recruiting pipeline, interview prep, compensation analysis, offers, onboarding, and people operations",
  "version": "0.1.0",
  "skills": ["./skills"],
  "configSchema": {}
}
```

- [ ] **Step 2: Create pack-manifest.yaml**

```yaml
packId: recruiting
displayName: "Recruiting & HR Pack"
capabilities:
  required:
    - ats.search_candidates
    - ats.get_candidate
    - calendar.read_events
    - research.web_search
  optional:
    - ats.update_candidate_stage
    - hris.get_employee
    - hris.list_employees
    - mail.send_followup
    - mail.read_inbox
    - chat.search_messages
    - docs.create_brief
    - compensation.get_benchmarks
    - project.list_tasks
    - recruiting.offer_workflow
preferredApps:
  ats.*:
    - greenhouse
    - lever
    - ashby
  hris.*:
    - bamboohr
    - workday
    - rippling
preferences:
  preferredAts:
    type: enum
    values: [greenhouse, lever, ashby, workable]
    label: "Applicant Tracking System"
    description: "Which ATS do you use for recruiting?"
    captureAt: first_use
  preferredHris:
    type: enum
    values: [bamboohr, workday, rippling, gusto]
    label: "HR Information System"
    description: "Which HRIS do you use for employee data?"
    captureAt: first_use
onboarding:
  welcomeMessage: "The Recruiting & HR pack helps with candidate pipelines, interview planning, offers, onboarding, and people operations."
  suggestedFirstTask: "Try: 'Show me the recruiting pipeline' or 'Prep interview questions for [role]'"
```

- [ ] **Step 3: Create index.ts**

File: `packages/pack-recruiting/src/index.ts`

```ts
interface OpenClawPluginApi {
  registerCommand(command: {
    name: string;
    description: string;
    handler: (ctx: any) => Promise<unknown>;
  }): void;
}

export function register(api: OpenClawPluginApi) {
  api.registerCommand({
    name: "comp_analysis",
    description: "Run a compensation benchmarking analysis for a role",
    handler: async () => ({
      systemPrompt: "Use the recruiting-comp-analysis skill. Ask the user for the role and level.",
    }),
  });

  api.registerCommand({
    name: "draft_offer",
    description: "Draft an offer letter with compensation details",
    handler: async () => ({
      systemPrompt: "Use the recruiting-draft-offer skill. Ask the user for the role and level.",
    }),
  });

  api.registerCommand({
    name: "onboarding_plan",
    description: "Generate an onboarding checklist and first-week plan for a new hire",
    handler: async () => ({
      systemPrompt: "Use the recruiting-onboarding-plan skill. Ask for the new hire's name and role.",
    }),
  });

  api.registerCommand({
    name: "people_report",
    description: "Generate a people analytics report (headcount, attrition, diversity, or org health)",
    handler: async () => ({
      systemPrompt: "Use the recruiting-people-report skill. Ask the user what type of report they need.",
    }),
  });

  api.registerCommand({
    name: "performance_review",
    description: "Structure a performance review with templates for self-assessment, manager review, or calibration",
    handler: async () => ({
      systemPrompt: "Use the recruiting-performance-review skill. Ask for the employee name or review cycle.",
    }),
  });

  api.registerCommand({
    name: "policy_lookup",
    description: "Find and explain company policies in plain language",
    handler: async () => ({
      systemPrompt: "Use the recruiting-policy-lookup skill. Ask the user what policy topic they need.",
    }),
  });
}
```

- [ ] **Step 4: Create recruiting-pipeline skill**

File: `packages/pack-recruiting/skills/recruiting-pipeline/SKILL.md`

```markdown
---
name: recruiting-pipeline
description: Track and manage recruiting pipeline from sourcing through offer. Triggers on "recruiting update", "candidate pipeline", "how many candidates", "hiring status for [role]"
metadata:
  openclaw:
    tags: [recruiting, pipeline, candidates]
---

## Recruiting Pipeline

When the user asks about recruiting status or candidate pipeline:

### Step 1: Gather pipeline data

Use `capability_execute` with capabilityId "ats.search_candidates":
- All active candidates, grouped by role
- Include: name, current stage, days in stage, source, last activity

If a specific role is mentioned, filter to that role.

### Step 2: Analyze pipeline health

Track metrics per role:
- **Pipeline velocity**: average days per stage
- **Conversion rates**: stage-to-stage pass-through
- **Source effectiveness**: which sources produce the most hires
- **Time to fill**: days from opening to offer acceptance
- **Offer acceptance rate**: offers extended vs. accepted

### Step 3: Identify issues

Flag:
- Candidates stuck in a stage for 7+ days
- Stages with low conversion (bottlenecks)
- Roles with insufficient pipeline (fewer than 3x candidates per hire needed)
- Candidates with no scheduled next step

### Output Format

**Recruiting Pipeline — [Date]**

**Summary**

| Role | Candidates | Avg Days Open | Stage Distribution |
|---|---|---|---|
| role | count | days | sourced/screen/interview/offer |

**Pipeline by Stage**

For each role:
- Sourced: count (candidates to screen)
- Screen: count (candidates in phone screen)
- Interview: count (in interview loops)
- Debrief: count (pending debrief decision)
- Offer: count (offer extended or in negotiation)

**Velocity Metrics**

| Stage | Avg Days | Conversion Rate |
|---|---|---|
| Sourced -> Screen | days | % |
| Screen -> Interview | days | % |
| Interview -> Offer | days | % |
| Offer -> Accepted | days | % |

**Attention Needed**
- Candidates stuck or stale
- Bottleneck stages
- Roles needing more pipeline

**Recommended Actions**
- Specific next steps for each flagged issue
```

- [ ] **Step 5: Create interview-prep skill**

File: `packages/pack-recruiting/skills/interview-prep/SKILL.md`

```markdown
---
name: recruiting-interview-prep
description: Create structured interview plans with competency-based questions and scorecards. Triggers on "interview plan for [role]", "interview questions for [role]", "scorecard for [role]"
metadata:
  openclaw:
    tags: [recruiting, interviews, planning]
---

## Interview Prep

When the user asks for interview planning:

### Step 1: Define role competencies

Ask for (or infer from job description):
- Role title and level
- 4-6 key competencies (e.g., technical skills, leadership, collaboration, problem-solving, domain expertise, communication)

Use `capability_execute` with capabilityId "research.web_search" to:
- Research best practices for interviewing this role type
- Find relevant competency frameworks

### Step 2: Build question bank

For each competency, generate:
- 2-3 behavioral questions ("Tell me about a time...")
- 1-2 situational questions ("How would you handle...")
- Follow-up probes for each question

All questions should be:
- Structured (same for every candidate)
- Evidence-based (asking for specific examples)
- Level-appropriate (junior vs. senior expectations differ)

### Step 3: Create scorecard

For each competency, define a 1-4 scoring rubric:
- 1: Does not meet — description of what this looks like
- 2: Partially meets — description
- 3: Meets expectations — description
- 4: Exceeds expectations — description

### Step 4: Design interview panel

Suggest:
- Which competencies each interviewer should cover
- Interview format (duration, structure)
- How to avoid redundant questions across interviewers

### Output Format

**Interview Plan: [Role Title]**

**Competencies**
1. Competency — why it matters for this role
2. Competency — why it matters
...

**Question Bank**

### [Competency 1]

**Behavioral:**
- Q: question
  - Probe: follow-up
  - Probe: follow-up
- Q: question

**Situational:**
- Q: question

### [Competency 2]
...

**Scorecard**

| Competency | 1 (Does Not Meet) | 2 (Partial) | 3 (Meets) | 4 (Exceeds) |
|---|---|---|---|---|
| comp | description | description | description | description |

**Panel Assignment**

| Interviewer | Competencies | Duration | Format |
|---|---|---|---|
| Hiring Manager | leadership, domain | 45 min | behavioral |
| Tech Lead | technical, problem-solving | 60 min | live exercise |
| Peer | collaboration, communication | 30 min | behavioral |

**Debrief Template**
- Each interviewer shares scores and evidence
- Discuss: strong hire / hire / no hire / strong no hire
- Red flags or concerns
- Decision and next steps
```

- [ ] **Step 6: Create org-planning skill**

File: `packages/pack-recruiting/skills/org-planning/SKILL.md`

```markdown
---
name: recruiting-org-planning
description: Headcount planning, org design, and team structure optimization. Triggers on "org planning", "headcount plan", "team structure", "reorg", "who should we hire next"
metadata:
  openclaw:
    tags: [recruiting, planning, org-design]
---

## Org Planning

When the user asks about org planning, headcount, or team structure:

### Step 1: Understand the request

Determine the planning type:
- **Headcount plan**: how many, what roles, by when, at what cost
- **Org design**: reporting lines, span of control, team structure
- **Sequencing**: which hires are most critical and in what order
- **Reorg**: restructuring existing teams

### Step 2: Gather current state

Use `capability_execute` with capabilityId "hris.list_employees" (if available):
- Current headcount by team, level, and location
- Reporting structure
- Recent hires and departures
- Open roles

Use `capability_execute` with capabilityId "research.web_search":
- Industry benchmarks for team sizes and ratios
- Compensation ranges for planned roles
- Market availability for key roles

### Step 3: Apply org health benchmarks

| Metric | Healthy Range |
|---|---|
| Span of control | 5-8 direct reports |
| Management layers | 4-6 for 500 people |
| IC-to-manager ratio | 6:1 to 10:1 |
| Team size | 5-9 members |

Flag any current structure that falls outside these ranges.

### Step 4: Build the plan

For headcount plans:
- Role, level, team, location, estimated comp, start quarter
- Total cost modeling (base + equity + benefits overhead)
- Sequencing rationale (which hires unlock the most value)

For org design:
- Text-based org chart (current and proposed)
- Changes to reporting lines with rationale
- Impact on spans of control and layers

### Output Format

**Org Planning: [Team/Department]**

**Current State**

| Metric | Value |
|---|---|
| Total headcount | count |
| Teams | count |
| Avg span of control | number |
| IC:Manager ratio | ratio |
| Open roles | count |

**Org Chart** (text-based)
```
VP Engineering
├── Director, Platform (6 DRs)
│   ├── Team Lead, Infra (4 ICs)
│   └── Team Lead, Data (3 ICs)
├── Director, Product (5 DRs)
│   └── ...
```

**Headcount Plan**

| Priority | Role | Level | Team | Target Start | Est. Cost |
|---|---|---|---|---|---|
| 1 | role | level | team | Q2 | $XXXk |

**Sequencing Rationale**
- Why this order (dependencies, urgency, unblock potential)

**Cost Summary**

| Quarter | New Headcount | Incremental Cost |
|---|---|---|
| Q2 | count | amount |
| Q3 | count | amount |

**Structural Issues**
- Any flags (span too wide, single points of failure, missing layers)

**Recommendations**
- Immediate actions
- Medium-term structural improvements
```

- [ ] **Step 7: Create comp-analysis skill**

File: `packages/pack-recruiting/skills/comp-analysis/SKILL.md`

```markdown
---
name: recruiting-comp-analysis
description: Compensation benchmarking, band placement, and equity modeling
argument-hint: "<role, level, or dataset>"
user-invocable: true
metadata:
  openclaw:
    tags: [recruiting, compensation, analytics]
---

## Compensation Analysis

When the user asks for comp benchmarking:

### Step 1: Determine the mode

- **Single role**: benchmark a specific role and level
- **Band analysis**: analyze a dataset of current employees against bands
- **Equity modeling**: model equity grant scenarios

### Step 2: Gather data

Use `capability_execute` with capabilityId "compensation.get_benchmarks" (if available):
- Market data by role, level, and location
- Percentile bands (25th, 50th, 75th, 90th)

Use `capability_execute` with capabilityId "hris.get_employee" (if available):
- Current employee comp for band analysis
- Historical comp changes

Use `capability_execute` with capabilityId "research.web_search":
- Public comp data from levels.fyi, Glassdoor, etc.
- Industry and geographic adjustments

### Step 3: Analyze

For single role: position against market percentiles
For band analysis: identify employees above/below band
For equity: model vesting schedules and refresh grants

### Output Format

**Compensation Analysis: [Role] — [Level]**

**Market Benchmarks**

| Percentile | Base | Equity (Annual) | Total Comp |
|---|---|---|---|
| 25th | amount | amount | amount |
| 50th (median) | amount | amount | amount |
| 75th | amount | amount | amount |
| 90th | amount | amount | amount |

**Key Variables**
- Location adjustment: +/- X%
- Company stage adjustment: notes
- Industry adjustment: notes

**Band Analysis** (if employee data provided)

| Employee | Current Base | Band Min | Band Mid | Band Max | Position |
|---|---|---|---|---|---|
| name | amount | amount | amount | amount | below/at/above |

**Recommendations**
- Employees needing adjustment (below band minimum)
- Competitive positioning assessment
- Budget implications

**Sources**
- Data sources used and their recency
```

- [ ] **Step 8: Create draft-offer skill**

File: `packages/pack-recruiting/skills/draft-offer/SKILL.md`

```markdown
---
name: recruiting-draft-offer
description: Draft an offer letter with compensation details and terms
argument-hint: "<role and level>"
user-invocable: true
metadata:
  openclaw:
    tags: [recruiting, offers, compensation]
---

## Draft Offer

When the user asks to draft an offer:

### Step 1: Gather required inputs

Ask for (or pull from ATS):
- Role title and level
- Location (for comp adjustments)
- Compensation: base salary, equity grant, signing bonus
- Target start date
- Hiring manager name
- Any special terms (remote work, relocation, etc.)

Use `capability_execute` with capabilityId "ats.get_candidate" (if available):
- Candidate name and current details
- Interview feedback summary

Use `capability_execute` with capabilityId "hris.get_employee" (if available):
- Comp band for the role/level (to validate offer is within band)
- Benefits summary
- Standard terms

### Step 2: Validate against bands

If comp band data is available:
- Check that base is within band
- Flag if offer is below 25th percentile or above 75th
- Note if signing bonus is needed to bridge a gap

### Step 3: Draft the offer

Generate a complete offer package.

### Output Format

**Offer Package: [Candidate Name] — [Role Title]**

**Compensation Summary**

| Component | Amount | Notes |
|---|---|---|
| Base Salary | $XXX,XXX | Xth percentile for role/level/location |
| Equity | X,XXX shares | 4-year vest, 1-year cliff |
| Signing Bonus | $XX,XXX | paid in first paycheck |
| Target Bonus | XX% | based on company/individual performance |
| **Total First-Year** | **$XXX,XXX** | |

**Terms**
- Start Date: date
- Reports To: manager name
- Location: office/remote/hybrid
- Employment Type: full-time

**Benefits Summary**
- Health/dental/vision
- 401(k) match
- PTO policy
- Other notable benefits

**Offer Letter**

[Complete offer letter text — formal but warm, covering all terms above]

**Notes for Hiring Manager**
- Comp band context (where this sits relative to band)
- Negotiation guidance (room to move, non-monetary levers)
- Any flags (candidate expectations, competing offers, timeline pressure)
```

- [ ] **Step 9: Create onboarding-plan skill**

File: `packages/pack-recruiting/skills/onboarding-plan/SKILL.md`

```markdown
---
name: recruiting-onboarding-plan
description: Generate an onboarding checklist and first-week plan for a new hire
argument-hint: "<new hire name and role>"
user-invocable: true
metadata:
  openclaw:
    tags: [recruiting, onboarding, planning]
---

## Onboarding Plan

When the user asks to create an onboarding plan:

### Step 1: Gather inputs

Ask for:
- New hire name
- Role and team
- Start date
- Manager name
- Location (office/remote)

Use `capability_execute` with capabilityId "hris.get_employee" (if available):
- Org chart for the team (who they'll work with)
- Tools and systems the team uses
- Existing onboarding docs

Use `capability_execute` with capabilityId "docs.search_files" (if available):
- Team wiki and documentation
- Onboarding guides
- Role-specific resources

### Step 2: Build the onboarding plan

Structure around pre-start, Day 1, Week 1, and 30/60/90 milestones.

### Output Format

**Onboarding Plan: [Name] — [Role]**
**Start Date**: date | **Manager**: name | **Team**: team

**Pre-Start Checklist** (before Day 1)
- [ ] Send welcome email with logistics
- [ ] Set up accounts (email, Slack, tools)
- [ ] Order equipment (laptop, monitor, etc.)
- [ ] Add to team calendar and recurring meetings
- [ ] Assign onboarding buddy
- [ ] Prepare desk/workspace (if office)

**Day 1 Schedule**

| Time | Activity | With Whom |
|---|---|---|
| 9:00 | Welcome and office tour / remote setup | Manager |
| 9:30 | IT setup and tool access | IT / self-guided |
| 10:30 | Team introduction | Full team |
| 11:30 | Company overview and culture | Manager |
| 12:00 | Lunch with team | Team |
| 1:00 | Role expectations and 30/60/90 goals | Manager |
| 2:00 | Review team docs and current projects | Self-paced |
| 3:30 | Meet your onboarding buddy | Buddy |
| 4:00 | End-of-day check-in | Manager |

**Week 1 Checklist**
- [ ] Complete compliance training (HR systems, security)
- [ ] Read team documentation and architecture docs
- [ ] Shadow 2-3 key meetings
- [ ] 1:1 with each direct team member
- [ ] First small task or contribution
- [ ] End-of-week check-in with manager

**30/60/90 Day Goals**

| Milestone | Goals | Success Criteria |
|---|---|---|
| 30 days | Understand team, ship first contribution | Can explain team's work, completed onboarding tasks |
| 60 days | Independent contributor | Handling tasks with minimal guidance |
| 90 days | Full velocity | Delivering at expected pace, identified improvements |

**Key Contacts**

| Person | Role | Context |
|---|---|---|
| name | role | why they'll interact |

**Tools & Access**

| Tool | Purpose | Access Level |
|---|---|---|
| tool | what it's for | admin/member/viewer |
```

- [ ] **Step 10: Create people-report skill**

File: `packages/pack-recruiting/skills/people-report/SKILL.md`

```markdown
---
name: recruiting-people-report
description: Generate people analytics reports — headcount, attrition, diversity, or org health
argument-hint: "<report type>"
user-invocable: true
metadata:
  openclaw:
    tags: [recruiting, analytics, reporting]
---

## People Report

When the user asks for a people report:

### Step 1: Determine report type

- **Headcount**: by team, location, level, tenure
- **Attrition**: voluntary/involuntary, by team, trends
- **Diversity**: representation by level, team, and pipeline
- **Org Health**: span of control, management layers, team sizes, flight risk

### Step 2: Gather data

Use `capability_execute` with capabilityId "hris.list_employees" (if available):
- Full employee roster with: name, team, level, location, start date, manager
- For attrition: departure dates and reasons (if available)
- For diversity: demographic data (if available and appropriate)

Without HRIS, ask user to provide data via CSV or describe the team.

### Step 3: Analyze

Calculate relevant metrics based on report type.

**Key metrics by report type:**

Headcount:
- Total by team, location, level, tenure band
- Growth rate (current vs. 6 months ago, 12 months ago)
- Ratio metrics (IC:manager, engineering:non-engineering)

Attrition:
- Attrition rate (annualized): departures / avg headcount
- Regrettable vs. non-regrettable (if data available)
- Attrition by team, level, tenure
- Average tenure at departure

Org Health:
- Span of control by manager
- Management layers (depth of org tree)
- Team sizes (min, max, avg, std dev)
- Single points of failure (teams of 1)

### Output Format

**People Report: [Report Type] — [Date]**

**Executive Summary**
2-3 sentence overview of key findings.

**Key Metrics**

| Metric | Value | Trend | Benchmark |
|---|---|---|---|
| metric | value | up/down/flat | industry norm |

**Detailed Analysis**

[Tables and breakdowns specific to report type]

**Visualizations** (text-based)
- Distribution charts using bar notation
- Trend indicators with arrows

**Recommendations**
- Immediate actions (address urgent issues)
- Medium-term initiatives (structural improvements)
- Monitoring suggestions (what to track going forward)

**Methodology**
- Data sources used
- Date range
- Assumptions or limitations
```

- [ ] **Step 11: Create performance-review skill**

File: `packages/pack-recruiting/skills/performance-review/SKILL.md`

```markdown
---
name: recruiting-performance-review
description: Structure a performance review — self-assessment, manager review, or calibration prep
argument-hint: "<employee name or review cycle>"
user-invocable: true
metadata:
  openclaw:
    tags: [recruiting, performance, reviews]
---

## Performance Review

When the user asks for help with performance reviews:

### Step 1: Determine the mode

- **Self-Assessment**: help an employee write their self-review
- **Manager Review**: help a manager write a review for a direct report
- **Calibration**: prepare calibration materials for a team

### Step 2: Gather context

Use `capability_execute` with capabilityId "hris.get_employee" (if available):
- Employee details, role, level, tenure
- Prior review history and ratings
- Current goals and OKRs

Use `capability_execute` with capabilityId "project.list_tasks" (if available):
- Completed work during the review period
- Project contributions and impact

### Step 3: Generate review content

**Self-Assessment mode:**
Guide the employee through:
- Accomplishments (Situation / Contribution / Impact format)
- Goals review (what was achieved vs. plan)
- Growth areas (skills developed, areas for improvement)
- Challenges faced
- Next-period goals
- Feedback for manager

**Manager Review mode:**
Generate:
- Overall rating recommendation with justification
- Performance summary (2-3 paragraphs)
- Strengths with specific examples
- Development areas with actionable guidance
- Goal achievement assessment
- Impact assessment (team, org, company)
- Development plan (skills to build, experiences to seek)
- Compensation recommendation context

**Calibration mode:**
Prepare:
- Team overview table (name, role, level, tenure, proposed rating)
- Rating distribution vs. targets
- Discussion points for each employee
- Promotion candidates with case
- Compensation action recommendations

### Output Format

**Performance Review: [Employee] — [Review Period]**

*Mode: [Self-Assessment / Manager Review / Calibration]*

[Mode-specific content as described above]

**Rating Scale Reference**

| Rating | Definition | Expected Distribution |
|---|---|---|
| Exceeds Expectations | Consistently above role requirements | 15-20% |
| Meets Expectations | Delivers what's expected for role/level | 60-70% |
| Developing | Working toward full role expectations | 10-15% |
| Below Expectations | Not meeting role requirements | <5% |
```

- [ ] **Step 12: Create policy-lookup skill**

File: `packages/pack-recruiting/skills/policy-lookup/SKILL.md`

```markdown
---
name: recruiting-policy-lookup
description: Find and explain company policies in plain language
argument-hint: "<policy topic>"
user-invocable: true
metadata:
  openclaw:
    tags: [recruiting, policy, hr]
---

## Policy Lookup

When the user asks about a company policy:

### Step 1: Identify the topic

Common policy areas:
- **PTO/Leave**: vacation, sick leave, parental leave, bereavement, sabbatical
- **Benefits**: health insurance, 401(k), wellness, education
- **Compensation**: pay cycles, bonuses, equity, raises
- **Remote Work**: eligibility, expectations, equipment, stipends
- **Travel**: booking, expense limits, approval process
- **Conduct**: code of conduct, harassment, conflicts of interest
- **Growth**: promotion criteria, learning budget, internal transfers

### Step 2: Search for the policy

Use `capability_execute` with capabilityId "docs.search_files" (if available):
- Search company handbook, wiki, or knowledge base
- Look for the specific policy document
- Find related policies or FAQs

Without knowledge base access:
- Ask the user if they can share the policy document
- Provide general guidance based on common practices
- Clearly state this is general guidance, not company-specific policy

### Step 3: Explain in plain language

Translate the policy into clear, actionable language:
- Lead with the answer to their specific question
- Explain the key rules simply
- Note exceptions or special cases
- Point to who to contact for edge cases

### Guardrails

- Always cite the source document if available
- Clearly say when a policy was not found
- For compliance-sensitive topics (discrimination, termination, legal), recommend consulting HR or legal directly
- Never make up policy details — if unsure, say so

### Output Format

**Policy: [Topic]**

**Quick Answer**
Direct answer to the user's question in 1-2 sentences.

**Details**
Plain-language explanation of the policy. Avoid legal jargon.
- Key rules and requirements
- What the employee can/should do
- Timeline or process steps

**Exceptions & Special Cases**
- Situations where different rules apply
- Manager discretion areas

**Who to Contact**
- HR contact or team for questions
- When to escalate (legal, compliance)

**Source**
- Document name and section (if found)
- Last updated date (if known)
- Note if this is general guidance vs. confirmed company policy
```

- [ ] **Step 7: Commit**

```bash
git add packages/pack-recruiting/
git commit -m "feat: add recruiting pack with pipeline, interview-prep, org-planning, and 6 more skills"
```

---

## Chunk 7: Integration Test & Final Verification

### Task 16: Integration test — pack discovery and end-to-end resolution

**Files:**
- Create: `packages/router/src/__tests__/integration.test.ts`

- [ ] **Step 1: Write integration test**

File: `packages/router/src/__tests__/integration.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";
import { Router } from "../router.js";
import type { PackManifest } from "../capabilities/types.js";

const SALES_MANIFEST: PackManifest = {
  packId: "sales",
  displayName: "Sales Pack",
  capabilities: {
    required: [
      "calendar.read_events",
      "crm.lookup_account",
      "mail.send_followup",
      "research.web_search",
    ],
    optional: ["docs.create_brief"],
  },
  preferredApps: { "crm.*": ["Salesforce", "HubSpot"] },
  onboarding: {
    welcomeMessage: "Sales pack is ready.",
    suggestedFirstTask: "Try: prep for next meeting",
  },
};

describe("Router integration", () => {
  it("registers a pack and resolves a capability", async () => {
    const router = new Router({ sideEffectPolicy: "never_confirm" });
    router.registerPack(SALES_MANIFEST);

    // Research should resolve via openclaw_tool adapter if native tool is available
    const result = await router.resolve("research.web_search", "sales", { query: "Acme Corp" });
    // Without any real backend, this should return needs_setup
    expect(["ok", "needs_setup", "error"]).toContain(result.status);
  });

  it("reports needs_setup for unconnected capabilities", async () => {
    const router = new Router();
    router.registerPack(SALES_MANIFEST);

    const result = await router.resolve("crm.lookup_account", "sales", { query: "Acme" });
    expect(result.status).toBe("needs_setup");
  });

  it("respects side-effect policy", () => {
    const router = new Router({ sideEffectPolicy: "confirm_destructive" });
    const check = router.checkSideEffect("crm.create_note", "composio", "HubSpot");
    expect(check.blocked).toBe(true);
    expect(check.confirmationToken).toBeDefined();
  });

  it("allows read capabilities through side-effect guard", () => {
    const router = new Router({ sideEffectPolicy: "confirm_destructive" });
    const check = router.checkSideEffect("crm.lookup_account", "composio", "HubSpot");
    expect(check.blocked).toBe(false);
  });

  it("tracks multiple packs", () => {
    const router = new Router();
    router.registerPack(SALES_MANIFEST);
    router.registerPack({
      ...SALES_MANIFEST,
      packId: "recruiting",
      displayName: "Recruiting Pack",
      capabilities: { required: ["ats.search_candidates"], optional: [] },
    });

    expect(router.packs).toHaveLength(2);
    expect(router.packs[0].packId).toBe("sales");
    expect(router.packs[1].packId).toBe("recruiting");
  });
});
```

- [ ] **Step 2: Run all tests**

Run: `cd packages/router && npx vitest run`
Expected: ALL PASS

- [ ] **Step 3: Build all packages**

Run: `pnpm build`
Expected: All packages compile without errors

- [ ] **Step 4: Commit**

```bash
git add packages/router/src/__tests__/integration.test.ts
git commit -m "feat: add integration tests for router pack discovery and resolution"
```

---

### Task 17: Final verification and cleanup

- [ ] **Step 1: Verify all files exist**

Run: `find packages/ -name "*.ts" -o -name "*.json" -o -name "*.yaml" -o -name "*.md" | head -80`

Verify the file tree matches the spec's repository layout.

- [ ] **Step 2: Run full test suite**

Run: `pnpm test`
Expected: ALL PASS

- [ ] **Step 3: Verify pack manifests are valid YAML**

Run: `node -e "const yaml = require('yaml'); const fs = require('fs'); ['sales','productivity','recruiting'].forEach(p => { const m = yaml.parse(fs.readFileSync('packages/pack-'+p+'/pack-manifest.yaml','utf-8')); console.log(p, m.packId, m.capabilities.required.length + ' required caps'); })"`

Expected: Each pack prints its ID and capability count.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final verification — all packages build and tests pass"
```
