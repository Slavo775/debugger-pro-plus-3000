# N03 — AI Review

**Verdict:** 🔧 Fix needed (one small typing fix + a couple of polish items)
**AI reviewer:** task-review (Claude Opus 4.7)
**Date:** 2026-05-20

## Summary

CHECKLIST fully met. Gates clean. Loader smoke test: **17/17** cases
pass. device-info renders live data, the resolver handles the
shorthand, override, unknown-id-warn, custom-append, mixed-order, and
dedupe paths. Architecture cleanly split across `types` / `registry` /
`resolve` / one built-in per file.

## Blocker — actually a typing fix

### `BuiltInModuleId` is `string`, not the literal union the spec promised

`src/modules/registry.ts`:
```ts
export const BUILT_IN_MODULES: Record<string, DebuggerModule<unknown>> = {
  'device-info': deviceInfoModule as DebuggerModule<unknown>,
}
export type BuiltInModuleId = keyof typeof BUILT_IN_MODULES  // currently: string
```

Annotating with `: Record<string, ...>` widens the inferred type, so
`keyof typeof BUILT_IN_MODULES` resolves to `string` rather than the
union of the literal keys. The TASK explicitly called for `satisfies`,
which preserves the literal keys while still validating shape.

**Fix:**

```ts
export const BUILT_IN_MODULES = {
  'device-info': deviceInfoModule,
} as const satisfies Record<string, DebuggerModule<any>>

export type BuiltInModuleId = keyof typeof BUILT_IN_MODULES  // 'device-info'
```

Variance note: `DebuggerModule<unknown>` won't accept
`DebuggerModule<void>` directly because `render`'s `TSettings`
parameter is contravariant. Using `DebuggerModule<any>` in the
`satisfies` constraint sidesteps the variance trap without losing
structural validation. The inline `as DebuggerModule<unknown>` cast on
the entry can go away.

Mirror the type-erasure in the resolver (`resolve.ts`) so consumer
casts disappear too:

```ts
export function resolveModules(
  configModules: ReadonlyArray<DebuggerModuleEntry>,
  customModules: ReadonlyArray<DebuggerModule<any>>,
  builtIns: Record<string, DebuggerModule<any>>,
): ResolvedModule[] { ... }
```

`Debugger.tsx`'s `modules?: DebuggerModule<unknown>[]` prop can stay
public as `unknown` — that's still meaningful for hosts authoring
custom modules — but the internal handoff to the resolver uses `any`.

## Non-blocking polish (fold into the same fix if convenient)

### Freeze the registry

`BUILT_IN_MODULES` is currently a mutable named export. Adding
`Object.freeze(...)` (or relying on `as const`'s readonly inference)
prevents host code from monkey-patching it.

### Document descriptor lookup precedence

In `resolve.ts`'s `findDescriptor`, built-ins are checked before
custom modules. A one-line comment near the function makes the
precedence explicit, since this could surprise a host who reuses a
built-in id for their own module:

```ts
// Built-ins win when a custom module declares the same id — keeps
// host code from accidentally shadowing the package's reserved ids.
```

### `useMemo` dep on the `modules` prop

`Debugger.tsx` memoizes `resolveModules` on `[configModules, modules]`.
If hosts pass a fresh array literal each render (e.g.
`<Debugger modules={[m]} />`), the memo invalidates every render.
`resolveModules` is cheap today, so it's only a flag for the future —
not a fix.

## Out of scope

- Multi-instance modules (TASK explicitly defers; `instanceKey` field
  already reserved).
- API healthcheck and other built-ins (each is its own task).
- Per-module settings schema validation (TASK defers).

## Acceptance for the fix

- `BuiltInModuleId` types as `'device-info'` (verifiable via TS via a
  type assertion test or just inspecting the emitted `.d.ts`).
- Inline `as DebuggerModule<unknown>` cast in `registry.ts` removed.
- Resolver signature uses `DebuggerModule<any>` in the registry /
  custom-modules parameters; consumer casts at the call site removed.
- One-line precedence comment near `findDescriptor`.
- `BUILT_IN_MODULES` shallow-frozen (or `as const` if that's enough).
- All gates still clean; smoke tests still pass.
