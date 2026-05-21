# debugger-pro-plus-3000

A modular debugger panel for React applications. Drop it into any app, add the modules you need, remove the ones you don't — the host never changes.

## Install

```bash
npm install debugger-pro-plus-3000
# or
pnpm add debugger-pro-plus-3000
```

React and ReactDOM ≥ 18 are peer dependencies.

---

## Quick start

```tsx
import { Debugger, logsModule, networkModule, deviceInfoModule } from 'debugger-pro-plus-3000'

function App() {
  return (
    <>
      <YourApp />
      <Debugger modules={[logsModule, networkModule, deviceInfoModule]} />
    </>
  )
}
```

The panel opens via a draggable FAB button (bottom-right by default). Each module renders as a collapsible accordion section.

---

## Predefined modules

Import and pass any combination to the `modules` prop. Removing a module from the array completely disables it — no config changes needed.

### `logsModule`

Collects log entries from anywhere in your app via `useDebuggerLog`. Tracks navigation automatically (route changes appear as `Navigation` entries). Supports filtering per log source and optional localStorage persistence.

```tsx
import { Debugger, logsModule } from 'debugger-pro-plus-3000'

<Debugger
  modules={[logsModule]}
  config={{
    logs: [
      { id: 'auth',    prefix: 'Auth'    },
      { id: 'payment', prefix: 'Payment' },
    ],
    persistLogs: true,
  }}
/>
```

Push entries from anywhere using `useDebuggerLog`:

```tsx
import { useDebuggerLog } from 'debugger-pro-plus-3000'

function CheckoutPage() {
  const log = useDebuggerLog('payment')

  const handlePay = async () => {
    log('Starting payment flow')
    const result = await processPayment()
    log(`Result: ${result.status}`)
  }
}
```

### `networkModule`

Sends a request to each configured endpoint on mount and displays the result: status badge (`loading` / `success` / `error`), HTTP status code, response body, and timestamp. Each card has a refetch button.

```tsx
import { Debugger, networkModule } from 'debugger-pro-plus-3000'

<Debugger
  modules={[networkModule]}
  config={{
    network: {
      apis: [
        { url: 'https://api.example.com/health',      label: 'Health check' },
        { url: 'https://api.example.com/auth/status', label: 'Auth service', method: 'POST' },
      ],
    },
  }}
/>
```

**Endpoint config:**

| Field | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | required | Endpoint URL |
| `method` | `string` | `'GET'` | HTTP method |
| `body` | `unknown` | — | Request body (JSON-serialised) |
| `label` | `string` | — | Display name in the panel |

### `deviceInfoModule`

Displays browser, OS, screen dimensions, pixel ratio, and connection info. No config required.

```tsx
<Debugger modules={[deviceInfoModule]} />
```

---

## Custom modules

A module is a plain object with a `render` function:

```tsx
import { Debugger, useDebuggerApi } from 'debugger-pro-plus-3000'

function ConsentPanel() {
  const { updateData, emit, subscribe } = useDebuggerApi()

  useEffect(() => {
    return consentSdk.onDecision((result) => {
      updateData({ granted: result.granted, vendor: result.vendor })
      emit('consent-decision', result)
    })
  }, [updateData, emit])

  return <span>Listening for consent decisions…</span>
}

const consentModule = {
  id: 'consent',
  title: 'Consent Manager',
  render: () => <ConsentPanel />,
  data: { granted: null },   // initial snapshot values
}

function App() {
  return (
    <Debugger
      modules={[consentModule]}
      onModuleEvent={(moduleId, event, payload) => {
        console.log(`[${moduleId}] ${event}`, payload)
      }}
    />
  )
}
```

`useDebuggerApi()` must be called inside the module's `render` function — it throws if called outside a module context.

| Method | Description |
|---|---|
| `updateData(patch)` | Shallow-merge runtime data into this module's snapshot slice |
| `moduleData` | Static data from `DebuggerModuleDefinition.data` merged with config |
| `emit(event, payload?)` | Fire an event to the `onModuleEvent` handler |
| `subscribe(event, handler)` | Receive events sent to this module; returns unsubscribe fn |

