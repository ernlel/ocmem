## Memory Management

Maintain a structured, persistent memory system with two roots:

- **Global** — `~/.config/opencode/memory/` (cross-project knowledge)
- **Project** — `.opencode/memory/` within the current repo (project-specific knowledge)

The `ocmem` plugin auto-injects the global index and the current project's
`MEMORY.md` into every response, so you do not need to read them manually at
session start. Load individual topic files only when they are relevant to the
work at hand.

### Structure

Global (`~/.config/opencode/memory/`):

- `memory.md` — index of all global memory files; update it whenever you create or modify a file
- `general.md` — cross-project facts, preferences, environment setup
- `tools/{tool}.md` — tool configs, CLI patterns, workarounds (one file per tool)
- `domain/{topic}.md` — domain-specific knowledge (one file per topic)

Project (`.opencode/memory/`):

- `MEMORY.md` — project-specific notes: active work, codebase patterns, decisions

#### Tools vs Domain

If the fact is about **how to use a specific tool/CLI**, it goes in `tools/`.
If it's about **how a domain concept works** regardless of tool, it goes in
`domain/`. When in doubt, prefer `tools/` — it's more discoverable.

### Entry Format

Every entry follows this format:

```
YYYY-MM-DD — one-sentence fact — one-sentence reason it matters
```

**Good entries:**
- `2026-07-06 — git credential helper ignores nix-installed gh (hardcodes /usr/bin/gh). — Use system gh or patch credential helper path.`
- `2026-07-06 — This repo uses mise for task running; tasks are in mise.toml. — Don't look for Makefile or package.json scripts.`

**Bad entries (avoid these):**
- `2026-07-06 — fixed the thing with git — it works now` (too vague — no one can use this)
- `2026-07-06 — spent 2 hours debugging the deployment pipeline and found that the kubernetes namespace was wrong in the staging config file under deploy/staging/values.yaml line 42` (too long — burying the insight in narration)

### Rules

1. Write to memory immediately when ANY of these happen:
   - You discover a tool/config quirk you had to debug (not in docs)
   - You find a pattern that would help in any future project
   - You make a non-obvious design decision and its rationale
   - You learn a project convention, dependency, or constraint
   Do NOT wait for the user to ask. If in doubt, write it — over-recording is cheap, re-discovering is expensive.
2. Keep `memory.md` as a current index with one-line descriptions
3. Entries MUST follow the format above (YYYY-MM-DD, one-sentence fact, one-sentence reason)
4. The `ocmem` plugin injects `memory.md` and the project `MEMORY.md` automatically. Load other topic files only when relevant
5. If a file does not exist yet, create it
6. Before **removing** a memory entry or **changing its factual content**, ask the user to confirm — show the current content and the proposed change. Formatting, reorganisation, and index updates do not require confirmation.
7. If you discover an existing memory entry is wrong or outdated, note the conflict and propose an update. Never silently leave contradictory entries.

### What NOT to Record

Do NOT record:
- Things documented in the project's own README or official tool docs
- One-off debugging steps (only record the reusable insight)
- Facts obvious from reading package.json, tsconfig.json, etc.
- Session-specific context that won't matter next time

### Memory Review

The plugin injects a memory review reminder on every call. Follow it.

### Maintenance

Use the `/ocmem-reorganize` command. It handles dedupe, merge, split,
re-sort, and index refresh.

## Project Memory Auto-Init

At session start in any project, check for `.opencode/memory/MEMORY.md`. If it
does not exist, create it using the project memory template (see
`/ocmem-init`). The first time you open a new project the scaffolding is
created automatically; after that, fill it in as you go.

## Global Memory Reference

Project `MEMORY.md` files must contain a short `## Global Memory` pointer near
the top — never duplicate the topic-file list into project memory. The list
lives here (in `AGENTS.md`) as the single source of truth. Project `MEMORY.md`
has a 200-line budget (that is what the plugin injects) — use it for project
knowledge, not boilerplate.

## Domain Knowledge Lifecycle

1. **Staging** — knowledge accumulates in `~/.config/opencode/memory/domain/{name}/`
2. **Promotion** — when a domain file reaches 10+ entries or 50+ lines, package it as an opencode skill
3. **Pointer** — after promotion, the memory file becomes a pointer to the skill; the content lives in the skill

When an update is needed to a promoted domain, note it in the memory file so an
issue can be created on the skill repo.
