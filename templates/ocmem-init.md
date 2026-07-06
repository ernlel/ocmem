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

## Global Memory

Read ~/.config/opencode/AGENTS.md for memory rules and the topic-file list.
The ocmem plugin auto-injects the global index and this file into every
response.

## Project Notes

<!-- Populated as you work in this project. -->
<!-- Entry format: date — what — why -->
```

3. If the file **already exists**, do not overwrite it — confirm it is present
   and show its current top-level heading.

Do not modify any other files.
