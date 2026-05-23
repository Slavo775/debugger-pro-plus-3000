# N13 — Review

## Request Changes

**Requested by:** Human (Project Owner)
**Date:** 2026-05-23

### Changes requested

- **Run `insight-flow init` to register the new features** — implementation plan, step 3 — explicitly cover both halves of what 0.5.0's `init` now installs: the **notification** `Stop` hook (`.claude/hooks/taskflow-notify.sh` + `Stop` entry in `.claude/settings.local.json`) and the **activity** `PostToolUse` hook (`.claude/hooks/taskflow-activity.sh` re-registration). Treat init as the single canonical way to register both — do not hand-edit `.claude/settings.local.json` to wire either hook.
- **Add `pnpm if:ui` (or `npm run if:ui`) script** — `package.json` — add a new script `"if:ui": "insight-flow"` so the dashboard launches via the project's package manager without anyone needing to remember `./node_modules/.bin/insight-flow`. This is the only new script; do not rename or alias existing scripts.

### Notes

- Both requests pass the 10 architecture invariants (tooling only, no runtime source, no `DebuggerConfig` shape change, no module behavior). No host/guest concerns.
- Per N12 precedent and `AGENT_ENFORCEMENT.md`, `insight-flow init` is the authoritative installer for hooks and skill files. Manual edits to `.claude/settings.local.json` for hook registration are out of bounds.
- The `if:ui` script intentionally invokes the bare `insight-flow` binary (which defaults to the dashboard at the configured port 6007) rather than `insight-flow ui` — both work, but the bare form keeps the script forward-compatible if the default subcommand changes.
- Quality gates inherited: `npm run lint`, `npm run format:check`, `npm run build` must all still pass after `package.json` gains the new script entry. Adding a script does not affect lint/format/build, but the gate stays.
