# Deployment Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 deployment issues (type error, directory naming, missing deps) and add an automated deploy script following OpenClaw conventions.

**Architecture:** One TypeScript type annotation fix, one new shell script that reads plugin IDs from manifests and deploys to the correct directory names with per-plugin `npm install`, and a README update replacing broken manual deployment instructions.

**Tech Stack:** TypeScript, Bash, Node.js (for JSON parsing in shell script), pnpm monorepo

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `packages/router/src/index.ts` | Modify (line ~14, 22) | Add `SideEffectPolicy` import, annotate default |
| `scripts/deploy.sh` | Create | Automated deployment to OpenClaw extensions dir |
| `README.md` | Modify (lines 7-27, 261-278) | Replace broken manual deploy instructions |

---

## Chunk 1: Type Fix and Deploy Script

### Task 1: Fix sideEffectPolicy type annotation

**Files:**
- Modify: `packages/router/src/index.ts:1-25`

**Context:** The `DEFAULT_CONFIG` object has `sideEffectPolicy: "confirm_destructive"` which TypeScript infers as `string`. But `RouterConfig.sideEffectPolicy` (in `packages/router/src/router.ts:25`) expects `SideEffectPolicy` (a union of 3 string literals from `packages/router/src/policy/side-effects.ts:10-13`). This causes TS2322 at line 91 when passing to the Router constructor.

- [ ] **Step 1: Verify the build fails**

Run: `cd /Users/hashwarlock/Projects/Clawdi/clawdi-plugins && pnpm -r build 2>&1 | tail -20`
Expected: Build succeeds (the current code uses `as typeof DEFAULT_CONFIG` which masks the issue at the `resolveConfig` level, but the type narrows to `string` not `SideEffectPolicy`). To confirm the latent issue, run:
```bash
cd packages/router && npx tsc --noEmit 2>&1
```
Expected: Error `TS2322: Type 'string' is not assignable to type 'SideEffectPolicy | undefined'` at line 91.

**Note:** If `--noEmit` passes cleanly, the `as typeof DEFAULT_CONFIG` cast may be sufficient in the current TypeScript version. In that case, apply the fix anyway for correctness — the OpenClaw team's build failed with this exact error.

- [ ] **Step 2: Add SideEffectPolicy import and annotate the default**

In `packages/router/src/index.ts`, add the import after line 13 (after the `check-setup` import block):

```ts
import type { SideEffectPolicy } from "./policy/side-effects.js";
```

Then change line 22 from:
```ts
  sideEffectPolicy: "confirm_destructive",
```
to:
```ts
  sideEffectPolicy: "confirm_destructive" as SideEffectPolicy,
```

- [ ] **Step 3: Verify the build succeeds**

Run: `cd /Users/hashwarlock/Projects/Clawdi/clawdi-plugins/packages/router && npx tsc --noEmit`
Expected: No errors.

Run: `cd /Users/hashwarlock/Projects/Clawdi/clawdi-plugins && pnpm -r build`
Expected: All packages build successfully.

- [ ] **Step 4: Commit**

```bash
git add packages/router/src/index.ts
git commit -m "fix(router): annotate sideEffectPolicy type for OpenClaw build compat"
```

---

### Task 2: Create deployment script

**Files:**
- Create: `scripts/deploy.sh`

**Context:** OpenClaw requires each plugin directory under `/data/openclaw/extensions/` to:
1. Be named after the plugin `id` from `openclaw.plugin.json` (not the source directory name)
2. Have its own `node_modules` if it has runtime dependencies
3. Dependencies installed with `npm install --omit=dev --ignore-scripts --legacy-peer-deps`

The script reads plugin IDs from `openclaw.plugin.json` using `node -e` (no `jq` dependency needed).

- [ ] **Step 1: Create `scripts/` directory and `scripts/deploy.sh`**

First create the directory (it does not exist yet):
```bash
mkdir -p /Users/hashwarlock/Projects/Clawdi/clawdi-plugins/scripts
```

Then create `scripts/deploy.sh` with this content:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Deploy clawdi-plugins to an OpenClaw extensions directory.
#
# Usage:
#   ./scripts/deploy.sh [target-extensions-dir]
#
# Default target: /data/openclaw/extensions

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET="${1:-/data/openclaw/extensions}"

echo "==> Building all packages..."
cd "$REPO_ROOT"
pnpm -r build

echo ""
echo "==> Deploying to $TARGET"
mkdir -p "$TARGET"

deployed=0

