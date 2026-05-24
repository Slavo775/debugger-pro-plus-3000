# N14 — Add consoleLoggerModule — intercept window.console and surface logs in debugger — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-24
**PR:** https://github.com/Slavo775/debugger-pro-plus-3000/pull/13
**Verdict:** APPROVED

## Summary

Adds a stateful sub-folder predefined module (`consoleLogger`) that intercepts 8 `window.console` methods on panel mount via `useEffect`, restores them on unmount, and pipes each entry into `updateData({ consoleLogs })` so the debug snapshot stays current. Risk: **low**. Module is fully self-contained, host/guest invariant intact, no cross-module imports, no new system events. Native DevTools output is preserved (wrapper calls the original first). When `consoleLoggerModule` is omitted from the consumer's `modules` prop, the panel never mounts and `window.console` is never patched — zero side-effects when absent.

## Checklist verification

- [x] `consoleLoggerStore.ts` exists with `patchConsole`, `restoreConsole`, `getConsoleLoggerStore`, `subscribeConsoleLogger` exports — pass
- [x] `ConsoleLogEntry` type defined as `{ id: number; ts: number; level: ConsoleLogLevel; args: unknown[] }` — pass (`consoleLoggerStore.ts:13-18`)
- [x] `ConsoleLogLevel` covers exactly the 8 levels — pass (`consoleLoggerStore.ts:1-9`)
- [x] Patch wrapper calls original console method **before** pushing to store — pass (`consoleLoggerStore.ts:85` → wrapper calls `original(...args)` first)
- [x] `assert` entries only recorded when first arg is falsy — pass (`consoleLoggerStore.ts:86-91`)
- [x] `restoreConsole()` fully restores all 8 patched methods — pass (`consoleLoggerStore.ts:100-112`)
- [x] `window.__debuggerConsoleLogger` lazy-init singleton with `_subs: Set<() => void>` — pass (`consoleLoggerStore.ts:44-56`)
- [x] `ConsoleLoggerPanel.tsx` patches on mount, restores on unmount — pass (`ConsoleLoggerPanel.tsx:65-79`)
- [x] Panel calls `updateData({ consoleLogs: store.entries })` on every new entry — pass (notify pushes via subscriber)
- [x] Panel uses `useReducer` forceUpdate pattern — pass (`ConsoleLoggerPanel.tsx:62`)
- [x] Panel reads `maxEntries` from `useDebuggerConfig().consoleLogger.maxEntries` — pass (`ConsoleLoggerPanel.tsx:63`)
- [x] Entries rendered reverse-chronological with level color-coding — pass (`LEVEL_TEXT_COLOR`, `[...entries].reverse()`)
- [x] `consoleLoggerModule` has `id: 'consoleLogger'`, `title: 'Console'`, `render` returning `<ConsoleLoggerPanel />` — pass (`consoleLoggerModule.ts:5-10`)
- [x] `src/modules/predefined/consoleLogger/index.ts` barrel re-exports — pass
- [x] Four config files updated (INVARIANT 4) — pass (`types.ts`, `defaults.ts`, `merge.ts`, `src/index.ts`)
- [x] Default `maxEntries: 500` in `defaults.ts` — pass
- [x] `src/index.ts` re-exports module + utils + types (INVARIANT 6) — pass
- [x] `Debugger.tsx` has zero imports from `predefined/consoleLogger/` — pass (host-grep returns exit 1)
- [x] `DebuggerModuleRegistryProvider.tsx` has zero imports from `predefined/consoleLogger/` — pass
- [x] `src/main.tsx` includes `consoleLoggerModule` in `modules` array — pass

## Invariant compliance (project extensions)

| # | Invariant | Status |
|---|---|---|
| 1 | Host/Guest — no predefined imports in host | ✅ grep returns zero |
| 2 | Single Channel — only via `useDebuggerApi()` | ✅ panel uses `updateData` only |
| 3 | Module Init — side-effects in panel `useEffect` | ✅ patch/restore inside panel effect |
| 4 | Config Four-File Rule | ✅ all 4 files updated |
| 5 | Unified Module Config | ⚠️ see Non-blocking — panel reads `maxEntries` from `useDebuggerConfig()` (same precedent as logs/network; N11 will migrate all three) |
| 6 | Public Re-export | ✅ all new public symbols in `src/index.ts` |
| 7 | Sub-folder pattern with `window.__debuggerXxx` singleton | ✅ matches LogsPanel pattern |
| 8 | No Cross-Module Imports | ✅ grep clean |
| 9 | System Events — no new broadcasts | ✅ module does not `emit` |
| 10 | Ordering via `config.modules[].order` | ✅ no parallel mechanism |

