# Architecture

How ocmem adapts John Conneely's [Claude Code memory
system](https://www.youngleaders.tech/p/how-i-finally-sorted-my-claude-code-memory)
to opencode.

## The original (Claude Code)

| Concern | Claude Code |
|---|---|
| Config home | `~/.claude/` |
| Instructions file | `CLAUDE.md` |
| Per-project memory | `~/.claude/projects/{mapped-path}/memory/MEMORY.md` |
| Hook mechanism | `PreToolUse` hook in `settings.json` running a bash → Python script |
| Context injection | hook emits JSON with `additionalContext` on the first tool call of a session |
| Session id in hooks | `os.getppid()` (a flag file in `/tmp/`) |

## The adaptation (opencode)

| Concern | opencode |
|---|---|
| Config home | `~/.config/opencode/` |
| Instructions file | `AGENTS.md` |
| Per-project memory | `MEMORY.md` at the repo root (version-controllable) |
| Hook mechanism | TypeScript plugin auto-loaded from `~/.config/opencode/plugins/` |
| Context injection | `experimental.chat.system.transform` hook pushes into `output.system` |
| Session id | the plugin receives `sessionID` in hook input — no flag file needed |

### Why `experimental.chat.system.transform`?

The original used a `PreToolUse` hook that fired **once** per session (gated by a
`/tmp/` flag file) and emitted the memory as `additionalContext`. opencode's
equivalent tool hook (`tool.execute.before`) can only mutate tool arguments — it
cannot inject conversation context.

The right hook for injecting context is `experimental.chat.system.transform`,
which receives `output: { system: string[] }`. Pushing onto that array adds to
the system prompt sent with **every** LLM call. Three useful properties fall out
of that for free:

1. **Always present.** No "first tool call" detection or flag file needed — the
   memory is in the system prompt from the very first response.
2. **Covers subagents.** Each subagent (opencode's `task` tool) gets its own
   LLM call, so the system transform fires for it too — subagents inherit the
   memory automatically. This is exactly what the original worked around with
   `os.getppid()`.
3. **Survives compaction.** The system prompt is never summarised away, so the
   memory persists across context compaction without any extra machinery.

A second hook, `experimental.session.compacting`, pushes the same context into
the compaction summary as a belt-and-suspenders backup (harmless redundancy).

### Why the project memory lives in the repo

Claude Code stashed per-project memory under `~/.claude/projects/{mapped-path}/`
— a path derived by replacing slashes with hyphens. opencode has a cleaner
convention: project-local config lives in `.opencode/` inside the repo. So
project memory is `MEMORY.md` at the repo root.

This means:

- It is **version-controllable** — commit it so the whole team shares context.
- It is **discoverable** — no hidden global state keyed on a mangled path.
- It **travels with the code** — clone the repo, get the memory.

Global memory (cross-project tools, domain knowledge, conventions) still lives
at `~/.config/opencode/memory/` and is shared across every project.

## The two layers

```
┌─────────────────────────────────────────────────────────────┐
│  AGENTS.md  (instructions — loaded once per session)        │
│  • memory management rules                                   │
│  • auto-init instructions                                    │
│  • domain lifecycle                                          │
└─────────────────────────────────────────────────────────────┘
              │  tells the agent HOW to use memory
              ▼
┌─────────────────────────────────────────────────────────────┐
│  ocmem plugin  (context injection — every LLM call)         │
│  • reads ~/.config/opencode/memory/memory.md   (global idx) │
│  • reads MEMORY.md                       (project, at repo root)         │
│  • pushes both into output.system                            │
│  • mtime-cached so it's ~free after the first call          │
└─────────────────────────────────────────────────────────────┘
              │  ensures memory is ALWAYS in context
              ▼
┌─────────────────────────────────────────────────────────────┐
│  Memory files (the knowledge itself)                        │
│  ~/.config/opencode/memory/                                  │
│    ├── memory.md   (index)                                   │
│    ├── general.md  (cross-project)                          │
│    ├── tools/{tool}.md                                       │
│    └── domain/{topic}.md                                     │
│  MEMORY.md                                (project-specific, at repo root)    │
└─────────────────────────────────────────────────────────────┘
```

**Layer 1 (AGENTS.md)** teaches the agent the *rules*: where to write, what
format to use, when to ask before changing things, how to reorganise.

**Layer 2 (the plugin)** is the *safety net*: even if the agent forgets to read
memory at session start, the plugin has already injected it. This is the direct
analogue of the blog's PreToolUse hook.

## Caching

The plugin rebuilds the injection on every LLM call, but it caches the result
and invalidates only when a tracked file's mtime changes. After the first call
the cost is two `statSync` calls — sub-millisecond. When the agent writes a new
memory entry mid-session, the next LLM call picks it up automatically.
