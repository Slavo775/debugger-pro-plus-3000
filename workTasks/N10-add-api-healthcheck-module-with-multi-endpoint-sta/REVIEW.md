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

`initNetworkStore` is called unconditionally from `Debugger.tsx` via a top-level `useEffect`,
regardless of whether `networkModule` was added to the `modules` prop. This means fetch requests
fire and the store is mutated even when the consumer never added the Network panel.

The same architectural principle applies to ALL predefined modules: **a module's init/side-effect
logic must only execute when that module is actually mounted**. Nothing from a module should
trigger if the module is absent.

### Required fix

Remove `initNetworkStore` (and its import) from `Debugger.tsx`. Move the call into `NetworkPanel`
itself via a `useEffect` that reads `network.apis` from `useDebuggerConfig()`:

```ts
// NetworkPanel.tsx
const { network } = useDebuggerConfig()
useEffect(() => { initNetworkStore(network.apis) }, [network])
```

`NetworkPanel` only mounts when `networkModule` is in the `modules` array, so the store init —
and all fetch traffic — is automatically gated by module presence.

The `initLogsStore` call in `Debugger.tsx` has the same problem but is out of scope for this
task. This task must fix the network side.

### No other blockers
