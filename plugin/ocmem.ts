/**
 * ocmem — structured memory injection for opencode.
 *
 * Adapted from John Conneely's Claude Code memory system
 * (https://www.youngleaders.tech/p/how-i-finally-sorted-my-claude-code-memory)
 * for opencode's plugin architecture.
 *
 * What it does
 * ------------
 * On every LLM call it injects three things into the system prompt:
 *   1. A hard memory-review reminder (enforces the AGENTS.md rule)
 *   2. The current project's `.opencode/memory/MEMORY.md` (first 200 lines)
 *   3. The global `~/.config/opencode/memory/memory.md` index
 *
 * Because the injection lives in the system prompt it is present for every
 * response — including subagent sessions (each gets its own LLM call) and it
 * survives context compaction (the system prompt is never summarised away).
 * A `experimental.session.compacting` hook is wired up as a belt-and-suspenders
 * backup so the memory is also folded into the compaction summary.
 *
 * File reads are cached per-process and invalidated by mtime, so the overhead
 * after the first call is a couple of `statSync` calls (~sub-millisecond).
 */
import type { Plugin } from "@opencode-ai/plugin"
import { existsSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

/** Maximum number of lines injected from the project MEMORY.md. */
const MAX_PROJECT_LINES = 200

/** Maximum number of lines injected from the global index. */
const MAX_INDEX_LINES = 200

/** Marker prepended to every injected block so the model can recognise it. */
const MARKER = "ocmem"

/**
 * Hard reminder injected into every LLM call's system prompt. Lives in the
 * plugin (not just AGENTS.md) so the agent cannot fail to see it — system
 * prompts are never summarised away and survive compaction. The agent still
 * has to choose to act on it, but ignoring it is now an active decision, not
 * an oversight.
 */
const REMINDER = `=== ${MARKER}: Memory Review Required ===
Before ending any task that involved debugging, configuration, or learning,
do a final memory scan:
  1. Did I learn anything cross-project? → ~/.config/opencode/memory/tools/ or domain/
  2. Did I learn anything about THIS project? → .opencode/memory/MEMORY.md
  3. Update the index in memory.md for any new files
If the answer to all three is "no", say so briefly. Do NOT wait for the user
to prompt — over-recording is cheap, re-discovering is expensive.`

function readTruncated(filePath: string, maxLines: number): string | null {
  if (!existsSync(filePath)) return null
  try {
    const text = readFileSync(filePath, "utf-8").trim()
    if (!text) return null
    const lines = text.split("\n")
    if (lines.length <= maxLines) return text
    return lines.slice(0, maxLines).join("\n") + "\n\n…(truncated)"
  } catch {
    return null
  }
}

/** Build a cheap cache key from the mtimes of the relevant files. */
function signature(paths: string[]): string {
  let sig = ""
  for (const p of paths) {
    if (!existsSync(p)) continue
    try {
      sig += `${p}:${statSync(p).mtimeMs};`
    } catch {
      /* ignore stat errors */
    }
  }
  return sig
}

const OcmemPlugin: Plugin = async ({ directory }) => {
  const home = homedir()
  const globalDir = join(home, ".config", "opencode", "memory")
  const globalIndex = join(globalDir, "memory.md")
  const projectMemory = join(directory, ".opencode", "memory", "MEMORY.md")

  // Per-process cache. Invalidated when any tracked file's mtime changes, so
  // writes the agent makes to memory during a session are picked up on the
  // next LLM call without re-reading on every single call.
  let cachedSig = ""
  let cachedContext = ""

  const build = (): string => {
    const sig = signature([globalIndex, projectMemory])
    if (sig === cachedSig && cachedContext) {
      return cachedContext
    }

    const parts: string[] = []

    const project = readTruncated(projectMemory, MAX_PROJECT_LINES)
    if (project) {
      parts.push(
        `=== ${MARKER}: Project Memory (${directory}) ===\n${project}`,
      )
    }

    const global = readTruncated(globalIndex, MAX_INDEX_LINES)
    if (global) {
      parts.push(`=== ${MARKER}: Global Memory Index ===\n${global}`)
    }

    cachedSig = sig
    cachedContext = parts.length > 0 ? parts.join("\n\n") : ""
    return cachedContext
  }

  return {
    // Primary injection — runs on every LLM call, for every agent & subagent.
    "experimental.chat.system.transform": async (_input, output) => {
      output.system.push(REMINDER)
      const ctx = build()
      if (ctx) output.system.push(ctx)
    },

    // Backup — folds memory into the compaction summary so it is never lost
    // when a long session is summarised. (The system-prompt hook above already
    // re-injects after compaction; this is redundant but harmless.)
    "experimental.session.compacting": async (_input, output) => {
      output.context.push(REMINDER)
      const ctx = build()
      if (ctx) output.context.push(ctx)
    },
  }
}

export default OcmemPlugin
