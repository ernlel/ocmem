#!/usr/bin/env bash
#
# ocmem uninstaller — removes the ocmem plugin, command, and memory templates.
#
# By default this PRESERVES your memory files (they contain your knowledge).
# Use --purge to also delete the memory directory and the AGENTS.md patch.
#
# Usage:
#   ./scripts/uninstall.sh            # remove plugin/command, keep memory
#   ./scripts/uninstall.sh --purge    # also delete memory + AGENTS.md patch
#   ./scripts/uninstall.sh --dry-run  # print what would happen without changing anything
#
set -euo pipefail

# Resolve the opencode config dir the same way opencode does:
#   ${XDG_CONFIG_HOME:-~/.config}/opencode
OC_DIR="${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}"
PURGE=0
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --purge|-p) PURGE=1 ;;
    --dry-run|-n) DRY_RUN=1 ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

echo "ocmem uninstaller"
echo "================="
echo "Config dir: $OC_DIR"
if [ "$DRY_RUN" -eq 1 ]; then
  echo "Mode:       DRY RUN (no changes will be made)"
fi
echo ""

maybe() {
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "       [dry-run] $*"
  else
    "$@"
  fi
}

maybe rm -f "$OC_DIR/plugins/ocmem.ts"          && echo "[1] Removed plugin     ($OC_DIR/plugins/ocmem.ts)"            || true
maybe rm -f "$OC_DIR/commands/ocmem-init.md"       && echo "[2a] Removed command  ($OC_DIR/commands/ocmem-init.md)"        || true
maybe rm -f "$OC_DIR/commands/ocmem-remember.md"   && echo "[2b] Removed command  ($OC_DIR/commands/ocmem-remember.md)"    || true
maybe rm -f "$OC_DIR/commands/ocmem-reorganize.md" && echo "[2c] Removed command  ($OC_DIR/commands/ocmem-reorganize.md)"  || true
maybe rm -f "$OC_DIR/commands/ocmem-export.md"     && echo "[2d] Removed command  ($OC_DIR/commands/ocmem-export.md)"      || true
# Backward-compat: remove legacy init-memory.md if it lingers from older installs
maybe rm -f "$OC_DIR/commands/init-memory.md"      && echo "[2e] Removed legacy   ($OC_DIR/commands/init-memory.md)"       || true

if [ "$PURGE" -eq 1 ]; then
  echo ""
  echo "--purge: removing memory files and AGENTS.md patch…"

  # Remove the memory directory
  if [ "$DRY_RUN" -eq 1 ] || [ -d "$OC_DIR/memory" ]; then
    maybe rm -rf "$OC_DIR/memory"
    echo "[3] Removed memory dir ($OC_DIR/memory/)"
  fi

  # Strip the ocmem block from AGENTS.md using awk (portable, unlike sed -i)
  AGENTS_FILE="$OC_DIR/AGENTS.md"
  if [ "$DRY_RUN" -eq 1 ]; then
    if [ -f "$AGENTS_FILE" ] && grep -qF "<!-- ocmem:begin -->" "$AGENTS_FILE" 2>/dev/null; then
      echo "[4] Would strip ocmem block from $AGENTS_FILE"
    fi
  elif [ -f "$AGENTS_FILE" ] && grep -qF "<!-- ocmem:begin -->" "$AGENTS_FILE"; then
    tmp="$(mktemp)"
    awk '
      /<!-- ocmem:begin -->/ { skip = 1; next }
      /<!-- ocmem:end -->/   { skip = 0; next }
      !skip
    ' "$AGENTS_FILE" > "$tmp"
    mv "$tmp" "$AGENTS_FILE"
    echo "[4] Stripped ocmem block from $AGENTS_FILE"
  fi
else
  echo ""
  echo "Memory files PRESERVED at $OC_DIR/memory/"
  echo "AGENTS.md instructions PRESERVED."
  echo "Re-install with ./scripts/install.sh to reactivate."
fi

echo ""
echo "Done. Restart opencode for the changes to take effect."
