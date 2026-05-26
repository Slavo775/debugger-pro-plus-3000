# N15 — Upgrade insight-flow from 0.5.0 to 0.7.1 — Checklist

## Done criteria

- [ ] `package.json` lists `"insight-flow": "0.7.1"` (or `^0.7.1`)
- [ ] `pnpm-lock.yaml` regenerated; lockfile resolves to `insight-flow@0.7.1`
- [ ] `./node_modules/.bin/insight-flow --version` reports `0.7.1`
- [ ] `insight-flow init --force` ran; resulting diffs reviewed file-by-file
- [ ] Every `## Project Extensions` block (between `taskflow:extensions:start`/`end`) preserved in role files after `init --force`
- [ ] `insight-flow migrate` ran without error (tracker schema migrated if needed)
- [ ] `insight-flow migrate-reviews` ran without error (idempotent on top of N14's split state)
- [ ] `insight-flow install-activity-hook --force` ran; if `taskflow-classify.sh` was overwritten, the bash `case → if/elif grep -q` fix from N14 was re-applied
- [ ] `insight-flow prompt-build --apply` ran (or skipped with rationale if 0.7.1 changed the contract)
- [ ] CLI smoke test: `current`, `list`, `next`, `next-review`, `next-fix`, `next-change`, `stats` all return without error
- [ ] Dashboard launches (`./node_modules/.bin/insight-flow`) on the default port and renders the task list

## Quality gates

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run build` produces `dist/` without errors
- [ ] `npm run format:check` — no new files dirty introduced by this task (pre-existing prettier debt acceptable)
- [ ] No changes under `src/` (library source untouched)

## Verification

- [ ] Open the dashboard, navigate to N14, confirm REVIEW.md rounds 1–7 are visible
- [ ] Open the dashboard, navigate to N15, confirm spec is visible and status updates as workflow progresses
- [ ] `git diff main...HEAD -- .claude/ taskflow.config.json` reviewed — every change is either an intended 0.7.1 update or a preserved-by-us extension
- [ ] No stray `.taskflow-activity.jsonl` or other ignored files in the commit
- [ ] PR description lists the 4 commands run (`init`, `migrate`, `migrate-reviews`, `install-activity-hook`) and their outcomes
