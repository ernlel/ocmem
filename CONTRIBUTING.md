# Contributing

Thanks for wanting to help.

## Getting started

```bash
# Clone and install
git clone https://github.com/ernlel/ocmem.git
cd ocmem
npm install
```

Nothing to build — the plugin is TypeScript source consumed directly by
openCode's Bun runtime.

## Running checks

```bash
npm run typecheck   # TypeScript compilation check
npm test            # Plugin unit tests (vitest)
```

Both must pass before a PR can be merged. CI runs them automatically.

## Project layout

```
plugin/   ocmem.ts              — the opencode plugin (memory injector)
templates/                      — AGENTS.md rules, memory scaffold, /ocmem-* commands
scripts/  install.sh, uninstall.sh — one-command deploy / remove
test/     ocmem.test.ts         — vitest unit tests
docs/     architecture.md       — design rationale
```

## Code style

- **Plugin:** TypeScript only where it helps — just Node built-ins +
  `import type { Plugin }` from `@opencode-ai/plugin`. No runtime
  dependencies beyond what Bun ships.
- **Shell scripts:** POSIX-compatible where possible. Prefer `awk` over
  `sed -i` (macOS `sed` is BSD, not GNU). Use `set -euo pipefail`.
- **Templates:** Plain markdown with YAML frontmatter (`---`) for
  command templates. Match the structure of existing commands.
- Errors are logged to `stderr`, never swallowed silently.
- Known trivia goes in comments; explanations live in `docs/`.

## Testing

- Plugin changes → add or update tests in `test/ocmem.test.ts`.
- Shell script changes → manually test with `--dry-run` first, then
  run against a temp directory. A bats-based test suite is planned
  but not yet wired in.

Run `npm test` before pushing.

## Submitting changes

1. Fork and branch from `master`.
2. Keep commits focused — one logical change per commit.
3. Write a clear commit message (present tense, imperative mood).
4. Run `npm run typecheck && npm test`.
5. Open a PR against `master` with a description of what changed and why.

## What to work on

Check the open issues, or look at `CHANGELOG.md` for the "Unreleased"
section to see what's already in flight. If you want to add something
not covered by an issue, open one first to discuss.

## Versioning

ocmem follows [SemVer](https://semver.org/) via git tags (`v{major}.{minor}.{patch}`):

- **Major** — breaking changes: memory format changes, plugin API changes, AGENTS.md rule changes that require manual migration
- **Minor** — new features: new commands, new hooks, new templates, new tests — backward compatible
- **Patch** — fixes: bug fixes, documentation updates, prompt refinements, CI changes — backward compatible

The version in `package.json` is the source of truth. When a PR is merged to
`master`, CI automatically creates a git tag matching the version. To release:

1. Bump the version in `package.json`.
2. Move the "Unreleased" section in `CHANGELOG.md` to a new dated section.
3. Commit with message `release: v{x.y.z}`.
4. Merge to `master` — CI tags it automatically.

## License

MIT — see [LICENSE](LICENSE).
