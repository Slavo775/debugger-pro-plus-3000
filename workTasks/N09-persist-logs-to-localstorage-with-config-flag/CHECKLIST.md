# N09 Checklist

## Config types
- [ ] `persistLogs?: boolean` added to `DebuggerConfig` in `src/config/types.ts`
- [ ] `persistLogs: boolean` added to `ResolvedDebuggerConfig` in `src/config/types.ts`
- [ ] `persistLogs: false` added to `DEFAULT_DEBUGGER_CONFIG` in `src/config/defaults.ts`

## logsStore — constants and store shape
- [ ] `LS_KEY = '__debugger_logs__'` constant defined
- [ ] `LS_MAX = 50` constant defined
- [ ] `persistLogs: boolean` field added to `LogsStore` interface
- [ ] `persistLogs: false` initialised in `getStore()` factory

## logsStore — init and load
- [ ] `initLogsStore` signature updated to `(logs: LogConfig[], persistLogs: boolean): void`
- [ ] `initLogsStore` sets `store.persistLogs = persistLogs`
- [ ] When `persistLogs` is `true`, existing localStorage entries are loaded and prepended to `store.entries`
- [ ] Loaded entries do not push the in-memory buffer beyond `MAX_ENTRIES`
- [ ] `_loadFromStorage` returns `[]` on parse error or missing key (no thrown errors)

## logsStore — save on push/clear
- [ ] `pushEntry` calls `_saveToStorage(store.entries)` when `store.persistLogs` is `true`
- [ ] `_saveToStorage` writes only the last `LS_MAX` (50) entries to localStorage
- [ ] `_saveToStorage` swallows all errors silently
- [ ] `clearEntries` calls `localStorage.removeItem(LS_KEY)` when `store.persistLogs` is `true`

## logsStore — setPersistLogs
- [ ] `setPersistLogs(on: boolean)` exported from `logsStore.ts`
- [ ] Turning on: immediately calls `_saveToStorage(store.entries)` to persist current buffer
- [ ] Turning off: calls `localStorage.removeItem(LS_KEY)`
- [ ] Notifies all subscribers after toggling

## Debugger.tsx
- [ ] `persistLogs` destructured from `useDebuggerConfig()` in `DebuggerModuleSetup`
- [ ] `initLogsStore(logs, persistLogs)` called (second argument added)

## LogsPanel.tsx — Persist log checkbox
- [ ] `setPersistLogs` imported from `./logsStore`
- [ ] Checkbox reads current value from `getStore().persistLogs` (reactive via existing `forceUpdate`)
- [ ] Checkbox `onChange` calls `setPersistLogs(e.target.checked)`
- [ ] Label text is exactly `Persist log`
- [ ] Thin divider rendered between channel checkboxes and Persist log row
- [ ] Checkbox `accentColor` uses `cfg.style.primaryColor`
- [ ] Checkbox visible even when no log channels are configured

## Quality gates
- [ ] `npm run build` passes with no type errors
- [ ] ESLint passes (`npm run lint`)
- [ ] Dev preview: set `persistLogs: true` in config → push logs → reload page → logs reappear in panel
- [ ] Dev preview: max 50 entries written to `localStorage.__debugger_logs__`
- [ ] Dev preview: "Persist log" checkbox toggles persistence regardless of config value
- [ ] Dev preview: unchecking "Persist log" removes the localStorage key
- [ ] Dev preview: `clearEntries` (Clear button) also removes the localStorage key when persist is on
- [ ] Snapshot (Copy Debug Info) includes rehydrated entries in `logs.logOutput`
- [ ] No runtime errors in console during normal operation
