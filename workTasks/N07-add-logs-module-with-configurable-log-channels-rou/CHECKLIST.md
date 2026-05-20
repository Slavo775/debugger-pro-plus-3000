# N07 Checklist — Logs module, route tracking, and useDebuggerLog hook

## Config extension

- [ ] `LogConfig { id, prefix }` interface added to `src/config/types.ts`
- [ ] `logs?: LogConfig[]` added to `DebuggerConfig`
- [ ] `logs: LogConfig[]` added to `ResolvedDebuggerConfig`
- [ ] Default `logs: []` in `src/config/defaults.ts`
- [ ] `logs` merged (array replace) in `src/config/merge.ts`

## Log store (`src/modules/predefined/logs/logsStore.ts`)

- [ ] `LogEntry { id, prefix, text, timestamp }` interface exported
- [ ] `window.__debuggerLogs` global type declaration
- [ ] `MAX_ENTRIES = 500` enforced; batch-splice 50 oldest on overflow
- [ ] `initLogsStore(logs: LogConfig[])` — creates store if absent, registers channels, preserves existing state for known ids
- [ ] `getStore()` — lazy init, never returns null
- [ ] `pushEntry(entry)` — appends, enforces cap, notifies `_subs`
- [ ] `setEnabled(id, on)` — toggles channel, notifies `_subs`

## Store initialisation in Debugger

- [ ] `DebuggerModuleSetup` in `src/components/Debugger.tsx` reads `config.logs`
- [ ] `useEffect(() => { initLogsStore(logs) }, [logs])` in `DebuggerModuleSetup`

## `useDebuggerLog` hook (`src/modules/predefined/logs/useDebuggerLog.ts`)

- [ ] Store not ready → `console.warn` + no-op
- [ ] Unknown id → `console.warn('[debugger-pro-plus-3000] useDebuggerLog: unknown log id "…"')` + no-op
- [ ] Disabled channel → silent no-op
- [ ] Enabled channel → `console.log('[prefix] text')` + `pushEntry`
- [ ] Returned function is stable (`useCallback([id])`)
- [ ] `enabled` check happens inside the callback (not at hook call time)

## Registry: route-change broadcast (`src/modules/DebuggerModuleRegistryProvider.tsx`)

- [ ] Separate `useEffect` (not mixed with viewport-change)
- [ ] Patches `history.pushState` and `history.replaceState`
- [ ] Listens to `popstate`
- [ ] Broadcasts `'route-change'` payload `{ path, timestamp }` to all modules via `_send`
- [ ] Also calls `pushEntry` with `{ id: '__route__', prefix: 'Navigation', text: path, timestamp }`
- [ ] Cleanup restores original `pushState`/`replaceState` and removes `popstate` listener
- [ ] `RouteChangePayload { path, timestamp }` added to `src/modules/types.ts`

## `LogsPanel` component (`src/modules/predefined/logs/LogsPanel.tsx`)

- [ ] Channels section: one checkbox per `config.logs` entry (label = prefix)
- [ ] Checkbox change calls `setEnabled(id, checked)`
- [ ] Empty channels state: "No log channels configured" message
- [ ] Log list shows `store.entries` newest-first
- [ ] Route entries (`id === '__route__'`) always shown
- [ ] Channel entries from disabled channels hidden (not deleted)
- [ ] Timestamp formatted `HH:MM:SS.mmm`
- [ ] Channel row: `timestamp  [prefix] text`
- [ ] Route row: `timestamp  ⇒ path`
- [ ] Clear button: empties `store.entries`, notifies subs
- [ ] Subscribes to store `_subs` on mount, unsubscribes on unmount
- [ ] Subscribes to `'route-change'` via `useDebuggerApi().subscribe`
- [ ] `forceUpdate` via `useReducer` increment (not `useState`)
- [ ] Responsive at 280 px; long lines wrap (`word-break: break-word`)
- [ ] Matches panel dark aesthetic (no external CSS)

## Module definition and barrels

- [ ] `src/modules/predefined/logs/LogsModule.ts` — exports `logsModule`
- [ ] `src/modules/predefined/logs/index.ts` — re-exports `logsModule`, `useDebuggerLog`
- [ ] `src/modules/predefined/index.ts` — re-exports from `./logs`
- [ ] `src/index.ts` — exports `logsModule`, `useDebuggerLog`, `LogConfig`, `RouteChangePayload`

## Dev preview (`src/main.tsx`)

- [ ] `logsModule` added to `<Debugger modules={[...]}>` array
- [ ] A demo component uses `useDebuggerLog` to emit a few log entries
- [ ] `config.debugger.js` updated with sample `logs` channels (e.g. `api`, `auth`)

## Quality gates

- [ ] TypeScript: no errors (`tsc --noEmit`)
- [ ] ESLint: 0 warnings (`eslint . --max-warnings 0`)

## Manual verification

- [ ] Panel shows Logs module with per-channel checkboxes
- [ ] Checking/unchecking a channel immediately enables/disables future logs
- [ ] `useDebuggerLog('api')('hello')` appears in console as `[API] hello` and in panel
- [ ] `useDebuggerLog('unknown')` logs a warning to console, nothing in panel
- [ ] Navigate to a different route → "⇒ /new-path" appears in log list
- [ ] Route changes appear even when all channels are unchecked
- [ ] Clear button empties the log list
- [ ] At 500+ entries, oldest entries are dropped (no memory growth)
- [ ] Panel at 280 px — no overflow, long log lines wrap
