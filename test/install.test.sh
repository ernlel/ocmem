#!/usr/bin/env bash
#
# Integration test for ocmem install/uninstall scripts.
# Creates a fake HOME, runs install and uninstall, verifies state at each step.
#
# Usage: bash test/install.test.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INSTALL_SCRIPT="$REPO_ROOT/scripts/install.sh"
UNINSTALL_SCRIPT="$REPO_ROOT/scripts/uninstall.sh"

PASS=0
FAIL=0
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

export HOME="$TMP/home"
export XDG_CONFIG_HOME="$HOME/.config"
export OPENCODE_CONFIG_DIR=""
mkdir -p "$XDG_CONFIG_HOME/opencode"
OC_DIR="$XDG_CONFIG_HOME/opencode"

assert_file() {
  local path="$1" label="${2:-}"
  if [ -f "$path" ]; then
    echo "  PASS: $label ($path)"
    ((PASS++)) || true
  else
    echo "  FAIL: $label — expected file not found: $path" >&2
    ((FAIL++)) || true
  fi
}

assert_no_file() {
  local path="$1" label="${2:-}"
  if [ ! -f "$path" ]; then
    echo "  PASS: $label"
    ((PASS++)) || true
  else
    echo "  FAIL: $label — file should not exist: $path" >&2
    ((FAIL++)) || true
  fi
}

assert_dir() {
  local path="$1" label="${2:-}"
  if [ -d "$path" ]; then
    echo "  PASS: $label ($path)"
    ((PASS++)) || true
  else
    echo "  FAIL: $label — expected dir not found: $path" >&2
    ((FAIL++)) || true
  fi
}

assert_no_dir() {
  local path="$1" label="${2:-}"
  if [ ! -d "$path" ]; then
    echo "  PASS: $label"
    ((PASS++)) || true
  else
    echo "  FAIL: $label — dir should not exist: $path" >&2
    ((FAIL++)) || true
  fi
}

assert_grep() {
  local file="$1" pattern="$2" label="${3:-}"
  if grep -qF "$pattern" "$file"; then
    echo "  PASS: $label"
    ((PASS++)) || true
  else
    echo "  FAIL: $label — pattern '$pattern' not found in $file" >&2
    ((FAIL++)) || true
  fi
}

assert_no_grep() {
  local file="$1" pattern="$2" label="${3:-}"
  if ! grep -qF "$pattern" "$file"; then
    echo "  PASS: $label"
    ((PASS++)) || true
  else
    echo "  FAIL: $label — pattern '$pattern' found in $file" >&2
    ((FAIL++)) || true
  fi
}

# Helper: run a command and check stdout contains a pattern
run_and_grep() {
  local pattern="$1" label="$2"
  shift 2
  local output
  output="$("$@" 2>&1)" || true
  if echo "$output" | grep -qF "$pattern"; then
    echo "  PASS: $label"
    ((PASS++)) || true
  else
    echo "  FAIL: $label — pattern '$pattern' not in output" >&2
    ((FAIL++)) || true
  fi
}

# ── Test 1: Fresh install ──────────────────────────────────────────────
echo ""
echo "=== Test 1: Fresh install ==="
bash "$INSTALL_SCRIPT" > /dev/null
assert_file "$OC_DIR/plugins/ocmem.ts" "plugin installed"
assert_file "$OC_DIR/memory/memory.md" "global index created"
assert_file "$OC_DIR/memory/general.md" "general.md created"
assert_dir "$OC_DIR/memory/tools" "tools dir created"
assert_dir "$OC_DIR/memory/domain" "domain dir created"
assert_file "$OC_DIR/commands/ocmem-init.md" "ocmem-init command"
assert_file "$OC_DIR/commands/ocmem-remember.md" "ocmem-remember command"
assert_file "$OC_DIR/commands/ocmem-reorganize.md" "ocmem-reorganize command"
assert_file "$OC_DIR/commands/ocmem-export.md" "ocmem-export command"
assert_file "$OC_DIR/AGENTS.md" "AGENTS.md exists"
assert_grep "$OC_DIR/AGENTS.md" "<!-- ocmem:begin -->" "AGENTS.md has ocmem block"

