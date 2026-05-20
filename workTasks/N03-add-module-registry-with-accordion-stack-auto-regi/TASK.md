# N03 — Add module registry with accordion stack, render-prop modules, and Debugger API

## Goal

Replace the flat tab+plugin system with a **stacked accordion UI** driven by a **prop-based module definition list**. Users pass a `modules` array to `<Debugger>` — each entry has an `id` and a `render` function. The debugger and its modules exchange data exclusively through a **Debugger API** (event bus in context). No module talks to another directly.

## Why not `<DebuggerModule>` JSX children?

The JSX children wrapper pattern (`<DebuggerModule id="x"><Component /></DebuggerModule>`) was the original design. It is replaced by a `modules` prop array for three reasons:

1. **Framework-agnostic evolution** — `render: () => ReactNode` is the React adapter today; the same slot can become `mount: (el: HTMLElement) => () => void` in a future task (N0X) to support Vue, Angular, web components, and vanilla JS without changing the registry or event bus.
2. **Explicit order** — the `modules` array defines render order directly; no React-child ordering ambiguity.
3. **Separation of concerns** — module metadata lives in `config.modules[]`; the render function lives in the prop; no mixed JSX.

`<DebuggerModule>` as a user-facing wrapper component is **not part of this task's public API**. It may be added as a secondary convenience in a future task if there is demand.

---

## Architecture

### New files

```
src/modules/
  types.ts                          — all module-related TypeScript types
  DebuggerModuleRegistryContext.ts  — React context (no logic)
  DebuggerModuleRegistryProvider.tsx — Provider: derived registry + event bus
  useDebuggerApi.ts                 — Hook for module content: { emit, subscribe, moduleData }
  index.ts                          — barrel export
```

### Modified files

| File | Change |
|------|--------|
| `src/config/types.ts` | Add `DebuggerModuleConfig`; extend `DebuggerConfig.modules` |
| `src/config/defaults.ts` | Add `modules: []` to defaults |
| `src/config/merge.ts` | Merge `modules` array (replace by ID) |
| `src/config/loadDebuggerConfig.ts` | Validate module configs |
| `src/components/Debugger.tsx` | Wrap with `DebuggerModuleRegistryProvider`; replace tab bar + content with accordion stack; add `modules` and `onModuleEvent` props |
| `src/index.ts` | Export `useDebuggerApi`, all new public types |

---

## Types (`src/modules/types.ts`)

```ts
// Config shape (from config.debugger.js — metadata only, no render)
export interface DebuggerModuleConfig {
  id: string
  title?: string              // display name in accordion header; falls back to id
  defaultExpanded?: boolean   // default: true
  data?: Record<string, unknown>  // arbitrary static data passed to module via useDebuggerApi()
}

// One entry in the modules prop passed to <Debugger> — the React adapter
export interface DebuggerModuleDefinition {
  id: string
  title?: string              // overrides config.title (config still takes precedence if both set)
  defaultExpanded?: boolean   // overrides config.defaultExpanded
  data?: Record<string, unknown>   // merged on top of config.data (shallow)
  render: () => React.ReactNode    // React adapter — future: mount?: (el: HTMLElement) => () => void
}

// Resolved entry inside the registry (config + prop merged)
export interface RegisteredModule {
  id: string
  title: string               // resolved from config > prop > id
  expanded: boolean
  data: Record<string, unknown>
  render: () => React.ReactNode
}

// Event bus
export type ModuleEventHandler = (payload: unknown) => void

export interface DebuggerApiContextValue {
  _modules: RegisteredModule[]
  _toggleExpanded(id: string): void
  _emit(moduleId: string, event: string, payload: unknown): void
  _subscribe(moduleId: string, event: string, handler: ModuleEventHandler): () => void
  _send(moduleId: string, event: string, payload: unknown): void
}

// Public surface of useDebuggerApi()
export interface DebuggerApi {
  emit(event: string, payload?: unknown): void
  subscribe(event: string, handler: ModuleEventHandler): () => void
  moduleData: Record<string, unknown>
}
```

---

