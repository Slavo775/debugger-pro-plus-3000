# N04 Checklist

## API

- [ ] `types.ts` — add `_updateData(moduleId, patch)` and `_getDebugSnapshot()` to `DebuggerApiContextValue`
- [ ] `types.ts` — add `updateData(patch)` to `DebuggerApi`
- [ ] `DebuggerModuleRegistryProvider.tsx` — add `runtimeDataRef` (Map, ref not state)
- [ ] `DebuggerModuleRegistryProvider.tsx` — implement `_updateData`: shallow-merge patch into runtimeDataRef entry
- [ ] `DebuggerModuleRegistryProvider.tsx` — implement `_getDebugSnapshot`: merge static + runtime data per module
- [ ] `DebuggerModuleRegistryProvider.tsx` — include both new methods in the `ctx` useMemo
- [ ] `useDebuggerApi.ts` — expose `updateData` wrapping `registry._updateData(moduleId, patch)`

## UI

- [ ] `Debugger.tsx` — read `DebuggerModuleRegistryContext` in `DebuggerPanelRoot` for `_getDebugSnapshot`
- [ ] `Debugger.tsx` — add `CopyExportButton` component (split-button: primary + chevron)
- [ ] `Debugger.tsx` — copy action: `navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2))` + 1.5 s checkmark feedback
- [ ] `Debugger.tsx` — dropdown: "Download JSON" — blob download of `debug-snapshot.json`
- [ ] `Debugger.tsx` — dropdown: "Download TXT" — blob download of `debug-snapshot.txt`
- [ ] `Debugger.tsx` — dropdown closes on: item click, Escape key, outside mousedown
- [ ] `Debugger.tsx` — wire `CopyExportButton` into header actions (left of fullscreen/close)

## Polish

- [ ] Button group shares connected border (left button: rounded-left, right chevron: rounded-right, shared border between them)
- [ ] Hover/active states on all interactive elements (match existing `iconButtonStyle` feel)
- [ ] Dropdown renders below the button group, z-index above panel content
- [ ] No external dependencies added

## Tests / Verification

- [ ] `updateData` called from a module → data appears in snapshot
- [ ] Multiple modules each contribute their slice independently
- [ ] Copy button flashes checkmark then resets
- [ ] Download JSON / TXT triggers file save with correct content and filename
- [ ] Dropdown closes correctly on all three dismissal paths
