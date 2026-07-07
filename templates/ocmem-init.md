---
description: Scaffold the project memory file (MEMORY.md) at the repo root.
agent: build
---

Set up the project memory file for this repository.

1. If `MEMORY.md` does **not** exist at the repo root, create it from this template
   (use the repository name, formatted readably, as the project name):

```
# {Project Name} — Project Memory

<!-- Global memory rules: see ~/.config/opencode/AGENTS.md -->

## Project Notes

- YYYY-MM-DD — example: this repo uses PostgreSQL 15 with pgvector. — Don't suggest MySQL-specific syntax.
```

2. If the file **already exists**, do not overwrite it — confirm it is present
   and show its current top-level heading.

Do not modify any other files.
