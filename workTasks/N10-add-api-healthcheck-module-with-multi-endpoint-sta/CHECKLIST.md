# N10 Checklist

## Config types (`src/config/types.ts`)
- [ ] `ApiEndpointConfig` interface added (`url`, `method?`, `body?`, `label?`)
- [ ] `NetworkConfig` interface added (`apis: ApiEndpointConfig[]`)
- [ ] `network?: NetworkConfig` added to `DebuggerConfig`
- [ ] `network: NetworkConfig` added to `ResolvedDebuggerConfig`

## Default config (`src/config/defaults.ts`)
- [ ] `network: { apis: [] }` added to `DEFAULT_DEBUGGER_CONFIG`

## networkStore.ts — types and store shape
- [ ] `ApiStatusState` type exported (`'loading' | 'success' | 'error'`)
- [ ] `ApiStatus` interface exported with all fields (`url`, `label`, `method`, `status`, `httpStatus`, `data`, `error`, `timestamp`)
- [ ] `NetworkStore` internal interface defined
- [ ] `window.__debuggerNetwork` global declaration added
- [ ] `getStore()` lazy-init singleton works

## networkStore.ts — init
- [ ] `initNetworkStore(endpoints: ApiEndpointConfig[]): void` exported
- [ ] Resets `store.apis` to one per endpoint with `status: 'loading'`, numeric/data fields `null`
- [ ] Notifies subscribers immediately after reset
- [ ] Fires `_fetchAll()` (fire and forget, no await)

## networkStore.ts — fetch
- [ ] `_fetchOne` defaults `method` to `'GET'` when not provided
- [ ] `_fetchOne` serialises `body` to JSON and sets `Content-Type: application/json` when body is present
- [ ] `response.ok` → `status: 'success'`, `httpStatus`, `data` populated
- [ ] `!response.ok` → `status: 'error'`, `httpStatus`, `error` set to statusText or status string
- [ ] Network/CORS error (catch) → `status: 'error'`, `httpStatus: null`, `error: err.message`
- [ ] Response body parsed as JSON; falls back to text on JSON parse error
- [ ] `timestamp: Date.now()` set after each fetch completes
- [ ] Subscribers notified after each individual fetch completes

## networkStore.ts — subscriptions
- [ ] `subscribeNetwork(cb: () => void): () => void` exported
- [ ] `getNetworkApis(): ApiStatus[]` exported

## NetworkPanel.tsx — empty state
- [ ] Renders `"No API endpoints configured."` when `store.apis` is empty

## NetworkPanel.tsx — endpoint cards
- [ ] One card/row rendered per `ApiStatus`
- [ ] Status badge shows correct colour: grey=loading, green=success, red=error
- [ ] Label shown (falls back to url if no label)
- [ ] Method badge displayed (e.g. `GET`, `POST`)
- [ ] URL shown in small/muted style
- [ ] HTTP status shown (e.g. `200`, `503`, `—` for null)
- [ ] Timestamp shown (human-readable or `—`)
- [ ] Data rendered in `<pre>` block (max-height 120px, overflow scroll) when non-null
- [ ] Error rendered in `<pre>` block when non-null
- [ ] Cards separated by `borderBottom` dividers

## NetworkPanel.tsx — reactivity
- [ ] Uses `forceUpdate` pattern (subscribe on mount, unsubscribe on unmount) matching `LogsPanel`
- [ ] Panel updates when any fetch resolves (loading → success/error)

## networkModule.ts
- [ ] `networkModule` definition exported with `id: 'network'`, `title: 'Network'`, `defaultExpanded: true`
- [ ] `render` returns `createElement(NetworkPanel)`

## network/index.ts
- [ ] `networkModule` re-exported
- [ ] `subscribeNetwork`, `getNetworkApis` re-exported
- [ ] `ApiStatus`, `ApiStatusState` types re-exported

## src/modules/predefined/index.ts
- [ ] `networkModule` exported
- [ ] Public types (`ApiStatus`, `ApiStatusState`) exported

## Debugger.tsx
- [ ] `network` destructured from `useDebuggerConfig()` in `DebuggerModuleSetup`
- [ ] `initNetworkStore(network.apis)` called (mirrors `initLogsStore` pattern)

## Quality gates
- [ ] `npm run build` passes with no type errors
- [ ] ESLint passes (`npm run lint`)
- [ ] Dev preview: add `networkModule` to modules array; no APIs configured → panel shows empty state message
- [ ] Dev preview: configure one `{ url: '...', method: 'GET' }` → panel shows `loading` then transitions to `success` or `error`
- [ ] Dev preview: configure multiple APIs → each renders its own card independently
- [ ] Dev preview: unreachable URL → shows `error` with network error message, `httpStatus: —`
- [ ] Dev preview: non-2xx response → shows `error` with HTTP status code
- [ ] Dev preview: `body` provided with `method: 'POST'` → request sent with JSON body and correct Content-Type
- [ ] No console errors during normal operation
