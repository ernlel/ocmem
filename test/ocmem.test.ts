import { describe, it, expect, afterEach } from "vitest"
import { mkdirSync, writeFileSync, rmSync, existsSync, statSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import {
  readTruncated,
  signature,
  checkOrphanedFiles,
  buildMemoryContext,
  MAX_PROJECT_LINES,
  MAX_INDEX_LINES,
} from "../plugin/ocmem.ts"

const tmpRoot = join(tmpdir(), "ocmem-test-" + process.pid)

function tmpdirCreate(...subdirs: string[]): string {
  const dir = join(tmpRoot, String(Math.random()).slice(2))
  mkdirSync(dir, { recursive: true })
  for (const s of subdirs) {
    mkdirSync(join(dir, s), { recursive: true })
  }
  return dir
}

function cleanup() {
  if (existsSync(tmpRoot)) {
    rmSync(tmpRoot, { recursive: true, force: true })
  }
}

afterEach(cleanup)

describe("readTruncated", () => {
  it("returns null for non-existent file", () => {
    expect(readTruncated("/no/such/file.md", 10)).toBeNull()
  })

  it("returns null for empty file", () => {
    const dir = tmpdirCreate()
    const f = join(dir, "empty.md")
    writeFileSync(f, "")
    expect(readTruncated(f, 10)).toBeNull()
  })

  it("returns null for whitespace-only file", () => {
    const dir = tmpdirCreate()
    const f = join(dir, "ws.md")
    writeFileSync(f, "   \n  \t\n")
    expect(readTruncated(f, 10)).toBeNull()
  })

  it("returns full content when under maxLines", () => {
    const dir = tmpdirCreate()
    const f = join(dir, "short.md")
    writeFileSync(f, "line one\nline two\nline three")
    const result = readTruncated(f, 10)
    expect(result).toBe("line one\nline two\nline three")
  })

  it("returns exactly maxLines lines and truncation notice when over limit", () => {
    const dir = tmpdirCreate()
    const f = join(dir, "long.md")
    const lines = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`)
    writeFileSync(f, lines.join("\n"))
    const result = readTruncated(f, 5)
    expect(result).not.toBeNull()
    const resultLines = result!.split("\n")
    expect(resultLines[0]).toBe("line 1")
    expect(resultLines[4]).toBe("line 5")
    expect(result).toContain("…(truncated)")
  })

  it("does not add truncated notice when exactly at maxLines", () => {
    const dir = tmpdirCreate()
    const f = join(dir, "exact.md")
    const lines = Array.from({ length: 5 }, (_, i) => `line ${i + 1}`)
    writeFileSync(f, lines.join("\n"))
    const result = readTruncated(f, 5)
    expect(result).not.toContain("…(truncated)")
    expect(result!.split("\n").length).toBe(5)
  })

  it("handles files with MAX_PROJECT_LINES and MAX_INDEX_LINES constants", () => {
    const dir = tmpdirCreate()
    const f = join(dir, "medium.md")
    const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`)
    writeFileSync(f, lines.join("\n"))

    expect(readTruncated(f, MAX_PROJECT_LINES)).not.toContain("…(truncated)")
    expect(readTruncated(f, MAX_INDEX_LINES)).not.toContain("…(truncated)")
  })

  it("trims trailing whitespace from the returned text", () => {
    const dir = tmpdirCreate()
    const f = join(dir, "trailing.md")
    writeFileSync(f, "hello\n\n  \n")
    const result = readTruncated(f, 10)
    expect(result).toBe("hello")
  })
})

