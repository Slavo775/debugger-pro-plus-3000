# N14 — Add consoleLoggerModule — intercept window.console and surface logs in debugger

**Type:** feat
**Priority:** medium
**Created:** 2026-05-24

## Problem

There is no way to see `console.log`, `console.warn`, `console.error`, `console.info`, `console.debug`, `console.table`, `console.trace` output inside the debugger panel. Developers must keep DevTools open alongside the debugger. Additionally, the debug snapshot does not include console output, so copied snapshots omit error context.

## Goal

1. Create `consoleLoggerModule` — a predefined module that intercepts `window.console` methods and stores each call in a dedicated store.
2. The module patches `window.console` on init (inside its panel `useEffect`) and restores originals on unmount.
3. The panel displays intercepted entries grouped/colored by level: `log`, `info`, `warn`, `error`, `debug`, `table`, `trace`, `assert`.
4. Each new console entry triggers `updateData(patch)` so the debug snapshot always contains the latest console log buffer.
5. `Debugger.tsx` and the registry have zero imports from `consoleLoggerModule` — the host/guest invariant is preserved.

## Scope

### In scope

- `src/modules/predefined/consoleLogger/consoleLoggerModule.ts` — module definition
- `src/modules/predefined/consoleLogger/consoleLoggerStore.ts` — `window.__debuggerConsoleLogger` singleton, patches/restores console, stores entries
- `src/modules/predefined/consoleLogger/ConsoleLoggerPanel.tsx` — panel component; patches console on mount, restores on unmount, renders entries
- `src/modules/predefined/consoleLogger/index.ts` — barrel re-export
- `src/index.ts` — re-export `consoleLoggerModule` and store utilities (INVARIANT 6)
- `src/config/types.ts`, `src/config/defaults.ts`, `src/config/merge.ts`, `src/index.ts` — add optional `consoleLogger?: { maxEntries?: number }` config field (INVARIANT 4, four-file rule)
- Snapshot integration: call `updateData({ consoleLogs: store.entries })` on every new entry so copy-snapshot includes console output

### Out of scope

- Changes to `Debugger.tsx`, `DebuggerModuleRegistryProvider.tsx`, or any other predefined module
- Intercepting `console.clear`, `console.count`, `console.countReset`, `console.group*`, `console.time*`, `console.profile*`, `console.dir`, `console.dirxml`, `console.context`, `console.createTask`, `console.memory` — capture only: `log`, `info`, `warn`, `error`, `debug`, `table`, `trace`, `assert`
- Persisting logs across page reloads
- Log filtering UI
- Deduplication or rate-limiting of log entries

## Implementation plan

1. **Create store** (`src/modules/predefined/consoleLogger/consoleLoggerStore.ts`)
   - Define `ConsoleLogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug' | 'table' | 'trace' | 'assert'`
   - Define `ConsoleLogEntry = { id: number; ts: number; level: ConsoleLogLevel; args: unknown[] }`
   - `window.__debuggerConsoleLogger` lazy-init singleton: `{ entries: ConsoleLogEntry[], _subs: Set<() => void>, _originals: Partial<Record<ConsoleLogLevel, (...args: unknown[]) => void>> }`
   - `patchConsole(maxEntries: number)` — for each of the 8 levels, store original in `_originals`, replace with wrapper that: calls `_originals[level](...args)` first (native output preserved), then pushes entry, trims to `maxEntries`, notifies `_subs`; special case `assert`: only record entry when first arg is falsy
   - `restoreConsole()` — restores `window.console[level]` from `_originals` for all patched levels
   - `subscribeConsoleLogger(fn: () => void): () => void` and `getConsoleLoggerStore()` exports

2. **Create panel** (`src/modules/predefined/consoleLogger/ConsoleLoggerPanel.tsx`)
   - `useReducer` forceUpdate pattern (same as `LogsPanel`)
   - `useEffect` on mount: call `patchConsole(maxEntries)`, subscribe to store, call `updateData({ consoleLogs: store.entries })`; on unmount: unsubscribe, call `restoreConsole()`
   - Read `maxEntries` from `useDebuggerConfig().consoleLogger.maxEntries`
   - On each store notification: call `updateData({ consoleLogs: store.entries })` then `forceUpdate()`
   - Render entries in reverse-chronological order; color-code by level (warn=yellow, error=red, info=blue, debug=gray, log=default, table=cyan, trace=gray italic, assert=red bold)
   - Format: `[LEVEL] HH:mm:ss.mmm args...`; for `table` level stringify first arg as JSON if object

3. **Create module definition** (`src/modules/predefined/consoleLogger/consoleLoggerModule.ts`)
   - Export `consoleLoggerModule: DebuggerModuleDefinition` with `id: 'consoleLogger'`, `title: 'Console'`, `render: () => <ConsoleLoggerPanel />`

4. **Create barrel** (`src/modules/predefined/consoleLogger/index.ts`)
   - Re-export `consoleLoggerModule`, `getConsoleLoggerStore`, `subscribeConsoleLogger`, `ConsoleLogEntry`, `ConsoleLogLevel`

5. **Add config field** (four-file rule — INVARIANT 4)
   - `src/config/types.ts`: add `consoleLogger?: { maxEntries?: number }` to `DebuggerConfig`
   - `src/config/defaults.ts`: add `consoleLogger: { maxEntries: 500 }` to `DEFAULT_DEBUGGER_CONFIG`
   - `src/config/merge.ts`: spread user `consoleLogger` over default
   - `src/index.ts`: re-export `ConsoleLoggerConfig` type if extracted separately

6. **Update public re-export** (`src/index.ts`)
   - `export { consoleLoggerModule } from './modules/predefined/consoleLogger'`
   - `export { getConsoleLoggerStore, subscribeConsoleLogger } from './modules/predefined/consoleLogger'`
   - `export type { ConsoleLogEntry, ConsoleLogLevel } from './modules/predefined/consoleLogger'`

7. **Dev preview** (`src/main.tsx`)
   - Add `consoleLoggerModule` to the dev preview `modules` array for local testing

8. **Verify build and types**
   - `npx tsc --noEmit`, `npm run lint`, `npm run build`

## Verification

```bash
npm run dev
# Open browser DevTools console → type: console.warn('hello'); console.error(new Error('oops'))
# → Console panel in debugger shows entries with correct level colors
# → Copy Snapshot → paste JSON → verify consoleLogs array is present and populated
npx tsc --noEmit   # zero errors
npm run lint       # zero warnings
npm run build      # dist/ produced without errors
```

## Notes

- Wrapper must call the **original** function first so DevTools still shows the log — never suppress native console output.
- `window.__debuggerConsoleLogger` follows the same lazy-init singleton pattern as `window.__debuggerLogs` and `window.__debuggerNetwork`.
- If `consoleLoggerModule` is absent from consumer's `modules` prop, `ConsoleLoggerPanel` never mounts and `window.console` is never patched — zero side-effects when module is absent (INVARIANT 3).
- `assert` special case: `console.assert(condition, ...args)` — only push entry when `condition` is falsy, matching native behavior.
- No breaking change: adds optional `consoleLogger` config key; existing consumers unaffected.
- Related: N13 (snapshot/notification infra), N11 (config shape pattern to follow), INVARIANT 7 (sub-folder pattern with store).
