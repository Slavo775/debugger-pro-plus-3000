# N05 AI Review — Round 1

**Verdict: fix-needed**

---

## Bug: `moduleData` description is factually wrong

**Location:** README.md — `useDebuggerApi()` table, `moduleData` row.

**Current text:**
> `moduleData` — Current snapshot data for this module **(static + runtime merged, read-only)**.

**Why it's wrong:**

`useDebuggerApi.ts` line 31:
```ts
const moduleData = registry._modules.find((m) => m.id === moduleId)?.data ?? EMPTY_DATA
```

`registry._modules[].data` is populated from `resolvedModules` in `DebuggerModuleRegistryProvider` — it merges `def.data` and `cfg.data` **at mount time only**. Runtime patches written via `updateData(patch)` go into `runtimeDataRef` (a ref, not state) and are **never reflected** in `_modules[].data`.

Runtime patches only appear in the Copy/Export snapshot via `_getDebugSnapshot()`.

**Impact:** A user who calls `updateData({ foo: 'bar' })` and then reads `moduleData.foo` will get `undefined`, not `'bar'`. The README leads them to expect the opposite.

**Fix:**

Change the `moduleData` description to:

> Static registration data for this module (initial values from `DebuggerModuleDefinition.data` merged with `config.modules[].data`). Does **not** include runtime patches from `updateData()` — those appear only in the Copy/Export snapshot.

---

## Everything else: approved

- All checklist items present and accurate
- Props table corrected (`position` removed, `modules` / `config` / `onModuleEvent` added)
- All three Mermaid diagrams are syntactically valid and accurately reflect the implementation
- Code snippets match the actual public API
- `pnpm format` correctly removed (no such script in package.json)
- README is self-contained for a new user
