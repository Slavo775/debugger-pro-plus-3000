# N11 — Unify config: move logs and network into modules[].data

## Problem

The current `DebuggerConfig` has a structural inconsistency — module-specific settings live at the top level instead of inside their module config entry:

```js
// CURRENT — fragmented
{
  modules: [{ id: 'logs', order: 0 }, { id: 'network', order: 1 }],
  logs: [{ id: 'auth', prefix: 'Auth' }],   // ← belongs to logsModule
  persistLogs: true,                          // ← belongs to logsModule
  network: { apis: [{ url: '...' }] },        // ← belongs to networkModule
}
```

A consumer adding `logsModule` must touch three separate config keys. Adding `networkModule` requires a separate `network` key. This will get worse with every new predefined module that has its own settings.

## Goal

All module-specific config lives inside its entry in `modules[]`. The consumer config becomes:

```js
// TARGET — unified
{
  modules: [
    {
      id: 'logs',
      order: 0,
      data: {
        logs: [{ id: 'auth', prefix: 'Auth' }],
        persistLogs: true,
      },
    },
    {
      id: 'network',
      order: 1,
      data: {
        apis: [{ url: 'https://api.example.com/health', label: 'Health' }],
      },
    },
  ],
}
```

## Scope

### Config types (`src/config/types.ts`)
- Remove `logs`, `persistLogs`, `network` from `DebuggerConfig` and `ResolvedDebuggerConfig`
- `DebuggerModuleConfig.data` already exists as `Record<string, unknown>` — no type change needed there
- Keep `DebuggerModuleConfig` generic; the modules themselves are responsible for reading their own keys out of `data`

### Defaults (`src/config/defaults.ts`)
- Remove `logs: []`, `persistLogs: false`, `network: { apis: [] }` from `DEFAULT_DEBUGGER_CONFIG`
- The default for each module's `data` is just `{}` (already the case when no config entry exists)

### Merge (`src/config/merge.ts`)
- Remove the `logs`, `persistLogs`, `network` merge lines

### LogsPanel (`src/modules/predefined/logs/LogsPanel.tsx`)
- Currently reads `useDebuggerConfig()` → `cfg.logs` and `cfg.persistLogs`
- Change to read from `moduleData` via `useDebuggerApi()`:
  ```ts
  const { moduleData } = useDebuggerApi()
  const logs = (moduleData.logs as LogConfig[]) ?? []
  const persistLogs = (moduleData.persistLogs as boolean) ?? false
  ```

### NetworkPanel (`src/modules/predefined/network/NetworkPanel.tsx`)
- Currently reads `useDebuggerConfig()` → `network.apis`
- Change to read from `moduleData`:
  ```ts
  const { moduleData } = useDebuggerApi()
  const apis = (moduleData.apis as ApiEndpointConfig[]) ?? []
  ```

### Public exports (`src/index.ts`)
- Remove `LogConfig`, `ApiEndpointConfig`, `NetworkConfig` type exports (they become internal implementation details)
- Keep them if they are still useful for typing the `data` object on consumer side — decide during implementation

### Dev preview (`config.debugger.js` + `src/main.tsx`)
- Update to the new unified shape

### README (`README.md`)
- Update Quick start example if it shows config
- Update every config code block under **Configuration** → replace top-level `logs`, `persistLogs`, `network` keys with the unified `modules[].data` shape
- Update the **Full config reference** type block — remove `logs`, `persistLogs`, `network` fields
- Update `logsModule` and `networkModule` sections to show the new `modules[].data` usage instead of separate keys
- Update the `config.debugger.js` example

### ARCHITECTURE.md
- Update the **Config layer** description — remove mention of `logs`, `persistLogs`, `network` as top-level keys
- Update the **Consumer-Facing APIs** table if it references those fields
- Update any config shape examples to the unified form
- Add a note that predefined modules read their own config from `moduleData` (via `useDebuggerApi()`), not from `useDebuggerConfig()`

## Out of scope
- `deviceInfoModule` has no config — no change needed
- `DebuggerModuleConfig.title`, `order`, `defaultExpanded` stay as-is (they are panel-level, not data)
- No changes to the module registry, accordion, or event system

## Breaking change
This is a **breaking config change**. Any consumer using `logs`, `persistLogs`, or `network` top-level keys must migrate to `modules[].data`.
