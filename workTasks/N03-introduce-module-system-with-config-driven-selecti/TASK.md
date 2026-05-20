# N03 — Introduce module system with config-driven selection and first built-in (device-info)

**Type:** feat
**Priority:** high
**Tags:** modules, api, config, builtins, breaking
**Depends on:** N00 (config), N02 (panel)

## Summary

Today the panel renders whatever `plugins` array the host passes in. The user wants the panel to be **composed of "modules"**, where:

1. The package ships a set of **built-in modules** (device-info, API healthcheck, etc.) ready to drop in.
2. Users **opt in to built-ins via config** — list module IDs (with optional per-module title/settings) in `config.debugger.js`.
3. There's a clean **module API** — a stable shape for what a module is: id, default title, default settings, render fn.
4. Each module has a **unique identifier** so the panel can find it, persist per-module state in the future, and prevent duplicates.

This task lays down the module framework and ships **one built-in: `device-info`** (browser/screen/locale/online-status inspector). Other built-ins (API healthcheck, etc.) follow in their own tasks.

This is a **breaking change** at v0.1.0: the existing `plugins` prop on `<Debugger>` and the `DebuggerPlugin` type are renamed to `modules` / `DebuggerModule`, and the shape changes slightly to match the new descriptor API. Nothing else in the repo depends on the old shape.

## Why

- "Modules" matches the user's mental model and is the term used in the request.
- Config-driven selection means dropping a built-in into a project is a one-line edit, not a code import + wiring step. This is the whole point of the config layer.
- A stable descriptor API lets the package and the host share a vocabulary, makes future built-ins straightforward to add, and unlocks per-module settings as a first-class concept.
- Locking in the API now (before there are many modules) avoids messy migrations later.

## Scope

### In scope

#### Module API (`src/modules/types.ts`)

```ts
export interface DebuggerModule<TSettings = unknown> {
  /** Stable unique identifier. Built-ins use slug-IDs (e.g. 'device-info'). */
  id: string
  /** Human-readable label shown in the tab bar when the user hasn't overridden it. */
  defaultTitle: string
  /** Optional defaults for module-specific settings. */
  defaultSettings?: TSettings
  /** Renders the module's content. Receives the resolved settings + title. */
  render: (ctx: ModuleContext<TSettings>) => React.ReactNode
}

export interface ModuleContext<TSettings> {
  settings: TSettings
  title: string
}

/** A resolved module instance — descriptor + user-merged settings. */
export interface ResolvedModule {
  id: string
  title: string
  render: () => React.ReactNode
  /** Stable per-instance key (for React reconciliation). Defaults to `id`. */
  instanceKey: string
}
```

Notes:
- `TSettings` is generic so each module can declare its own settings shape. Modules that take no settings use `void` (declared as `DebuggerModule<void>`).
- For v1 there is **one instance per module ID** (no multi-instance / duplicates). `instanceKey === id` for now; the field exists so we can support multiple instances later without another breaking change.

#### Built-in module registry (`src/modules/registry.ts`)

```ts
import type { DebuggerModule } from './types'
import { deviceInfoModule } from './builtin/deviceInfo'

export const BUILT_IN_MODULES = {
  'device-info': deviceInfoModule,
} satisfies Record<string, DebuggerModule<unknown>>

export type BuiltInModuleId = keyof typeof BUILT_IN_MODULES
```

The registry is a simple object keyed by module ID. Built-ins are imported and listed here; the loader/resolver can look up descriptors by ID without dynamic imports.

#### First built-in: `device-info` (`src/modules/builtin/deviceInfo.tsx`)

A read-only inspector that shows:
- `navigator.userAgent`
- Platform (`navigator.platform`)
- Language (`navigator.language`)
- Online status (`navigator.onLine`) with a live update on `online`/`offline` events
- Viewport dimensions (`window.innerWidth × window.innerHeight`), live on resize
- Screen dimensions (`screen.width × screen.height`)
- Device pixel ratio (`window.devicePixelRatio`)
- Color scheme preference (`matchMedia('(prefers-color-scheme: dark)')`), live

