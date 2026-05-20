# N03 — Add module registry with accordion stack, auto-registration wrapper, and Debugger API

## Goal

Replace the flat tab+plugin system with a **stacked accordion UI** driven by a **self-registering module system**. Users wrap their content in `<DebuggerModule>` — the wrapper handles registration automatically. The debugger and its modules exchange data exclusively through a **Debugger API** (event bus inside context), so no module talks to another directly.

## Background

The existing `Debugger` component has a tab bar (`DebuggerPlugin[]`) where each plugin has a `render()` fn. This task replaces that with:

1. **Module registry** — a context that tracks mounted modules by ID
2. **`<DebuggerModule>`** — wrapper component that auto-registers on mount, renders as an accordion item in the panel
3. **Debugger API** — event bus exposed via `useDebuggerApi()` hook; bidirectional (module → debugger, debugger → module), no cross-module communication
4. **Accordion stack** — panel content area becomes a vertical list of expand/collapse module items
5. **Config-driven metadata** — `config.modules[]` declares title, defaultExpanded, and static `data` per module ID

---

## Architecture

### New files

```
src/modules/
  types.ts                          — all module-related TypeScript types
  DebuggerModuleRegistryContext.ts  — React context (no logic)
  DebuggerModuleRegistryProvider.tsx — Provider: registry state + event bus
  useDebuggerApi.ts                 — Hook for module content: { emit, subscribe, moduleData }
  DebuggerModule.tsx                — Wrapper: auto-registers, renders nothing at placement site
  index.ts                          — barrel export
```

### Modified files

| File | Change |
|------|--------|
| `src/config/types.ts` | Add `DebuggerModuleConfig`; extend `DebuggerConfig.modules` |
| `src/config/defaults.ts` | Add `modules: []` to defaults |
| `src/config/merge.ts` | Merge `modules` array (replace by ID) |
| `src/config/loadDebuggerConfig.ts` | Validate module configs |
| `src/components/Debugger.tsx` | Wrap with `DebuggerModuleRegistryProvider`; add `children` prop; replace tab bar + content with accordion stack; add `onModuleEvent` prop |
| `src/index.ts` | Export `DebuggerModule`, `useDebuggerApi`, all new types |

---

## Types (`src/modules/types.ts`)

```ts
// Config shape (from config.debugger.js)
export interface DebuggerModuleConfig {
  id: string
  title?: string              // display name in accordion header; falls back to id
  defaultExpanded?: boolean   // default: true
  data?: Record<string, unknown>  // arbitrary static data passed to the module via useDebuggerApi()
}

// Runtime registration entry
export interface RegisteredModule {
  id: string
  title: string
  expanded: boolean
  render: () => React.ReactNode
}

// Event bus types
export type ModuleEventHandler = (payload: unknown) => void

export interface DebuggerApiContextValue {
  // called by DebuggerModule to register/unregister
  _register(id: string, title: string, render: () => React.ReactNode): void
  _unregister(id: string): void
  // called by useDebuggerApi inside modules
  _emit(moduleId: string, event: string, payload: unknown): void
  _subscribe(moduleId: string, event: string, handler: ModuleEventHandler): () => void
  // called by Debugger panel internals
  _modules: RegisteredModule[]
  _toggleExpanded(id: string): void
  // called by host app through Debugger ref or internal use
  _send(moduleId: string, event: string, payload: unknown): void
  // static module config data keyed by id
  _moduleData: Record<string, Record<string, unknown>>
}

// Public surface for useDebuggerApi()
export interface DebuggerApi {
  emit(event: string, payload?: unknown): void
  subscribe(event: string, handler: ModuleEventHandler): () => void
  moduleData: Record<string, unknown>  // the config.modules[].data for this module
}
```

---

## Registry Provider (`src/modules/DebuggerModuleRegistryProvider.tsx`)

- Accepts `moduleConfigs: DebuggerModuleConfig[]` and `onModuleEvent?: (id, event, payload) => void` as props
- State: `Map<id, RegisteredModule>` (modules in insertion/config order)
- `_register(id, title, render)`:
  - If id already registered → skip (idempotent)
  - Title precedence: config.title > passed title > id
  - defaultExpanded from config (default `true`)
  - Appends to modules list; if id appears in config, slot is reserved at config order position
- `_unregister(id)`: removes from map
- `_emit(moduleId, event, payload)`: calls `onModuleEvent` prop
- `_subscribe(moduleId, event, handler)`: stores handler in a `Map<id, Map<event, Set<handler>>>`, returns unsub fn
- `_send(moduleId, event, payload)`: calls all handlers for that id+event
- `_toggleExpanded(id)`: toggles expanded state

---

## Module Wrapper (`src/modules/DebuggerModule.tsx`)

