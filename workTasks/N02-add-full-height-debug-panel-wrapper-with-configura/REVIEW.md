# N02 — Review (AI + Human)

**Verdict:** 🔧 Fix needed (concurring AI + human)
**AI reviewer:** task-review (Claude Opus 4.7)
**Human reviewer:** Slavomir Sedlak
**Date:** 2026-05-19

## Human feedback (primary issue)

> "Please the button or at least icons is sooooo small can you make
> it bigger?"

The header icon buttons (fullscreen `⤢` and close `✕`) are
technically WCAG-compliant (24 × 24 hit area) but visually too small:
icon glyph `fontSize: 14` inside a 24 × 24 chip feels cramped. The
`✕` in particular looks thin against the dark header.

## AI findings (bundle into the same fix)

### 1. Header icon glyph size — confirmed

`iconButtonStyle.fontSize: 14` is the culprit. Bump to **`18 px`** and
grow the hit area to **`28–32 px`** so the larger glyph isn't pressed
against the chip edge. Apply consistently to both header buttons.

### 2. `panelStyle` over-constrains the box

`panelStyle()` sets `top: 0`, `bottom: 0`, **and** `height: '100dvh'`.
With `position: fixed`, `top + bottom` already determines height; the
explicit `height` is redundant and the two constraints can disagree
on browsers that prefer one signal over the other. **Drop `bottom: 0`**
and keep `top: 0; height: '100dvh'` as the single source of truth.

### 3. Tab buttons vertically off-center

`tabStyle` has `minHeight: 24` but no flex centering, so the label
floats to the top of the 24 px box. Add
`display: 'inline-flex', alignItems: 'center', justifyContent: 'center'`
so the text sits in the middle — especially noticeable once the
header icons get larger and the tab bar visual balance shifts.

### 4. Title overflow safety

`titleStyle` has `whiteSpace: 'nowrap'` / `textOverflow: 'ellipsis'`
but no `minWidth: 0`. In a flex row, an `<h2>` won't shrink below its
content width by default — long titles (or narrow panels) push the
header actions off the right edge instead of ellipsizing. Add
`minWidth: 0, flex: 1` to `titleStyle`.

### 5. DRY: `closePanel` vs inline Escape handler

`closePanel` is defined at line 41 (used by the close button) but the
Escape `useEffect` inlines `setOpen(false); setIsFullscreen(false)` to
avoid an exhaustive-deps warning. Memoize `closePanel` with
`useCallback([])` and call it from both places. Reduces the chance of
the two paths drifting when we add behavior to close.

### 6. Empty `aria-label` when `panel.title === ''`

`<section aria-label={panel.title}>` becomes `aria-label=""` if the
user sets an empty title. Empty aria-label is technically valid but
useless. Fallback: `aria-label={panel.title || 'Debugger panel'}`.

## Out of scope

- Focus management on panel open (deferred in TASK.md, not part of
  this fix).
- Animated panel open/close (deferred in TASK.md).
- Theming the panel chrome beyond width / title (TASK.md scope).

## Acceptance for the fix

- Header icon glyphs read clearly without crowding their chip.
- `panelStyle` no longer over-constrains the box.
- Tab labels visually centered within their `minHeight: 24` box.
- Long titles ellipsize cleanly instead of pushing header actions off.
- `closePanel` reused by the Escape handler.
- Empty `panel.title` still produces a meaningful `aria-label`.
- All gates remain clean.
