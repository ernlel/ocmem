---
description: Review the current session for things worth remembering and let the user pick which to record.
agent: build
---

Review the conversation history in this session for knowledge that should be
written to memory, then ask the user to confirm which entries to record.

Steps:

1. **Scan the session.** Walk back through the conversation and identify
   things worth remembering. Apply the same triggers as the AGENTS.md memory
   rules:
   - Tool/config quirks you had to debug (not in docs)
   - Patterns that would help in any future project
   - Non-obvious design decisions and their rationale
   - Project conventions, dependencies, or constraints learned

2. **Classify each candidate:**
   - **Global** → belongs in `~/.config/opencode/memory/` (cross-project)
     - `tools/{tool}.md` for tool-specific gotchas
     - `domain/{topic}.md` for domain knowledge
     - `general.md` for user identity, workflow preferences, conventions
   - **Project** → belongs in `.opencode/memory/MEMORY.md` (this repo only)

3. **Check for duplicates.** Before presenting the list, read the target
   files (`tools/*.md`, `domain/*.md`, `general.md`, `memory.md`, and
   `.opencode/memory/MEMORY.md` if it exists) and the global index. For each
   candidate, decide one of:
   - **New** — not present anywhere; safe to add
   - **Already covered** — the same fact is already recorded; mark as
     "skip, already in {file}" and exclude from the user's list
   - **Update / supersede** — an existing entry is wrong, outdated, or
     incomplete; mark as "update {file} — {what changes}" and present it
     for confirmation
   Never silently overwrite an existing entry.

4. **Present a numbered list** to the user. For each candidate show:
   - What you learned (one line)
   - Proposed file + section
   - Why it's worth keeping (one line)
   Example:
   ```
   1. nix-installed `gh` is not picked up by git's credential helper
      (git hardcodes /usr/bin/gh).
      → tools/gh.md
      Saves 10 minutes next time someone installs gh via nix.

   2. This repo uses mise for task running; tasks live in mise.toml.
      → .opencode/memory/MEMORY.md (project notes)
      ```

5. **Ask the user** which entries to record. Use a `question` tool call with
   `multiple: true` so they can pick several at once. Do NOT write anything
   until they confirm.

6. **Write only the confirmed entries.** For each, create the target file
   (or append to it if it already exists). Follow the entry format from the
   existing files: `date — what — why`. For "update / supersede" entries,
   edit the existing entry in place — do not add a new line.

7. **Update the index** in `memory.md` if any new file was created.

8. **Confirm** what was written, file by file.