describe("signature", () => {
  it("returns empty string for empty path list", () => {
    expect(signature([])).toBe("")
  })

  it("returns empty string when no files exist", () => {
    expect(signature(["/no/such/file.a", "/no/such/file.b"])).toBe("")
  })

  it("returns mtime-based signature for existing files", () => {
    const dir = tmpdirCreate()
    const a = join(dir, "a.md")
    const b = join(dir, "b.md")
    writeFileSync(a, "hello")
    writeFileSync(b, "world")

    const sig = signature([a, b])
    expect(sig).toContain(`${a}:`)
    expect(sig).toContain(`${b}:`)
    expect(sig).toContain(";")
  })

  it("skips non-existent files in the list", () => {
    const dir = tmpdirCreate()
    const a = join(dir, "a.md")
    writeFileSync(a, "hello")

    const sig = signature([a, "/no/such/file.md"])
    expect(sig).toContain(`${a}:`)
    expect(sig).not.toContain("no/such")
  })

  it("produces the same signature for unchanged files", () => {
    const dir = tmpdirCreate()
    const a = join(dir, "a.md")
    writeFileSync(a, "hello")

    const sig1 = signature([a])
    const sig2 = signature([a])
    expect(sig1).toBe(sig2)
  })

  it("produces different signature after file modification", async () => {
    const dir = tmpdirCreate()
    const a = join(dir, "a.md")
    writeFileSync(a, "hello")

    const sig1 = signature([a])

    await new Promise((r) => setTimeout(r, 10))
    writeFileSync(a, "world")

    const sig2 = signature([a])
    expect(sig1).not.toBe(sig2)
  })
})

describe("readTruncated — MAX_CHARS truncation", () => {
  it("truncates single overlong line at MAX_CHARS boundary", () => {
    const dir = tmpdirCreate()
    const f = join(dir, "huge.md")
    const long = "x".repeat(9000)
    writeFileSync(f, long)
    const result = readTruncated(f, 10)
    expect(result).not.toBeNull()
    expect(result!.length).toBeLessThanOrEqual(8000 + 14) // "…(truncated)" added
    expect(result).toContain("…(truncated)")
  })

  it("truncates many-lines content exceeding MAX_CHARS", () => {
    const dir = tmpdirCreate()
    const f = join(dir, "many.md")
    // 100 lines of 100 chars each = 10000 chars
    const lines = Array.from({ length: 100 }, (_, i) => `line ${String(i).padStart(4, "0")} — ${"x".repeat(80)}`)
    writeFileSync(f, lines.join("\n"))
    const result = readTruncated(f, 200)
    expect(result).not.toBeNull()
    expect(result!.length).toBeLessThanOrEqual(8000 + 14)
  })

  it("does not apply MAX_CHARS when content is under limit", () => {
    const dir = tmpdirCreate()
    const f = join(dir, "small.md")
    writeFileSync(f, "hello world")
    const result = readTruncated(f, 10)
    expect(result).toBe("hello world")
  })
})

describe("checkOrphanedFiles", () => {
  it("returns null when tools/ and domain/ are empty", () => {
    const dir = tmpdirCreate("tools", "domain")
    expect(checkOrphanedFiles(dir, "tools/foo.md")) // foo.md referenced but doesn't exist
    .toBeNull()
  })

  it("returns null when all .md files are referenced in the index", () => {
    const dir = tmpdirCreate("tools", "domain")
    writeFileSync(join(dir, "tools", "git.md"), "# Git")
    writeFileSync(join(dir, "domain", "db.md"), "# DB")
    const index = "| tools/git.md | desc |\n| domain/db.md | desc |"
    expect(checkOrphanedFiles(dir, index)).toBeNull()
  })

  it("detects orphaned .md files not in the index", () => {
    const dir = tmpdirCreate("tools", "domain")
    writeFileSync(join(dir, "tools", "git.md"), "# Git")
    writeFileSync(join(dir, "tools", "docker.md"), "# Docker")
    const index = "| tools/git.md | desc |"
    const result = checkOrphanedFiles(dir, index)
    expect(result).toContain("Orphaned Memory Files")
    expect(result).toContain("tools/docker.md")
    expect(result).not.toContain("tools/git.md")
  })

  it("returns null when tools/ and domain/ dirs do not exist", () => {
    const dir = tmpdirCreate()
    // No tools/ or domain/ created
    expect(checkOrphanedFiles(dir, "")).toBeNull()
  })

  it("ignores non-.md files in tools/ and domain/", () => {
    const dir = tmpdirCreate("tools")
    writeFileSync(join(dir, "tools", "notes.txt"), "text")
    writeFileSync(join(dir, "tools", ".gitkeep"), "")
    expect(checkOrphanedFiles(dir, "")).toBeNull()
  })

  it("detects orphans in domain/ directory", () => {
    const dir = tmpdirCreate("domain")
    writeFileSync(join(dir, "domain", "kubernetes.md"), "# K8s")
    const result = checkOrphanedFiles(dir, "")
    expect(result).toContain("domain/kubernetes.md")
  })
})

