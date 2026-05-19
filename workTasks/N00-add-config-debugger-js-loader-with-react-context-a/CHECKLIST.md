# N00 — Checklist

## Types & defaults
- [ ] Create `src/config/types.ts` exporting `DebuggerConfig` (`style?.primaryColor?: string`).
- [ ] Create `src/config/defaults.ts` exporting `DEFAULT_DEBUGGER_CONFIG` with `style.primaryColor = '#1a6eb5'`.

## Loader
- [ ] Create `src/config/loadDebuggerConfig.ts` with `loadDebuggerConfig(options?: { cwd?: string }): Promise<DebuggerConfig>`.
- [ ] Resolve `config.debugger.js` from `cwd` (default `process.cwd()`).
- [ ] Use dynamic `import(pathToFileURL(...).href)` so it works on Windows + ESM/CJS.
- [ ] Support both `export default` and `module.exports` (handle `.default` unwrap).
- [ ] Return defaults if file is missing (catch `ERR_MODULE_NOT_FOUND` / `MODULE_NOT_FOUND` / `ENOENT`).
- [ ] Validate types — throw prefixed errors for malformed shapes.
- [ ] Deep-merge user config over defaults.

## Context & hook
- [ ] Create `src/config/DebuggerConfigContext.tsx` with `DebuggerConfigProvider` (accepts optional `config` prop, falls back to defaults).
- [ ] Provider deep-merges incoming partial config with defaults so consumers can pass any subset.
- [ ] Create `src/config/useDebuggerConfig.ts` exporting `useDebuggerConfig()` hook.
- [ ] Hook throws a clear error if used outside the provider.

## Integration
- [ ] Add `config?: DebuggerConfig` prop to `DebuggerProps`.
- [ ] Wrap `Debugger` internals in `DebuggerConfigProvider`.
- [ ] Replace hard-coded `#1a6eb5` (active tab border + background accent) with values from `useDebuggerConfig()`.

## Public API
- [ ] Add `src/config/index.ts` barrel.
- [ ] Re-export from `src/index.ts`: `loadDebuggerConfig`, `DebuggerConfigProvider`, `useDebuggerConfig`, type `DebuggerConfig`.

## Verification
- [ ] Add a temporary `config.debugger.js` at project root with `{ style: { primaryColor: '#ff0066' } }` and confirm via `pnpm dev` that the active tab uses the new color. Remove before merging.
- [ ] `pnpm lint` clean.
- [ ] `pnpm build` succeeds.
- [ ] No regression: `<Debugger />` with no config still renders identically to before.
