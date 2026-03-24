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
  plugin_id=$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).id)" -- "$manifest")

  if [ -z "$plugin_id" ]; then
    echo "  SKIP $(basename "$pkg_dir") — no id in openclaw.plugin.json"
    continue
  fi

  case "$plugin_id" in
    */*|..|.) echo "  ERROR: unsafe plugin_id '$plugin_id'"; exit 1 ;;
  esac

  dest="$TARGET/$plugin_id"
  echo "  $(basename "$pkg_dir") -> $plugin_id"

  # Clean and create target
  rm -rf "$dest"
  mkdir -p "$dest"

  # Copy deployment-relevant files
  if [ ! -d "$pkg_dir/dist" ]; then
    echo "  ERROR: $pkg_dir/dist not found — was build successful?"
    exit 1
  fi
  cp -r "$pkg_dir/dist" "$dest/dist"
  cp "$pkg_dir/package.json" "$dest/package.json"
  cp "$manifest" "$dest/openclaw.plugin.json"

  # Copy optional pack files
  [ -d "$pkg_dir/skills" ] && cp -r "$pkg_dir/skills" "$dest/skills"
  [ -f "$pkg_dir/pack-manifest.yaml" ] && cp "$pkg_dir/pack-manifest.yaml" "$dest/pack-manifest.yaml"

  # Install runtime dependencies if package.json has any
  has_deps=$(node -e "
    const pkg = JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));
    console.log(pkg.dependencies && Object.keys(pkg.dependencies).length > 0 ? 'yes' : 'no');
  " -- "$dest/package.json")

  if [ "$has_deps" = "yes" ]; then
    echo "    Installing runtime dependencies..."
    (cd "$dest" && npm install --omit=dev --ignore-scripts --legacy-peer-deps)
  fi

  deployed=$((deployed + 1))
done

echo ""
echo "==> Deployed $deployed plugin(s) to $TARGET"