## Quality gate results

- `npx tsc --noEmit` — ✅ pass (zero errors)
- `npm run lint` — ✅ pass (zero warnings, `--max-warnings 0`)
- `npm run build` — ✅ pass (`dist/debugger-pro-plus-3000.js 50.85 kB / 12.61 kB gzip`)
- `npm run format:check` — ⚠️ project-wide pre-existing prettier debt in 12 untouched files (`Debugger.tsx`, `DebuggerFab.tsx`, `LogsPanel.tsx`, etc.); **N14's own files are prettier-clean** — verified via targeted `prettier --list-different` on the changed file set
- Host/guest grep (INVARIANT 1) — ✅ exit 1 (zero matches)
- Cross-module grep (INVARIANT 8) — ✅ exit 1 (zero matches)

## Non-blocking

1. **INVARIANT 5 drift — config field is top-level.** `consoleLogger.maxEntries` lives on the resolved `DebuggerConfig`, and the panel reaches into `useDebuggerConfig()` for it instead of `useDebuggerApi().moduleData`. This matches the existing precedent of `logs`, `persistLogs`, and `network` (all top-level) — and the TASK.md explicitly cites N11 as "config shape pattern to follow." Treating this as non-blocking because (a) the TASK.md was approved with this shape, and (b) N11 ("Unify config — move logs and network into modules[].data") is the dedicated task to migrate all three together. When N11 lands, fold `consoleLogger` into the same migration.

2. **`patchConsole` and `restoreConsole` exported from sub-folder barrel but not re-exported from `src/index.ts`.** Currently they're internal helpers used by the panel. If consumers ever need to control patching directly (e.g., to temporarily pause capture), consider adding them to the public surface. Not required now.

3. **Console patch is global / not nested.** Calling `patchConsole()` twice without an intervening `restoreConsole()` is idempotent (`_patched` guard) — good. But if a *different* tool (e.g., Sentry, LogRocket) patches `console` after us, then unmounts run `restoreConsole()` and we'd restore *their* wrapper, not the native. Acceptable for scope; document if it becomes a recurring footgun.

4. **`updateData({ consoleLogs: [...store.entries] })` clones on every entry.** With `maxEntries: 500` this is a 500-element array clone per console call — cheap, but worth knowing if someone bumps `maxEntries` to 50_000.

## Security & edge cases

- **No XSS surface** — entries are rendered as React text children (`{formatEntryBody(...)}`), so HTML-like payloads from `console.log` strings are escaped by default.
- **Error object stack traces** — `formatArg(arg instanceof Error)` includes `arg.stack`, which can contain absolute file paths from source maps. Acceptable for a developer tool; do not enable in production builds without consumer opt-in (already gated by whether `consoleLoggerModule` is registered).
- **Circular references** — `JSON.stringify` will throw on circular objects; the `try/catch` in `formatArg` falls back to `String(arg)`. ✓
- **localStorage persistence** — not implemented (explicitly out of scope). ✓
- **assert recorded args** — `args.slice(1)` strips the condition before recording. Correct — only message args are stored.

## Notes

- Manual browser verification (`npm run dev` + DevTools console + Copy Snapshot) was NOT performed in this AI review pass — it requires a human running the dev server and exercising the console. The CHECKLIST.md "Verification" section lists the steps; please run them before merging or hand off to `/task-human-review`.
- Pre-existing project-wide prettier debt (12 files) is out of scope for N14 and should be cleaned up in a separate `chore(format)` PR — not a regression introduced here.
- Related tasks: **N11** (unify module config — will migrate `consoleLogger` along with `logs`/`network`), **N13** (snapshot/notification infra that this module integrates with).
