# N08 Checklist

## Snapshot integration
- [ ] `LogsPanel` calls `updateData({ logOutput: [...store.entries] })` inside the `_subs` subscription callback
- [ ] Snapshot output includes `"logs": { "logOutput": [...] }` when Copy Debug Info is triggered
- [ ] `logOutput` reflects the full store buffer (not just visible entries)

## Filter chips — state
- [ ] `activeFilters` state initialised to a `Set` containing all registered channel IDs + `'__route__'`
- [ ] State re-initialises correctly when `store.registered` changes (channels added/removed)
- [ ] Clicking a chip toggles membership in `activeFilters` without mutating `store.enabled`

## Filter chips — rendering
- [ ] Chip row rendered above the log entry list (below checkboxes section)
- [ ] One chip per registered log channel (label = prefix string, e.g. "API")
- [ ] One "Navigation" chip for `__route__` entries
- [ ] Active chip: filled with `primaryColor`, white text
- [ ] Inactive chip: transparent background, `#444` border, `#888` text
- [ ] Chip style: pill shape (`borderRadius: 999`), `fontSize: 11`, monospace font

## Filter chips — filtering
- [ ] `visibleEntries` filters by `activeFilters` AND `store.enabled` together
- [ ] Route entries (`id === '__route__'`) shown only when Navigation chip is active
- [ ] Toggling a chip off hides entries but does NOT call `setEnabled` or modify the store
- [ ] Toggling a checkbox does NOT affect `activeFilters`

## Quality gates
- [ ] `npm run build` passes with no type errors
- [ ] ESLint passes (`npm run lint`)
- [ ] Dev preview: Log API / Log Auth buttons produce entries; chips filter correctly
- [ ] Dev preview: Copy Debug Info JSON includes `logs.logOutput` array
- [ ] No runtime errors in console during normal operation
