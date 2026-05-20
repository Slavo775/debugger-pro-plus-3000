# N04 — Add module debug-data registration, runtime updates, and header copy/export button

## Goal

Extend the Debugger API so modules can register structured JSON debug data at mount time and update it at runtime. Aggregate all module data into a single snapshot JSON (`{ [moduleId]: { ...data } }`). Add a split copy/export button to the panel header that copies the snapshot to the clipboard or downloads it as `.json` / `.txt`.

---

## Context

Current state (post-N03):
- `RegisteredModule` already carries `data: Record<string, unknown>`, seeded from `DebuggerModuleDefinition.data` merged with `config.modules[i].data` at registration time.
- `useDebuggerApi()` exposes `moduleData` (read-only, the module's own slice) but no write path.
- The header has fullscreen toggle and close — no export actions.

Relevant files:
- `src/modules/types.ts` — `DebuggerApi`, `DebuggerApiContextValue`, `RegisteredModule`
- `src/modules/DebuggerModuleRegistryProvider.tsx` — registry state, builds `modules[]`
- `src/modules/useDebuggerApi.ts` — public hook consumed by module renders
- `src/components/Debugger.tsx` — panel, header, `ModuleStack`, `AccordionItem`

---

## API Changes

### `src/modules/types.ts`

Add to `DebuggerApiContextValue`:
```ts
_updateData(moduleId: string, patch: Record<string, unknown>): void
_getDebugSnapshot(): Record<string, Record<string, unknown>>
```

Add to `DebuggerApi`:
```ts
updateData(patch: Record<string, unknown>): void
```

### `src/modules/DebuggerModuleRegistryProvider.tsx`

1. Add `runtimeDataRef` — a `useRef<Map<string, Record<string, unknown>>>(new Map())` to hold live patches (ref not state — updates are reflected via `_getDebugSnapshot` on demand, no re-render needed for export).
2. Implement `_updateData(moduleId, patch)`:
   - Merges `patch` into `runtimeDataRef.current.get(moduleId) ?? {}` using shallow spread.
   - Stores result back into the ref map.
   - Does NOT trigger re-render (export is on-demand — no need to re-render the whole tree on every data update).
3. Implement `_getDebugSnapshot()`:
   - Returns `{ [m.id]: { ...m.data, ...runtimeDataRef.current.get(m.id) } }` for every registered module.
   - `m.data` = the static data merged at registration from definition + config.

### `src/modules/useDebuggerApi.ts`

Add `updateData` to the returned `DebuggerApi`:
```ts
const updateData = useCallback(
  (patch: Record<string, unknown>) => registry._updateData(moduleId, patch),
  [registry, moduleId],
)
return { emit, subscribe, moduleData, updateData }
```

---

## UI Changes — Header Copy/Export Button

### Location: `DebuggerPanelRoot` in `src/components/Debugger.tsx`

The header currently renders:
```
[title]   [⤢ fullscreen]  [✕ close]
```

After this task:
```
[title]   [⎘ Copy ▾]  [⤢ fullscreen]  [✕ close]
```

### Split-button pattern (GitHub merge-button style)

Two adjacent buttons sharing a visual group (connected border):
- **Left: primary action** — label `⎘ Copy`, aria-label `"Copy debug snapshot to clipboard"`. Clicking it calls `navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2))` then briefly shows a `✓` checkmark for 1.5 s.
- **Right: chevron** — label `▾`, aria-label `"Export options"`. Clicking toggles a small dropdown menu below.

Dropdown menu items:
1. **Download JSON** — triggers browser download of `debug-snapshot.json` (pretty-printed JSON blob).
2. **Download TXT** — triggers browser download of `debug-snapshot.txt` (same content, plain text MIME).

Dropdown behaviour:
- Rendered as an absolutely-positioned `<ul>` beneath the button group.
- Closes on item selection, on Escape key, or on click outside (one `mousedown` listener on `document`).
- No external dependencies — inline styles, monospace font to match the panel.

### Accessing the snapshot in the header

`DebuggerPanelRoot` already has access to `DebuggerModuleRegistryContext` (read indirectly via `ModuleStack`). Pass `_getDebugSnapshot` down via a prop from `DebuggerModuleSetup` → `DebuggerPanelRoot`, or read the context directly in `DebuggerPanelRoot` using `useContext(DebuggerModuleRegistryContext)`.

Use `useContext` directly inside `DebuggerPanelRoot` — it's already inside the provider tree (set up in `DebuggerModuleSetup`).

---

## Data Shape

```json
{
  "consent-manager": {
    "vendor": "Sourcepoint",
    "granted": true,
    "lastUpdated": "2026-05-20T17:00:00Z"
  },
  "network-monitor": {
    "lastRequest": "/api/v1/user",
    "lastStatus": 200
  }
}
```

Top-level keys = module IDs. Values = whatever the module registered/updated.

---

## Out of scope

- Pretty-printing or rendering debug data inside the accordion (N05+ concern).
- Streaming / live "push to server" — just clipboard and file download.
- Merging plugin (synthetic module) data — plugins use `render()` only, no `data` field today.
