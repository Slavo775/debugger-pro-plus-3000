# N03 Review — fix-needed

Gates clean (lint + build pass). All checklist items met architecturally. Two functional bugs must be fixed before approval.

---

## Bug 1 — Expand animation does not animate (MUST FIX)

**File:** `src/components/Debugger.tsx:185-188`

```tsx
// CURRENT — broken
if (module.expanded) {
  const measured = el.scrollHeight
  setBodyOverflow('hidden')
  setMaxHeight(measured)   // ← batched with setBodyOverflow, jumps in one render
}
```

React batches the two `setState` calls into a single commit. The element goes from `maxHeight: 0` → `maxHeight: <measured>px` in one frame — there is no starting state for the CSS transition to animate from. The element snaps open instantly.

The collapse path correctly uses the double-`requestAnimationFrame` trick:
```tsx
setMaxHeight(measured)
requestAnimationFrame(() => {
  requestAnimationFrame(() => setMaxHeight(0))
})
```

**Fix:** Apply the same two-frame pattern on expand:

```tsx
if (module.expanded) {
  const measured = el.scrollHeight
  setBodyOverflow('hidden')
  setMaxHeight(0)                        // ensure transition starts from 0
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setMaxHeight(measured)             // then animate to full height
    })
  })
}
```

---

## Bug 2 — Legacy plugins (`plugins` prop) cannot collapse (MUST FIX)

**File:** `src/components/Debugger.tsx:131-137`

```tsx
// CURRENT — expanded always true
const syntheticModules: RegisteredModule[] = plugins.map((p) => ({
  id: p.id,
  title: p.label,
  expanded: true,      // ← hardcoded, never updates
  data: {},
  render: p.render,
}))
```

`_toggleExpanded` is called on header click and correctly updates `expandedState` inside the registry provider. But `syntheticModules` is rebuilt from `plugins` on every render and always has `expanded: true`. The registry's `expandedState` is never consulted, so the visual state never changes.

**Fix:** Track expanded state for synthetic plugins in `ModuleStack` local state:

```tsx
function ModuleStack({ plugins, primaryColor }: ModuleStackProps) {
  const registryCtx = useContext(DebuggerModuleRegistryContext)
  const [pluginExpanded, setPluginExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(plugins.map((p) => [p.id, true]))
  )

  const syntheticModules: RegisteredModule[] = plugins.map((p) => ({
    id: p.id,
    title: p.label,
    expanded: pluginExpanded[p.id] ?? true,
    data: {},
    render: p.render,
  }))

  // pass to AccordionItem:
  // onToggle for synthetic: () => setPluginExpanded(prev => ({ ...prev, [p.id]: !(prev[p.id] ?? true) }))
  // onToggle for registry:  () => registryCtx?._toggleExpanded(mod.id)
```

Split the `onToggle` callback based on whether the module is synthetic or registered:

```tsx
{syntheticModules.map((mod) => (
  <AccordionItem
    key={mod.id}
    module={mod}
    primaryColor={primaryColor}
    onToggle={() =>
      setPluginExpanded((prev) => ({ ...prev, [mod.id]: !(prev[mod.id] ?? true) }))
    }
  />
))}
{registeredModules.map((mod) => (
  <AccordionItem
    key={mod.id}
    module={mod}
    primaryColor={primaryColor}
    onToggle={() => registryCtx?._toggleExpanded(mod.id)}
  />
))}
```

---

## Non-blocking findings

### (3) `moduleData` creates a new `{}` on every render

**File:** `src/modules/useDebuggerApi.ts:30`

```ts
const moduleData = registry._modules.find((m) => m.id === moduleId)?.data ?? {}
```

The `?? {}` fallback creates a new object reference on every render when the module isn't found. Any consumer that uses `moduleData` as a `useEffect` or `useMemo` dependency will re-run unnecessarily. Consider:

```ts
const EMPTY_DATA: Record<string, unknown> = {}
const moduleData = registry._modules.find((m) => m.id === moduleId)?.data ?? EMPTY_DATA
```

### (4) `DebuggerModuleRegistryProvider` exported from internal barrel unnecessarily

**File:** `src/modules/index.ts:2`

`DebuggerModuleRegistryProvider` is an internal component (not in the public `src/index.ts` barrel) but is exported from `src/modules/index.ts`. Since it's only used in `Debugger.tsx` via a direct relative import, remove the barrel export to keep the internal surface clean.
