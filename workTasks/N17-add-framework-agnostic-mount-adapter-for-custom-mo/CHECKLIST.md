# N17 — Add framework-agnostic mount adapter for custom modules — Checklist

## Done criteria

- [ ] `src/modules/types.ts` exposes `DebuggerModuleDefinition` as `render | mount` union; `RegisteredModule` updated; `DebuggerApi` shape unchanged.
- [ ] `src/modules/useDebuggerApi.ts` exports an internal `buildDebuggerApi(ctx, moduleId)` helper; hook still returns the same object for React modules.
- [ ] New file `src/modules/ImperativeModulePanel.tsx` renders a host `<div>`, builds the api via the registry context, calls `module.mount(div, api)` on mount, and calls the returned unmount on cleanup.
- [ ] `DebuggerModuleRegistryProvider.tsx` resolves `render = def.render ?? (() => <ImperativeModulePanel module={def} />)` and throws if neither is supplied. Zero imports from `modules/predefined/*`.
- [ ] `src/components/Debugger.tsx` unchanged with respect to predefined-module imports (INVARIANT 1).
- [ ] `src/index.ts` re-exports the updated `DebuggerModuleDefinition` (and any new alias type) — runtime imports from consumer code still resolve.
- [ ] `src/main.tsx` includes a `vanillaDemoModule` using the `mount` path for manual verification during `npm run dev`. Not part of the shipped library.
- [ ] Existing predefined modules (`logsModule`, `networkModule`, `deviceInfoModule`, `consoleLoggerModule`) compile and render with no source changes required.

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes (zero warnings)
- [ ] `npm run build` passes
- [ ] `npm run format:check` passes
- [ ] No regressions in existing predefined modules

## Verification

- [ ] `npm run dev` — vanilla-demo panel appears; button click increments a counter; `route-change` reaches the vanilla panel; snapshot exposes `vanilla-demo.clicks`.
- [ ] `npm run dev` — every existing predefined module still renders and behaves as before.
- [ ] `grep -R "predefined" src/components/Debugger.tsx src/modules/DebuggerModuleRegistryProvider.tsx src/modules/ImperativeModulePanel.tsx` returns no matches (host-stays-blind invariant).
- [ ] Author a throwaway test definition with neither `render` nor `mount` — registry throws a clear `Module "x" must define either render or mount.` error.
