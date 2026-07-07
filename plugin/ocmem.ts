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
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

/** Maximum number of lines injected from the project MEMORY.md. */
export const MAX_PROJECT_LINES = 200

/** Maximum number of lines injected from the global index. */
export const MAX_INDEX_LINES = 200

/** Maximum characters injected per file (safety net for pathological line lengths). */
const MAX_CHARS = 8000

/** Marker prepended to every injected block so the model can recognise it. */
const MARKER = "ocmem"

/**
 * Full memory-review reminder — injected on the first LLM call only.
 * After the first call, a shorter one-liner is used to avoid token waste
 * and habituation (models learn to ignore identically repeated text).
 */
const FULL_REMINDER = `=== ${MARKER}: Memory Review Required ===
Before ending any task that involved debugging, configuration, or learning,
do a final memory scan:
  1. Did I learn anything cross-project? → ~/.config/opencode/memory/tools/ or domain/
  2. Did I learn anything about THIS project? → .opencode/memory/MEMORY.md
  3. Update the index in memory.md for any new files
If the answer to all three is "no", say so briefly. Do NOT wait for the user
to prompt — over-recording is cheap, re-discovering is expensive.`

/** Short one-liner — injected on every call after the first. */
const REMINDER = `=== ${MARKER}: Review memory before ending this task.`

export function readTruncated(filePath: string, maxLines: number): string | null {
  if (!existsSync(filePath)) return null
  try {
    const text = readFileSync(filePath, "utf-8").trim()
    if (!text) return null
    const lines = text.split("\n")
    let result: string
    if (lines.length <= maxLines) {
      result = text
    } else {
      result = lines.slice(0, maxLines).join("\n") + "\n\n…(truncated)"
    }
    if (result.length > MAX_CHARS) {
      result = result.slice(0, MAX_CHARS) + "\n\n…(truncated)"
    }
    return result
  } catch (e) {
    console.error(`ocmem: failed to read ${filePath}: ${e}`)
    return null
  }
}

/** Build a cheap cache key from the mtimes of the relevant files. */
export function signature(paths: string[]): string {
  let sig = ""
  for (const p of paths) {
    if (!existsSync(p)) continue
    try {
      sig += `${p}:${statSync(p).mtimeMs};`
    } catch (e) {
      console.error(`ocmem: failed to stat ${p}: ${e}`)
    }
  }
  return sig
}

/**
 * Scan the tools/ and domain/ directories for .md files that are not
 * referenced in the index. Orphaned files are invisible to the agent
 * until they are added to memory.md — this warning surfaces them.
 */
function checkOrphanedFiles(globalDir: string, indexContent: string): string | null {
  const rels: string[] = []
  for (const sub of ["tools", "domain"]) {
    const dir = join(globalDir, sub)
    if (!existsSync(dir)) continue
    try {
      for (const f of readdirSync(dir)) {
        if (!f.endsWith(".md")) continue
        const rel = `${sub}/${f}`
        if (!indexContent.includes(rel)) {
          rels.push(rel)
        }
      }
    } catch {
      /* directory listing may fail — not critical enough to crash */
    }
  }
  if (rels.length === 0) return null
  return `=== ${MARKER}: Orphaned Memory Files ===\nThe following files exist in the memory directory but are not listed in the index. Consider updating memory.md to reference them:\n${rels.map((r) => `  - ${r}`).join("\n")}`
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

  // First-call tracking — inject the full reminder only once to avoid token
  // waste and the habituation effect (models learn to skip repeated text).
  let firstCallDone = false

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
      const orphaned = checkOrphanedFiles(globalDir, global)
      if (orphaned) parts.push(orphaned)
    }

    cachedSig = sig
    cachedContext = parts.length > 0 ? parts.join("\n\n") : ""
    return cachedContext
  }

  return {
    // This plugin depends on two opencode hooks that are flagged as
    // experimental and may change in future opencode versions:
    //
    //   experimental.chat.system.transform  (primary — every LLM call)
    //   experimental.session.compacting     (backup  — during summarisation)
    //
    // Minimum opencode version: v1.17 (required for the experimental.*
    // hook namespace). If opencode renames or removes these hooks, the
    // plugin will fail silently — the hooks simply won't fire and memory
    // injection will stop. Check the opencode docs if the plugin stops
    // working after an opencode upgrade.
    //
    // Primary injection — runs on every LLM call, for every agent & subagent.
    "experimental.chat.system.transform": async (_input, output) => {
      if (!firstCallDone) {
        output.system.push(FULL_REMINDER)
        firstCallDone = true
      } else {
        output.system.push(REMINDER)
      }
      const ctx = build()
      if (ctx) output.system.push(ctx)
    },

    // Backup — folds memory into the compaction summary so it is never lost
    // when a long session is summarised. Always uses the short reminder (the
    // full one was already seen on the first call).
    "experimental.session.compacting": async (_input, output) => {
      output.context.push(REMINDER)
      const ctx = build()
      if (ctx) output.context.push(ctx)
    },
  }
}

export default OcmemPlugin
