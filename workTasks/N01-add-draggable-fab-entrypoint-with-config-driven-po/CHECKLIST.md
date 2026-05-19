# N01 — Checklist

## Config schema
- [x] Add `ButtonCorner` union (`'rightTop' | 'leftTop' | 'rightBottom' | 'leftBottom'`) to `src/config/types.ts`.
- [x] Add `DebuggerButtonConfig` interface (`draggable?: boolean`, `position?: ButtonCorner`).
- [x] Extend `DebuggerConfig` with `button?: DebuggerButtonConfig`.
- [x] Extend `ResolvedDebuggerConfig` so `button` is fully resolved post-merge.

## Defaults & merge
- [x] Add `button: { draggable: true, position: 'rightBottom' }` to `DEFAULT_DEBUGGER_CONFIG`.
- [x] Update `mergeWithDefaults` to deep-merge `button` alongside `style`.

## Loader validation
- [x] Reject non-object `button`.
- [x] Reject non-boolean `button.draggable`.
- [x] Reject `button.position` not in the allowed corner set.
- [x] Each error includes the file path and the `[debugger-pro-plus-3000]` prefix.

## FAB component (`src/components/DebuggerFab.tsx`)
- [x] 40×40 px circle (`borderRadius: '50%'`), background = `style.primaryColor`.
- [x] Reads config via `useDebuggerConfig()` (no prop drilling for theming).
- [x] `aria-label="Open debugger"`; `cursor: 'grab'` when draggable, `'pointer'` when not.
- [x] Pointer-event handlers (`pointerdown` / `pointermove` / `pointerup`) only attached if `draggable`.
- [x] `setPointerCapture` on down, `releasePointerCapture` on up, so drag survives leaving the element.
- [x] Track displacement; treat ≤ 5 px move as click → calls the `onOpen` callback prop.
- [x] During drag, follow the cursor with `position: fixed`, offset by the original grab point.
- [x] On `pointerup` (drag), compute nearest corner from viewport midpoints and call the position-update callback.

## Position persistence hook (`src/components/useFabPosition.ts`)
- [x] Signature: `useFabPosition(configured: ButtonCorner, draggable: boolean): [ButtonCorner, (next: ButtonCorner) => void]`.
- [x] Storage key: `'debugger_fab_position'`.
- [x] Guard all `localStorage` / `window` access with `typeof window !== 'undefined'`.
- [x] When `draggable === false`, never read or write `localStorage`; always return the configured value.
- [x] When `draggable === true`, read once on mount; validate the stored value against the corner union; fall back to `configured` if invalid or missing.
- [x] Setter writes to state and to `localStorage`.
- [x] No write on initial mount (only on user-driven updates).

## Debugger integration
- [x] Remove the `position` prop from `DebuggerProps`.
- [x] Render `<DebuggerFab onOpen={...} />` when closed (no inline button anymore).
- [x] Compute panel anchoring from the FAB's current corner (replaces today's `positionCoords(position)` call).
- [x] Ensure panel and FAB share the corner state so they stay aligned.

## Public API
- [x] Re-export `DebuggerButtonConfig` and `ButtonCorner` from `src/config/index.ts` and `src/index.ts`.

## Dev preview
- [x] Update `src/main.tsx` so the dev entry no longer passes `position` (it's gone).
- [x] Add a small note on the page that drags persist across reloads, so manual verification is obvious.

## Quality gates
- [x] `pnpm lint` clean.
- [x] `pnpm build` succeeds; `dist/` regenerated `.d.ts` files include the new types.
- [x] Node smoke test of loader covers: `button: 'left'` (rejected), `button: { position: 'nope' }` (rejected), `button: { draggable: 'yes' }` (rejected), valid `button: { draggable: false, position: 'leftTop' }` (accepted).

## Manual verification (browser at http://localhost:4242)
- [x] Default render: bottom-right FAB, primary color from config.
- [x] Click FAB → panel opens from same corner; ✕ closes back to FAB.
- [x] Drag FAB to top-left, release → snaps to top-left; reload → still top-left.
- [x] Set `button.draggable: false` in `config.debugger.js` → cursor is `pointer`, drag does nothing, localStorage value (if any) is ignored.
- [x] Set `button.position: 'leftBottom'` with localStorage cleared → FAB renders in bottom-left.
- [x] Quick click without moving still opens the panel (no accidental drag).
