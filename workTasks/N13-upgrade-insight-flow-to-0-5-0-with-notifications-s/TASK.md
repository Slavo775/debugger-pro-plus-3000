# N13 — Upgrade insight-flow to 0.5.0 with notifications, socket.io live updates, and activity log-activity hook

**Type:** feat
**Priority:** high
**Created:** 2026-05-23

## Problem

- `package.json` pins `insight-flow@0.4.0` (devDependency). Release 0.5.0 replaces the hand-rolled WebSocket with Socket.IO (auto-reconnect, mobile Safari support), adds OS-level + browser Notification API alerts on task transitions, adds a `/overview` multi-project page, and richer activity-feed enrichment via `insight-flow log-activity`. None of these are wired in this repo yet.
- The Stop-hook installer that 0.5.0's `insight-flow init` writes (`.claude/hooks/taskflow-notify.sh`) does not exist locally. Without it the CLI half of notifications is silent.
- New config keys `notifications.browser` and `notifications.cli` are not declared in `taskflow.config.json`. Defaults are `true`, so we want them explicit to document intent and to make later opt-out trivial.
- N12 baked the 0.4.0 invariants into five built-in agents and a custom `/arch-check` agent. Re-running `insight-flow init` after the bump replaces the `## Project Extensions` block in each role file — we need to verify all of that survives the bump intact.

## Goal

1. Bump `insight-flow` devDependency from 0.4.0 to 0.5.0 (pnpm-managed, lockfile updated).
2. Re-run `insight-flow init` so 0.5.0 installs the Stop hook, refreshes generated skills, and regenerates role files from `agents.extend` / `agents.custom`.
3. Add `notifications.browser` and `notifications.cli` explicitly to `taskflow.config.json` (both `true`).
4. Verify Socket.IO live updates work, the Stop notification hook fires, and `/overview` is reachable when the dashboard is running.
5. Confirm N12's project-extension rules (taskmaster, task-implement, task-review, task-review-fix, task-request-changes, custom /arch-check) are present and unchanged in the regenerated role files.

## Scope

### In scope

- `package.json` — bump `devDependencies.insight-flow` to `0.5.0`.
- `pnpm-lock.yaml` — regenerated via `pnpm install`.
- `taskflow.config.json` — add a `notifications` block with `browser: true` and `cli: true`.
- `.claude/hooks/taskflow-notify.sh` — installed by `insight-flow init`; verify presence and executable bit.
- `.claude/hooks/taskflow-activity.sh` — re-installed/refreshed by `insight-flow init`; verify still wired in `.claude/settings.local.json` `PostToolUse`.
- `.claude/settings.local.json` — verify `Stop` hook (notify) and `PostToolUse` hook (activity) are both registered after `init`.
- `.claude/commands/*.md` — refreshed by `init`; verify the nine built-in skills plus `/arch-check` are present.
- `.claude/roles/*.md` — refreshed by `init`; verify `## Project Extensions` block in each of the five extended role files matches the rules currently in `taskflow.config.json`.
- `CLAUDE.md` — confirm the slash-command table still lists `/arch-check` after `init` re-renders it (init may rewrite this section — preserve any non-insight-flow content above/below).
- `README.md` (project root) — add a one-line note pointing consumers at `insight-flow notify` if there is an existing "Tooling" section; otherwise leave untouched.

### Out of scope

- Runtime debugger source (`src/**`). Zero changes — this task is tooling only.
- Architecture invariants (1-10) and any of the runtime debugger contracts.
- Adding new project-extension rules. The 14/18/17/11/7 rules baked in by N12 carry over verbatim.
- The multi-project `insight-flow-master` setup. Out of scope for a single-project repo; mention but do not wire.
- `docs/architecture-*.svg` and `docs/internal-design-gemini.png`. Already modified in the working tree from previous work — do NOT stage them as part of this task.
- Any change to `workTasks/master.json` ID sequencing or shard layout.

## Implementation plan

1. **Bump the package.**
   - `pnpm add -D insight-flow@0.5.0` (NOT `npm install` — repo is pnpm-only).
   - Confirm `package.json` shows `"insight-flow": "0.5.0"` under devDependencies.
   - Confirm `pnpm-lock.yaml` updated and includes the new transitive `socket.io@^4.8.3`.

2. **Add notifications config.**
   - Edit `taskflow.config.json`: add a top-level `notifications` object after `activityEngine`:
     ```json
     "notifications": {
       "browser": true,
       "cli": true
     }
     ```
   - Both `true` matches defaults but documents intent. Do not touch `agents.extend` or `agents.custom`.

3. **Re-run init.**
   - `./node_modules/.bin/insight-flow init`
   - This will: install `.claude/hooks/taskflow-notify.sh`, register it as a `Stop` hook in `.claude/settings.local.json`, re-emit all nine built-in skills in `.claude/commands/`, refresh role files in `.claude/roles/` with the current `agents.extend` content, regenerate the `/arch-check` skill from `agents.custom`, and update the slash-command table in `CLAUDE.md`.
   - Init MUST be idempotent — re-running on the already-installed activity hook is a no-op per the 0.5.0 README. Capture and review the full stdout/stderr.

