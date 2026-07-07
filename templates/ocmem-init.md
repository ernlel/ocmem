---
description: Scaffold the project memory file (.opencode/memory/MEMORY.md) for this repo.
agent: build
---

Set up the project memory structure for this repository.

1. Create the `.opencode/memory/` directory if it does not exist.
2. If `.opencode/memory/MEMORY.md` does **not** exist, create it from this template
   (use the repository name, formatted readably, as the project name):

```
# {Project Name} — Project Memory

<!-- Global memory rules: see ~/.config/opencode/AGENTS.md -->

## Project Notes

- YYYY-MM-DD — example: this repo uses PostgreSQL 15 with pgvector. — Don't suggest MySQL-specific syntax.
```

3. If the file **already exists**, do not overwrite it — confirm it is present
   and show its current top-level heading.

Do not modify any other files.
