---
description: Export all memory files into a single markdown bundle for backup or review.
agent: build
---

Bundle every memory file into a single markdown document. Useful for
backing up before a system migration, sharing memory between machines,
or reviewing all accumulated knowledge in one place.

Steps:

1. **Read the global index.** Load `~/.config/opencode/memory/memory.md`
   to discover all registered files.

2. **Read every indexed file.** For each row in the index table, read the
   corresponding file under `tools/` and `domain/`, plus `general.md`.
   If a file is listed in the index but does not exist, note it as a
   broken reference.

3. **Read the project memory** if `.opencode/memory/MEMORY.md` exists.

4. **Assemble a single markdown document** with this structure:

   ```
   # ocmem Export — YYYY-MM-DD

   ## Project Memory
   (content of .opencode/memory/MEMORY.md, or "No project memory.")

   ## Global Memory Index
   (content of memory.md)

   ## Tools
   (each tools/*.md file under its own ### heading)

   ## Domain
   (each domain/*.md file under its own ### heading)

   ## General
   (content of general.md)
   ```

5. **Write the bundle** to a timestamped file in the workspace root:

   ```
   ocmem-export-YYYY-MM-DD.md
   ```

6. **Show a summary** — file count, total size, and the path of the
   export file. Tell the user they can copy it to another machine,
   version-control it, or share it.

Do NOT modify any existing memory files. This is a read-only export.
