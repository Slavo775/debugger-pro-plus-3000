# N11 Checklist

## Config types
- [ ] Remove `logs?: LogConfig[]` from `DebuggerConfig`
- [ ] Remove `persistLogs?: boolean` from `DebuggerConfig`
- [ ] Remove `network?: NetworkConfig` from `DebuggerConfig`
- [ ] Remove `logs`, `persistLogs`, `network` from `ResolvedDebuggerConfig`
- [ ] Decide whether `LogConfig`, `ApiEndpointConfig`, `NetworkConfig` stay exported (for consumer typing)

## Defaults
- [ ] Remove `logs`, `persistLogs`, `network` from `DEFAULT_DEBUGGER_CONFIG`

## Merge
- [ ] Remove `logs`, `persistLogs`, `network` merge lines from `merge.ts`

## LogsPanel
- [ ] Replace `useDebuggerConfig()` logs/persistLogs reads with `useDebuggerApi().moduleData`
- [ ] Cast `moduleData.logs` to `LogConfig[]` with `?? []` fallback
- [ ] Cast `moduleData.persistLogs` to `boolean` with `?? false` fallback

## NetworkPanel
- [ ] Replace `useDebuggerConfig()` network.apis read with `useDebuggerApi().moduleData`
- [ ] Cast `moduleData.apis` to `ApiEndpointConfig[]` with `?? []` fallback

## Public exports
- [ ] Remove `LogConfig` export from `src/index.ts` (or keep with a note if still useful)
- [ ] Remove `ApiEndpointConfig`, `NetworkConfig` exports (or keep)

## Dev preview
- [ ] Update `config.debugger.js` to new shape
- [ ] Verify `src/main.tsx` still works

## Quality gates
- [ ] `npm run build` passes
- [ ] `npm run lint` passes (0 warnings)
- [ ] Dev server shows Logs panel receiving entries from `useDebuggerLog`
- [ ] Dev server shows Network panel fetching configured endpoints
- [ ] Removing a module entry from `modules[]` silences its data reads (no errors)

## Docs
- [ ] Update README config examples to new unified shape
- [ ] Update `ARCHITECTURE.md` config section if referenced
