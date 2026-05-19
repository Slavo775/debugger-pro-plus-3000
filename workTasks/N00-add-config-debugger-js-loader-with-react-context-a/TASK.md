# N00 — Add `config.debugger.js` loader with React context and hook

**Type:** feat
**Priority:** high
**Tags:** config, context, hook, customization

## Summary

Introduce user-facing customization for Debugger Pro Plus 3000 via a project-root config file (`config.debugger.js`). The file exports a JSON-shaped options object. The loader reads it, validates it, and makes it available everywhere inside the Debugger through a React Context plus a `useDebuggerConfig()` hook.

## Why

Today the `Debugger` only accepts a few hard-coded props (`plugins`, `defaultOpen`, `position`) and styles are baked into the component. For users to customize visuals (starting with `style.primaryColor`) without forking the package or threading props through every plugin, we need:

1. A conventional, discoverable config file at the consumer's project root.
2. A loader that resolves and parses it.
3. A context + hook so any internal component or user-authored plugin can read config without prop drilling.

## Scope

### In scope

- **Config schema (v1):**
  ```ts
  export interface DebuggerConfig {
    style?: {
      primaryColor?: string
    }
  }
  ```
  Future-proofed shape: a top-level `style` object so we can grow it (e.g. `backgroundColor`, `fontFamily`) without breaking changes.

- **Config file convention:** `config.debugger.js` at the consumer project root.
  - Must be a JS module that default-exports (or `module.exports =`) a plain JSON-compatible object.
  - Loader must support both ESM `export default` and CJS `module.exports`.

- **Loader (`src/config/loadDebuggerConfig.ts`):**
  - Resolves `config.debugger.js` from the current working directory (or a passed-in `cwd`).
  - Returns a fully-resolved `DebuggerConfig` (merged with defaults).
  - If file is missing → returns defaults (no error, just silent fallback).
  - If file exists but is malformed → throws a clear, prefixed error (`[debugger-pro-plus-3000]`).
  - Validates shape: `style` must be an object if present; `primaryColor` must be a string if present.

- **Defaults (`src/config/defaults.ts`):**
  - `style.primaryColor` defaults to the current hard-coded accent (`#1a6eb5`).

- **Context (`src/config/DebuggerConfigContext.tsx`):**
  - `DebuggerConfigProvider` accepts `config?: DebuggerConfig` prop.
  - If `config` is omitted, the provider falls back to defaults (loader is invoked by the consumer, not eagerly inside the provider, because reading files at the project root only works in build-time / Node contexts — see "How loading works" below).
  - Exposes the merged config through context.

- **Hook (`src/config/useDebuggerConfig.ts`):**
  - `useDebuggerConfig()` returns the current `DebuggerConfig`.
  - Throws a clear error if called outside a `DebuggerConfigProvider`.

- **Wire into `Debugger` component:**
  - `Debugger` wraps its tree in `DebuggerConfigProvider` (passing through an optional `config` prop on `Debugger`).
  - Existing styles (`tabStyle` active border, panel accents) read `primaryColor` from the hook instead of using the hard-coded `#1a6eb5`.

- **Public API exports** from `src/index.ts`:
  - `loadDebuggerConfig`
  - `DebuggerConfigProvider`
  - `useDebuggerConfig`
  - `DebuggerConfig` type

### Out of scope (deferred)

- Additional style fields beyond `primaryColor` (will follow in later tasks).
- Theme presets / dark-light switching.
- Hot-reload of the config file at runtime.
- TypeScript config file support (`config.debugger.ts`) — JS only for v1.
- CLI command to scaffold a `config.debugger.js`.

## How loading works (design note)

Because `config.debugger.js` lives on the consumer's filesystem, it can only be `require`d in environments with Node access (Vite/webpack config, SSR, tests, Node tooling). Two consumption paths:

1. **Build-time / Node:** Consumer calls `await loadDebuggerConfig()` and passes the result into `<Debugger config={...} />` (or directly into `<DebuggerConfigProvider>`).
2. **Pure browser bundle:** Consumer can import their config directly (`import config from '../../config.debugger.js'`) and pass it in. Bundlers will inline it.

The loader itself uses dynamic `import()` so it works in both ESM and CJS without forcing a runtime dependency. We document both paths in the JSDoc on `loadDebuggerConfig`.

## Acceptance criteria

- `loadDebuggerConfig()` reads `config.debugger.js` from `cwd` (or provided path) and returns a merged `DebuggerConfig`.
- Missing config file → returns defaults, no throw.
- Malformed config (wrong types) → throws a clearly-prefixed error.
- `useDebuggerConfig()` returns the current config inside the provider; throws outside it.
- `<Debugger />` rendered without any config still works and uses defaults (existing behavior is preserved).
- `<Debugger config={{ style: { primaryColor: '#ff0066' } }} />` visibly changes the active-tab accent to `#ff0066`.
- New exports are present in `src/index.ts`.
- Lint + typecheck + build pass (`pnpm lint`, `pnpm build`).

## Files (expected)

- `src/config/defaults.ts` (new)
- `src/config/types.ts` (new) — `DebuggerConfig` interface
- `src/config/loadDebuggerConfig.ts` (new)
- `src/config/DebuggerConfigContext.tsx` (new)
- `src/config/useDebuggerConfig.ts` (new)
- `src/config/index.ts` (new) — barrel
- `src/components/Debugger.tsx` (edit) — wrap in provider, read color from hook
- `src/index.ts` (edit) — re-export public API

## Risks / open questions

- Resolving the config file with dynamic `import()` on Windows paths can be fragile — must use `pathToFileURL`.
- Need to decide whether `Debugger` should auto-invoke `loadDebuggerConfig()` if no `config` prop is passed. Current decision: **no** — keeps the component pure browser-safe; loading is the consumer's job. Loader is available as a separate export.
