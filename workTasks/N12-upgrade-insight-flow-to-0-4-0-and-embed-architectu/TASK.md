# N12 — Upgrade insight-flow to 0.4.0 and embed architecture rules in agents

## Problem

We are pinned to `insight-flow@0.3.1`. Version **0.4.0** (latest on npm) adds an `agents` block to `taskflow.config.json` that lets us:

1. Append **project-specific rules** to every built-in slash command (`agents.extend`).
2. Register **brand-new custom slash commands** (`agents.custom`) that get materialized into `.claude/commands/<name>.md` plus a row in `CLAUDE.md`.

Today our `/taskmaster`, `/task-implement`, and `/task-review` skills are minimal generic templates. They do not know about the **host/guest invariant**, the **single-channel API**, the **module init rule**, the **predefined module file patterns**, the **store singleton pattern**, the **public re-export rule**, or the **config-layer four-file rule** documented in `ARCHITECTURE.md` and `CLAUDE.md`. So every spec written, every implementation, and every review re-derives that context from scratch (or worse, drifts away from it).

We need the agents to be **architecture-aware by default**.

## Goal

1. **Bump `insight-flow` 0.3.1 → 0.4.0** and re-init.
2. **Inject the full set of project architectural invariants** into `taskmaster`, `task-implement`, `task-review`, `task-review-fix`, and `task-request-changes` via `agents.extend`. After re-init, the corresponding `.claude/commands/*.md` files must contain a `## Project Extensions` section with the rules.
3. **Register a new `/arch-check` custom agent** (`agents.custom`) — a standalone, on-demand architecture compliance checker that runs the same invariant grep checks the review agent performs. Available as a slash command in Claude Code.
4. The agent content must be **self-sufficient**: a reviewer that has never opened `ARCHITECTURE.md` should still know which imports are forbidden, which file patterns are required, and which exact commands to run.

## Scope

### `package.json`
- `"insight-flow": "0.3.1"` → `"insight-flow": "0.4.0"` in `devDependencies`.
- Run `pnpm install` (this project uses pnpm).

### `taskflow.config.json`
Add an `agents` block at the top level. Keep all existing keys unchanged.

```jsonc
{
  // ... existing keys ...
  "agents": {
    "extend": {
      "taskmaster": [/* rules — see "Rule content" below */],
      "task-implement": [/* rules */],
      "task-review": [/* rules */],
      "task-review-fix": [/* rules */],
      "task-request-changes": [/* rules */]
    },
    "custom": [
      {
        "name": "arch-check",
        "role": "Architecture Compliance Auditor",
        "description": "Run static and structural checks for debugger-pro-plus-3000's host/guest invariant.",
        "outputContract": "/* see below */"
      }
    ]
  }
}
```

### Apply changes
Run `./node_modules/.bin/insight-flow init` after editing config. Per the 0.4.0 README:
> Each rule is appended to the corresponding role file under a `## Project Extensions` section. Re-running `insight-flow init` replaces (not duplicates) the section.

So re-init is idempotent and is the canonical way to apply the agents block.

---

## Rule content — what to write into each agent

The rule strings are **complete, self-contained sentences**. They become bullet items under `## Project Extensions` inside `.claude/commands/<agent>.md`. Be exhaustive — the user explicitly asked for "as much information as needed".

### Shared invariants (cite verbatim across all three implementer-touching agents)

Every agent that writes, plans, or reviews code MUST know:

1. **Host/Guest Invariant.** `src/components/Debugger.tsx` and `src/modules/DebuggerModuleRegistryProvider.tsx` MUST have **zero imports** from `src/modules/predefined/*`. The Debugger is a host; modules are guests; the host never knows the guest. Adding or removing a module requires zero changes to Debugger source.
2. **Single-Channel Rule.** A module communicates with the Debugger **only** through `useDebuggerApi()` returned from `src/modules/useDebuggerApi.ts`. The four members are `emit(event, payload)`, `subscribe(event, handler)`, `moduleData`, `updateData(patch)`. Calling `useDebuggerApi()` outside a module's `render()` throws — it depends on `DebuggerModuleIdContext`. No direct cross-module store calls are permitted.
3. **Module Init Rule.** All module side-effects (store initialization, event listeners, network calls) MUST live inside the module's panel component, gated by a `useEffect`. They must NOT live in `Debugger.tsx`. If a module is absent from the consumer's `modules={[…]}` prop, its panel never mounts and its init never runs — that property is the whole point.
4. **Config Layer Four-File Rule.** Adding a new config field requires edits in exactly four files: `src/config/types.ts`, `src/config/defaults.ts`, `src/config/merge.ts`, and the public `src/index.ts` re-export. Skipping any of the four causes either a type error or a runtime `SyntaxError: does not provide an export named`.
5. **Unified Module Config (post-N11).** Module-specific data lives inside `modules[].data` on the consumer config, NOT at the top level of `DebuggerConfig`. Modules read their own data via `useDebuggerApi().moduleData`, not via `useDebuggerConfig()`. `useDebuggerConfig()` is reserved for cross-cutting / global settings.
6. **Public Re-export Rule.** Every type, hook, module definition, or store utility that is part of the consumer-facing API MUST be re-exported from `src/index.ts`. Forgetting this causes consumer-side `SyntaxError: does not provide an export named` at runtime — TypeScript will not catch it because internal imports still resolve.
7. **Predefined Module File Patterns.**
   - **Flat** (no store): `src/modules/predefined/Xxx/XxxModule.ts` exporting the `DebuggerModuleDefinition` and `XxxPanel.tsx` exporting the React panel. Example: `deviceInfoModule`.
   - **Sub-folder with store** (complex): `src/modules/predefined/xxx/{xxxModule.ts, xxxStore.ts, XxxPanel.tsx, index.ts}`. The store uses `window.__debuggerXxx` as a lazy-init singleton with a `_subs: Set<() => void>` subscriber set. The panel subscribes on mount with `useReducer` as `forceUpdate` (mirror `LogsPanel`). Examples: `logsModule`, `networkModule`.
