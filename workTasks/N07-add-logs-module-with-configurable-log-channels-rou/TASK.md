# N07 — Add Logs module with configurable log channels, route tracking, and debugger API hook

## Goal

Build a complete logging system composed of four cooperating pieces:

1. **Config** — user declares named log channels in `config.debugger.js`
2. **Log store** — a capped `window.__debuggerLogs` singleton that all pieces share
3. **`useDebuggerLog` hook** — public API for app code to emit log entries
4. **`logsModule`** — pre-defined panel module with per-channel enable/disable toggles and a live log list

Route changes are captured automatically (same centralised pattern as `viewport-change`) and appear in the log list as a special non-filterable channel.

---

## Context

Current state (post-N06):
- `DebuggerModuleRegistryProvider` already owns `resize`/`orientationchange` listeners and broadcasts via `_send`. Route-change follows the exact same pattern.
- `useDebuggerApi().subscribe(event, handler)` is the standard way modules react to registry broadcasts.
- `DebuggerConfig` → `ResolvedDebuggerConfig` → `mergeWithDefaults()` is the established config pipeline (`src/config/types.ts`, `defaults.ts`, `merge.ts`).
- `DebuggerModuleSetup` in `Debugger.tsx` calls `useDebuggerConfig()` and is the right place to initialise the store from config.
- Pre-defined module pattern: `.tsx` for the React panel, `.ts` for the `DebuggerModuleDefinition` constant (`src/modules/predefined/`).

---

## Piece 1 — Config extension

### `src/config/types.ts`

Add:
```ts
export interface LogConfig {
  id: string
  prefix: string
}
```

Add to `DebuggerConfig`:
```ts
logs?: LogConfig[]
```

Add to `ResolvedDebuggerConfig`:
```ts
logs: LogConfig[]
```

### `src/config/defaults.ts`

```ts
logs: [],
```

### `src/config/merge.ts`

```ts
logs: userConfig.logs ?? DEFAULT_DEBUGGER_CONFIG.logs,
```

(No deep-merge needed — user replaces the full array.)

---

## Piece 2 — Log store (`src/modules/predefined/logs/logsStore.ts`)

A module-level singleton backed by `window.__debuggerLogs`.

### Types

```ts
export interface LogEntry {
  id: string        // channel id, or '__route__' for route changes
  prefix: string    // channel prefix, or 'Navigation' for route changes
  text: string      // log message or pathname+search for routes
  timestamp: number // Date.now()
}

interface LogsStore {
  registered: Map<string, string>  // id -> prefix  (set at init time)
  enabled: Set<string>             // ids currently allowed to log
  entries: LogEntry[]              // capped circular log; newest appended at end
  _subs: Set<() => void>           // React panel subscribers
}

declare global {
  interface Window { __debuggerLogs?: LogsStore }
}
```

### `MAX_ENTRIES = 500`

When `entries.length >= MAX_ENTRIES`, splice the oldest 50 entries before pushing new ones (batch splice avoids per-entry O(n) shifts).

### API

```ts
export function initLogsStore(logs: LogConfig[]): void
// Creates window.__debuggerLogs if absent, then (re)registers channels.
// On re-init (HMR), preserves existing entries and enabled state for ids
// that were already registered; adds new ids as enabled by default.

export function getStore(): LogsStore
// Returns window.__debuggerLogs, creating an empty store if not present.
// Never returns null/undefined.

export function pushEntry(entry: LogEntry): void
// Appends entry, enforces MAX_ENTRIES cap, notifies _subs.

export function setEnabled(id: string, on: boolean): void
// Toggles channel on/off, notifies _subs.
```

### Store initialisation contract

`initLogsStore` must be called **before** any `useDebuggerLog` calls reach the point of checking `registered`. It is called inside `DebuggerModuleSetup` (see Piece 4).

---

## Piece 3 — `useDebuggerLog` hook (`src/modules/predefined/logs/useDebuggerLog.ts`)

A **standalone** public hook — not inside any module render context, just a regular React hook that any component in the host app can call.

```ts
export function useDebuggerLog(id: string): (text: string) => void
```

Behaviour of the returned logger:

| Condition | Outcome |
|---|---|
| `window.__debuggerLogs` not yet initialised | `console.warn('[debugger-pro-plus-3000] useDebuggerLog: store not ready — is <Debugger> mounted?')`, no-op |
| `id` not in `store.registered` | `console.warn('[debugger-pro-plus-3000] useDebuggerLog: unknown log id "…". Register it in config.logs.')`, no-op |
| `id` in `store.registered` but not in `store.enabled` | silent no-op |
| `id` in `store.registered` and in `store.enabled` | `console.log('[${prefix}] ${text}')`, `pushEntry({ id, prefix, text, timestamp: Date.now() })` |

The returned function must be **stable** across renders (`useCallback([id])`). The check of `store.enabled` happens inside the callback at call time (not captured at hook call time), so toggling a channel in the panel takes effect immediately without re-rendering every consumer.

---

## Piece 4 — Registry: route-change broadcast

### `src/modules/DebuggerModuleRegistryProvider.tsx`

