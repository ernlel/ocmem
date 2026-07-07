import { describe, it, expect, afterEach } from "vitest"
import { mkdirSync, writeFileSync, rmSync, existsSync, statSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { readTruncated, signature, MAX_PROJECT_LINES, MAX_INDEX_LINES } from "../plugin/ocmem.ts"

const tmpRoot = join(tmpdir(), "ocmem-test-" + process.pid)

function tmpdirCreate(): string {
  const dir = join(tmpRoot, String(Math.random()).slice(2))
  mkdirSync(dir, { recursive: true })
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