---

## `<Debugger>` props

| Prop | Type | Default | Description |
|---|---|---|---|
| `modules` | `DebuggerModuleDefinition[]` | `[]` | Panels to render, in order |
| `config` | `DebuggerConfig` | see defaults | Merged with `config.debugger.js` (inline wins) |
| `defaultOpen` | `boolean` | `false` | Open the panel on mount |
| `onModuleEvent` | `(moduleId, event, payload) => void` | — | Receive events emitted by modules |

---

## Configuration

Config can come from a file, the inline prop, or both — they are merged (inline wins on conflict).

### File: `config.debugger.js`

Place in your public assets directory so it's served at runtime:

```js
// public/config.debugger.js
export default {
  style: {
    primaryColor: '#7c3aed',
  },
  button: {
    position: 'rightBottom',   // 'rightTop' | 'rightBottom' | 'leftTop' | 'leftBottom'
    draggable: true,
    size: 50,
  },
  panel: {
    title: 'My Debugger',
    style: { width: 400 },
  },
  modules: [
    { id: 'consent', defaultExpanded: false },
    { id: 'network', order: 0 },   // render first regardless of array position
  ],
  logs: [
    { id: 'auth',    prefix: 'Auth'    },
    { id: 'payment', prefix: 'Payment' },
  ],
  persistLogs: false,
  network: {
    apis: [
      { url: 'https://api.example.com/health', label: 'Health' },
    ],
  },
}
```

Load it manually if you need to await it before rendering:

```ts
import { loadDebuggerConfig, DebuggerConfigProvider } from 'debugger-pro-plus-3000'

const config = await loadDebuggerConfig({ src: '/config.debugger.js' })

// then pass it to DebuggerConfigProvider or the config prop
```

### Inline prop

```tsx
<Debugger
  config={{
    style: { primaryColor: '#e11d48' },
    panel: { title: 'Debug', style: { width: 360 } },
  }}
  modules={[logsModule]}
/>
```

### Full config reference

```ts
interface DebuggerConfig {
  style?: {
    primaryColor?: string          // accent colour for accordion headers
  }
  button?: {
    position?: 'rightTop' | 'rightBottom' | 'leftTop' | 'leftBottom'
    draggable?: boolean
    size?: number                  // FAB diameter in px
  }
  panel?: {
    title?: string
    style?: { width?: number }     // panel width in px
  }
  modules?: Array<{
    id: string
    title?: string                 // override module title
    defaultExpanded?: boolean
    order?: number                 // lower = higher position in the panel
    data?: Record<string, unknown> // extra static data merged into snapshot
  }>
  logs?: Array<{
    id: string                     // matches useDebuggerLog(id)
    prefix: string                 // label shown in the Logs panel
  }>
  persistLogs?: boolean            // save last 50 log entries to localStorage
  network?: {
    apis: Array<{
      url: string
      method?: string
      body?: unknown
      label?: string
    }>
  }
}
```

---

## Module ordering

Modules render in the order of the `modules` array by default. Override per-module with `order` in config (lower number = higher position):

```js
// config.debugger.js
modules: [
  { id: 'network', order: 0 },  // always first
  { id: 'logs',    order: 1 },
]
```

---

## Copy / Export snapshot

The panel header contains a split **Copy / Export** button:

| Action | Result |
|---|---|
| **⎘ Copy** | Copies the full JSON snapshot to clipboard, shows ✓ for 1.5 s |
| **▾ → Download .json** | Downloads `debug-snapshot.json` |
| **▾ → Download .txt** | Downloads `debug-snapshot.txt` |

Snapshot shape — one key per module, merged from static `data` + runtime `updateData()` patches:

```json
{
  "consent": { "granted": true, "vendor": "Sourcepoint" },
  "network": {},
  "device": { "userAgent": "…", "screen": "1440×900" }
}
```

---

## License

MIT
