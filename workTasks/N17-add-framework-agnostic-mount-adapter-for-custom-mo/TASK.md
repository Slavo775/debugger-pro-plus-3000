# N17 — Add framework-agnostic mount adapter for custom modules

**Type:** feat
**Priority:** medium
**Created:** 2026-05-28

## Problem

`DebuggerModuleDefinition.render()` in `src/modules/types.ts:5-11` returns `React.ReactNode`, which locks every guest module to React. Consumers who want a Vue, Angular, Svelte, or plain DOM/jQuery panel cannot ship one without first transpiling it into a React tree. The host/guest contract (ARCHITECTURE.md, INVARIANT 1) is supposed to be framework-neutral on the guest side — the current React-coupled `render()` violates that spirit.

## Goal

1. Allow a guest module to be authored in any framework (Vue, Angular, jQuery, Svelte, vanilla DOM) and rendered inside the Debugger panel without a React wrapper.
2. Preserve full backwards-compatibility: existing `render()`-based modules (`logsModule`, `networkModule`, `deviceInfoModule`, `consoleLoggerModule`) and any consumer-authored React modules keep working unchanged.
3. Deliver the same `DebuggerApi` surface (`emit`, `subscribe`, `moduleData`, `updateData`) to non-React modules — without requiring `useDebuggerApi()` (which can only be called from a React render).
4. Keep INVARIANT 1 intact: `Debugger.tsx` and `DebuggerModuleRegistryProvider.tsx` stay free of any predefined-module imports.
5. Add no new system events, no new config files, no breaking changes to existing exports.

## Scope

### In scope

