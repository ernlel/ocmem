# ocmem — structured memory for opencode

A structured, persistent memory system for [opencode](https://opencode.ai),
adapted from John Conneely's [*How I Finally Sorted My Claude Code
Memory*](https://www.youngleaders.tech/p/how-i-finally-sorted-my-claude-code-memory)
(which itself builds on [Paweł Huryn's
prompt](https://www.productcompass.pm/p/self-improving-claude-system)).

It gives opencode two things:

1. **Memory rules** in `AGENTS.md` — where to write knowledge, what format to
   use, when to ask before changing things, and how to reorganise.
2. **An auto-injection plugin** — a TypeScript plugin that reads your memory
   files and injects them into the system prompt on every response, so the
   agent always has context even if it forgets to read it.

```
~/.config/opencode/memory/          ← global memory (cross-project)
  ├── memory.md                       index of all files
  ├── general.md                      conventions & preferences
  ├── tools/{tool}.md                 tool configs, CLI patterns
  └── domain/{topic}.md               domain knowledge

.opencode/memory/                    ← project memory (per-repo, committable)
  └── MEMORY.md                       project-specific notes
```

---

## Prerequisites

- [opencode](https://opencode.ai) v1.17+ (plugin hooks used here ship in that
  version and later). Check with `opencode --version`.
- That's it. The plugin uses only Node.js built-ins (`node:fs`, `node:path`,
  `node:os`) — no extra runtime or dependencies required.

---

## Quick install

```bash
git clone https://github.com/ernlel/ocmem.git
cd ocmem
./scripts/install.sh
```

Then **restart opencode**. That's it — the plugin is auto-loaded from
`~/.config/opencode/plugins/` and the memory rules are appended to your
`~/.config/opencode/AGENTS.md`.

> The installer never overwrites existing memory files. Run
> `./scripts/install.sh --force` to re-deploy template scaffolding (plugin,
> AGENTS.md block, commands). Memory data is always preserved.
> Use `./scripts/install.sh --dry-run` to preview what would happen without
> making changes.

### What the installer does

| Step | Target |
|------|--------|
| Plugin | `~/.config/opencode/plugins/ocmem.ts` |
| Global memory dir | `~/.config/opencode/memory/` + `memory.md`, `general.md`, `tools/`, `domain/` |
| AGENTS.md patch | memory-management rules appended (between `<!-- ocmem:begin -->` markers, with `$OC_DIR` substituted for the default path) |
| Commands | `~/.config/opencode/commands/ocmem-{init,remember,reorganize,export}.md` |
| Version check | warns if opencode < v1.17 or missing from PATH |
| Dry-run | `--dry-run` / `-n` prints every action without making changes |

---

## Manual install

If you prefer to do it by hand:

```bash
# 1. Plugin
mkdir -p ~/.config/opencode/plugins
cp plugin/ocmem.ts ~/.config/opencode/plugins/ocmem.ts

# 2. Global memory structure
mkdir -p ~/.config/opencode/memory/tools ~/.config/opencode/memory/domain
cp templates/memory.md  ~/.config/opencode/memory/memory.md
cp templates/general.md ~/.config/opencode/memory/general.md

# 3. Commands
mkdir -p ~/.config/opencode/commands
cp templates/ocmem-init.md       ~/.config/opencode/commands/ocmem-init.md
cp templates/ocmem-remember.md   ~/.config/opencode/commands/ocmem-remember.md
cp templates/ocmem-reorganize.md ~/.config/opencode/commands/ocmem-reorganize.md
cp templates/ocmem-export.md     ~/.config/opencode/commands/ocmem-export.md

# 4. AGENTS.md — append the contents of templates/AGENTS-memory.md
cat templates/AGENTS-memory.md >> ~/.config/opencode/AGENTS.md
```

Restart opencode.

---

## Upgrading

```bash
# Re-deploy the plugin, commands, and AGENTS.md block (keeps memory files):
cd ocmem && git pull && ./scripts/install.sh --force
```

This refreshes all scaffolding without touching your memory data
(`memory.md`, `general.md`, `tools/*`, `domain/*`).

ocmem follows [SemVer](https://semver.org/) with git tags
(`v{major}.{minor}.{patch}`):

- **Major** — breaking changes that may require manual migration
- **Minor** — new features, backward compatible
- **Patch** — bug fixes, documentation, prompt refinements

Check [`CHANGELOG.md`](CHANGELOG.md) for what's new between versions.

---

## Usage

### Start working

Open any project in opencode. On the first response the plugin injects:
- A full memory-review reminder
- The global memory index (and warns about any `tools/` or `domain/` files not listed in it)
- The project's `MEMORY.md` (if it exists)

After the first call the reminder is shortened to a one-liner to avoid
repetition and token waste.

### Scaffold project memory

Run the built-in command in any repo:

```
/ocmem-init
```

This creates `.opencode/memory/MEMORY.md` from the template if it doesn't
already exist. (The agent will also auto-create it on first use per the
`AGENTS.md` rules, so this is just a convenience.)

### How memory gets written

As you work, whenever the agent learns something worth remembering it writes it
to the right file — `tools/`, `domain/`, `general.md`, or the project
`MEMORY.md` — and updates the `memory.md` index. Entries follow a simple format:

```
2026-07-02 — The Atlassian CLI requires --no-prompt in CI. — Prevents hangs.
```

To force a review of the current session and pick what to record, run:

```
/ocmem-remember
```

The agent scans the conversation, classifies candidates as global vs project,
checks for duplicates against existing memory, presents a numbered list, and
writes only the entries you confirm.

### Reorganise memory

Over time notes accumulate. Run:

```
/ocmem-reorganize
```

The agent reads all memory files, removes duplicates, merges related entries,
splits overstuffed files, re-sorts by date, updates the index, and shows you a
summary of what changed. Run this in **plan mode** first so you can review
before changes are applied.

### Export memory

Create a single-file snapshot of all memory (global + project):

```
/ocmem-export
```

Writes `ocmem-export-YYYY-MM-DD.md` to the workspace root. Useful for
backups, sharing between machines, or reviewing everything at once.

### Domain → skill lifecycle

When domain knowledge in `~/.config/opencode/memory/domain/{name}/` grows large
enough, promote it into an [opencode skill](https://opencode.ai/docs/skills/).
After promotion the memory file becomes a three-line pointer to the skill; the
knowledge lives in the skill, the memory just says where to find it.

---

## How it works

The plugin hooks into two opencode events:

| Hook | Purpose |
|------|---------|
| `experimental.chat.system.transform` | **Primary.** Pushes memory into `output.system` on every LLM call — for every agent and subagent. Survives compaction (the system prompt is never summarised). |
| `experimental.session.compacting` | **Backup.** Folds memory into the compaction summary so it is never lost when a long session is summarised. |

Because injection lives in the **system prompt** (not a one-shot message), three
things the original needed special handling for come for free:

- **Always present** — no "first tool call" detection or flag file needed.
- **Covers subagents** — each subagent's LLM call triggers the transform, so
  subagents inherit memory automatically.
- **Survives compaction** — the system prompt is re-sent in full after
  compaction, so memory is never summarised away.

File reads are mtime-cached per process: after the first call the overhead is a
handful of `statSync` + `existsSync` calls (sub-millisecond). When the agent
writes a memory entry mid-session, the next call picks it up automatically.

The full memory-review reminder is injected only on the first LLM call; a
one-line shorthand is used on subsequent calls to avoid token waste and prevent
the model from learning to ignore a repetitive block.

The plugin also scans the `tools/` and `domain/` directories for `.md` files
that aren't listed in the `memory.md` index. Orphaned files are invisible to
the agent, so it warns about them so you can update the index.

See [`docs/architecture.md`](docs/architecture.md) for the full design rationale
and a side-by-side comparison with the original Claude Code setup.

---

## Customisation

### Change the injection budget

The plugin injects the first 200 lines of the project `MEMORY.md` and 200 lines
of the global index (with a hard 8000-character cap as a safety net). Edit the
constants at the top of `~/.config/opencode/plugins/ocmem.ts`:

```typescript
export const MAX_PROJECT_LINES = 200
export const MAX_INDEX_LINES = 200
const MAX_CHARS = 8000
```

### Disable the plugin

Rename or remove the file and restart opencode:

```bash
mv ~/.config/opencode/plugins/ocmem.ts ~/.config/opencode/plugins/ocmem.ts.disabled
```

### Use a different config directory

The installer resolves the opencode config dir the same way opencode does —
`${XDG_CONFIG_HOME:-~/.config}/opencode`. Point it elsewhere with
`XDG_CONFIG_HOME` (opencode will look in the same place):

```bash
XDG_CONFIG_HOME=/custom/path ./scripts/install.sh
```

For full control over the exact target directory (bypassing the `/opencode`
suffix), set `OPENCODE_CONFIG_DIR` instead.

### Version-control project memory

Project memory lives in `.opencode/memory/MEMORY.md` — commit it to share
context with your team:

```bash
git add .opencode/memory/MEMORY.md
```

Global memory (`~/.config/opencode/memory/`) is yours; consider a private git
repo for it separately.

---

## Uninstall

```bash
# Remove the plugin and command, KEEP your memory files:
./scripts/uninstall.sh

# Remove everything including memory files and the AGENTS.md patch:
./scripts/uninstall.sh --purge

# Preview what would happen without making changes:
./scripts/uninstall.sh --dry-run
```

Restart opencode.

---

## Project layout

```
ocmem/
├── .github/workflows/
│   └── ci.yml                   # CI pipeline (typecheck + tests)
├── plugin/
│   └── ocmem.ts                 # the opencode plugin (memory injector)
├── templates/
│   ├── AGENTS-memory.md         # memory rules (appended to AGENTS.md)
│   ├── memory.md                # global index template
│   ├── general.md               # global conventions template
│   ├── MEMORY.md                # project memory template
│   ├── ocmem-init.md            # /ocmem-init command template
│   ├── ocmem-remember.md        # /ocmem-remember command template
│   ├── ocmem-reorganize.md      # /ocmem-reorganize command template
│   └── ocmem-export.md          # /ocmem-export command template
├── scripts/
│   ├── install.sh               # one-command installer
│   └── uninstall.sh             # uninstaller (keeps memory by default)
├── test/
│   ├── ocmem.test.ts            # plugin unit tests
│   └── install.test.sh          # install/uninstall integration tests
├── docs/
│   └── architecture.md          # design rationale & Claude Code comparison
├── CHANGELOG.md
├── CONTRIBUTING.md
├── package.json
├── package-lock.json
└── README.md
```

---

## Credits

- **John Conneely** — [*How I Finally Sorted My Claude Code
  Memory*](https://www.youngleaders.tech/p/how-i-finally-sorted-my-claude-code-memory) —
  the structured memory system and the PreToolUse hook this project adapts.
- **Paweł Huryn** — [The Product
  Compass](https://www.productcompass.pm/p/self-improving-claude-system) — the
  original memory-management prompt that started it.

This project is an independent adaptation for opencode and is not affiliated
with either author.

## License

MIT — see [LICENSE](LICENSE).
