# Changelog

All notable changes to ocmem.

## 1.1.0 — 2026-07-07

### Added
- `/ocmem-export` command — bundles all memory into a single markdown snapshot.
- Byte-level cap (`MAX_CHARS = 8000`) in the plugin to prevent pathological line lengths from eating the context window.
- Orphaned-file detection: the plugin now scans `tools/` and `domain/` directories and warns when `.md` files exist that are not referenced in the index.
- `--dry-run` / `-n` flag on `install.sh` and `uninstall.sh` — prints every action without modifying anything.
- OpenCode version check in `install.sh` — warns if < v1.17 or if the binary is missing.
- Portable `awk`-based block removal in `uninstall.sh` (was GNU-only `sed -i`).
- Plugin unit tests (`test/ocmem.test.ts` — 14 tests covering `readTruncated` and `signature`) and vitest runner.
- GitHub Actions CI pipeline (`.github/workflows/ci.yml`) running typecheck + tests.
- `package-lock.json` committed to ensure reproducible installs.
- Auto-tagging: CI creates a git tag matching `package.json` version on every push to master.
- `CHANGELOG.md` and `CONTRIBUTING.md` for project governance.
- Prompt-engineering improvements: entry format examples, anti-patterns, tools/ vs domain/ rules, concrete thresholds for reorganize.

### Changed
- `tsconfig.json` updated: uses `npx tsc`, added `@types/node`, set `"types": ["node"]`.
- Paths in the AGENTS.md block are now substituted with the resolved config directory at install time (no more hardcoded `~/.config/opencode/`).
- Plugin error handling: unexpected read/stat errors are now logged to `stderr` instead of being silently swallowed.
- `.gitignore` now includes a note clarifying that users *should* commit their project `MEMORY.md`.
- README fully updated to reflect all features, `--dry-run`, version check, and upgrade path.
- REMINDER text shortened: full reminder on first call, one-liner on subsequent calls.
- Shell scripts install/ocmem-{init,remember,reorganize,export}.md now tracked by uninstaller.
- Entry format tightened with good/bad examples, rule 6 narrowed to factual changes only.

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
