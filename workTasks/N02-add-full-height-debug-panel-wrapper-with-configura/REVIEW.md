# N02 — Human Review

**Verdict:** 🔧 Fix needed
**Reviewer:** Slavomir Sedlak
**Date:** 2026-05-19

## Feedback

> "Please the button or at least icons is sooooo small can you make
> it bigger?"

The header **icon buttons** (fullscreen `⤢` and close `✕`) are
technically WCAG-compliant (24 × 24 hit area) but visually too small —
the icon glyphs themselves are only `fontSize: 14`, which feels
cramped inside the 24 × 24 chip.

## Required changes

- Bump the **icon glyph** size — try `fontSize: 18` (close to the
  hit-target boundary) and adjust the hit area if needed (e.g. 28 × 28
  or 32 × 32) so the icons read clearly without crowding.
- Same treatment for both header buttons (fullscreen + close).
- Verify the tab buttons still feel balanced next to the larger header
  controls; bump font / hit-area there too if they look out of
  proportion.

## Out of scope

- No change requested to layout, colors, or panel chrome.

## Notes

All other panel behavior verified working: full-height layout,
side-anchoring follows FAB, width override, fullscreen toggle, Escape
to close, mobile responsiveness. This is purely a visual sizing
adjustment.