No per-module settings beyond title in v1. Module signature: `DebuggerModule<void>`.

Layout: a vertical list of label/value rows using inline styles consistent with the panel chrome (dark background, monospace, alternating row colors). Long values (like user agent) wrap.

#### Config schema additions

```ts
export type DebuggerModuleEntry =
  | string // shorthand: just the built-in module id
  | {
      id: string
      title?: string
      settings?: Record<string, unknown>
    }

export interface DebuggerConfig {
  // ... existing
  modules?: DebuggerModuleEntry[]
}
```

Defaults: `modules: []` (no built-ins active by default — host has to opt in).

#### Loader validation

- `modules` must be an array if present.
- Each entry must be either a non-empty string or a plain object with a non-empty string `id`.
- Object form: `title` must be a string if present; `settings` must be a plain object if present.
- **Built-in lookup is not done at load time** — the loader is package-agnostic and just validates shape. Unknown IDs surface later, at panel render, as a clear `[debugger-pro-plus-3000]`-prefixed warning (console.warn, not throw — the host page shouldn't crash because of a typo).

#### Merge

`config.modules` is **replaced**, not merged. List semantics: the user's choice fully overrides the default empty list. The merge function still spread-copies the array so we don't share refs with the user's config.

#### Resolver / wiring in `Debugger.tsx`

A new internal helper `resolveModules(config, customModules, builtIns)` returns an ordered `ResolvedModule[]`:

1. Walk `config.modules` in order; for each entry:
   - Normalize to `{ id, title?, settings? }`.
   - Look up the descriptor in `builtIns` **or** in the `customModules` array.
   - If found: produce a `ResolvedModule` with `title = entry.title ?? descriptor.defaultTitle`, `settings = { ...descriptor.defaultSettings, ...entry.settings }`, `render = () => descriptor.render({ settings, title })`.
   - If not found: `console.warn('[debugger-pro-plus-3000] Unknown module id: ${id}')` and skip it.
2. Append any `customModules` not already consumed by config entries (so hosts can register custom modules at runtime without listing them in config).

#### Breaking API renames

- `DebuggerPlugin` → `DebuggerModule` (and shape change, see above).
- `<Debugger plugins={...} />` prop → `<Debugger modules={...} />`.
- `plugins?: DebuggerPlugin[]` on `DebuggerProps` → `modules?: DebuggerModule[]`.

`src/main.tsx` and `config.debugger.js` updated to the new names.

#### Public API exports (`src/index.ts`)

- `DebuggerModule`, `ModuleContext`, `ResolvedModule`, `DebuggerModuleEntry` types
- `BUILT_IN_MODULES` and `BuiltInModuleId`
- `deviceInfoModule` (so hosts can also pass it directly via `modules` prop if they prefer)

### Out of scope (deferred)

- Additional built-ins (API healthcheck, network log, console, env, etc.). Each gets its own task.
- Multi-instance modules (two `api-healthcheck` tabs with different endpoints).
- Per-module persistent state / storage abstraction.
- Module ordering controls (drag-to-reorder in the tab bar).
- A "registry hook" that lets modules register themselves at import side-effect (avoiding the central registry object). Keeping registration centralized for clarity.
- Async / lazy modules — for v1 all modules are bundled into the main package output.
- Module-specific settings schema validation (per-module Zod-style schemas). For now settings are `unknown` and the module type-narrows internally.
- A devtools/extension UI for picking modules visually — config-driven only.

## Acceptance criteria

- `<Debugger />` with no config and no `modules` prop renders zero tabs (was: zero tabs from no plugins). Same baseline.
- `config.debugger.js` with `modules: ['device-info']` renders one tab labelled "Device" showing the device-info inspector. The tab populates with live data.
- `config.debugger.js` with `modules: [{ id: 'device-info', title: 'My Device' }]` renders the same content with the overridden tab label.
- `config.debugger.js` with `modules: ['nope']` does **not** crash — it logs `[debugger-pro-plus-3000] Unknown module id: nope` to the console and renders no tab for it.
- Custom modules can still be passed via `<Debugger modules={[customDescriptor]} />` and appear in the tab bar after config-selected built-ins.
- Loader rejects malformed `modules` (non-array, entries with missing `id`, wrong types) with prefixed errors.
- `pnpm lint` clean, `pnpm build` succeeds, `.d.ts` includes new types.
- Mobile: device-info tab content scrolls inside the panel content area without breaking layout.

## Files (expected)

- `src/modules/types.ts` (new) — `DebuggerModule`, `ModuleContext`, `ResolvedModule`, `DebuggerModuleEntry`
- `src/modules/registry.ts` (new) — `BUILT_IN_MODULES`, `BuiltInModuleId`
- `src/modules/resolve.ts` (new) — `resolveModules(config, customModules)`
- `src/modules/builtin/deviceInfo.tsx` (new) — first built-in
- `src/modules/builtin/index.ts` (new) — barrel
- `src/modules/index.ts` (new) — barrel
- `src/config/types.ts` (edit) — `DebuggerModuleEntry`; extend `DebuggerConfig` / `ResolvedDebuggerConfig`
- `src/config/defaults.ts` (edit) — `modules: []`
- `src/config/merge.ts` (edit) — array replace
- `src/config/loadDebuggerConfig.ts` (edit) — validate `modules`
- `src/config/index.ts` (edit) — re-export new types
- `src/components/Debugger.tsx` (edit) — replace `plugins` prop with `modules`; resolve modules via `resolveModules`; render their content in the tab bar
- `src/index.ts` (edit) — re-export module API + `deviceInfoModule` + `BUILT_IN_MODULES`
- `src/main.tsx` (edit) — dev preview consumes config-driven modules + one custom module to demonstrate both paths
- `config.debugger.js` (edit) — add `modules: ['device-info']` (or with a title override)

## Decisions baked in (overridable)

- **Modules selected by string ID in config, hybrid array of `string | object` for ergonomics.** Lets simple cases stay terse (`'device-info'`) while keeping room for settings/title overrides.
- **One instance per module ID (v1).** Multi-instance is a future story; `instanceKey` field is reserved so the future change isn't breaking.
- **Unknown module IDs warn, do not throw.** Throwing inside a debugger that's supposed to help you debug is hostile UX.
- **Breaking rename `plugins` → `modules`.** v0.1.0 has no published users; cleaner to do it now.
- **Modules render in config-list order, then runtime-prop modules.** Predictable; reorder is a future feature.
- **`deviceInfoModule` ships as both a registry entry and a named public export.** Some hosts will prefer importing it; both paths work.
- **Settings are `Record<string, unknown>` in config, generic `TSettings` per descriptor in code.** No per-module schema validator yet — each module casts/narrows on its own. Cheap; revisit if it gets error-prone.

## Risks / open questions

- **`navigator` / `window` usage in `deviceInfo`:** SSR-unsafe access. Guard with `typeof window !== 'undefined'` (and `typeof navigator`) — the module renders a fallback in non-browser contexts.
- **Tab bar growth:** ten or more modules will exceed the panel width on mobile. The tab bar already wraps (`flexWrap: 'wrap'`); will need a horizontal scroll variant later. Not a blocker.
- **Vocabulary collision risk:** "module" overlaps with "ESM module". Inside this codebase the meaning is unambiguous (debugger modules); use the term consistently and lean on the type names (`DebuggerModule`) to keep it clear in mixed contexts.
- **Unknown-id warning noise:** if someone has a typo in their config they might spam the console with every render. The resolver should compute the warning **once per render** (not per re-render), and ideally only log once per ID per session. Implementation note rather than a hard requirement — a `Set` of warned IDs at module scope is fine.
- **Built-in modules with their own external dependencies** (api-healthcheck, etc.) might want to fetch on a polling interval. We don't pay that cost today — only `device-info` ships now — but the API should be expressive enough that polling, async setup, and teardown all live in standard React-effect territory inside the module's render fn.