```tsx
export interface DebuggerModuleProps {
  id: string
  title?: string           // optional override (config title takes precedence)
  children: React.ReactNode
}

export function DebuggerModule({ id, title, children }: DebuggerModuleProps) {
  // registers on mount with render = () => children
  // unregisters on unmount
  // renders null at its placement site
  return null
}
```

The `render` function stored in the registry is a stable ref to `() => children`. The actual rendering is done by the accordion inside the panel.

---

## Hook (`src/modules/useDebuggerApi.ts`)

```ts
// Must be called inside a component rendered by DebuggerModule's render fn
// (i.e., inside the module's children). It reads the moduleId from context.
export function useDebuggerApi(): DebuggerApi
```

- Uses `DebuggerModuleIdContext` (string context set by `DebuggerModule`) to know its own ID
- Throws a clear error if called outside a `DebuggerModule` subtree

---

## Debugger Component Changes

### New props
```ts
interface DebuggerProps {
  plugins?: DebuggerPlugin[]   // kept for backward compat (renders as modules at the top)
  defaultOpen?: boolean
  config?: DebuggerConfig
  children?: ReactNode         // NEW: place <DebuggerModule> elements here
  onModuleEvent?: (moduleId: string, event: string, payload: unknown) => void  // NEW
}
```

### Rendering tree
```
<DebuggerConfigProvider>
  <DebuggerModuleRegistryProvider moduleConfigs={resolvedConfig.modules} onModuleEvent={...}>
    {children}             ← mounts DebuggerModule components → populates registry
    <DebuggerPanel>        ← reads registry, renders accordion
    </DebuggerPanel>
  </DebuggerModuleRegistryProvider>
</DebuggerConfigProvider>
```

### Panel content area — accordion stack

- Remove tab bar and active-plugin content area
- Content area becomes a scrollable `<ul>` of accordion items
- Each item: `<li>` with header + collapsible body
- Header: title (left) + chevron button (right, ▾/▸) + expand/collapse on click
- Body: `overflow: hidden` + CSS max-height transition (0 ↔ auto via measured height)
- Empty state: "No modules registered." hint when registry is empty
- Plugins from `plugins` prop are wrapped in `DebuggerModule`-equivalent items rendered first

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
  modules?: DebuggerModuleConfig[]  // NEW
}

export type ResolvedDebuggerConfig = Required<{
  // ...existing...
  modules: DebuggerModuleConfig[]   // NEW (array, never undefined)
}>
```

### Loader validation (`loadDebuggerConfig.ts`)
- `modules` must be an array
- Each entry must have a non-empty string `id`
- `title` must be string if present
- `defaultExpanded` must be boolean if present
- `data` must be a plain object if present
- Invalid entries are skipped with a `[debugger-pro-plus-3000]` prefixed console warning

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
import { Debugger, DebuggerModule, useDebuggerApi } from 'debugger-pro-plus-3000'

function NetworkPanel() {
  const { emit, subscribe, moduleData } = useDebuggerApi()
  // moduleData.baseUrl === '/api'

  useEffect(() => {
    const unsub = subscribe('highlight', (payload) => {
      console.log('highlight event', payload)
    })
    return unsub
  }, [subscribe])

  return (
    <button onClick={() => emit('request', { url: '/api/users' })}>
      Fetch users
    </button>
  )
}

function App() {
  return (
    <Debugger
      config={loadedConfig}
      onModuleEvent={(id, event, payload) => {
        console.log(`[${id}] ${event}`, payload)
      }}
    >
      <DebuggerModule id="network" title="Network">
        <NetworkPanel />
      </DebuggerModule>
      <DebuggerModule id="state" title="App State">
        <StatePanel />
      </DebuggerModule>
    </Debugger>
  )
}
```

---

## Accordion animation

- Do NOT use `max-height: 9999px` trick — use `ResizeObserver` or measured `scrollHeight`
- Transition: `max-height 220ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms ease`
- Collapsed: `max-height: 0; overflow: hidden; opacity: 0`
- Expanded: `max-height: <measured>px; opacity: 1`
- After expand transition ends, set `overflow: visible` so tooltips/dropdowns inside can escape

---

## Constraints

- No cross-module communication — modules can only `emit` to the host via `onModuleEvent` or `subscribe` to host-sent events via `_send`
- `useDebuggerApi` must throw (not silently no-op) if used outside a `<DebuggerModule>` subtree
- `DebuggerModule` with an ID that is not in `config.modules` still works — it just uses the `title` prop (or ID) as label and defaults to expanded
- `DebuggerModule` registration is idempotent — duplicate IDs are ignored with a console.warn
- All inline styles follow the existing pattern (no CSS files, no CSS-in-JS library)
- Lint must pass (`eslint . --max-warnings 0`)
- Build must succeed (`tsc -p tsconfig.build.json && vite build`)
