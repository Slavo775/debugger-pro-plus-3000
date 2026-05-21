# Architecture

## Core Principle

**The Debugger is a host. Modules are guests. The host never knows the guest.**

`Debugger.tsx` and `DebuggerModuleRegistryProvider` have zero imports from any module.
Adding or removing a module requires no changes to Debugger source code.

---

## System Layers

```
┌─────────────────────────────────────────────────────────┐
│  Consumer App                                           │
│  config.debugger.js  ─►  <Debugger modules={[...]} />  │
└───────────────────────────┬─────────────────────────────┘
                            │
            ┌───────────────▼───────────────┐
            │   Config Layer                │
            │   DebuggerConfigProvider      │
            │   mergeWithDefaults()         │
            │   useDebuggerConfig()         │
            └───────────────┬───────────────┘
                            │
            ┌───────────────▼───────────────┐
            │   Debugger Panel (Host)       │
            │   FAB entry point             │
            │   AccordionItem renderer      │
            │   DebuggerModuleRegistry-     │
            │   Provider (API broker)       │
            └───────────────┬───────────────┘
                            │ single channel
            ┌───────────────▼───────────────┐
            │   Module API                  │
            │   useDebuggerApi()            │
            └───────────────┬───────────────┘
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
  ┌────▼─────┐      ┌───────▼──────┐     ┌──────▼──────┐
  │ logsModule│     │networkModule │     │ yourModule  │
  │ LogsPanel │     │NetworkPanel  │     │ YourPanel   │
  └───────────┘     └──────────────┘     └─────────────┘
```

---

## Communication — Single Channel

`useDebuggerApi()` is the **only** way a module communicates with the Debugger.
There is no other channel. Calling it outside a module `render()` throws.

| Direction | Method | Purpose |
|-----------|--------|---------|
| Module → outside | `emit(event, payload)` | Fires `onModuleEvent` on the consumer app |
| Debugger → Module | `subscribe(event, handler)` | Receives system events |
| Module → snapshot | `updateData(patch)` | Writes key/value data into the debug snapshot |
| Config → Module | `useDebuggerConfig()` | Read-only access to resolved config (separate from the API) |

### System events broadcast to all modules

| Event | Payload type | Fired when |
|-------|-------------|------------|
| `route-change` | `RouteChangePayload` | `history.pushState / replaceState / popstate` |
| `viewport-change` | `ViewportChangePayload` | `resize / orientationchange` |

---

## Module Contract

A module is a plain `DebuggerModuleDefinition` object:

```ts
{
  id: string            // unique, used for API routing and config matching
  title?: string        // accordion header label
  defaultExpanded?: boolean
  data?: Record<string, unknown>  // static data merged into snapshot
  render: () => ReactNode         // panel content
}
```

`render()` is called inside `DebuggerModuleIdContext.Provider`. This context provides the
module's `id` to `useDebuggerApi()`. Without it the hook throws — so the API is automatically
scoped to the correct module.

**All module side-effects must live inside `render()` components, gated by mount.**
If the module is absent from the `modules` array its panel never mounts and its init never runs.

---

## Adding / Removing a Module

```ts
// Add
<Debugger modules={[logsModule, networkModule, myModule]} />

// Remove — no Debugger changes needed
<Debugger modules={[logsModule]} />
```

---

## Module Ordering

Modules render in the order of the `modules` prop array by default.
Override per-module via `config.modules[].order` (lower = higher position):

```js
// config.debugger.js
modules: [
  { id: 'network', order: 0 },  // rendered first
  { id: 'logs',    order: 1 },
]
```

Modules without an `order` value keep their natural prop-array position (stable relative to each other).

---

## Consumer-Facing APIs

These are the surfaces the consumer app uses — none of them couple the Debugger to a specific module:

| Export | What it is |
|--------|-----------|
| `<Debugger>` | Host component |
| `useDebuggerLog(id)` | Logging hook — pushes entries into the logs store from anywhere in the app |
| `onModuleEvent` prop | Event bridge — modules emit, app receives |
| `logsModule` | Predefined logs panel |
| `networkModule` | Predefined API healthcheck panel |
| `deviceInfoModule` | Predefined device info panel |
| `useDebuggerConfig()` | Read resolved config inside any component under `DebuggerConfigProvider` |

---

## Predefined Module Patterns

**Flat** (simple, no store):
```
DeviceInfoModule.ts   — DebuggerModuleDefinition export
DeviceInfoPanel.tsx   — React component
```

**Sub-folder** (complex, owns a store):
```
network/
  networkModule.ts    — DebuggerModuleDefinition export
  networkStore.ts     — window.__debuggerNetwork singleton + subscriber set
  NetworkPanel.tsx    — reads useDebuggerConfig(), self-inits store on mount
  index.ts            — re-exports for predefined/index.ts
```

Stores use `window.__debuggerXxx` as a lazy-init singleton. React panels subscribe via a
`_subs: Set<() => void>` and re-render using `useReducer` as a `forceUpdate`.

---

## Invariants (enforce in every PR)

1. `src/components/Debugger.tsx` — zero imports from `modules/predefined/`
2. `src/modules/DebuggerModuleRegistryProvider.tsx` — zero imports from `modules/predefined/`
3. All module init/side-effects live inside the module's panel component
4. `useDebuggerApi()` is the single communication channel — no direct store calls across modules
5. Every new public export must be added to `src/index.ts`