# ── Test 2: Idempotent install ─────────────────────────────────────────
echo ""
echo "=== Test 2: Idempotent install ==="
run_and_grep "already patched" "idempotent install" bash "$INSTALL_SCRIPT"

# ── Test 3: --force re-deploys, preserves pre-existing content ─────────
echo ""
echo "=== Test 3: --force ==="
tmp_agents="$OC_DIR/AGENTS.md.bak"
cp "$OC_DIR/AGENTS.md" "$tmp_agents"
echo "# Pre content" > "$OC_DIR/AGENTS.md"
cat "$tmp_agents" >> "$OC_DIR/AGENTS.md"
rm "$tmp_agents"
bash "$INSTALL_SCRIPT" --force > /dev/null
assert_grep "$OC_DIR/AGENTS.md" "Pre content" "pre content survived --force"
assert_grep "$OC_DIR/AGENTS.md" "<!-- ocmem:begin -->" "ocmem block present after --force"

# ── Test 4: --dry-run prints actions, does NOT modify ──────────────────
echo ""
echo "=== Test 4: --dry-run ==="
rm -f "$OC_DIR/plugins/ocmem.ts"
run_and_grep "[dry-run]" "dry-run prints messages" bash "$INSTALL_SCRIPT" --dry-run
assert_no_file "$OC_DIR/plugins/ocmem.ts" "plugin still missing after dry-run"

# ── Test 5: Uninstall (keep memory) ────────────────────────────────────
echo ""
echo "=== Test 5: Uninstall (keep memory) ==="
bash "$INSTALL_SCRIPT" > /dev/null
bash "$UNINSTALL_SCRIPT" > /dev/null
assert_no_file "$OC_DIR/plugins/ocmem.ts" "plugin removed"
assert_no_file "$OC_DIR/commands/ocmem-init.md" "commands removed"
assert_dir "$OC_DIR/memory" "memory dir preserved"
assert_file "$OC_DIR/memory/general.md" "general.md preserved"
assert_grep "$OC_DIR/AGENTS.md" "Pre content" "AGENTS.md pre content still there"
assert_grep "$OC_DIR/AGENTS.md" "<!-- ocmem:begin -->" "AGENTS.md ocmem block still there"

# ── Test 6: Uninstall --purge ──────────────────────────────────────────
echo ""
echo "=== Test 6: Uninstall --purge ==="
bash "$INSTALL_SCRIPT" > /dev/null
bash "$UNINSTALL_SCRIPT" --purge > /dev/null
assert_no_file "$OC_DIR/plugins/ocmem.ts" "plugin removed (purge)"
assert_no_dir "$OC_DIR/memory" "memory dir removed (purge)"
assert_grep "$OC_DIR/AGENTS.md" "Pre content" "pre content survived purge"
assert_no_grep "$OC_DIR/AGENTS.md" "<!-- ocmem:begin -->" "ocmem block stripped"

# ── Test 7: Uninstall --dry-run does not modify ────────────────────────
echo ""
echo "=== Test 7: Uninstall --dry-run ==="
bash "$INSTALL_SCRIPT" > /dev/null
run_and_grep "[dry-run]" "uninstall dry-run prints messages" bash "$UNINSTALL_SCRIPT" --dry-run
assert_file "$OC_DIR/plugins/ocmem.ts" "plugin still present after dry-run uninstall"

# ── Test 8: Fresh AGENTS.md gets ocmem block appended ──────────────────
echo ""
echo "=== Test 8: Fresh AGENTS.md ==="
echo "# Clean AGENTS.md" > "$OC_DIR/AGENTS.md"
bash "$INSTALL_SCRIPT" > /dev/null
assert_grep "$OC_DIR/AGENTS.md" "<!-- ocmem:begin -->" "AGENTS.md patched"
assert_grep "$OC_DIR/AGENTS.md" "# Clean AGENTS.md" "pre content preserved"

# ── Result ─────────────────────────────────────────────────────────────
echo ""
echo "========================================="
echo "Results: $PASS passed, $FAIL failed"
echo "========================================="

[ "$FAIL" -eq 0 ] || exit 1