## Registry Provider (`src/modules/DebuggerModuleRegistryProvider.tsx`)

Accepts:
- `moduleDefinitions: DebuggerModuleDefinition[]` — from `<Debugger modules={...}>`
- `moduleConfigs: DebuggerModuleConfig[]` — from resolved config
- `onModuleEvent?: (id, event, payload) => void`

**Derived registry** (no dynamic register/unregister — computed from props):
- Build `RegisteredModule[]` by merging `moduleDefinitions` + `moduleConfigs` by ID:
  - Title precedence: `config.title > definition.title > id`
  - `defaultExpanded` precedence: `config.defaultExpanded > definition.defaultExpanded > true`
  - `data` = shallow merge of `config.data` over `definition.data` (config wins on key conflicts)
- `expanded` state lives in `useState` keyed by ID, seeded from `defaultExpanded`
- When `moduleDefinitions` prop changes identity, re-derive (useMemo)

**Event bus** (dynamic — survives across renders):
- `_subscribe(id, event, handler)` → stores in `Map<id, Map<event, Set<handler>>>`, returns cleanup
- `_send(id, event, payload)` → calls all handlers for that id+event
- `_emit(id, event, payload)` → calls `onModuleEvent` prop

---

## Hook (`src/modules/useDebuggerApi.ts`)

```ts
export function useDebuggerApi(): DebuggerApi
```

- Reads own module ID from `DebuggerModuleIdContext` (set by the accordion item renderer before calling `render()`)
- Throws a descriptive error if called outside a module render context
- `emit(event, payload?)` → calls `_emit` with own ID
- `subscribe(event, handler)` → calls `_subscribe` with own ID, returns unsub fn
- `moduleData` → `registry.find(m => m.id === ownId)?.data ?? {}`

The accordion renderer sets the context:
```tsx
// Inside the panel, for each module:
<DebuggerModuleIdContext.Provider value={module.id}>
  {module.render()}
</DebuggerModuleIdContext.Provider>
```

This is transparent to the user — `useDebuggerApi()` just works inside any component returned by `render`.

---

## Debugger Component Changes

### New / changed props
```ts
interface DebuggerModuleDefinition {
  id: string
  title?: string
  defaultExpanded?: boolean
  data?: Record<string, unknown>
  render: () => React.ReactNode
}

interface DebuggerProps {
  plugins?: DebuggerPlugin[]   // kept for backward compat
  defaultOpen?: boolean
  config?: DebuggerConfig
  modules?: DebuggerModuleDefinition[]   // NEW primary module API
  onModuleEvent?: (moduleId: string, event: string, payload: unknown) => void  // NEW
  // children: REMOVED — use modules prop instead
}
```

### Rendering tree
```
<DebuggerConfigProvider>
  <DebuggerModuleRegistryProvider
    moduleDefinitions={modules ?? []}
    moduleConfigs={resolvedConfig.modules}
    onModuleEvent={onModuleEvent}
  >
    <DebuggerPanel />   ← reads registry, renders accordion + FAB
  </DebuggerModuleRegistryProvider>
</DebuggerConfigProvider>
```

### Panel content area — accordion stack

- Remove tab bar and active-plugin content area entirely
- Content area = scrollable `<ul>` of accordion items
- Each `<li>`: header row (title left, chevron right) + collapsible body
- Chevron: ▾ when expanded, ▸ when collapsed; rotates on toggle
- Body: `overflow: hidden` + animated height + opacity
- Clicking header → `_toggleExpanded(id)`
- Body renders: `<DebuggerModuleIdContext.Provider value={id}>{module.render()}</DebuggerModuleIdContext.Provider>`
- Empty state: "No modules loaded." hint when registry is empty and no plugins
- Legacy `plugins` prop: each plugin is inserted as a synthetic `RegisteredModule` at the **front** of the list using `plugin.render` as the render fn; plugins have no config metadata (title = plugin.label)

---

## Config shape extension

