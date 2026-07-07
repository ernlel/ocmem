---
description: Reorganize all memory files — dedupe, merge, split, re-sort, refresh the index.
agent: build
---

Reorganize the entire memory system. This is a maintenance pass, not a
capture pass.

1. **Read all memory files:**
   - Global: `~/.config/opencode/memory/memory.md` and every file it indexes
     under `tools/` and `domain/`, plus `general.md`
   - Project: `.opencode/memory/MEMORY.md` (if it exists)

2. **Remove duplicates and outdated entries.**
   - If the same fact appears in two files, keep it in the more specific
     one and delete the other.
   - An entry is outdated when a later entry contradicts it, or when it
     references a tool version or API that no longer exists.
   - Before removing any entry, show what you're removing and why.

3. **Merge** entries that describe the same tool or problem from different
   angles (e.g. multiple scattered notes about the same CLI quirk). Combine
   them into one concise entry following the format:
   `YYYY-MM-DD — one-sentence fact — one-sentence reason`.

4. **Split** files when they meet any of these criteria:
   - The file has 3+ unrelated sections (different tools or domain concepts)
   - The file exceeds 30 entries
   Move entries to `tools/x.md` or `domain/y.md` as appropriate.

5. **Re-sort** entries by date within each file (oldest first, newest last).

6. **Refresh the index** in `memory.md` so every existing file has a row with
   a one-line description and last-updated date.

7. **Show a summary** of every change made: files touched, entries added,
   removed, merged, or moved. Do not commit or push — wait for user review.
