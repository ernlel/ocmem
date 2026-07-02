#!/usr/bin/env bash
#
# ocmem uninstaller — removes the ocmem plugin, command, and memory templates.
#
# By default this PRESERVES your memory files (they contain your knowledge).
# Use --purge to also delete the memory directory and the AGENTS.md patch.
#
# Usage:
#   ./scripts/uninstall.sh           # remove plugin/command, keep memory
#   ./scripts/uninstall.sh --purge   # also delete memory + AGENTS.md patch
#
set -euo pipefail

# Resolve the opencode config dir the same way opencode does:
#   ${XDG_CONFIG_HOME:-~/.config}/opencode
OC_DIR="${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}"
PURGE=0

for arg in "$@"; do
  case "$arg" in
    --purge|-p) PURGE=1 ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

echo "ocmem uninstaller"
echo "================="
echo "Config dir: $OC_DIR"
echo ""

rm -f "$OC_DIR/plugins/ocmem.ts" &&      echo "[1] Removed plugin     ($OC_DIR/plugins/ocmem.ts)"       || true
rm -f "$OC_DIR/commands/init-memory.md" && echo "[2] Removed command   ($OC_DIR/commands/init-memory.md)" || true

if [ "$PURGE" -eq 1 ]; then
  echo ""
  echo "--purge: removing memory files and AGENTS.md patch…"

  # Remove the memory directory
  if [ -d "$OC_DIR/memory" ]; then
    rm -rf "$OC_DIR/memory"
    echo "[3] Removed memory dir ($OC_DIR/memory/)"
  fi

  # Strip the ocmem block from AGENTS.md
  AGENTS_FILE="$OC_DIR/AGENTS.md"
  if [ -f "$AGENTS_FILE" ] && grep -qF "<!-- ocmem:begin -->" "$AGENTS_FILE"; then
    # Delete from the begin marker to the end marker inclusive
    sed -i '/<!-- ocmem:begin -->/,/<!-- ocmem:end -->/d' "$AGENTS_FILE"
    # Collapse trailing blank lines
    sed -i -e :a -e '/^\n*$/{$d;N;ba}' "$AGENTS_FILE"
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
