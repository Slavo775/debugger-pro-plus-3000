# N09 — Persist logs to localStorage with config flag and UI override

## Type
feat

## Priority
medium

## Tags
logs, localStorage, config, persistence

## Summary
Add opt-in log persistence to localStorage for the Logs module. When `persistLogs: true` is set in the debugger config, the log module saves up to 50 entries to localStorage and rehydrates them on init. A "Persist log" checkbox in the Logs panel UI lets the user override the config setting at runtime.

## Context
- N07 shipped `logsStore`, `useDebuggerLog`, `LogsPanel`, and `logsModule`.
- N08 added snapshot integration (`logOutput`) and visual filter chips.
- `initLogsStore(logs)` is called in `Debugger.tsx` → `DebuggerModuleSetup` on every `logs` config change.
- `logsStore` holds all runtime state in `window.__debuggerLogs`.
- `MAX_ENTRIES` in `logsStore.ts` is 500; the localStorage cap must be a separate constant of 50.

## Scope

### 1 — Config type (`src/config/types.ts`)
- Add `persistLogs?: boolean` to `DebuggerConfig`.
- Add `persistLogs: boolean` to `ResolvedDebuggerConfig`.

### 2 — Default config (`src/config/defaults.ts`)
- Add `persistLogs: false` to `DEFAULT_DEBUGGER_CONFIG`.

### 3 — `logsStore.ts` (`src/modules/predefined/logs/logsStore.ts`)

**Constants:**
```ts
const LS_KEY = '__debugger_logs__'
const LS_MAX = 50
```

**Store field:**
```ts
interface LogsStore {
  ...
  persistLogs: boolean
}
```
Init `persistLogs: false` in `getStore()`.

**New / updated functions:**

`initLogsStore(logs: LogConfig[], persistLogs: boolean): void`
- Set `store.persistLogs = persistLogs`.
- If `persistLogs` is `true`, load entries from localStorage (see `_loadFromStorage`), prepend them to `store.entries` (deduplicate by timestamp+id if needed, then cap at `MAX_ENTRIES`).
- Existing channel registration logic unchanged.

`_loadFromStorage(): LogEntry[]`  (internal helper, not exported)
- Read `localStorage.getItem(LS_KEY)`, parse JSON, validate it is an array of objects with the expected shape. Return `[]` on any error.

`_saveToStorage(entries: LogEntry[]): void`  (internal helper, not exported)
- Take the last `LS_MAX` entries, write to `localStorage.setItem(LS_KEY, JSON.stringify(...))`. Swallow errors silently (private mode, quota, etc.).

`pushEntry(entry: LogEntry): void`
- After pushing and notifying subscribers (existing logic), if `store.persistLogs` is `true` call `_saveToStorage(store.entries)`.

`clearEntries(): void`
- After clearing `store.entries` (existing logic), if `store.persistLogs` is `true` call `localStorage.removeItem(LS_KEY)`.

`setPersistLogs(on: boolean): void`  (new export)
- Set `store.persistLogs = on`.
- If turning on: call `_saveToStorage(store.entries)` to persist the current buffer immediately.
- If turning off: call `localStorage.removeItem(LS_KEY)`.
- Notify subscribers: `store._subs.forEach((cb) => cb())`.

### 4 — `Debugger.tsx` (`src/components/Debugger.tsx`)
- In `DebuggerModuleSetup`, destructure `persistLogs` from `useDebuggerConfig()`.
- Pass it to `initLogsStore`: `initLogsStore(logs, persistLogs)`.

### 5 — `LogsPanel.tsx` (`src/modules/predefined/logs/LogsPanel.tsx`)
- Import `setPersistLogs` from `./logsStore`.
- Add a "Persist log" checkbox to the Channels section (rendered below the channel checkboxes).
- Checkbox state is derived from `store.persistLogs` (read on each render from `getStore()`).
- On change: call `setPersistLogs(e.target.checked)` — this triggers a subscriber notify so the panel re-renders.
- Label: `Persist log`
- Style: same checkbox label style as existing channel checkboxes; use `accentColor` from `cfg.style.primaryColor`.
- Separator: render a thin divider (`borderTop: '1px solid #2a2a3e'`, `margin: '6px 0'`) between the channel checkboxes and the Persist log checkbox to keep them visually distinct.

## Files to change
1. `src/config/types.ts`
2. `src/config/defaults.ts`
3. `src/modules/predefined/logs/logsStore.ts`
4. `src/components/Debugger.tsx`
5. `src/modules/predefined/logs/LogsPanel.tsx`

## Files to read first
- `src/config/types.ts`
- `src/config/defaults.ts`
- `src/modules/predefined/logs/logsStore.ts`
- `src/components/Debugger.tsx`
- `src/modules/predefined/logs/LogsPanel.tsx`

## Out of scope
- No changes to `logsModule.ts`.
- No changes to snapshot aggregation — `updateData({ logOutput: [...store.entries] })` already fires on every subscriber notify, so rehydrated entries appear in snapshots automatically.
- Do not add a localStorage viewer or history UI.
- Do not expose `LS_KEY` or `LS_MAX` in the public API / index exports.
- Do not change `MAX_ENTRIES` (500); the 50-entry cap applies only to what is written to localStorage.
