# N03 Checklist

## Config layer
- [ ] `DebuggerModuleConfig` type added to `src/config/types.ts`
- [ ] `DebuggerConfig.modules?: DebuggerModuleConfig[]` added
- [ ] `ResolvedDebuggerConfig.modules: DebuggerModuleConfig[]` added (non-optional)
- [ ] `DEFAULT_DEBUGGER_CONFIG.modules` defaults to `[]`
- [ ] `merge.ts` merges modules array (replace entries by ID, keep config order)
- [ ] `loadDebuggerConfig.ts` validates each module: `id` is non-empty string, `title` is string|undefined, `defaultExpanded` is boolean|undefined, `data` is plain object|undefined
- [ ] Invalid module entries skipped with `[debugger-pro-plus-3000]` prefixed console.warn

## Module types
- [ ] `src/modules/types.ts` defines `DebuggerModuleConfig`, `RegisteredModule`, `ModuleEventHandler`, `DebuggerApiContextValue`, `DebuggerApi`

## Registry context + provider
- [ ] `DebuggerModuleRegistryContext` created (context only, no logic)
- [ ] `DebuggerModuleRegistryProvider` manages `Map<id, RegisteredModule>` state
- [ ] `_register` is idempotent (duplicate ID → console.warn, ignore)
- [ ] `_register` title precedence: config.title > prop title > id
- [ ] `_register` respects `defaultExpanded` from config (default: `true`)
- [ ] `_unregister` removes module from registry
- [ ] `_emit` calls `onModuleEvent` prop with (moduleId, event, payload)
- [ ] `_subscribe` stores handler, returns stable unsub fn
- [ ] `_send` calls all subscribed handlers for the given module+event
- [ ] `_toggleExpanded` flips expanded boolean for that module ID

## DebuggerModule wrapper
- [ ] `DebuggerModule` renders `null` at its placement site
- [ ] Calls `_register` in a `useEffect` on mount
- [ ] Calls `_unregister` in the cleanup of that effect
- [ ] Sets `DebuggerModuleIdContext` so children can call `useDebuggerApi()`
- [ ] `render` function stored in registry is `() => children`

## useDebuggerApi hook
- [ ] Reads own module ID from `DebuggerModuleIdContext`
- [ ] Throws a descriptive error if called outside a `<DebuggerModule>` subtree
- [ ] `emit(event, payload?)` calls `_emit` with the module's own ID
- [ ] `subscribe(event, handler)` calls `_subscribe` with own ID, returns unsub fn
- [ ] `moduleData` returns the `data` object from config for this module (empty object if not configured)

## Debugger component changes
- [ ] `DebuggerProps` adds `children?: ReactNode`
- [ ] `DebuggerProps` adds `onModuleEvent?: (moduleId, event, payload) => void`
- [ ] `DebuggerModuleRegistryProvider` wraps the full render tree (inside `DebuggerConfigProvider`)
- [ ] `children` are rendered always (regardless of open/closed panel) so modules stay registered
- [ ] Tab bar removed from panel
- [ ] Panel content area is a scrollable accordion stack
- [ ] Legacy `plugins` prop still works — each plugin is rendered as a synthetic module item (no self-registration needed; rendered directly using plugin's `render()`)

## Accordion UI
- [ ] Each module item: header (title left, chevron button right) + collapsible body
- [ ] Chevron rotates on expand/collapse (▾ expanded, ▸ collapsed)
- [ ] Collapse/expand animation uses measured `scrollHeight` (NOT `max-height: 9999px`)
- [ ] Transition: `220ms cubic-bezier(0.4, 0, 0.2, 1)` on max-height + `180ms ease` on opacity
- [ ] After expand transition completes → `overflow: visible` (so dropdowns/tooltips inside can escape)
- [ ] Empty state: "No modules registered." hint when registry has no entries and no plugins
- [ ] All accordion styles are inline (no CSS files)

## Barrel / public API
- [ ] `src/modules/index.ts` exports `DebuggerModule`, `useDebuggerApi`, all public types
- [ ] `src/index.ts` re-exports `DebuggerModule`, `useDebuggerApi`, `DebuggerModuleConfig`, `RegisteredModule`, `DebuggerApi`

## Dev preview
- [ ] `config.debugger.js` updated to include at least two example modules
- [ ] `src/main.tsx` renders `<DebuggerModule>` components inside `<Debugger>` to exercise the stack
- [ ] Manual browser check: accordion expand/collapse works; `useDebuggerApi` emit/subscribe round-trip works in console

## Gates
- [ ] `pnpm lint` passes (`--max-warnings 0`)
- [ ] `pnpm build` succeeds (tsc + vite)
