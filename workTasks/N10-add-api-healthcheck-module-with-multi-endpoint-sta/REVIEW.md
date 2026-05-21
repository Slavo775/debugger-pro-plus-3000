# N10 Review

## AI Review — approved

All checklist items pass. One non-blocking edge case noted: stale in-flight fetch writes
can land on a re-initialised store if `initNetworkStore` is called again before previous
fetches complete. Dependency on the `network` object reference in `useEffect` is consistent
with the existing logs pattern. Build and lint clean.

## Human Review round 1 — approved

Approved by human reviewer without changes requested.

## Human Review round 2 — fix-needed

### Blocker: module init must not run unless the module is present

`initNetworkStore` was called unconditionally from `Debugger.tsx` regardless of whether
`networkModule` was added to the modules prop. Fixed: moved into `NetworkPanel`.

## Human Review round 3 — fix-needed

### Blocker A: initLogsStore still in Debugger.tsx

`Debugger.tsx` imports and calls `initLogsStore(logs, persistLogs)` unconditionally — same
violation as `initNetworkStore` was. If `logsModule` is not in the `modules` array,
`initLogsStore` still runs and the logs store is initialised for nothing.

**Fix**: Remove `initLogsStore` import and `useEffect` from `Debugger.tsx`. Move the call
into `LogsPanel.tsx` via `useDebuggerConfig()`:

```ts
// LogsPanel.tsx
const { logs, persistLogs } = useDebuggerConfig()
useEffect(() => { initLogsStore(logs, persistLogs) }, [logs, persistLogs])
```

### Blocker B: DebuggerModuleRegistryProvider imports pushEntry from logs store

`DebuggerModuleRegistryProvider.tsx` imports `pushEntry` from `./predefined/logs/logsStore`
and calls it directly inside the route-change handler. The registry is Debugger infrastructure
and must not import from any module.

**Fix**: Remove `pushEntry` from the registry. The registry already fires a `route-change`
event to all modules. `LogsPanel` already subscribes to `route-change` — extend that handler
to push the entry to the store itself:

```ts
// LogsPanel.tsx — in the route-change subscribe effect
subscribe('route-change', (payload) => {
  const { path, timestamp } = payload as RouteChangePayload
  pushEntry({ id: '__route__', prefix: 'Navigation', text: path, timestamp })
  forceUpdate()
})
```

After this fix `DebuggerModuleRegistryProvider` has zero module imports and the route log
entry only appears when `logsModule` is mounted.
