# N03 Checklist

## Config layer
- [ ] `DebuggerModuleConfig` type added to `src/config/types.ts`
- [ ] `DebuggerConfig.modules?: DebuggerModuleConfig[]` added
- [ ] `ResolvedDebuggerConfig.modules: DebuggerModuleConfig[]` added (non-optional)
- [ ] `DEFAULT_DEBUGGER_CONFIG.modules` defaults to `[]`
- [ ] `merge.ts` merges modules array (replace entries by ID, keep config order)
- [ ] `loadDebuggerConfig.ts` validates each module: `id` non-empty string, `title` string|undefined, `defaultExpanded` boolean|undefined, `data` plain object|undefined
- [ ] Invalid module entries skipped with `[debugger-pro-plus-3000]` prefixed console.warn

## Module types
- [ ] `src/modules/types.ts` defines `DebuggerModuleConfig`, `DebuggerModuleDefinition`, `RegisteredModule`, `ModuleEventHandler`, `DebuggerApiContextValue`, `DebuggerApi`
- [ ] `DebuggerModuleDefinition` has `render: () => React.ReactNode` (NOT optional — `mount` undefined for now)
- [ ] `RegisteredModule` has resolved `title`, `expanded`, `data`, and `render` fields

## Registry context + provider
- [ ] `DebuggerModuleRegistryContext` created (context only, no logic)
- [ ] `DebuggerModuleIdContext` created (string context; provides own module ID to `useDebuggerApi`)
- [ ] `DebuggerModuleRegistryProvider` accepts `moduleDefinitions`, `moduleConfigs`, `onModuleEvent`
- [ ] Registry derived via `useMemo` from `moduleDefinitions` + `moduleConfigs` (no dynamic register/unregister)
- [ ] Title precedence: `config.title > definition.title > id`
- [ ] `defaultExpanded` precedence: `config.defaultExpanded > definition.defaultExpanded > true`
- [ ] `data` = shallow merge of `config.data` over `definition.data` (config wins)
- [ ] `expanded` state lives in `useState` keyed by module ID, seeded from resolved `defaultExpanded`
- [ ] `_emit` calls `onModuleEvent` prop with `(moduleId, event, payload)`
- [ ] `_subscribe` stores handler in `Map<id, Map<event, Set<handler>>>`, returns stable unsub fn
- [ ] `_send` calls all handlers matching `(id, event)`
- [ ] `_toggleExpanded` flips `expanded` for the given ID

## useDebuggerApi hook
- [ ] Reads own module ID from `DebuggerModuleIdContext`
- [ ] Throws a descriptive error if called outside a module render context (null context)
- [ ] `emit(event, payload?)` calls `_emit` with own ID
- [ ] `subscribe(event, handler)` calls `_subscribe` with own ID, returns unsub fn
- [ ] `moduleData` returns `registeredModule.data` for own ID (empty object fallback)

## Debugger component changes
- [ ] `DebuggerProps` adds `modules?: DebuggerModuleDefinition[]`
- [ ] `DebuggerProps` adds `onModuleEvent?: (moduleId, event, payload) => void`
- [ ] `DebuggerProps` removes `children` (not part of this API)
- [ ] `DebuggerModuleRegistryProvider` wraps the panel tree
- [ ] Tab bar removed from panel
- [ ] Panel content area is a scrollable `<ul>` accordion stack
- [ ] Accordion item renderer wraps each `module.render()` in `<DebuggerModuleIdContext.Provider value={module.id}>`
- [ ] Legacy `plugins` prop still works — each plugin inserted as a synthetic module at the **front** of the list (title = `plugin.label`, render = `plugin.render`)

## Accordion UI
- [ ] Each module item `<li>`: header row (title left, chevron right) + collapsible body
- [ ] Chevron: ▾ expanded / ▸ collapsed; rotates on toggle
- [ ] Collapse/expand animation uses measured `scrollHeight` (NOT `max-height: 9999px`)
- [ ] Transition: `220ms cubic-bezier(0.4, 0, 0.2, 1)` on max-height + `180ms ease` on opacity
- [ ] After expand `transitionend` → set `overflow: visible`
- [ ] Empty state: "No modules loaded." hint when list is empty
- [ ] All accordion styles are inline (no CSS files)

## Barrel / public API
- [ ] `src/modules/index.ts` exports `useDebuggerApi`, all public types
- [ ] `src/index.ts` re-exports `useDebuggerApi`, `DebuggerModuleConfig`, `DebuggerModuleDefinition`, `RegisteredModule`, `DebuggerApi`
- [ ] `DebuggerModule` wrapper component is NOT exported (not part of public API in this task)

## Dev preview
- [ ] `config.debugger.js` updated with at least two module entries
- [ ] `src/main.tsx` passes `modules` prop to `<Debugger>` with at least two render functions
- [ ] Manual browser check: accordion expand/collapse animates; `useDebuggerApi` emit visible in console via `onModuleEvent`; subscribe round-trip works

## Gates
- [ ] `pnpm lint` passes (`--max-warnings 0`)
- [ ] `pnpm build` succeeds (tsc + vite)
