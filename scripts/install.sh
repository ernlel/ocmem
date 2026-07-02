#!/usr/bin/env bash
#
# ocmem installer — deploys the structured memory system to ~/.config/opencode/
#
# Usage:
#   ./scripts/install.sh          # install everything
#   ./scripts/install.sh --force  # overwrite existing template files too
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# Resolve the opencode config dir the same way opencode does:
#   ${XDG_CONFIG_HOME:-~/.config}/opencode
# Override with OPENCODE_CONFIG_DIR to point at a non-standard location.
OC_DIR="${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}"
FORCE=0

for arg in "$@"; do
  case "$arg" in
    --force|-f) FORCE=1 ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

echo "ocmem — structured memory for opencode"
echo "======================================"
echo "Target dir: $OC_DIR"
echo ""

mkdir -p "$OC_DIR"

# 1. Plugin -----------------------------------------------------------------
mkdir -p "$OC_DIR/plugins"
install -m 644 "$REPO_ROOT/plugin/ocmem.ts" "$OC_DIR/plugins/ocmem.ts"
echo "[1/5] Plugin     -> $OC_DIR/plugins/ocmem.ts"

# 2. Global memory structure ------------------------------------------------
mkdir -p "$OC_DIR/memory/tools" "$OC_DIR/memory/domain"

copy_template() {
  local src="$1" dest="$2"
  if [ "$FORCE" -eq 1 ] || [ ! -f "$dest" ]; then
    install -m 644 "$src" "$dest"
    echo "       created $(basename "$dest")"
  else
    echo "       kept existing $(basename "$dest") (use --force to overwrite)"
  fi
}

echo "[2/5] Memory dir -> $OC_DIR/memory/"
copy_template "$REPO_ROOT/templates/memory.md"  "$OC_DIR/memory/memory.md"
copy_template "$REPO_ROOT/templates/general.md" "$OC_DIR/memory/general.md"

# 3. AGENTS.md instructions -------------------------------------------------
AGENTS_FILE="$OC_DIR/AGENTS.md"
OPEN_MARKER="<!-- ocmem:begin -->"
CLOSE_MARKER="<!-- ocmem:end -->"

if [ -f "$AGENTS_FILE" ] && grep -qF "$OPEN_MARKER" "$AGENTS_FILE"; then
  echo "[3/5] AGENTS.md -> already patched (skipped)"
else
  if [ ! -f "$AGENTS_FILE" ]; then
    : > "$AGENTS_FILE"
  fi
  {
    echo ""
    echo "$OPEN_MARKER"
    cat "$REPO_ROOT/templates/AGENTS-memory.md"
    echo "$CLOSE_MARKER"
    echo ""
  } >> "$AGENTS_FILE"
  echo "[3/5] AGENTS.md -> memory instructions appended"
fi

# 4. /init-memory command ---------------------------------------------------
mkdir -p "$OC_DIR/commands"
install -m 644 "$REPO_ROOT/templates/init-memory.md" "$OC_DIR/commands/init-memory.md"
echo "[4/5] Command    -> $OC_DIR/commands/init-memory.md"

# 5. Plugin dependency ------------------------------------------------------
#
# The plugin only uses `import type` from @opencode-ai/plugin (erased at
# runtime by Bun) plus node: built-ins, so it works without the package
# installed. We still ensure it is present so editors / type-checking resolve
# the types.
PKG_FILE="$OC_DIR/package.json"
NEED_INSTALL=0
if [ ! -f "$PKG_FILE" ]; then
  echo '{"dependencies":{"@opencode-ai/plugin":"latest"}}' > "$PKG_FILE"
  NEED_INSTALL=1
elif ! grep -q '"@opencode-ai/plugin"' "$PKG_FILE"; then
  echo "[5/5] Note: @opencode-ai/plugin not found in $PKG_FILE — types only"
  echo "       The plugin will still run (types are erased). To get editor"
  echo "       type-checking, add \"@opencode-ai/plugin\" to dependencies."
  echo "[5/5] Dependency -> optional, skipped"
  NEED_INSTALL=0
else
  echo "[5/5] Dependency -> @opencode-ai/plugin already present"
  NEED_INSTALL=0
fi

if [ "$NEED_INSTALL" -eq 1 ]; then
  echo "       Running opencode to install plugin types…"
  echo "       (opencode auto-installs on next launch — just restart it)"
fi

echo ""
echo "Done. Restart opencode for the changes to take effect."
echo ""
echo "Next steps:"
echo "  • Open any project and run  /init-memory  to scaffold project memory"
echo "  • Say  \"reorganize memory\"  to tidy up notes the agent has accumulated"
echo "  • Edit  $OC_DIR/memory/memory.md  to curate your global index"
