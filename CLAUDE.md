# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server (src/main.tsx is the dev preview entry)
npm run build        # tsc type-check + vite library build → dist/
npm run lint         # ESLint, zero warnings allowed
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier write
npm run format:check # Prettier check

# insight-flow (not globally installed — use local binary)
./node_modules/.bin/insight-flow current
./node_modules/.bin/insight-flow list
```

## Architecture

### Layers

```
FAB button  →  Debugger panel  →  Module registry  →  Modules
(entry)        (host/manager)     (API provider)      (consumers)
```

**The fundamental invariant: `Debugger.tsx` and the registry have zero imports from any module.**
Modules depend on the Debugger; the Debugger does not depend on modules. Violating this rule
means the Debugger becomes coupled to a specific module and the module can no longer be
removed cleanly.

### Config layer (`src/config/`)

`DebuggerConfig` (user-facing, all optional) → `mergeWithDefaults` → `ResolvedDebuggerConfig`
(all fields required). `DebuggerConfigProvider` wraps the app; any component inside calls
`useDebuggerConfig()` to read resolved values.

Adding a new config field requires changes in four files: `types.ts`, `defaults.ts`, `merge.ts`,
and the public `src/index.ts` export.

### Module registry (`src/modules/`)

`DebuggerModuleRegistryProvider` is the host. It receives `moduleDefinitions: DebuggerModuleDefinition[]`
(render functions, from the consumer's `modules` prop) and `moduleConfigs: DebuggerModuleConfig[]`
(metadata from config). It merges them, manages expand/collapse state, routes events, and provides
the `DebuggerApiContextValue` context.

Modules call `useDebuggerApi()` to get:
- `emit(event, payload)` — fire an event to the outside world (`onModuleEvent` callback)
- `subscribe(event, handler)` — receive events sent to this module
- `moduleData` — static + runtime data for this module
- `updateData(patch)` — write runtime data (included in debug snapshot)

`useDebuggerApi()` reads `DebuggerModuleIdContext` to know which module is calling it —
it must be called from inside a module's `render()` function.

### Module init rule

**A module's initialization logic must live inside its own panel component, not in `Debugger.tsx`.**

Use a `useEffect` inside the panel that reads from `useDebuggerConfig()`:

```ts
// ✅ correct — only runs when this module is mounted
export function NetworkPanel() {
  const { network } = useDebuggerConfig()
  useEffect(() => { initNetworkStore(network.apis) }, [network])
  ...
}
```

```ts
// ❌ wrong — fires even when the module is absent
// Debugger.tsx:
useEffect(() => { initNetworkStore(network.apis) }, [network])
```

If the module is not in the `modules` array, its panel never mounts and its init never runs.

### Predefined modules (`src/modules/predefined/`)

Two file patterns:
- **Flat** (simple): `XxxModule.ts` + `XxxPanel.tsx` (e.g. DeviceInfo)
- **Sub-folder** (complex, has a store): `xxx/xxxModule.ts` + `xxxStore.ts` + `XxxPanel.tsx` + `index.ts`

Stores use `window.__debuggerXxx` as a lazy-init singleton. They are not React state — they
notify React via a `_subs: Set<() => void>` subscriber set. Panels subscribe on mount with
`useReducer` for `forceUpdate` (same pattern as `LogsPanel`).

**Current predefined modules:** `logsModule`, `deviceInfoModule`, `networkModule`.

### Known exception

`DebuggerModuleRegistryProvider` imports `pushEntry` from `logs/logsStore` to record route
changes in the log. This is the one place where the registry touches a module store directly.
It exists because route tracking is cross-cutting. Do not add further module imports here.

### Public API (`src/index.ts`)

Every type, hook, module, and store utility that consumers need must be explicitly re-exported
here. Forgetting this causes runtime `SyntaxError: does not provide an export named` errors.

---

<!-- taskflow:start -->
## insight-flow

This project uses **insight-flow** for AI-assisted task lifecycle management.

## Task System

Tasks are tracked in `workTasks/` as sharded JSON files. Use the insight-flow CLI or slash commands to manage them.

## Commands

```bash
insight-flow create --title "..." --type feat|fix|rework --priority high|medium|low --tags a,b
insight-flow current                    # Show active task
insight-flow list                       # List all tasks
insight-flow stats                      # Aggregate statistics
insight-flow next                       # Pick next actionable task
insight-flow                            # Launch dashboard at http://localhost:6006
```

## Slash Commands (Claude Code Skills)

| Command | Purpose |
|---------|---------|
| `/taskmaster` | Create a new task spec (TASK.md + CHECKLIST.md) |
| `/task-implement` | Implement a task from its spec |
| `/task-review` | AI code review of implemented task |
| `/task-human-review` | Record human review feedback |
| `/task-review-fix` | Fix issues from review |
| `/task-git` | Branch, commit, push, PR, merge |
| `/task-incident` | Track production incidents |
| `/task-request-changes` | Request post-implementation changes |
| `/taskmaster-change` | Modify an existing task spec |

## Task Lifecycle

```
ready -> in-progress -> implemented -> reviewing -> approved -> pushed -> merged
                                          |
                                     fix-needed -> fixing -> fixed -> (re-review)
```

## Conventions

- Task IDs: N00, N01, N02, ...
- Task folders: `workTasks/Nxx-short-title/` containing TASK.md + CHECKLIST.md
- Branches: `<type>/Nxx-short-title` (e.g., `feat/N00-add-auth`)
- Commits: conventional commits (feat, fix, refactor, docs, chore, etc.)
- Tracker commands: `insight-flow <command>` (replaces `node scripts/task-tracker.mjs`)
<!-- taskflow:end -->
