# N09 Human Review

**Verdict:** fix-needed
**Reviewed by:** human
**Date:** 2026-05-21

## Blockers

### 1. Unified localStorage schema — single field with persistLog + logOutput
The current implementation uses a single `LS_KEY` but stores only `LogEntry[]` (raw array).
The localStorage value **must** be a JSON object:
```json
{ "persistLog": true, "logOutput": [ ...LogEntry ] }
```
This means:
- The `persistLog` boolean is itself persisted to localStorage so the user's UI override survives page reload.
- On init, the stored `persistLog` flag (not just the config value) drives whether logs are rehydrated.

### 2. Hydration and cleanup happen only on init — not during runtime
Current code calls `localStorage.removeItem(LS_KEY)` in two runtime paths:
- `clearEntries()` when persist is on — **remove this**
- `setPersistLogs(false)` — **remove this**

The correct behaviour:
- **During runtime** (`pushEntry`, `clearEntries`, `setPersistLogs`): only write to localStorage (update `persistLog` flag and/or `logOutput`). Never delete the key.
- **On module init** (`initLogsStore`): read localStorage. If the stored or config `persistLog` is `false`, **delete localStorage then**. If `true`, rehydrate log output into the store AND call `updateData` (snapshot hydration).

### 3. Snapshot hydration on init
On init, when localStorage has `persistLog: true` and entries exist, those entries must be pushed into the module's snapshot via `updateData`. Currently `updateData` is only called from the LogsPanel subscriber — on first load the snapshot would be empty until the first log is pushed.
- `initLogsStore` cannot call `updateData` (it has no access to the module API).
- Solution: the `LogsPanel` `useEffect` that subscribes to the store should also call `updateData({ logOutput: [...store.entries] })` **immediately on mount** (before any new log is pushed), so rehydrated entries appear in the snapshot right away.

## Required changes

### `logsStore.ts`

**New LS schema type (internal):**
```ts
interface PersistedLogs {
  persistLog: boolean
  logOutput: LogEntry[]
}
```

**`_loadFromStorage(): PersistedLogs | null`**
- Parse and validate the full object shape. Return `null` on any error.

**`_saveToStorage(persistLog: boolean, entries: LogEntry[]): void`**
- Write `{ persistLog, logOutput: entries.slice(-LS_MAX) }`. Swallow errors.

**`initLogsStore(logs, persistLogs)`**
- Read localStorage with `_loadFromStorage()`.
- Effective persist flag = `stored?.persistLog ?? persistLogs` (stored UI choice wins over config default).
- If effective flag is `false`: `localStorage.removeItem(LS_KEY)`, set `store.persistLogs = false`, return.
- If effective flag is `true`: set `store.persistLogs = true`, rehydrate `stored.logOutput` into `store.entries`.

**`pushEntry`** — save via `_saveToStorage(store.persistLogs, store.entries)` when flag is on. ✓ (keep, no deletion)

**`clearEntries`** — when flag is on, save the now-empty entries: `_saveToStorage(store.persistLogs, [])`. **Do NOT** call `removeItem`. Remove the current `removeItem` call.

**`setPersistLogs(on)`** — update `store.persistLogs`, then always call `_saveToStorage(on, store.entries)` (this persists the new flag value). **Remove** the `removeItem` call. Notify subscribers.

### `LogsPanel.tsx`

In the subscriber `useEffect`, after wiring up the subscription, **call `notify()` once immediately** so rehydrated entries are flushed to the snapshot on mount:
```ts
useEffect(() => {
  const s = getStore()
  const notify = () => {
    updateData({ logOutput: [...s.entries] })
    forceUpdate()
  }
  s._subs.add(notify)
  notify() // flush rehydrated entries to snapshot on mount
  return () => { s._subs.delete(notify) }
}, [updateData])
```

## Out of scope (unchanged)
- `LS_KEY`, `LS_MAX` values unchanged.
- No change to chip filter logic or channel checkboxes.
- No change to `merge.ts` or `types.ts`.