- **`src/modules/types.ts`** — extend `DebuggerModuleDefinition` so `render` becomes optional and a new optional `mount(container: HTMLElement, api: DebuggerApi) => () => void` field is accepted. Exactly one of `render` / `mount` must be provided. Update `RegisteredModule` to carry whichever one was supplied.
- **`src/modules/ImperativeModulePanel.tsx`** (new file) — a small React adapter component used internally by the registry when a module supplies `mount` instead of `render`. It renders one `<div ref>`, builds a `DebuggerApi` instance for the module via the registry context, calls `mount(div, api)` on mount, and calls the returned unmount function on unmount. Re-builds the api via context, so the four-member contract (INVARIANT 2) is preserved.
- **`src/modules/DebuggerModuleRegistryProvider.tsx`** — keep `def.render` when present; when only `def.mount` is supplied, synthesize a `render` that returns `<ImperativeModulePanel module={def} />`. The rest of the provider stays unchanged. (`ImperativeModulePanel` is part of the registry's own infrastructure, not a predefined module — INVARIANT 1 still holds.)
- **`src/modules/useDebuggerApi.ts`** — extract or expose a small internal helper `buildDebuggerApi(ctx, moduleId): DebuggerApi` so both the React hook and `ImperativeModulePanel` can produce the same object shape. No behavior change for existing React callers.
- **`src/index.ts`** — re-export `DebuggerApi` (already exported via `types`) and confirm the updated `DebuggerModuleDefinition` shape surfaces publicly (INVARIANT 6). No new top-level exports required if everything routes through the existing `types` re-export block.
- **`src/main.tsx` (dev preview)** — add one tiny demo "vanilla" module using `mount` to prove the path works end-to-end during `npm run dev`. Lives in dev preview only, not shipped.

### Out of scope

- Shipping framework-specific helpers (`createVueModule`, `createAngularModule`, etc.) — that is a follow-up task once the primitive lands.
- Converting any existing predefined module from `render` to `mount` — they stay React.
- New config fields (no edits to `src/config/*` — INVARIANT 4 not triggered).
- Style isolation (shadow DOM, scoped CSS) for guest frameworks — guest is responsible for its own styling.
- New system events beyond `route-change` / `viewport-change` (INVARIANT 9 untouched).
- Server-side rendering of guest modules.

## Implementation plan

1. **Extend the module contract types** — edit `src/modules/types.ts`. Make `render` optional. Add `mount?: (container: HTMLElement, api: DebuggerApi) => () => void`. Use a discriminated-union helper type to express "exactly one of render | mount required" (e.g., a TS overload-style union `DebuggerModuleDefinitionRender | DebuggerModuleDefinitionMount`). Update `RegisteredModule` accordingly. Keep `DebuggerApi` shape identical.
2. **Factor an api builder out of `useDebuggerApi`** — in `src/modules/useDebuggerApi.ts`, extract a pure function `buildDebuggerApi(ctx: DebuggerApiContextValue, moduleId: string): DebuggerApi`. The hook becomes a thin wrapper that reads context + module-id and returns `buildDebuggerApi(...)`. No public API change.
3. **Add `ImperativeModulePanel.tsx`** — `src/modules/ImperativeModulePanel.tsx`. Props: `{ module: DebuggerModuleDefinition }`. Internals:
   - Read `DebuggerApiContextValue` via `useContext(DebuggerModuleRegistryContext)`.
   - On mount, build api with `buildDebuggerApi(ctx, module.id)`.
   - Render `<div ref={containerRef} />`.
   - In `useEffect`, call `unmount = module.mount!(containerRef.current!, api)`. Cleanup calls `unmount()`. The effect depends on `module.id` so swapping module identity reinitializes.
4. **Wire the adapter into the registry** — in `DebuggerModuleRegistryProvider.tsx`, when mapping `moduleDefinitions` into `resolvedModules`, set `render = def.render ?? (() => <ImperativeModulePanel module={def} />)`. Validation: if neither `render` nor `mount` is provided, throw a clear error during registration (`Module "${id}" must define either render or mount.`). No changes to event routing, expand state, snapshot, or system events.
5. **Confirm public exports** — `src/index.ts` already re-exports `DebuggerApi` and `DebuggerModuleDefinition` from `./modules/types`. Verify the union-typed `DebuggerModuleDefinition` flows through with no extra entry needed. If TS surfaces a new exported alias (e.g., `DebuggerModuleDefinitionMount`), add it to the same export block.
6. **Dev-preview demo** — in `src/main.tsx`, add a `vanillaDemoModule: DebuggerModuleDefinition = { id: 'vanilla-demo', title: 'Vanilla DOM (mount)', mount: (el, api) => { ... } }` that paints a button into `el`, subscribes to `route-change`, and calls `api.updateData({ clicks: n })` on click. Pass it via `modules={[..., vanillaDemoModule]}`. Confirm it appears as an accordion item, the button works, route-change fires, snapshot includes `vanilla-demo.clicks`.
7. **Run gates** — `npx tsc --noEmit`, `npm run lint`, `npm run build`. Manually verify the dev preview and that existing React modules still render correctly.

## Verification

- `npx tsc --noEmit` — passes; new union type compiles, existing call sites unchanged.
- `npm run lint` — zero warnings.
- `npm run build` — produces `dist/` without errors.
- `npm run dev` — open the preview, expand the new "Vanilla DOM (mount)" panel, click the button: counter increments, console snapshot via `_getDebugSnapshot` includes `vanilla-demo.clicks`, navigating routes (back/forward) triggers a re-render inside the vanilla panel.
- Existing modules (`logsModule`, `networkModule`, `deviceInfoModule`, `consoleLoggerModule`) still render normally — no regression.
- Grep check: `src/components/Debugger.tsx` and `src/modules/DebuggerModuleRegistryProvider.tsx` still have zero imports from `src/modules/predefined/*` (INVARIANT 1).

## Notes

- Mental model: `render` is the React-native path, `mount` is the framework-agnostic path. The host (React) wraps `mount` guests in a thin React adapter that mounts an empty `<div>` and hands off control. From the guest's perspective it gets a DOM node + the same `DebuggerApi` object.
- The api passed into `mount` is a snapshot at mount time. If consumers need a live api (e.g., to react to context-driven changes), a follow-up task can introduce a `getApi()` accessor. For the first cut, a stable api ref is enough — the underlying `_emit`/`_subscribe`/`_updateData` callbacks are stable across re-renders.
- INVARIANT 2 (single channel): non-React modules still talk to the host via the four `DebuggerApi` members, just delivered as a function argument instead of a hook return. Contract is preserved, not widened.
- INVARIANT 4 (config four-file rule): not triggered — no new config fields.
- INVARIANT 7 (predefined patterns): not touched — this work adds a new "imperative/external" pattern alongside Flat and Sub-folder. A separate doc-update task can extend ARCHITECTURE.md with the third pattern once N17 is merged.
- Follow-ups (NOT this task): `createVueModule(component, options)`, `createAngularModule(...)`, `createSvelteModule(...)` thin wrappers around `mount`; ARCHITECTURE.md pattern doc; style isolation primitive.
