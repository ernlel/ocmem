# Changelog

All notable changes to ocmem.

## Unreleased

### Added
- Byte-level cap (`MAX_CHARS = 8000`) in the plugin to prevent pathological line lengths from eating the context window.
- Orphaned-file detection: the plugin now scans `tools/` and `domain/` directories and warns when `.md` files exist that are not referenced in the index.
- `--dry-run` / `-n` flag on `install.sh` and `uninstall.sh` — prints every action without modifying anything.
- OpenCode version check in `install.sh` — warns if < v1.17 or if the binary is missing.
- Portable `awk`-based block removal in `uninstall.sh` (was GNU-only `sed -i`).
- Plugin unit tests (`test/ocmem.test.ts` — 14 tests covering `readTruncated` and `signature`) and vitest runner.
- GitHub Actions CI pipeline (`.github/workflows/ci.yml`) running typecheck + tests.
- `package-lock.json` committed to ensure reproducible installs.

### Changed
- `tsconfig.json` updated: uses `npx tsc`, added `@types/node`, set `"types": ["node"]`.
- Paths in the AGENTS.md block are now substituted with the resolved config directory at install time (no more hardcoded `~/.config/opencode/`).
- Plugin error handling: unexpected read/stat errors are now logged to `stderr` instead of being silently swallowed.
- `.gitignore` now includes a note clarifying that users *should* commit their `.opencode/memory/MEMORY.md`.

## 1.0.0 — 2026-07-06

### Added
- Structured memory system: global (`~/.config/opencode/memory/`) + project (`.opencode/memory/`) roots.
- `plugin/ocmem.ts` — auto-injects the project `MEMORY.md` and global index into every LLM system prompt via `experimental.chat.system.transform` and `experimental.session.compacting`.
- `scripts/install.sh` — one-command installer with `--force` support (never touches user data).
- `scripts/uninstall.sh` — uninstaller that preserves memory files by default, `--purge` to remove everything.
- `/ocmem-init` command — scaffolds project memory in any repo.
- `/ocmem-remember` command — reviews a session, classifies candidates, checks for duplicates, and writes confirmed entries.
- `/ocmem-reorganize` command — dedupe, merge, split, re-sort, and refresh the global index.
- AGENTS.md memory rules: when to write, entry format, mandatory end-of-task memory review.
- `templates/` directory with scaffolding for memory files, commands, and AGENTS.md rules.
- `docs/architecture.md` — design rationale and Claude Code comparison.
- MIT license.
