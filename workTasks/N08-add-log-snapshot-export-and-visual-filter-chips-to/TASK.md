# N08 — Add log snapshot export and visual filter chips to Logs module

## Type
feat

## Priority
high

## Tags
logs, snapshot, filter, ui

## Summary
Two additions to the logging system built in N07:
1. Include the live log entries in the copy/export snapshot under `logs.logOutput`.
2. Add visual filter chips inside the Log output section — one chip per log channel plus a "Navigation" chip — that toggle display of entries without touching `store.enabled` or `store.entries`.

## Context
- N07 shipped `logsStore`, `useDebuggerLog`, `LogsPanel`, `logsModule`, and route-change tracking.
- The copy/export snapshot (`_getDebugSnapshot`) gathers `moduleData` per module. Currently the logs module exposes no data to the snapshot.
- `LogsPanel` already has per-channel checkboxes that toggle `store.enabled` (write-through to the store). The new chips must NOT touch `store.enabled`; they are purely a local display filter.

## Scope

### 1 — Snapshot integration (`src/modules/predefined/logs/LogsPanel.tsx`)
- On every store update (inside the existing `_subs` subscription), call `updateData({ logOutput: [...store.entries] })` so the module's runtime data reflects the current log buffer.
- The snapshot captured via "Copy Debug Info" will then include:
  ```json
  { "logs": { "logOutput": [ { "id": "api", "prefix": "API", "text": "...", "timestamp": 1234 }, ... ] } }
  ```

### 2 — Visual filter chips (`src/modules/predefined/logs/LogsPanel.tsx`)
- Add local state: `const [activeFilters, setActiveFilters] = useState<Set<string>>(() => new Set([...channelIds, '__route__']))`
  - `channelIds` = the IDs from `store.registered` (all registered log channels).
  - `'__route__'` covers Navigation entries.
- Render a chip row directly above the log entry list (below the checkboxes section).
- One chip per registered log channel (label = `store.registered.get(id)` prefix, e.g. "API", "Auth") + one "Navigation" chip for `__route__`.
- Chip appearance:
  - Active (selected): filled pill — `background: cfg.style.primaryColor`, white text, no border.
  - Inactive (deselected): outlined pill — transparent background, `border: 1px solid #444`, muted text `#888`.
  - Size: `fontSize: 11`, `padding: '2px 10px'`, `borderRadius: 999`, `cursor: 'pointer'`, `fontFamily: 'monospace'`.
- Clicking a chip toggles it in `activeFilters` (new Set, spread existing).
- `visibleEntries` filtering:
  ```ts
  const visibleEntries = store.entries.filter((e) => {
    if (e.id === '__route__') return activeFilters.has('__route__')
    if (!store.enabled.has(e.id)) return false   // existing checkbox gate
    return activeFilters.has(e.id)               // new chip gate
  })
  ```

## Files to change
- `src/modules/predefined/logs/LogsPanel.tsx` — primary; both additions live here.

## Files to read first
- `src/modules/predefined/logs/logsStore.ts`
- `src/modules/predefined/logs/LogsPanel.tsx`
- `src/modules/useDebuggerApi.ts`
- `src/config/types.ts` (for `primaryColor`)

## Out of scope
- No changes to `logsStore.ts` (no new store fields).
- No changes to public API / index exports.
- No changes to snapshot aggregation logic in the registry — `updateData` is sufficient.
- Do not rename or restructure existing store fields.
