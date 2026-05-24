# N13 — Upgrade insight-flow to 0.5.0 with notifications, socket.io live updates, and activity log-activity hook — Checklist

## Done criteria

- [ ] `package.json` `devDependencies.insight-flow` reads `0.5.0`
- [ ] `pnpm-lock.yaml` regenerated; `socket.io@^4.8.3` resolved as a transitive of insight-flow
- [ ] `./node_modules/.bin/insight-flow version` prints `0.5.0`
- [ ] `taskflow.config.json` has a top-level `notifications` object with `browser: true` and `cli: true`
- [ ] `taskflow.config.json` `agents.extend` and `agents.custom` blocks are byte-for-byte unchanged from the pre-upgrade copy
- [ ] `./node_modules/.bin/insight-flow init` completed without errors
- [ ] `.claude/hooks/taskflow-notify.sh` exists and is executable
- [ ] `.claude/hooks/taskflow-activity.sh` still exists and is executable (unchanged or refreshed)
- [ ] `.claude/settings.local.json` `hooks.Stop` references `taskflow-notify.sh`
- [ ] `.claude/settings.local.json` `hooks.PostToolUse` still references `taskflow-activity.sh`
- [ ] No unrelated hook entries in `.claude/settings.local.json` were removed
- [ ] All nine built-in skill files exist in `.claude/commands/` (taskmaster, task-implement, task-review, task-human-review, task-review-fix, task-git, task-incident, task-request-changes, taskmaster-change)
- [ ] `.claude/commands/arch-check.md` exists and matches the `agents.custom[0].outputContract` in `taskflow.config.json`
- [ ] Each of `.claude/roles/{TASKMASTER,TASK_IMPLEMENT,TASK_REVIEW,TASK_REVIEW_FIX,TASK_REQUEST_CHANGES}_ROLE.md` contains a `<!-- taskflow:extensions:start -->` / `<!-- taskflow:extensions:end -->` block whose contents match `agents.extend.<agent>` line-for-line
- [ ] N12's 10 invariants are still present in the regenerated role files (`grep -rE "INVARIANT 1 \(Host/Guest\)" .claude/roles/` returns ≥3 hits)
- [ ] `CLAUDE.md` slash-command table still lists `/arch-check` (or init's regenerated equivalent still includes it)
- [ ] No staging of `docs/architecture-*.svg`, `docs/internal-design-gemini.png`, `docs/architecture-communication-gemini.png`, `docs/architecture-layers-gemini.png`, `docs/architecture-module-lifecycle-gemini.png`, or `.taskflow-activity.jsonl`
- [ ] No changes under `src/` (runtime code is out of scope)

## Change-request additions (Round 1)

- [ ] `insight-flow init` ran and registered BOTH the notification `Stop` hook (`.claude/hooks/taskflow-notify.sh`) AND the activity `PostToolUse` hook (`.claude/hooks/taskflow-activity.sh`) in `.claude/settings.local.json`
- [ ] Neither hook was hand-edited into `.claude/settings.local.json` — both came from `init`
- [ ] `package.json` `scripts` has a new entry `"if:ui": "insight-flow"`
- [ ] `pnpm if:ui` (and `npm run if:ui`) launches the dashboard on port 6007 with the Socket.IO connection healthy
- [ ] No other existing script in `package.json` was renamed, removed, or re-aliased

## Quality gates

- [ ] `npx tsc --noEmit` passes (sanity — runtime untouched)
- [ ] `npm run lint` passes with zero warnings (`--max-warnings 0`)
- [ ] `npm run format:check` passes
- [ ] `npm run build` succeeds (`tsc -p tsconfig.build.json && vite build`)
- [ ] No regressions in affected area (runtime debugger source is untouched; verify by building)

## Verification

- [ ] Run `./node_modules/.bin/insight-flow` — dashboard starts on port 6007 without errors
- [ ] Open `http://localhost:6007` in a browser — page renders, no WebSocket errors in DevTools console
- [ ] DevTools Network tab confirms a `/socket.io/` connection (HTTP→WS upgrade), not the legacy `/ws`
- [ ] Run `./node_modules/.bin/insight-flow notify "N13 smoke" --title "Test"` — OS notification appears (macOS: `osascript`)
- [ ] With the dashboard tab open, run `./node_modules/.bin/insight-flow status --id N13 --status implemented` then revert — the dashboard updates within ~1s without a page refresh AND a browser desktop notification fires (if Notification permission granted)
- [ ] Run `./node_modules/.bin/insight-flow log-activity "N13 manual marker"` — a new entry appears in the dashboard's Activity panel
- [ ] Run `./node_modules/.bin/insight-flow current` — returns N13 with the expected status
- [ ] `git diff --stat` before commit shows only files listed in the Done criteria (no `src/`, no `docs/architecture-*`, no `.taskflow-activity.jsonl`)
