# N14 — Add consoleLoggerModule — Checklist

## Done criteria

- [ ] `src/modules/predefined/consoleLogger/consoleLoggerStore.ts` exists with `patchConsole`, `restoreConsole`, `getConsoleLoggerStore`, `subscribeConsoleLogger` exports
- [ ] `ConsoleLogEntry` type defined: `{ id: number; ts: number; level: ConsoleLogLevel; args: unknown[] }`
- [ ] `ConsoleLogLevel` covers exactly: `log | info | warn | error | debug | table | trace | assert`
- [ ] Patch wrapper calls original console method **before** pushing to store (native output preserved)
- [ ] `assert` entries only recorded when first argument is falsy
- [ ] `restoreConsole()` fully restores all 8 patched methods on `window.console`
- [ ] `window.__debuggerConsoleLogger` is a lazy-init singleton with `_subs: Set<() => void>`
- [ ] `ConsoleLoggerPanel.tsx` patches console on mount via `useEffect`, restores on unmount
- [ ] Panel calls `updateData({ consoleLogs: store.entries })` on every new entry
- [ ] Panel uses `useReducer` forceUpdate pattern (same as LogsPanel)
- [ ] Panel reads `maxEntries` from `useDebuggerConfig().consoleLogger.maxEntries`
- [ ] Entries rendered in reverse-chronological order with level color-coding
- [ ] `consoleLoggerModule` definition has `id: 'consoleLogger'`, `title: 'Console'`, `render` returning `<ConsoleLoggerPanel />`
- [ ] `src/modules/predefined/consoleLogger/index.ts` barrel re-exports all public items
- [ ] Four config files updated: `types.ts`, `defaults.ts`, `merge.ts`, `src/index.ts` (INVARIANT 4)
- [ ] Default `maxEntries: 500` in `defaults.ts`
- [ ] `src/index.ts` re-exports `consoleLoggerModule`, store utils, and types (INVARIANT 6)
- [ ] `Debugger.tsx` has zero imports from `predefined/consoleLogger/`
- [ ] `DebuggerModuleRegistryProvider.tsx` has zero imports from `predefined/consoleLogger/`
- [ ] `src/main.tsx` dev preview includes `consoleLoggerModule` in `modules` array

## Quality gates

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run build` produces `dist/` without errors
- [ ] No regressions in `logsModule`, `networkModule`, `deviceInfoModule`

## Verification

- [ ] `npm run dev` → Console panel visible in debugger accordion
- [ ] `console.log('test', 123)` in browser DevTools → entry appears in Console panel AND in DevTools (original not suppressed)
- [ ] `console.warn('oops')` → yellow-styled entry in panel
- [ ] `console.error(new Error('boom'))` → red entry in panel
- [ ] `console.table([{a:1}])` → cyan entry, first arg shown as JSON
- [ ] `console.assert(false, 'fail')` → red-bold assert entry appears
- [ ] `console.assert(true, 'no record')` → NO entry added (condition truthy)
- [ ] Copy Snapshot → paste JSON → `consoleLogs` array present with correct entries
- [ ] Remove `consoleLoggerModule` from `modules` in `src/main.tsx` → rebuild → no console patching (native console untouched)
- [ ] Add 600 log entries → only last 500 retained (maxEntries cap enforced)