### `src/config/types.ts`
```ts
export interface DebuggerModuleConfig {
  id: string
  title?: string
  defaultExpanded?: boolean
  data?: Record<string, unknown>
}

export interface DebuggerConfig {
  style?: DebuggerStyleConfig
  button?: DebuggerButtonConfig
  panel?: DebuggerPanelConfig
  modules?: DebuggerModuleConfig[]   // NEW
}

export type ResolvedDebuggerConfig = Required<{
  // ...existing...
  modules: DebuggerModuleConfig[]    // NEW (never undefined)
}>
```

### Loader validation (`loadDebuggerConfig.ts`)
- `modules` must be an array; if missing → default `[]`
- Each entry: `id` non-empty string (required), `title` string|undefined, `defaultExpanded` boolean|undefined, `data` plain object|undefined
- Invalid entries skipped with `[debugger-pro-plus-3000]` prefixed console.warn

### `config.debugger.js` example
```js
export default {
  modules: [
    { id: 'network', title: 'Network', defaultExpanded: true, data: { baseUrl: '/api' } },
    { id: 'state', title: 'App State', defaultExpanded: false },
  ]
}
```

---

## Usage example (consumer app)

```tsx
import { Debugger, useDebuggerApi } from 'debugger-pro-plus-3000'

function NetworkPanel() {
  const { emit, subscribe, moduleData } = useDebuggerApi()
  // moduleData.baseUrl === '/api'  (from config.modules[0].data)

  useEffect(() => {
    return subscribe('highlight', (payload) => console.log('highlight', payload))
  }, [subscribe])

  return (
    <button onClick={() => emit('request', { url: '/api/users' })}>
      Fetch users
    </button>
  )
}

function StatePanel() {
  const { moduleData } = useDebuggerApi()
  return <pre>{JSON.stringify(moduleData, null, 2)}</pre>
}

function App() {
  return (
    <Debugger
      config={loadedConfig}
      modules={[
        { id: 'network', render: () => <NetworkPanel /> },
        { id: 'state', render: () => <StatePanel /> },
      ]}
      onModuleEvent={(id, event, payload) => {
        console.log(`[module:${id}] ${event}`, payload)
      }}
    />
  )
}
```

---

## Framework-agnostic evolution path (out of scope for N03)

The `render: () => ReactNode` field is the **React adapter**. The event bus, registry, and config system are all framework-agnostic by design. A future task (N0X) will add:

```ts
interface DebuggerModuleDefinition {
  id: string
  // ... metadata ...
  render?: () => React.ReactNode        // React adapter (current)
  mount?: (el: HTMLElement) => () => void  // Universal adapter (future)
}
```

When `mount` is supported, users can plug in any framework:
```ts
// Vue 3
{ id: 'vue-panel', mount: (el) => { const app = createApp(MyVueComp); app.mount(el); return () => app.unmount() } }

// Web component / vanilla
{ id: 'vanilla', mount: (el) => { el.innerHTML = '<my-element></my-element>'; return () => { el.innerHTML = '' } } }
```

The panel will render a `<div ref={containerRef} />` for mount-based modules and call `mount(containerRef.current)` in a `useEffect`.

**N03 does not implement `mount`.** It only implements `render`. But the type must **not** make `render` required in a way that blocks adding `mount` later — see the type union note: `render` is required for now, but the architecture is documented so N0X can add `mount` as an alternative.

---

## Accordion animation

- Do NOT use `max-height: 9999px` — use `scrollHeight` measured via `ref` or `ResizeObserver`
- Collapsed: `maxHeight: 0, overflow: hidden, opacity: 0`
- Expanded: `maxHeight: <measured>px, opacity: 1`
- Transition: `max-height 220ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms ease`
- After expand transition ends (`transitionend`) → set `overflow: visible` so tooltips/dropdowns inside can escape

---

## Constraints

- No cross-module communication — `emit` goes only to `onModuleEvent`; `subscribe` only receives events sent by `_send` from the host
- `useDebuggerApi` must throw (not silently no-op) if called outside a module render context
- All inline styles (no CSS files, no CSS-in-JS library)
- Lint must pass (`eslint . --max-warnings 0`)
- Build must succeed (`tsc -p tsconfig.build.json && vite build`)
