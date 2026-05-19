# N02 — Checklist

## Config schema
- [ ] Add `DebuggerPanelStyleConfig` (`width?: number`) to `src/config/types.ts`.
- [ ] Add `DebuggerPanelConfig` (`title?: string`, `style?: DebuggerPanelStyleConfig`).
- [ ] Extend `DebuggerConfig` with `panel?: DebuggerPanelConfig`.
- [ ] Extend `ResolvedDebuggerConfig` so `panel` and `panel.style` are fully resolved post-merge.

## Defaults & merge
- [ ] `DEFAULT_DEBUGGER_CONFIG.panel.title = 'Debugger Pro Plus 3000'`.
- [ ] `DEFAULT_DEBUGGER_CONFIG.panel.style.width = 320`.
- [ ] `mergeWithDefaults` deep-merges `panel` and `panel.style` so callers can override either field alone.

## Loader validation
- [ ] Reject non-object `panel`.
- [ ] Reject non-string `panel.title`.
- [ ] Reject non-object `panel.style`.
- [ ] Reject non-finite / non-positive / non-number `panel.style.width`.
- [ ] Each error includes the file path and the `[debugger-pro-plus-3000]` prefix.

## Panel layout (`src/components/Debugger.tsx`)
- [ ] Replace the corner-anchored panel style with a side-anchored full-height layout.
- [ ] Derive `side: 'left' | 'right'` from the FAB corner.
- [ ] Height: `100dvh`. Top: `0`. Bottom: `0`. Width: `min(${configured}px, 100vw)` (CSS expression).
- [ ] When fullscreen: width: `100vw`.
- [ ] Remove the old `cornerCoords` panel-positioning helper.

## Header
- [ ] Title element renders `config.panel.title` (heading semantics: `<h2>` or `role="heading" aria-level={2}`).
- [ ] Fullscreen icon button: `⤢` when not fullscreen, `⤡` when fullscreen.
  - [ ] `aria-label` switches between "Enter fullscreen" and "Exit fullscreen".
  - [ ] `aria-pressed={isFullscreen}`.
- [ ] Close ✕ button kept, with explicit 24×24 hit area.
- [ ] All three header controls share min-height 24, min-width 24.

## State
- [ ] New `isFullscreen` local state in the panel component.
- [ ] Fullscreen resets to `false` when the panel closes (so reopening starts at configured width).
- [ ] `Escape` key closes the panel (`document.addEventListener('keydown', ...)` with cleanup).

## Accessibility & responsiveness
- [ ] Panel container uses `role="complementary"` + `aria-label="Debugger panel"` (no focus trap — debugger must not lock the host page).
- [ ] All icon-only buttons have explicit `aria-label`.
- [ ] Tab buttons: min-height 24.
- [ ] Width capping: configured width > viewport width → CSS `min()` keeps panel at 100 vw.

## Public API
- [ ] Re-export `DebuggerPanelConfig` and `DebuggerPanelStyleConfig` from `src/config/index.ts` and `src/index.ts`.

## Dev preview
- [ ] Update `config.debugger.js` to set `panel: { title: 'My App Debugger', style: { width: 360 } }`.
- [ ] Update `src/main.tsx` blurb: note the panel is full-height and the title is configurable.

## Quality gates
- [ ] `pnpm lint` clean.
- [ ] `pnpm build` succeeds; `.d.ts` includes the new types.
- [ ] Node smoke test of loader covers: `panel: 'x'` (rejected), `panel: { title: 123 }` (rejected), `panel: { style: 'x' }` (rejected), `panel: { style: { width: -1 } }` (rejected), valid `panel: { title: 'X', style: { width: 400 } }` (accepted).

## Manual verification (browser at http://localhost:4242 + mobile)
- [ ] Default: panel is 320 wide, full viewport height, right side; FAB sits at right-bottom.
- [ ] Drag FAB to a left-side corner → panel opens on the left.
- [ ] Set `panel.title: 'X'` → header shows "X".
- [ ] Set `panel.style.width: 480` → panel is 480 wide.
- [ ] On a < configured-width viewport (mobile or narrow window), panel doesn't overflow.
- [ ] Fullscreen toggle: panel becomes 100 vw; icon and `aria-label` swap; clicking again returns to configured width.
- [ ] Close ✕ returns to FAB; reopen → not fullscreen.
- [ ] `Escape` closes the panel.
- [ ] All header buttons feel at least 24 px to tap on mobile (no fat-finger misses).
