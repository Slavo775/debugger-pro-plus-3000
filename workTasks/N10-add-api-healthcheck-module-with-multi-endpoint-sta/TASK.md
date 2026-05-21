# N10 — Add API Healthcheck Module with Multi-Endpoint Status

## Type
feat

## Priority
medium

## Tags
network, healthcheck, module, api

## Summary
Add a new predefined `networkModule` that fires healthcheck fetch requests to one or more configured API endpoints on init, tracks `loading / success / error` status per endpoint, and renders a panel showing HTTP status, response data, and error details for each entry.

## Context
- N06 shipped `deviceInfoModule` — the flat file pattern (`XxxModule.ts` + `XxxPanel.tsx`) is the reference.
- N07–N09 shipped the full `logs/` sub-folder pattern — use that as the reference for a new sub-folder.
- No existing Network module exists; this is a net-new predefined module.
- `DebuggerModuleSetup` in `Debugger.tsx` is the right place to call the store init (mirrors `initLogsStore`).
- Module is auto-registered if the consumer includes `networkModule` in their `modules` array in config.

## Config Shape

### New types (`src/config/types.ts`)

```ts
export interface ApiEndpointConfig {
  url: string
  method?: string   // default 'GET'
  body?: unknown    // serialised to JSON if provided
  label?: string    // display label; falls back to url
}

export interface NetworkConfig {
  apis: ApiEndpointConfig[]
}
```

Add to `DebuggerConfig`:
```ts
network?: NetworkConfig
```

Add to `ResolvedDebuggerConfig`:
```ts
network: NetworkConfig
```

### Default config (`src/config/defaults.ts`)
```ts
network: { apis: [] }
```

## New Files

### `src/modules/predefined/network/networkStore.ts`

**Types:**
```ts
export type ApiStatusState = 'loading' | 'success' | 'error'

export interface ApiStatus {
  url: string
  label: string
  method: string
  status: ApiStatusState
  httpStatus: number | null
  data: unknown
  error: string | null
  timestamp: number | null
}

interface NetworkStore {
  apis: ApiStatus[]
  _subs: Set<() => void>
}
```

**Global singleton:**
```ts
declare global { interface Window { __debuggerNetwork?: NetworkStore } }
```

**`getStore(): NetworkStore`** — lazy init, empty apis.

**`initNetworkStore(endpoints: ApiEndpointConfig[]): void`**
- Reset `store.apis` to one `ApiStatus` per endpoint with `status: 'loading'`, all numeric/data fields `null`.
- Notify subscribers.
- Fire `_fetchAll()` (do not await — fire and forget).

**`_fetchAll(): void`** (not exported)
- For each endpoint, call `_fetchOne(index, endpoint)`.

**`_fetchOne(index: number, endpoint: ApiEndpointConfig): Promise<void>`** (not exported)
- Build `RequestInit`: `method` defaults to `'GET'`; if `body` is defined, set `body: JSON.stringify(endpoint.body)` and `Content-Type: application/json`.
- Try `fetch(endpoint.url, init)`:
  - **Success branch** (`response` received regardless of status code):
    - Read body: attempt `response.json()`, fall back to `response.text()` on JSON parse failure.
    - If `response.ok`: set `status: 'success'`, `httpStatus: response.status`, `data: body`, `error: null`.
    - If `!response.ok`: set `status: 'error'`, `httpStatus: response.status`, `data: null`, `error: response.statusText || String(response.status)`.
  - **Catch branch** (network error, CORS, etc.): set `status: 'error'`, `httpStatus: null`, `data: null`, `error: err.message`.
- Set `timestamp: Date.now()`.
- Notify subscribers after each update.

**`subscribeNetwork(cb: () => void): () => void`** — add/remove from `_subs`.

**`getNetworkApis(): ApiStatus[]`** — returns `store.apis`.

### `src/modules/predefined/network/NetworkPanel.tsx`

Functional React component, no props.

**State:** use the same `forceUpdate` pattern as `LogsPanel` (subscribe on mount, unsubscribe on unmount).

**Render logic:**
- If `store.apis` is empty: render a muted message `"No API endpoints configured."`.
- For each `ApiStatus`, render a card/row:
  - **Header row**: status badge + label (or url) + method badge.
  - **Status badge**: coloured pill — `loading` → grey, `success` → green, `error` → red. Use inline styles (consistent with existing panels).
  - **Body rows** (always visible, not collapsible for simplicity):
    - URL (small, muted).
    - HTTP status: e.g. `200 OK` or `503 Service Unavailable` or `—` if null.
    - Timestamp: human-readable if set, otherwise `—`.
    - Data / Error: render as a `<pre>` block with `JSON.stringify(data, null, 2)` for objects, plain string otherwise. Max height 120px with overflow scroll. Only show whichever is non-null.
  - Use `borderBottom` dividers between cards.

**Colours:** derive from no external theme — use the same hardcoded palette as `LogsPanel` / `DeviceInfoPanel`.

### `src/modules/predefined/network/networkModule.ts`

```ts
import { createElement } from 'react'
import { NetworkPanel } from './NetworkPanel'
import type { DebuggerModuleDefinition } from '../../types'

export const networkModule: DebuggerModuleDefinition = {
  id: 'network',
  title: 'Network',
  defaultExpanded: true,
  render: () => createElement(NetworkPanel),
}
```

### `src/modules/predefined/network/index.ts`

```ts
export { networkModule } from './networkModule'
export { subscribeNetwork, getNetworkApis } from './networkStore'
export type { ApiStatus, ApiStatusState } from './networkStore'
```

## Files to Change

1. `src/config/types.ts` — add `ApiEndpointConfig`, `NetworkConfig`, extend `DebuggerConfig` and `ResolvedDebuggerConfig`.
2. `src/config/defaults.ts` — add `network: { apis: [] }`.
3. `src/components/Debugger.tsx` — call `initNetworkStore(network.apis)` in `DebuggerModuleSetup`.
4. `src/modules/predefined/index.ts` — re-export `networkModule`, `subscribeNetwork`, `getNetworkApis`, `ApiStatus`, `ApiStatusState`.

## Files to Read First
- `src/config/types.ts`
- `src/config/defaults.ts`
- `src/components/Debugger.tsx`
- `src/modules/predefined/logs/logsStore.ts` (store pattern reference)
- `src/modules/predefined/logs/LogsPanel.tsx` (panel pattern reference)
- `src/modules/predefined/logs/logsModule.ts` (module definition pattern)
- `src/modules/predefined/index.ts`

## Out of Scope
- No polling / auto-refresh. One request per endpoint on init only.
- No authentication headers (not in config shape).
- No retry logic.
- No CORS proxy or server-side relay.
- Do not add a dedicated snapshot key — existing `updateData` pattern not needed; the panel is always live from the store.
- Do not add a refresh button (can be a future task).
- Do not expose `getStore()` or internal helpers in public exports.
