# N06 Human Review — Round 2

**Reviewer:** Human (task-human-review)
**Verdict:** fix-needed

## Feedback

> "please can we update the values when something change maybe it can be through debugger api so debugger listen on size change portrait landscape and so on for usage and module can subscribe on this changes please do that"

## Requested Change

Currently `DeviceInfoPanel` adds its own `resize` and `orientationchange` listeners directly to `window`. The human wants the **debugger itself** (the registry provider) to own those window listeners and broadcast viewport/orientation changes through the existing event system, so any module can subscribe to them via `useDebuggerApi().subscribe(...)`.

This is an architectural improvement: centralised browser event management in the registry, modules stay decoupled from `window`.

---

## Required Changes

### 1. `src/modules/DebuggerModuleRegistryProvider.tsx`

Add a `useEffect` that listens to `resize` and `orientationchange` on `window` and broadcasts a `'viewport-change'` event to all registered modules:

```ts
const modulesRef = useRef(modules)
modulesRef.current = modules

useEffect(() => {
  const broadcast = (event: string, payload: unknown) => {
    for (const m of modulesRef.current) {
      _send(m.id, event, payload)
    }
  }
  const onViewportChange = () =>
    broadcast('viewport-change', {
      width: window.innerWidth,
      height: window.innerHeight,
      orientation: screen.orientation?.type ?? 'unknown',
      devicePixelRatio: window.devicePixelRatio,
    })
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('orientationchange', onViewportChange)
  return () => {
    window.removeEventListener('resize', onViewportChange)
    window.removeEventListener('orientationchange', onViewportChange)
  }
}, [_send])
```

### 2. `src/modules/types.ts`

Export a typed payload for the event:

```ts
export interface ViewportChangePayload {
  width: number
  height: number
  orientation: string
  devicePixelRatio: number
}
```

### 3. `src/modules/predefined/DeviceInfoPanel.tsx`

Remove the direct `window.addEventListener` calls. Replace with:
- `useState(collectDeviceData)` to hold current data reactively
- `useEffect` → `subscribe('viewport-change', ...)` to re-collect on each broadcast

```ts
const [data, setData] = useState(collectDeviceData)
const { updateData, subscribe } = useDebuggerApi()

useEffect(() => {
  updateData(data as unknown as Record<string, unknown>)
}, [data, updateData])

useEffect(() => {
  return subscribe('viewport-change', () => {
    setData(collectDeviceData())
  })
}, [subscribe])
```

The render then reads from `data` state instead of calling `collectDeviceData()` inline.

### 4. `src/index.ts` / `src/modules/types.ts`

Export `ViewportChangePayload` from the public barrel so consumers can type their own viewport-change subscribers.

---

## Blockers

- [ ] `DeviceInfoPanel` still owns its own window listeners — violates the new architecture
- [ ] Registry does not broadcast any browser events — modules have no way to subscribe to viewport changes
- [ ] `ViewportChangePayload` type not defined or exported
