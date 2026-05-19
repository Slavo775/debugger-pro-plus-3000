# N01 — Add draggable FAB entrypoint with config-driven position and localStorage persistence

**Type:** feat
**Priority:** high
**Tags:** ui, fab, config, drag, localStorage
**Depends on:** N00 (uses the config schema added there)

## Summary

Replace today's plain "DBG" toggle button with a circular **Floating Action Button (FAB)**: 40×40 px, background = `style.primaryColor`, anchored to one of four screen corners, optionally draggable. When the user drops the FAB the new corner is persisted to `localStorage` so it survives reloads. Clicking the FAB still opens the existing debugger panel.

Extend `DebuggerConfig` with a new `button` namespace:

```ts
interface DebuggerButtonConfig {
  draggable?: boolean // default true
  position?: 'rightTop' | 'leftTop' | 'rightBottom' | 'leftBottom' // default 'rightBottom'
}
```

## Why

The current `<button>DBG</button>` toggle is a placeholder. A FAB:

- Is the conventional debugger / devtools entry pattern (React DevTools, Sentry, Datadog all use one).
- Becomes themable via the existing `style.primaryColor` plumbing from N00 — concrete proof that the config layer is useful.
- Removing the panel from a covered area of the page is a real workflow need; making the FAB draggable solves it without forcing a rebuild or config change.

## Scope

### In scope

- **Config schema additions** in `src/config/types.ts`:
  - New `DebuggerButtonConfig` interface (`draggable?: boolean`, `position?: ButtonCorner`)
  - New `ButtonCorner` union type: `'rightTop' | 'leftTop' | 'rightBottom' | 'leftBottom'`
  - Add `button?: DebuggerButtonConfig` to `DebuggerConfig`
  - Extend `ResolvedDebuggerConfig` so `button` is fully resolved (no optionals after merge)

- **Defaults** (`src/config/defaults.ts`):
  - `button.draggable: true`
  - `button.position: 'rightBottom'`

- **Merge** (`src/config/merge.ts`):
  - Deep-merge `button` (object-level, like `style`)

- **Loader validation** (`src/config/loadDebuggerConfig.ts`):
  - `button` must be a plain object if present
  - `button.draggable` must be a boolean if present
  - `button.position` must be one of the four allowed corners if present
  - Throw clearly-prefixed `[debugger-pro-plus-3000]` errors otherwise

- **New `DebuggerFab` component** (`src/components/DebuggerFab.tsx`):
  - Circular 40×40 px button, background = `style.primaryColor` from `useDebuggerConfig()`
  - Subtle hover/active state (slight scale or brightness change, kept inline-style so we stay style-sheet-free for now)
  - `aria-label="Open debugger"`, `cursor: 'grab'` when draggable, `'pointer'` otherwise
  - Pointer-event-based drag (`pointerdown` / `pointermove` / `pointerup`) using `setPointerCapture` so dragging works across iframes / off-element exits
  - **Click vs drag**: track total pointer displacement; if ≤ `5px` between down and up, treat as click and open the panel; otherwise treat as drag (no click side effect)
  - **Snap on drop**: compute FAB center; pick corner by comparing center against viewport midpoints (`innerWidth/2`, `innerHeight/2`). No partial / arbitrary positions — always one of the four corners.
  - During drag, follow the cursor (CSS `position: fixed`, update `left`/`top` from pointer coords, offset by half FAB size so the cursor stays centered on the button)
  - If `draggable` is `false`, attach no drag handlers and skip the cursor-style change

- **Position persistence hook** (`src/components/useFabPosition.ts`):
  - `useFabPosition(configured: ButtonCorner, draggable: boolean): [ButtonCorner, (next: ButtonCorner) => void]`
  - Storage key: `'debugger_fab_position'`
  - When `draggable === false`: ignore localStorage entirely and always return the configured value (no read, no write)
  - When `draggable === true`: read once on mount; if a valid corner is stored, use it as the initial value; otherwise use `configured`. Write on every update.
  - Guard all `window`/`localStorage` access with `typeof window !== 'undefined'` (SSR-safe)
  - Validate the stored value against the allowed-corner union; ignore garbage

- **Panel anchoring**:
  - The open panel anchors to the FAB's current corner (so it appears to "grow" from where you clicked)
  - Replace the current `positionCoords` helper in `Debugger.tsx` so it consumes a `ButtonCorner`, not the old `position` union

