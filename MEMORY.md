# ocmem — Project Memory

## Global Memory

Read `~/.config/opencode/AGENTS.md` for memory rules and the topic-file list.
The ocmem plugin auto-injects the global index and the root `MEMORY.md` into
every response.

## Project Notes

- 2026-07-06 — Three slash commands: `/ocmem-init`, `/ocmem-remember`, `/ocmem-reorganize`. `remember` is interactive (scans session, presents candidates, asks which to record); `reorganize` is full maintenance pass. — Discoverable entry points for the plugin.
- 2026-07-06 — `./scripts/install.sh --force` strips the `<!-- ocmem:begin -->...<!-- ocmem:end -->` block in the user's `AGENTS.md` and re-appends from `templates/AGENTS-memory.md`. Memory data files (memory.md, general.md, tools/*, domain/*) are NEVER touched. — Iteration loop for AGENTS-memory.md changes.
- 2026-07-06 — Legacy `init-memory.md` was renamed to `ocmem-init.md`. After upgrading, `rm ~/.config/opencode/commands/init-memory.md` to clear the stale file. The uninstall script handles this on next `--purge`. — One-time cleanup.
- 2026-07-06 — Full project review in `docs/review.md` (16 issues: tests, portability, CI, token budget). Prompt engineering review in `docs/prompt-review.md` (13 issues: REMINDER repetition, entry format, anti-patterns, rule 6 friction). — Pending user decision on which to implement.
- 2026-07-07 — `package.json` version is the source of truth for releases. CI reads it, creates matching GitHub Release with notes extracted from CHANGELOG.md via awk. — No manual tag management needed.