4. **Verify Stop hook + settings.**
   - `cat .claude/hooks/taskflow-notify.sh` — file exists, is executable (`chmod +x` if needed; init should do this).
   - `cat .claude/settings.local.json | jq '.hooks'` — confirm both `Stop` (notify) and `PostToolUse` (activity) entries exist, point at the right scripts, and neither overwrote unrelated hooks.

5. **Verify role-file extensions survived.**
   - For each of `.claude/roles/TASKMASTER_ROLE.md`, `TASK_IMPLEMENT_ROLE.md`, `TASK_REVIEW_ROLE.md`, `TASK_REVIEW_FIX_ROLE.md`, `TASK_REQUEST_CHANGES_ROLE.md`: locate the `<!-- taskflow:extensions:start -->` / `<!-- taskflow:extensions:end -->` markers and confirm the rule lines match the corresponding `agents.extend.<agent>` array in `taskflow.config.json` verbatim.
   - For `.claude/commands/arch-check.md`: confirm the file exists and its body matches the `outputContract` from `agents.custom[0]`.

6. **Smoke-test live updates + notifications.**
   - Start the dashboard: `./node_modules/.bin/insight-flow` (port 6007 per config).
   - Open `http://localhost:6007` and verify the page loads without WebSocket errors in DevTools console — Socket.IO should connect (request to `/socket.io/` returning 200).
   - In a separate terminal, run `./node_modules/.bin/insight-flow notify "N13 smoke test" --title "Test"` and confirm an OS notification appears (macOS: requires Terminal/iTerm Notification permission).
   - Trigger a status transition (e.g., `./node_modules/.bin/insight-flow review-start --id N13 --type ai`) and confirm the dashboard re-renders within ~1s without a page refresh.

7. **Optional: log-activity smoke.**
   - Run `./node_modules/.bin/insight-flow log-activity "manual phase marker"` and confirm a new entry appears in the dashboard's activity panel (and in `.taskflow-activity.jsonl`).

8. **Stage explicitly and commit.**
   - Stage ONLY: `package.json`, `pnpm-lock.yaml`, `taskflow.config.json`, `.claude/hooks/taskflow-notify.sh`, `.claude/settings.local.json`, any refreshed `.claude/commands/*.md` and `.claude/roles/*.md`, `CLAUDE.md` (if init regenerated it), and the N13 task files.
   - Do NOT stage `docs/architecture-*.svg`, `docs/internal-design-gemini.png`, `.taskflow-activity.jsonl`, or anything else outside this task's scope.
   - Conventional commit: `feat(N13): upgrade insight-flow to 0.5.0 (notifications, socket.io, log-activity)`.

## Verification

- `cat package.json | grep insight-flow` → `"insight-flow": "0.5.0"`.
- `./node_modules/.bin/insight-flow version` → `0.5.0`.
- `test -x .claude/hooks/taskflow-notify.sh` (exit 0).
- `cat .claude/settings.local.json | jq '.hooks.Stop'` shows the notify hook.
- Dashboard loads at `http://localhost:6007`, browser DevTools Network panel shows `/socket.io/` HTTP+WS upgrade (not the old plain `/ws`).
- `./node_modules/.bin/insight-flow notify "test"` fires an OS notification (macOS `osascript`).
- A status transition (`status` / `review-start`) updates the dashboard live without refresh.
- `grep -rE "INVARIANT 1 \(Host/Guest\)" .claude/roles/` returns hits in TASKMASTER_ROLE.md, TASK_IMPLEMENT_ROLE.md, TASK_REVIEW_ROLE.md, TASK_REVIEW_FIX_ROLE.md (confirms N12 rules survived re-init).
- `cat .claude/commands/arch-check.md | head -3` matches the custom agent in `taskflow.config.json`.
- `npm run lint && npm run build` succeed (sanity check — no runtime source touched but verify nothing broke transitively).

## Notes

- This is a pure tooling upgrade. Runtime code is untouched. The 10 architecture invariants apply only to deciding what NOT to do (don't modify `src/`, don't add module behavior, don't touch `DebuggerConfig`).
- **Re-running `insight-flow init` is destructive to role-file content outside the `<!-- taskflow:extensions:* -->` markers.** Any manual edits inside the canonical role text will be reverted. Check git diff carefully after `init` and decide per-line whether each change is intentional (the upgrade) or accidental (lost local edit).
- Per `AGENT_ENFORCEMENT.md`: never `Edit`/`Write` tracker files or anything in `workTasks/` outside the new N13 folder. All state transitions go through the `insight-flow` CLI.
- Per CLAUDE.md: the binary is local. Always invoke as `./node_modules/.bin/insight-flow`.
- 0.5.0 changelog: socket.io reliable updates + browser/CLI notifications + `/overview` multi-project page + `log-activity` command. See `https://www.npmjs.com/package/insight-flow/v/0.5.0` for the README.
- Related: N12 (the 0.4.0 upgrade) for precedent on how to verify role-extension injection.
- `insight-flow-master` and the `/overview` multi-project page are intentionally deferred — this repo is a single project and the feature requires a second server to demonstrate.
