# N12 — Checklist

## Pre-flight
- [ ] Read `ARCHITECTURE.md` end-to-end (the agent rules quote it verbatim — wording must match).
- [ ] Read `CLAUDE.md` end-to-end.
- [ ] Confirm `pnpm-lock.yaml` is clean (`git status` shows no lockfile edits).
- [ ] Confirm `./node_modules/.bin/insight-flow current` reports a task — sanity check the CLI works.

## Upgrade
- [ ] In `package.json`, change `"insight-flow": "0.3.1"` → `"insight-flow": "0.4.0"` in `devDependencies`.
- [ ] Run `pnpm install` (NOT `npm install`). Confirm `pnpm-lock.yaml` updates.
- [ ] Run `./node_modules/.bin/insight-flow --version` → must print exactly `0.4.0`.
- [ ] Run `./node_modules/.bin/insight-flow help` and skim — confirm no removed commands we currently use (`current`, `list`, `create`, `implement-*`, `review-*`, `fix-*`, `push`, `merge`, `done`, `next*`).

## Config changes — `taskflow.config.json`
- [ ] Add a top-level `"agents"` key. Do NOT modify `workDir`, `shardSize`, `projectName`, `rolesDir`, `server.port` (still 6007), or `activityEngine.*`.
- [ ] `agents.extend` map keys = `taskmaster`, `task-implement`, `task-review`, `task-review-fix`, `task-request-changes`.
- [ ] Each value is an array of self-contained rule strings drawn from TASK.md → "Rule content".
- [ ] **Shared invariants (1–10)** appear in `task-implement`, `task-review`, `task-review-fix`, and `task-request-changes`. They may be summarized but not omitted.
- [ ] **Quality gates (11–17)** appear in `task-implement`, `task-review`, and `task-review-fix`.
- [ ] **Per-agent emphasis** appears verbatim in each respective agent's rule list.
- [ ] `taskmaster` rules cover invariants 1–7 and the four-file rule explicitly — taskmaster writes specs, so it must reference these by name.
- [ ] `agents.custom` contains one entry: `{ name: "arch-check", role: "Architecture Compliance Auditor", description: "...", outputContract: <7-step block> }`.

## Apply
- [ ] Run `./node_modules/.bin/insight-flow init`. Capture stdout — it should report which files were written.
- [ ] `cat .claude/commands/taskmaster.md` — must end with a `## Project Extensions` section containing our rules.
- [ ] Same for `task-implement.md`, `task-review.md`, `task-review-fix.md`, `task-request-changes.md`.
- [ ] `.claude/commands/arch-check.md` exists; contains the role header and the 7-step output contract.
- [ ] `CLAUDE.md` has a row for `/arch-check` in the skills table (the README states init updates CLAUDE.md when custom agents are present).
- [ ] Re-run `./node_modules/.bin/insight-flow init` a SECOND time. `git diff .claude/ CLAUDE.md` must be empty — init is idempotent.

## Static checks
- [ ] `grep -rE "from ['\"](\.\./)*modules/predefined" src/components/Debugger.tsx src/modules/DebuggerModuleRegistryProvider.tsx` returns **zero** matches (invariant 1 still holds — sanity).
- [ ] `./node_modules/.bin/insight-flow list` still parses (config schema accepted with the new `agents` block).
- [ ] `./node_modules/.bin/insight-flow current` still works.

## Quality gates
- [ ] `npm run lint` → zero warnings, zero errors.
- [ ] `npm run format:check` passes (run `npm run format` if not).
- [ ] `npm run build` succeeds. (The bump shouldn't change the library build, but verify.)

## Documentation
- [ ] No README change required — `insight-flow` is a dev tool, not part of the published surface.
- [ ] If `CLAUDE.md` was auto-modified by `insight-flow init`, review the diff; the existing handwritten content under `## Architecture`, `## Commands`, etc. must NOT be clobbered. If init overwrites handwritten sections, file a follow-up — DO NOT discard the existing content.

## Git
- [ ] Branch: `feat/N12-upgrade-insight-flow-0-4-0-agents`.
- [ ] Stage explicitly: `package.json`, `pnpm-lock.yaml`, `taskflow.config.json`, `.claude/commands/*.md`, `CLAUDE.md` (if modified by init), `workTasks/N12-*/`, and the updated shard `workTasks/tasks-N10-N19.json` + `workTasks/master.json`.
- [ ] Do NOT stage: `.taskflow-activity.jsonl`, `dist/`, `.vite/`.
- [ ] Commit message: `feat(N12): upgrade insight-flow to 0.4.0 and embed architecture rules in agents`.
- [ ] `./node_modules/.bin/insight-flow push --id N12 --commit <hash> --message "..." --branch feat/N12-upgrade-insight-flow-0-4-0-agents`.

## Acceptance smoke test
- [ ] Open `.claude/commands/task-review.md` in an editor. Confirm a fresh reader who has never opened `ARCHITECTURE.md` could still review a PR using only that file — the host/guest invariant, single-channel rule, init rule, four-file rule, re-export rule, and predefined-module patterns are all stated explicitly.
- [ ] Manually invoke `/arch-check` against the current working tree. It should print `PASS` (or list specific blockers if any).