Add a second `useEffect` (separate from the viewport-change one) that patches `history.pushState` / `history.replaceState` and listens to `popstate`:

```ts
useEffect(() => {
  const notify = () => {
    const path = location.pathname + location.search + location.hash
    const payload: RouteChangePayload = { path, timestamp: Date.now() }
    for (const m of modulesRef.current) {
      _send(m.id, 'route-change', payload)
    }
    // Also push directly to the log store for persistence
    pushEntry({ id: '__route__', prefix: 'Navigation', text: path, timestamp: Date.now() })
  }

  const origPush = history.pushState
  const origReplace = history.replaceState

  history.pushState = function (...args) { origPush.apply(this, args); notify() }
  history.replaceState = function (...args) { origReplace.apply(this, args); notify() }
  window.addEventListener('popstate', notify)

  return () => {
    history.pushState = origPush
    history.replaceState = origReplace
    window.removeEventListener('popstate', notify)
  }
}, [_send])
```

### `src/modules/types.ts`

```ts
export interface RouteChangePayload {
  path: string
  timestamp: number
}
```

### Store init in `Debugger.tsx` — `DebuggerModuleSetup`

```ts
function DebuggerModuleSetup({ modules, onModuleEvent, panelProps }: SetupProps) {
  const { modules: moduleConfigs, logs } = useDebuggerConfig()
  useEffect(() => { initLogsStore(logs) }, [logs])
  // ... existing return
}
```

This runs before the panel mounts, so `useDebuggerLog` callers during the first render will have a ready store.

---

## Piece 5 — `LogsPanel` component (`src/modules/predefined/logs/LogsPanel.tsx`)

### Layout

```
┌─ Logs ──────────────────────────────────┐
│ Channels                                │
│  ☑ API          ☑ Auth        ☑ Router  │  ← one checkbox per LogConfig
│                                         │
│ Log output          [Clear]             │
│ 14:02:33.412  ⇒ /dashboard             │  ← route change (always)
│ 14:02:34.001  [API] fetching users      │
│ 14:02:34.205  [Auth] token refreshed    │
│ 14:02:35.100  ⇒ /settings              │
└─────────────────────────────────────────┘
```

### Behaviour

- **On mount**: subscribes to store (`store._subs.add(forceUpdate)`) and to `'route-change'` via `subscribe('route-change', forceUpdate)`.
- **Checkboxes**: call `setEnabled(id, checked)` — changes take effect immediately for new log calls.
- **Log list**: shows `store.entries` newest-first (reverse order). Entries where `id !== '__route__'` and the channel is currently **disabled** are **hidden** (not deleted — re-enabling shows them again). Route entries (`id === '__route__'`) always shown.
- **Timestamp**: formatted as `HH:MM:SS.mmm` (local time).
- **Log row**: `timestamp  [prefix] text` for channel logs; `timestamp  ⇒ path` for route changes.
- **Clear button**: sets `store.entries = []`, notifies `_subs`.
- **Responsive**: fits 280 px panel width; long lines wrap with `word-break: break-word`.
- **No re-render on every log**: `forceUpdate` is a `useReducer` increment, batched by React.

### Empty state

If `config.logs` is empty (`[]`): show "No log channels configured. Add `logs` to your debugger config." message in the Channels section; log list still shows route changes.

---

## Piece 6 — Module definition and barrel

### `src/modules/predefined/logs/LogsModule.ts`

```ts
export const logsModule: DebuggerModuleDefinition = {
  id: 'logs',
  title: 'Logs',
  defaultExpanded: true,
  render: () => createElement(LogsPanel),
}
```

### `src/modules/predefined/logs/index.ts`

```ts
export { logsModule } from './LogsModule'
export { useDebuggerLog } from './useDebuggerLog'
```

### `src/modules/predefined/index.ts` — add re-export

```ts
export { logsModule, useDebuggerLog } from './logs'
```

### `src/index.ts` — add to public barrel

```ts
export { logsModule, useDebuggerLog } from './modules/predefined'
export type { LogConfig, RouteChangePayload } from './modules/types' // RouteChangePayload already exists from N06 additions; LogConfig is new from config/types
```

Wait — `LogConfig` lives in `src/config/types.ts`. Export it from there:
```ts
export type { LogConfig } from './config/types'
```

---

## Memory safety

- `MAX_ENTRIES = 500` hard cap; batch-splice 50 oldest on overflow (one array op per 50 pushes, not per push).
- `_subs` holds function references only (no closures over entries) — no memory growth.
- `window.__debuggerLogs` is a plain object; no circular refs, no DOM nodes.
- `pushEntry` notifies subs synchronously but React batches the resulting `setState` calls in React 18+ — no render storms.
- History patching is cleaned up on unmount (the registry effect returns cleanup).

---

## Non-goals

- No persistence across page reloads (entries are in-memory only).
- No log level (info/warn/error) — all logs are flat. Can be added later.
- No export of log entries — the existing snapshot copy/export button does not include logs (logs are high-frequency, not snapshot data).
- No regex/text search filter in the panel — channel toggles are the only filter.
