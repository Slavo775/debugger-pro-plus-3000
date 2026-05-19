# N02 — Add full-height debug panel wrapper with configurable title, width, and fullscreen toggle

**Type:** feat
**Priority:** high
**Tags:** ui, panel, config, accessibility, responsive
**Depends on:** N00 (config layer), N01 (FAB / corner state)

## Summary

Turn the existing debugger panel into a proper side sidebar:

- **100 dvh tall** (full visible viewport height — `dvh` not `vh`, so mobile browser chrome doesn't clip it).
- **Default width 320 px**, configurable via `config.panel.style.width`.
- **Anchored to the side** the FAB lives on (left vs right; top/bottom no longer matter for the panel — it's full-height either way).
- **New three-element header** at the top: customizable title (left), fullscreen toggle (right), close ✕ (far right).
- **Content area below** hosts plugin tabs + plugin output, scrollable.
- **Fullscreen toggle** expands the panel to 100 vw temporarily; collapse returns it to the configured width. State is local to the open panel (resets when the panel closes).
- **Accessible & mobile-friendly:** all interactive controls ≥ 24 × 24 px hit area, panel width capped at viewport width on narrow screens, ARIA labels on icon-only buttons.

## Why

Today the panel is a small floating rectangle in the corner (360 × max-480, with insets). That works for tiny inspectors but breaks down once a plugin needs real estate (JSON tree, network log, etc.). Making it a proper full-height sidebar:

1. Gives plugins predictable, generous vertical space.
2. Matches the pattern devs expect from React DevTools / Redux DevTools / Sentry's session replay.
3. Lets us keep the panel anchored to the same side as the FAB (no more disorienting jumps when the FAB moves between top-right and bottom-right).
4. Makes the fullscreen mode trivial to add once the layout is already side-anchored.

## Scope

### In scope

#### Config schema additions

```ts
interface DebuggerPanelStyleConfig {
  width?: number // px, default 320
}

interface DebuggerPanelConfig {
  title?: string // default 'Debugger Pro Plus 3000'
  style?: DebuggerPanelStyleConfig
}

interface DebuggerConfig {
  style?: DebuggerStyleConfig
  button?: DebuggerButtonConfig
  panel?: DebuggerPanelConfig
}
```

Defaults (`ResolvedDebuggerConfig`):
- `panel.title: 'Debugger Pro Plus 3000'`
- `panel.style.width: 320`

#### Loader validation

- `panel` must be a plain object if present.
- `panel.title` must be a string if present (empty string allowed — caller's choice).
- `panel.style` must be a plain object if present.
- `panel.style.width` must be a finite positive number if present (same rules as `button.size`).
- Each error includes the file path and `[debugger-pro-plus-3000]` prefix.

#### Merge

Deep-merge `panel` (top-level) and `panel.style` (one level deep) so consumers can override either field without losing the other.

#### Panel layout

Replace today's `panelStyle(corner)` and `cornerCoords(corner)` in `Debugger.tsx` with a side-anchored full-height layout:

```
right-side, normal mode:
  position: fixed
  top: 0
  right: 0
  height: 100dvh
  width: min(${configuredWidth}px, 100vw)

right-side, fullscreen:
  width: 100vw

left-side mirrors right-side with `left: 0` instead of `right: 0`.
```

Derive `side` from the FAB corner:
- `leftTop` / `leftBottom` → `'left'`
- `rightTop` / `rightBottom` → `'right'`

#### Header

A new flex row at the top of the panel:

```
┌──────────────────────────────────────────────┐
│ {panel.title}              [⤢ fullscreen][✕] │ ← header
├──────────────────────────────────────────────┤
│ [Tab 1] [Tab 2] [Tab 3]                      │ ← tab bar (unchanged behavior)
├──────────────────────────────────────────────┤
│                                              │
│         plugin content (scrolls)             │
│                                              │
└──────────────────────────────────────────────┘
```

- Title: `<h2>` or `<span role="heading" aria-level="2">` with the configured title.
- Fullscreen toggle: icon button (`⤢` when not fullscreen, `⤡` when fullscreen). `aria-label` swaps too: "Enter fullscreen" ↔ "Exit fullscreen". `aria-pressed={isFullscreen}`.
- Close: existing ✕, kept but bumped to 24 × 24 hit area.

#### Fullscreen state

Local React state in the panel component. Toggled by the header button. Resets to `false` whenever the panel closes (so reopening always starts at the configured width).

#### Accessibility & responsiveness

- All header buttons ≥ 24 × 24 px (use padding to expand the hit area, not by making the icons huge).
- Tab buttons stay 11 px font but get a min-height that respects 24 px touch targets.
- `Escape` key closes the panel.
- Panel container has `role="dialog"` and `aria-label="Debugger panel"` (or uses the title via `aria-labelledby`).
- On viewports narrower than the configured width, the panel caps at `100vw` via CSS `min()` so it never overflows.
- The fullscreen toggle is still useful on mobile (giving plugins all of the screen).

#### Public API exports

From `src/config/index.ts` and `src/index.ts`:
- `DebuggerPanelConfig`
- `DebuggerPanelStyleConfig`

### Out of scope (deferred)

- Resizable panel (drag the inner edge to resize). Two-state width (configured ↔ fullscreen) is enough for v1.
- Multiple panel "docks" (bottom drawer, floating window, etc.).
- Per-plugin title override (the header always shows `config.panel.title`).
- Animated open/close transition for the panel itself (we already animate the FAB; the panel can pop instantly).
- Persisting the fullscreen state across sessions in localStorage.
- Theming the panel chrome (background, border, fonts) — only `width` is configurable for now; everything else inherits today's dark theme.

## Acceptance criteria

- `<Debugger />` with no config: panel is 320 px wide, full viewport height, anchored to the right edge (because FAB defaults to `rightBottom` → right side).
- After dragging the FAB to a left-side corner, the panel opens from the left edge instead.
- Header shows "Debugger Pro Plus 3000" by default, replaceable via `config.panel.title`.
- `config.panel.style.width: 480` makes the panel 480 px wide.
- On a 320 px viewport (mobile), a 480 px configured width is automatically capped to 100 vw.
- Clicking the fullscreen icon expands the panel to 100 vw; clicking again returns to configured width.
- Closing the panel (✕ or `Escape`) returns to the FAB; reopening starts at configured width (no leaked fullscreen state).
- All header buttons have a hit area ≥ 24 × 24 px.
- Loader rejects malformed `panel`, `panel.title`, `panel.style`, and `panel.style.width` values with prefixed errors.
- `pnpm lint` clean, `pnpm build` succeeds, `.d.ts` updated.

## Files (expected)

- `src/config/types.ts` — new `DebuggerPanelStyleConfig`, `DebuggerPanelConfig`; extend `DebuggerConfig` / `ResolvedDebuggerConfig`
- `src/config/defaults.ts` — `panel` defaults
- `src/config/merge.ts` — deep-merge `panel` and `panel.style`
- `src/config/loadDebuggerConfig.ts` — validate `panel` shape
- `src/config/index.ts` — re-export new types
- `src/components/Debugger.tsx` — overhaul panel layout: header (title + fullscreen + close), 100dvh, side-anchored, width from config, fullscreen state, Escape-to-close, 24 px hit areas
- `src/components/DebuggerPanel.tsx` (optional new file if `Debugger.tsx` grows uncomfortably large — split if it makes review easier)
- `src/index.ts` — re-export new types
- `src/main.tsx` — dev preview note: panel now full-height; demonstrate config override (e.g. set `panel.title: 'My App Debugger'`)
- `config.debugger.js` — sample fixture: add `panel: { title: 'My App Debugger', style: { width: 360 } }`

## Decisions baked in (overridable)

- **Width is a `number` (px), not a string.** Skips support for `%`/`vw` to keep validation tight. Easy to widen later.
- **Fullscreen state resets on close.** Could be persisted with the same pattern as the FAB position, but simpler reset is the more conservative default.
- **Side is derived from FAB corner**, not configured separately. If we later want a panel anchored independently, we add `panel.side`.
- **Panel ignores top/bottom from the corner.** A `leftTop` FAB and a `leftBottom` FAB both open the same left-side panel.
- **No animation** when opening / closing the panel itself. The FAB already animates; the panel popping is fine.
- **Escape closes** — convention for dialogs/sidebars. Easy to remove if anyone objects.

## Risks / open questions

- **`dvh` browser support:** Safari 15.4+, Chrome 108+, Firefox 101+. Modern but worth being aware of for the README. If we needed a fallback, `min(100vh, 100dvh)` covers older mobile Safari.
- **Focus management:** opening the panel doesn't currently move focus into it. Should we focus the close button on open so keyboard users land somewhere sensible? Spec defers this; flag for follow-up.
- **`role="dialog"` semantics:** strict dialog implementations trap focus and disable background interaction. We don't want that — the debugger panel shouldn't hijack the host page. Use `role="dialog"` + `aria-modal="false"`, or just `role="complementary"`. I'll go with `role="complementary"` (sidebar-style) so we avoid the focus-trap expectation.
- **Plugin content height:** plugins may have their own height assumptions. With full-height panels, plugins should `height: 100%` of the content area instead of using fixed heights. Document in the dev preview / TASK.md so users know.