describe("buildMemoryContext", () => {
  it("returns empty string when neither project nor global memory exist", () => {
    const dir = tmpdirCreate()
    const result = buildMemoryContext({
      directory: "/fake/project",
      projectMemory: join(dir, "missing.md"),
      globalDir: dir,
      globalIndex: join(dir, "missing.md"),
    })
    expect(result).toBe("")
  })

  it("includes project memory when it exists", () => {
    const dir = tmpdirCreate()
    const pm = join(dir, "MEMORY.md")
    writeFileSync(pm, "# My Project\n\n- 2026-07-07 — uses Go 1.22. — Don't suggest newer features.")
    const result = buildMemoryContext({
      directory: "/fake/project",
      projectMemory: pm,
      globalDir: dir,
      globalIndex: join(dir, "missing.md"),
    })
    expect(result).toContain("Project Memory (/fake/project)")
    expect(result).toContain("uses Go 1.22")
  })

  it("includes global index when it exists", () => {
    const dir = tmpdirCreate()
    const gi = join(dir, "memory.md")
    writeFileSync(gi, "| tools/git.md | Git quirks | 2026-07-06 |")
    const result = buildMemoryContext({
      directory: "/fake/project",
      projectMemory: join(dir, "missing.md"),
      globalDir: dir,
      globalIndex: gi,
    })
    expect(result).toContain("Global Memory Index")
    expect(result).toContain("tools/git.md")
  })

  it("includes both project and global when both exist", () => {
    const dir = tmpdirCreate()
    const pm = join(dir, "MEMORY.md")
    const gi = join(dir, "memory.md")
    writeFileSync(pm, "# Project X")
    writeFileSync(gi, "| tools/foo.md | desc |")
    const result = buildMemoryContext({
      directory: "/x",
      projectMemory: pm,
      globalDir: dir,
      globalIndex: gi,
    })
    expect(result).toContain("Project Memory (/x)")
    expect(result).toContain("Global Memory Index")
    expect(result).toContain("\n\n") // sections separated
  })

  it("includes orphaned file warning when orphans exist", () => {
    const dir = tmpdirCreate("tools")
    writeFileSync(join(dir, "tools", "docker.md"), "# Docker")
    const gi = join(dir, "memory.md")
    writeFileSync(gi, "| tools/git.md | desc |")
    const result = buildMemoryContext({
      directory: "/x",
      projectMemory: join(dir, "nope.md"),
      globalDir: dir,
      globalIndex: gi,
    })
    expect(result).toContain("Orphaned Memory Files")
    expect(result).toContain("tools/docker.md")
  })

  it("does not include orphaned warning when no orphans", () => {
    const dir = tmpdirCreate("tools")
    writeFileSync(join(dir, "tools", "git.md"), "# Git")
    const gi = join(dir, "memory.md")
    writeFileSync(gi, "| tools/git.md | desc |")
    const result = buildMemoryContext({
      directory: "/x",
      projectMemory: join(dir, "nope.md"),
      globalDir: dir,
      globalIndex: gi,
    })
    expect(result).not.toContain("Orphaned")
  })
})
