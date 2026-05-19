# N01 — Checklist

## Config schema
- [ ] Add `ButtonCorner` union (`'rightTop' | 'leftTop' | 'rightBottom' | 'leftBottom'`) to `src/config/types.ts`.
- [ ] Add `DebuggerButtonConfig` interface (`draggable?: boolean`, `position?: ButtonCorner`).
- [ ] Extend `DebuggerConfig` with `button?: DebuggerButtonConfig`.
- [ ] Extend `ResolvedDebuggerConfig` so `button` is fully resolved post-merge.

## Defaults & merge
- [ ] Add `button: { draggable: true, position: 'rightBottom' }` to `DEFAULT_DEBUGGER_CONFIG`.
- [ ] Update `mergeWithDefaults` to deep-merge `button` alongside `style`.

## Loader validation
- [ ] Reject non-object `button`.
- [ ] Reject non-boolean `button.draggable`.
- [ ] Reject `button.position` not in the allowed corner set.
- [ ] Each error includes the file path and the `[debugger-pro-plus-3000]` prefix.

## FAB component (`src/components/DebuggerFab.tsx`)
- [ ] 40×40 px circle (`borderRadius: '50%'`), background = `style.primaryColor`.
- [ ] Reads config via `useDebuggerConfig()` (no prop drilling for theming).
- [ ] `aria-label="Open debugger"`; `cursor: 'grab'` when draggable, `'pointer'` when not.
- [ ] Pointer-event handlers (`pointerdown` / `pointermove` / `pointerup`) only attached if `draggable`.
- [ ] `setPointerCapture` on down, `releasePointerCapture` on up, so drag survives leaving the element.
- [ ] Track displacement; treat ≤ 5 px move as click → calls the `onOpen` callback prop.
- [ ] During drag, follow the cursor with `position: fixed`, offset by the original grab point.
- [ ] On `pointerup` (drag), compute nearest corner from viewport midpoints and call the position-update callback.

## Position persistence hook (`src/components/useFabPosition.ts`)
- [ ] Signature: `useFabPosition(configured: ButtonCorner, draggable: boolean): [ButtonCorner, (next: ButtonCorner) => void]`.
- [ ] Storage key: `'debugger_fab_position'`.
- [ ] Guard all `localStorage` / `window` access with `typeof window !== 'undefined'`.
- [ ] When `draggable === false`, never read or write `localStorage`; always return the configured value.
- [ ] When `draggable === true`, read once on mount; validate the stored value against the corner union; fall back to `configured` if invalid or missing.
- [ ] Setter writes to state and to `localStorage`.
- [ ] No write on initial mount (only on user-driven updates).

## Debugger integration
- [ ] Remove the `position` prop from `DebuggerProps`.
- [ ] Render `<DebuggerFab onOpen={...} />` when closed (no inline button anymore).
- [ ] Compute panel anchoring from the FAB's current corner (replaces today's `positionCoords(position)` call).
- [ ] Ensure panel and FAB share the corner state so they stay aligned.

## Public API
- [ ] Re-export `DebuggerButtonConfig` and `ButtonCorner` from `src/config/index.ts` and `src/index.ts`.

## Dev preview
- [ ] Update `src/main.tsx` so the dev entry no longer passes `position` (it's gone).
- [ ] Add a small note on the page that drags persist across reloads, so manual verification is obvious.

## Quality gates
- [ ] `pnpm lint` clean.
- [ ] `pnpm build` succeeds; `dist/` regenerated `.d.ts` files include the new types.
- [ ] Node smoke test of loader covers: `button: 'left'` (rejected), `button: { position: 'nope' }` (rejected), `button: { draggable: 'yes' }` (rejected), valid `button: { draggable: false, position: 'leftTop' }` (accepted).

## Manual verification (browser at http://localhost:4242)
- [ ] Default render: bottom-right FAB, primary color from config.
- [ ] Click FAB → panel opens from same corner; ✕ closes back to FAB.
- [ ] Drag FAB to top-left, release → snaps to top-left; reload → still top-left.
- [ ] Set `button.draggable: false` in `config.debugger.js` → cursor is `pointer`, drag does nothing, localStorage value (if any) is ignored.
- [ ] Set `button.position: 'leftBottom'` with localStorage cleared → FAB renders in bottom-left.
- [ ] Quick click without moving still opens the panel (no accidental drag).