- **Remove the existing `position` prop** from `DebuggerProps`:
  - At v0.1.0 nothing depends on it. The FAB position (from `config.button.position` + localStorage) is the single source of truth.
  - Update `src/main.tsx` dev preview accordingly.

- **Public API exports** from `src/index.ts`:
  - `DebuggerButtonConfig` type
  - `ButtonCorner` type

### Out of scope (deferred)

- Free-form positioning (arbitrary x/y); only the four corners are supported.
- Resize handles, panel docking modes, sidebar mode.
- Touch-specific tweaks beyond what pointer events already give us (long-press menu, haptics, etc.).
- A "reset to configured position" action / context-menu.
- Animations on snap (instant snap is fine for v1).
- Migrating from `localStorage` to a pluggable storage adapter.

## Acceptance criteria

- `<Debugger />` (no config) renders a 40×40 px round FAB in the bottom-right corner, default blue (`#1a6eb5`).
- Clicking the FAB opens the panel; clicking the panel's ✕ closes it back to the FAB.
- With `config = { style: { primaryColor: '#ff00aa' }, button: { position: 'leftTop' } }`, the FAB renders pink in the top-left and the panel opens from the top-left.
- With `config.button.draggable: true` (default), the FAB can be dragged with the mouse; on release it snaps to whichever of the four corners the cursor is nearest, and that corner is written to `localStorage['debugger_fab_position']`.
- After a reload, the FAB reappears in the persisted corner (not the configured one), and so does the panel.
- With `config.button.draggable: false`, the FAB is not draggable, no `localStorage` read or write happens, and the FAB always sits in `config.button.position`.
- A 1-pixel jitter on `pointerdown`/`pointerup` is still recognized as a click (threshold = 5 px), so the FAB stays clickable.
- Malformed `button` config (`button: 'left'`, `button: { position: 'nope' }`, `button: { draggable: 'yes' }`) throws prefixed errors from `loadDebuggerConfig`.
- `pnpm lint` clean, `pnpm build` succeeds, `.d.ts` updated.

## Files (expected)

- `src/config/types.ts` (edit) — add `ButtonCorner`, `DebuggerButtonConfig`, extend `DebuggerConfig` / `ResolvedDebuggerConfig`
- `src/config/defaults.ts` (edit)
- `src/config/merge.ts` (edit)
- `src/config/loadDebuggerConfig.ts` (edit) — extend validation
- `src/config/index.ts` (edit) — re-export new types
- `src/components/DebuggerFab.tsx` (new)
- `src/components/useFabPosition.ts` (new)
- `src/components/Debugger.tsx` (edit) — remove `position` prop, render `DebuggerFab`, re-anchor panel
- `src/index.ts` (edit) — re-export new types
- `src/main.tsx` (edit) — dev preview no longer passes `position`

## Decisions

- **localStorage key: `'debugger_fab_position'`** (typo from the original request corrected, per follow-up clarification).
- **`position` prop on `<Debugger>` is removed**, not deprecated. Confirmed: nothing depends on it at v0.1.0.
- **Snap by viewport midpoint**, not by FAB-distance-to-each-corner. Simpler and behaves identically except in edge cases where a FAB is dragged near the exact diagonals.
- **Click threshold: 5 px** between `pointerdown` and `pointerup`. Common UI convention; tweakable.

## Open questions

- Does the panel still need its own `defaultOpen` prop, or should we add a `button.defaultOpen` for symmetry with the FAB? Out of scope here; flag for a future task if useful.

## Risks

- **Cursor centering vs. element offset:** Naively setting `left = clientX` puts the top-left of the FAB at the cursor, which feels broken. Mitigation: store the down-event offset within the FAB and apply it on every move so the cursor stays anchored to the grab point.
- **`pointerup` outside the FAB:** Releasing the mouse outside the FAB without pointer capture would orphan the drag. Mitigation: `setPointerCapture(e.pointerId)` on `pointerdown` and release on `pointerup`.
- **Viewport resize while persisted in a corner:** Since we snap to corners (not coordinates), the persisted value remains valid across window resizes — no extra handling needed.
- **Strict Mode double-invocation:** The hook's mount-time `localStorage` read runs twice under React 18 StrictMode in dev. Idempotent reads are fine; just be careful not to write defaults back to storage on first mount.