8. **No Direct Module-to-Module Coupling.** Modules MUST NOT import from each other under `src/modules/predefined/`. Cross-cutting state belongs in the API broker (the registry) or is fanned out via events.
9. **Two System Events Only.** The registry broadcasts only `route-change` and `viewport-change` to all modules. Adding new system-wide events is a registry-level change (`DebuggerModuleRegistryProvider.tsx`) and must be done deliberately — not casually inside a module.
10. **Order Field.** `config.modules[].order` controls render order (lower = higher). Modules without `order` keep their natural prop-array position. Do not introduce a separate ordering mechanism.

### Quality gates every implementer & reviewer agent must enforce

11. `pnpm` is the only package manager. Never `npm install` or `yarn add` — `pnpm-lock.yaml` is the lockfile of record.
12. `npm run lint` MUST pass with `--max-warnings 0`. The repo enforces zero warnings.
13. `npm run build` must succeed end-to-end (`tsc -p tsconfig.build.json && vite build`). Type-check errors block merge.
14. `npm run format:check` must pass. Run `npm run format` before pushing if it fails.
15. Conventional commits: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`. Include the task ID in the scope: `feat(N12): …`.
16. Never auto-stage with `git add -A` — stage explicit files (matches the existing `/task-git` workflow and avoids leaking `.taskflow-activity.jsonl`, `dist/`, or scratch artifacts).
17. The dev server is `npm run dev` (entry `src/main.tsx`); the library build is `npm run build` (entry `src/index.ts`, output `dist/`). These two entries must not import each other's dev-only code.

### Per-agent emphasis

- **`taskmaster`** — specs MUST state which of the 4 config files will change, which module files (flat vs sub-folder) will be added, which public exports will be touched, and whether the change is a breaking config change (`modules[].data` migrations are breaking).
- **`task-implement`** — before declaring done, run a self-check grep:
  ```bash
  grep -rE "from ['\"](\.\./)?modules/predefined" src/components/Debugger.tsx src/modules/DebuggerModuleRegistryProvider.tsx
  ```
  This MUST return zero matches. Then run `npm run lint && npm run build`.
- **`task-review`** — verdict `fix-needed` whenever any of the 10 invariants is violated, when a public type is added to `src/` but missing from `src/index.ts`, when a new config key is added but any of the 4 files is missed, or when module init logic appears outside the module's panel component.
- **`task-review-fix`** — when fixing review blockers, do NOT add new functionality, do NOT touch unrelated files, do NOT loosen invariants to make a test pass. If a blocker requires a scope change, escalate by writing back into `REVIEW.md` rather than silently expanding the diff.
- **`task-request-changes`** — when accepting a change request, ensure the new spec still respects all invariants. If the requested change would break invariant 1 or 2 (host/guest, single-channel), reject it and propose an alternative.

### `/arch-check` custom agent — `outputContract` body

```
1. Print which Nxx task is current (`./node_modules/.bin/insight-flow current`).
2. Run the host-import grep:
     grep -rE "from ['\"](\.\./)*modules/predefined" src/components/Debugger.tsx src/modules/DebuggerModuleRegistryProvider.tsx
   Expect zero hits. Any hit = BLOCKER.
3. Run the cross-module-import grep:
     grep -rE "from ['\"](\.\./)*predefined/(logs|network|deviceInfo)" src/modules/predefined --include='*.ts' --include='*.tsx'
   Expect zero cross-folder hits (predefined modules MUST NOT import each other).
4. Verify every exported symbol from src/components, src/modules, src/config, and src/modules/predefined that is part of the public API is re-exported from src/index.ts. List any orphans.
5. Confirm npm run lint passes with zero warnings.
6. Confirm npm run build succeeds.
7. Confirm npm run format:check passes.
8. Report PASS or BLOCKED with the failing checks and exact file:line where applicable.
```

---

## Out of scope
- Refactoring any existing module code. This task only changes config + slash-command markdown.
- Changing the `insight-flow` lifecycle, dashboard port, or sharding rules.
- Modifying `CLAUDE.md` manually — `insight-flow init` updates the skills table when `agents.custom` entries are added; verify after re-init.
- Touching `.claude/hooks/`.
- Anything related to N11 (unified config) — that task lands separately.

## Breaking change
None for the library itself. Slash-command surface gains one new command (`/arch-check`) and existing commands gain a `## Project Extensions` section — neither is a breaking change for consumers of the npm package.

## Acceptance
- `./node_modules/.bin/insight-flow --version` prints `0.4.0`.
- `.claude/commands/taskmaster.md`, `task-implement.md`, `task-review.md`, `task-review-fix.md`, and `task-request-changes.md` each contain a `## Project Extensions` section with the rules above.
- `.claude/commands/arch-check.md` exists with the role header and the seven-step output contract.
- `CLAUDE.md` skills table contains a row for `/arch-check`.
- Running `./node_modules/.bin/insight-flow init` a second time leaves all generated files byte-identical (idempotent).
