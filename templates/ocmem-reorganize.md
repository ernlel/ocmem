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
2. **Remove duplicates and outdated entries.** If the same fact appears in
   two files, keep it in the more specific one and delete the other.
3. **Merge** entries that belong together (e.g. three lines about the same
   tool quirk → one consolidated entry).
4. **Split** files that have grown to cover too many topics (e.g.
   `general.md` with 30+ entries under unrelated headings → move entries
   to `tools/x.md` or `domain/y.md`).
5. **Re-sort** entries by date within each file (oldest first, newest last).
6. **Refresh the index** in `memory.md` so every existing file has a row with
   a one-line description and last-updated date.
7. **Show a summary** of every change made: files touched, entries added,
   removed, merged, or moved. Do not commit or push — wait for user review.
