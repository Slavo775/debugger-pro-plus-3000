# N03 — Checklist

## Module API
- [ ] `src/modules/types.ts`:
  - [ ] `DebuggerModule<TSettings = unknown>` (`id`, `defaultTitle`, `defaultSettings?`, `render(ctx)`).
  - [ ] `ModuleContext<TSettings>` (`settings`, `title`).
  - [ ] `ResolvedModule` (`id`, `title`, `render`, `instanceKey`).
  - [ ] `DebuggerModuleEntry` (`string` shorthand or `{ id, title?, settings? }`).

## Built-in registry
- [ ] `src/modules/registry.ts`:
  - [ ] `BUILT_IN_MODULES` object keyed by ID.
  - [ ] `BuiltInModuleId` exported.
- [ ] `src/modules/builtin/index.ts` barrel.
- [ ] `src/modules/index.ts` barrel.

## device-info module
- [ ] `src/modules/builtin/deviceInfo.tsx`:
  - [ ] `DebuggerModule<void>` with `id: 'device-info'`, `defaultTitle: 'Device'`.
  - [ ] React component shows: userAgent, platform, language, online status (live), viewport (live on resize), screen, devicePixelRatio, prefers-color-scheme (live).
  - [ ] SSR-safe: guard all `window` / `navigator` / `matchMedia` access with `typeof window !== 'undefined'`; render a "Device info unavailable outside a browser." fallback otherwise.
  - [ ] Long values (user agent) wrap; container scrolls inside the panel content area.

## Config schema
- [ ] Extend `DebuggerConfig` with `modules?: DebuggerModuleEntry[]`.
- [ ] Extend `ResolvedDebuggerConfig.modules: DebuggerModuleEntry[]` (defaults to `[]`).

## Defaults & merge
- [ ] `DEFAULT_DEBUGGER_CONFIG.modules = []`.
- [ ] `mergeWithDefaults` replaces (not merges) the array — spread-copy to avoid sharing refs with user config.

## Loader validation
- [ ] Reject non-array `modules`.
- [ ] Reject entries that are neither non-empty strings nor plain objects.
- [ ] Reject object entries with missing / empty / non-string `id`.
- [ ] Reject object entries with non-string `title` (when present).
- [ ] Reject object entries with non-object `settings` (when present).
- [ ] Errors include the file path and `[debugger-pro-plus-3000]` prefix.

## Resolver
- [ ] `src/modules/resolve.ts` exports `resolveModules(configModules, customModules, builtIns): ResolvedModule[]`.
- [ ] Walks `configModules` in order, normalizes string-shorthand entries.
- [ ] For each entry: looks up the descriptor in `builtIns`, then in `customModules`.
- [ ] Computes `title = entry.title ?? descriptor.defaultTitle` and `settings = { ...defaultSettings, ...entry.settings }`.
- [ ] Unknown IDs log a console warning once per session per ID (track via a module-scope `Set`); do **not** throw.
- [ ] Appends any `customModules` not already consumed by config entries.

## Debugger integration
- [ ] Rename `DebuggerPlugin` → `DebuggerModule`-shaped entries on the `<Debugger>` API (breaking).
- [ ] Rename `plugins?` prop → `modules?: DebuggerModule[]`.
- [ ] Inside `DebuggerPanel`: call `resolveModules(config.modules, props.modules, BUILT_IN_MODULES)`, render tabs from the resolved list.
- [ ] Tab label uses `resolvedModule.title`; tab content calls `resolvedModule.render()`.
- [ ] Keep `activePlugin` state but rename to `activeModuleId` for consistency.

## Public API
- [ ] `src/index.ts` re-exports:
  - [ ] Types: `DebuggerModule`, `ModuleContext`, `ResolvedModule`, `DebuggerModuleEntry`, `BuiltInModuleId`
  - [ ] Values: `BUILT_IN_MODULES`, `deviceInfoModule`
- [ ] `src/config/index.ts` re-exports `DebuggerModuleEntry`.

## Dev preview
- [ ] `config.debugger.js`: `modules: ['device-info']` (or with a title override for demo).
- [ ] `src/main.tsx`: use the new `modules` prop name for the demo plugin (configEcho).
- [ ] Page blurb updated to mention modules come from config + custom modules can still be passed via the prop.

## Quality gates
- [ ] `pnpm lint` clean.
- [ ] `pnpm build` succeeds; `.d.ts` includes the new module types.
- [ ] Loader smoke test covers: `modules: 'x'` (rejected), `modules: [null]` (rejected), `modules: [{}]` (rejected), `modules: [{ id: '' }]` (rejected), `modules: [{ id: 'x', title: 7 }]` (rejected), `modules: [{ id: 'x', settings: 'no' }]` (rejected), valid `modules: ['x']` and `modules: [{ id: 'x', title: 'Y', settings: { k: 1 } }]` (accepted).

## Manual verification (browser at http://localhost:4242 + mobile)
- [ ] With `modules: ['device-info']` the panel shows a Device tab with live info.
- [ ] User agent value wraps; the content area scrolls if the rows exceed the panel height.
- [ ] Toggle the network off in dev tools — online status flips to "offline" without a manual refresh.
- [ ] Resize the browser — viewport row updates live.
- [ ] Switch system dark/light mode — color-scheme row updates live.
- [ ] With `modules: ['nope']` the panel still renders (no crash); console shows one `[debugger-pro-plus-3000] Unknown module id: nope` warning per session.
- [ ] With `modules: [{ id: 'device-info', title: 'My Device' }]` the tab label is "My Device".
- [ ] A custom module passed via `<Debugger modules={[customDescriptor]} />` appears in the tab bar after the config-selected device-info tab.