for pkg_dir in "$REPO_ROOT"/packages/*/; do
  manifest="$pkg_dir/openclaw.plugin.json"
  [ -f "$manifest" ] || continue

  # Read plugin ID from openclaw.plugin.json
  plugin_id=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$manifest','utf8')).id)")

  if [ -z "$plugin_id" ]; then
    echo "  SKIP $(basename "$pkg_dir") — no id in openclaw.plugin.json"
    continue
  fi

  dest="$TARGET/$plugin_id"
  echo "  $(basename "$pkg_dir") -> $plugin_id"

  # Clean and create target
  rm -rf "$dest"
  mkdir -p "$dest"

  # Copy deployment-relevant files
  cp -r "$pkg_dir/dist" "$dest/dist"
  cp "$pkg_dir/package.json" "$dest/package.json"
  cp "$manifest" "$dest/openclaw.plugin.json"

  # Copy optional pack files
  [ -d "$pkg_dir/skills" ] && cp -r "$pkg_dir/skills" "$dest/skills"
  [ -f "$pkg_dir/pack-manifest.yaml" ] && cp "$pkg_dir/pack-manifest.yaml" "$dest/pack-manifest.yaml"

  # Install runtime dependencies if package.json has any
  has_deps=$(node -e "
    const pkg = JSON.parse(require('fs').readFileSync('$dest/package.json','utf8'));
    console.log(pkg.dependencies && Object.keys(pkg.dependencies).length > 0 ? 'yes' : 'no');
  ")

  if [ "$has_deps" = "yes" ]; then
    echo "    Installing runtime dependencies..."
    cd "$dest"
    npm install --omit=dev --ignore-scripts --legacy-peer-deps
    cd "$REPO_ROOT"
  fi

  deployed=$((deployed + 1))
done

echo ""
echo "==> Deployed $deployed plugin(s) to $TARGET"
```

- [ ] **Step 2: Make the script executable**

Run: `chmod +x /Users/hashwarlock/Projects/Clawdi/clawdi-plugins/scripts/deploy.sh`

- [ ] **Step 3: Test the deploy script against a temp directory**

Run:
```bash
cd /Users/hashwarlock/Projects/Clawdi/clawdi-plugins
./scripts/deploy.sh /tmp/clawdi-test-deploy
```

Expected output includes:
- `router -> knowledge-work-router`
- `pack-sales -> pack-sales`
- (and 9 more pack lines)
- `Deployed 11 plugin(s)`

- [ ] **Step 4: Verify deployment structure**

Run:
```bash
# Check all 11 directories exist with correct names
ls /tmp/clawdi-test-deploy/
```
Expected: `knowledge-work-router  pack-customer-support  pack-engineering  pack-enterprise-search  pack-human-resources  pack-marketing  pack-operations  pack-product-management  pack-productivity  pack-recruiting  pack-sales`

Run:
```bash
# Check router has node_modules with yaml
node -e "require('/tmp/clawdi-test-deploy/knowledge-work-router/node_modules/yaml')" && echo "yaml OK"
```
Expected: `yaml OK`

Run:
```bash
# Check a pack does NOT have node_modules
ls /tmp/clawdi-test-deploy/pack-sales/node_modules 2>&1
```
Expected: `No such file or directory`

Run:
```bash
# Check each directory has the required files
for d in /tmp/clawdi-test-deploy/*/; do
  name=$(basename "$d")
  echo -n "$name: "
  [ -d "$d/dist" ] && echo -n "dist " || echo -n "MISSING-dist "
  [ -f "$d/package.json" ] && echo -n "pkg " || echo -n "MISSING-pkg "
  [ -f "$d/openclaw.plugin.json" ] && echo -n "manifest " || echo -n "MISSING-manifest "
  echo ""
done
```
Expected: All 11 directories show `dist pkg manifest`.

- [ ] **Step 5: Clean up test directory**

Run: `rm -rf /tmp/clawdi-test-deploy`

- [ ] **Step 6: Commit**

```bash
git add scripts/deploy.sh
git commit -m "feat: add deploy script for OpenClaw extensions

Reads plugin IDs from openclaw.plugin.json, copies only deployment
files, and runs npm install for plugins with runtime dependencies.
Follows OpenClaw conventions: --ignore-scripts, --legacy-peer-deps."
```

---

## Chunk 2: README Update

### Task 3: Update README deployment instructions

**Files:**
- Modify: `README.md:7-27` (Quick Start section)
- Modify: `README.md:261-278` (Deployment section)

**Context:** The current README has manual `cp -r` instructions that caused the deployment issues. Replace with `deploy.sh` usage. Keep the rest of the README unchanged.

- [ ] **Step 1: Replace the Quick Start steps 1-2**

Using the Edit tool, replace this exact old_string in `README.md`:

**old_string:**
```
1. Clone and build:

\`\`\`bash
git clone <repo-url>
cd clawdi-plugins
pnpm install
pnpm build
\`\`\`

2. Copy the built extensions into your OpenClaw extensions directory:

\`\`\`bash
# Copy router
cp -r packages/router /data/openclaw/extensions/knowledge-work-router

# Copy desired packs
cp -r packages/pack-sales /data/openclaw/extensions/pack-sales
cp -r packages/pack-productivity /data/openclaw/extensions/pack-productivity
\`\`\`
```

**new_string:**
```
1. Clone and install:

\`\`\`bash
git clone <repo-url>
cd clawdi-plugins
pnpm install
\`\`\`

2. Deploy to your OpenClaw extensions directory:

\`\`\`bash
./scripts/deploy.sh /data/openclaw/extensions
\`\`\`

This builds all packages, copies them with correct plugin ID directory names, and installs runtime dependencies.
```

Steps 3-4 (enable in openclaw.json, restart agent) remain unchanged.

- [ ] **Step 2: Replace the Deployment section**

Using the Edit tool, replace this exact old_string in `README.md`:

**old_string:**
```
## Deployment

### Remote OpenClaw Instance

\`\`\`bash
# On the remote machine
git clone <repo-url> /tmp/clawdi-plugins
cd /tmp/clawdi-plugins
pnpm install
pnpm build

# Copy built packages to extensions directory
cp -r packages/router /data/openclaw/extensions/knowledge-work-router
cp -r packages/pack-sales /data/openclaw/extensions/pack-sales
# ... repeat for desired packs

# Restart OpenClaw to load extensions
\`\`\`
```

**new_string:**
```
## Deployment

### Deploy Script

The `scripts/deploy.sh` script automates deployment following OpenClaw conventions:

\`\`\`bash
# On the remote machine
git clone <repo-url> /root/.openclaw/clawdi-plugins
cd /root/.openclaw/clawdi-plugins
pnpm install
./scripts/deploy.sh /data/openclaw/extensions
\`\`\`

The script:
- Builds all packages
- Reads each plugin's `id` from `openclaw.plugin.json`
- Copies only deployment files (`dist/`, `package.json`, `openclaw.plugin.json`, `skills/`, `pack-manifest.yaml`)
- Installs runtime dependencies per-plugin (`npm install --omit=dev --ignore-scripts --legacy-peer-deps`)
- Safe to re-run (idempotent)

To deploy a subset of packs, copy only the desired pack directories manually after building, or modify `plugins.allow` in `openclaw.json` to control which plugins load.
```

The "Plugin ID Convention" subsection that follows remains unchanged.

- [ ] **Step 3: Also update "Creating a Pack" step 7 (line 215)**

Replace:
```
7. Copy to `/data/openclaw/extensions/pack-yourpack` and enable in `openclaw.json`
```
With:
```
7. Run `./scripts/deploy.sh` to deploy all plugins, or manually copy the built pack to `/data/openclaw/extensions/pack-yourpack` and run `npm install --omit=dev --ignore-scripts --legacy-peer-deps` if it has runtime dependencies. Enable in `openclaw.json`.
```

- [ ] **Step 4: Review the README changes**

Read through the modified README to ensure:
- No references to manual `cp -r` for standard deployment
- Deploy script is the primary deployment method
- Plugin ID convention section is preserved
- No broken markdown

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: replace manual deploy instructions with deploy script

Quick Start and Deployment sections now reference scripts/deploy.sh
instead of manual cp -r commands that caused missing dependencies
and directory naming confusion."
```

---

## Verification

After all tasks are complete:

- [ ] **Full build verification**

Run: `cd /Users/hashwarlock/Projects/Clawdi/clawdi-plugins && pnpm -r build`
Expected: All packages build without errors.

- [ ] **Full deploy verification**

Run:
```bash
cd /Users/hashwarlock/Projects/Clawdi/clawdi-plugins
./scripts/deploy.sh /tmp/clawdi-final-verify
ls /tmp/clawdi-final-verify/ | wc -l
node -e "require('/tmp/clawdi-final-verify/knowledge-work-router/node_modules/yaml')"
rm -rf /tmp/clawdi-final-verify
```
Expected: 11 directories, yaml resolves successfully.

- [ ] **Existing tests still pass**

Run: `cd /Users/hashwarlock/Projects/Clawdi/clawdi-plugins && pnpm test`
Expected: All tests pass.
