# N04 Human Review — Round 3

**Verdict: approved**

> "approved!" — human reviewer

---

# N04 AI Review — Round 1

**Verdict: fix-needed**

---

## Bug: Escape key closes dropdown AND panel simultaneously

**Severity:** Medium — breaks expected UX; user pressing Escape to dismiss the dropdown also closes the entire debugger panel.

**Root cause:**

`DebuggerPanelRoot` registers a `document` `keydown` listener for `Escape` to close the panel (`Debugger.tsx` lines 76–82):

```ts
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') closePanel()
}
document.addEventListener('keydown', onKey)
```

`CopyExportButton` registers a second `document` `keydown` listener for `Escape` to close the dropdown (`Debugger.tsx` lines 291–293):

```ts
const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') setDropdownOpen(false)
}
document.addEventListener('keydown', onKeyDown)
```

Both listeners are on `document` with no `stopPropagation`. A single Escape keypress fires both: dropdown closes and panel closes.

**Fix:**

In `CopyExportButton`, call `e.stopPropagation()` before closing the dropdown so the panel listener never receives the event:

```ts
const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    e.stopPropagation()
    setDropdownOpen(false)
  }
}
```

---

## Everything else: approved

- API (`types.ts`, `DebuggerModuleRegistryProvider`, `useDebuggerApi`) — correct, ref-backed runtime patches, snapshot merges static + runtime on demand, no unnecessary re-renders.
- `CopyExportButton` — split-button layout, clipboard write + 1.5 s feedback, blob download for JSON and TXT, click-outside dismissal all correct.
- Build and lint: clean.
- All checklist items implemented correctly modulo the Escape bug above.
