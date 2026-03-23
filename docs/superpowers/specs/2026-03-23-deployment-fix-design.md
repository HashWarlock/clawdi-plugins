# Deployment Fix & Script Design

## Problem

When the OpenClaw team deployed clawdi-plugins to a remote instance, they hit 3 issues:

1. **Build failure** — TypeScript type mismatch: `DEFAULT_CONFIG.sideEffectPolicy` inferred as `string`, but `RouterConfig.sideEffectPolicy` expects `SideEffectPolicy` union type (`"always_confirm" | "confirm_destructive" | "never_confirm"`). The team applied `as any` as a workaround.

2. **Directory naming confusion** — The package directory is `packages/router/` but the plugin ID is `knowledge-work-router`. Deploying required manually renaming: `cp -a router knowledge-work-router && rm -rf router`.

3. **Missing runtime dependency** — After `cp -r` to extensions directory, `yaml` module was not found because `node_modules` wasn't copied. OpenClaw requires each plugin directory to have its own `node_modules`.

## Solution

### Fix 1: Proper `sideEffectPolicy` type annotation

Import `SideEffectPolicy` in `packages/router/src/index.ts` and annotate the default value:

```ts
import type { SideEffectPolicy } from "./policy/side-effects.js";

const DEFAULT_CONFIG = {
  adapterOrder: ["composio", "openclaw_tool", "lobster", "cli", "mcporter"],
  disabledAdapters: [] as string[],
  capabilityPins: {} as Record<string, string>,
  sideEffectPolicy: "confirm_destructive" as SideEffectPolicy,
  cacheTtl: 600000,
  cliMappings: {} as Record<string, string>,
};
```

This ensures `typeof DEFAULT_CONFIG` has `sideEffectPolicy: SideEffectPolicy`, which is assignable to `RouterConfig.sideEffectPolicy?: SideEffectPolicy`. No `as any` needed.

### Fix 2: Deployment script (`scripts/deploy.sh`)

A shell script that automates the full deployment process following OpenClaw conventions.

**Usage:**
```bash
./scripts/deploy.sh [target-extensions-dir]
# Default target: /data/openclaw/extensions
```

**Behavior:**

1. Build all packages: `pnpm -r build`
2. For each directory under `packages/` that contains `openclaw.plugin.json`:
   a. Read the `id` field from `openclaw.plugin.json` (this is the plugin ID that OpenClaw expects as the directory name)
   b. Create `$TARGET/$id/` directory
   c. Copy `dist/`, `package.json`, `openclaw.plugin.json`, `skills/` (if present), and `pack-manifest.yaml` (if present)
   d. If `package.json` has a non-empty `dependencies` field, run `npm install --omit=dev --ignore-scripts --legacy-peer-deps` in the deployed directory (installs runtime deps like `yaml`). Skip `npm install` for packages with no runtime dependencies (all current packs).
3. Print summary of deployed plugins

**Design decisions:**
- Reads plugin ID from `openclaw.plugin.json` using `node -e` (Node.js is available since this is a Node project — no external `jq` dependency)
- Copies only deployment-relevant files (not `src/`, `tsconfig.json`, `node_modules/` from the monorepo, or test files)
- Uses `npm install --omit=dev --ignore-scripts --legacy-peer-deps` matching OpenClaw's own plugin install pattern (pure JS/TS deps, no lifecycle scripts). `--legacy-peer-deps` prevents failures on unmet `openclaw` peer dependency which is provided by the host runtime.
- Conditional `npm install` — only runs when `package.json` has runtime `dependencies`, avoiding unnecessary `node_modules` and `package-lock.json` in packs that have none
- Idempotent — safe to re-run (overwrites existing deployments)
- Takes target directory as argument for flexibility across environments
- Uses `set -euo pipefail` for fail-fast error handling — if the build or any deployment step fails, the script stops immediately

**Limitation:** The script does not remove stale plugin directories from the target. If a plugin is removed from the source, its old deployment remains. Run `rm -rf $TARGET/<old-id>` manually if needed.

**Files copied per plugin:**
| Source | Copied | Why |
|--------|--------|-----|
| `dist/` | yes | Compiled JS entry point |
| `package.json` | yes | Dependency manifest for `npm install` |
| `openclaw.plugin.json` | yes | Plugin metadata/manifest |
| `skills/` | if present | Pack skill definitions (SKILL.md files) |
| `pack-manifest.yaml` | if present | Pack capability declarations |
| `src/` | no | Source not needed at runtime |
| `tsconfig.json` | no | Build config not needed at runtime |
| `node_modules/` | no | Reinstalled per-extension via `npm install` |

### Fix 3: README update

**Replace** the existing "Quick Start" and "Remote OpenClaw Instance" deployment sections (which show broken manual `cp -r` commands) with the `deploy.sh` usage. The current README instructs `cp -r packages/router /data/openclaw/extensions/knowledge-work-router` which copies source files, misses `node_modules`, and requires the user to know the name mapping. The deploy script replaces all of this.

## Scope

**Changed files:**
- `packages/router/src/index.ts` — type annotation fix (1 line)
- `scripts/deploy.sh` — new file (~50 lines)
- `README.md` — add deploy script documentation

**Not changed:**
- No pack code changes
- No directory renames
- No new dependencies
- No changes to `openclaw.plugin.json` files

## Testing

- `pnpm build` should succeed without type errors (verifies Fix 1)
- `./scripts/deploy.sh /tmp/test-deploy` should:
  - Create 11 directories (1 router + 10 packs) with correct plugin ID names
  - Expected directories: `knowledge-work-router`, `pack-sales`, `pack-productivity`, `pack-recruiting`, `pack-marketing`, `pack-operations`, `pack-customer-support`, `pack-engineering`, `pack-enterprise-search`, `pack-human-resources`, `pack-product-management`
  - Each directory contains `dist/`, `package.json`, `openclaw.plugin.json`
  - Pack directories also contain `skills/` and `pack-manifest.yaml`
  - Router directory has `node_modules/` with `yaml` resolvable: `node -e "require('/tmp/test-deploy/knowledge-work-router/node_modules/yaml')"` succeeds
  - Pack directories do NOT have `node_modules/` (no runtime deps)
- README review: deployment instructions reference `scripts/deploy.sh`, not manual `cp -r`
