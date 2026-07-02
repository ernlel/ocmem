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

### Rules

1. When you learn something worth remembering, write it to the right file immediately
2. Keep `memory.md` as a current index with one-line descriptions
3. Entries: date, what, why — nothing more
4. The `ocmem` plugin injects `memory.md` and the project `MEMORY.md` automatically. Load other topic files only when relevant
5. If a file does not exist yet, create it
6. Before removing or modifying any existing memory entry, ask the user to confirm — show the current content and the proposed change

### Maintenance

When the user says "reorganize memory":

1. Read all memory files
2. Remove duplicates and outdated entries
3. Merge entries that belong together
4. Split files that cover too many topics
5. Re-sort entries by date within each file
6. Update `memory.md` index
7. Show a summary of what changed

## Project Memory Auto-Init

At session start in any project, check for `.opencode/memory/MEMORY.md`. If it
does not exist, create it using the project memory template (see
`/init-memory`). The first time you open a new project the scaffolding is
created automatically; after that, fill it in as you go.

## Global Memory Reference

Project `MEMORY.md` files must contain a short `## Global Memory` pointer near
the top — never duplicate the topic-file list into project memory. The list
lives here (in `AGENTS.md`) as the single source of truth. Project `MEMORY.md`
has a 200-line budget (that is what the plugin injects) — use it for project
knowledge, not boilerplate.

## Domain Knowledge Lifecycle

1. **Staging** — knowledge accumulates in `~/.config/opencode/memory/domain/{name}/`
2. **Promotion** — once enough knowledge exists, package it as an opencode skill
3. **Pointer** — after promotion, the memory file becomes a pointer to the skill; the content lives in the skill

When an update is needed to a promoted domain, note it in the memory file so an
issue can be created on the skill repo.
