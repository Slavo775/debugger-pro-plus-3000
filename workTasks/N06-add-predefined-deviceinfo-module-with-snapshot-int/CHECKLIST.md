# N06 Checklist — Predefined DeviceInfo Module

## Implementation

- [ ] Create `src/modules/predefined/DeviceInfoModule.tsx`
  - [ ] Collect all device fields (screen, viewport, DPR, orientation, UA, cores, touch, connection)
  - [ ] `updateData` called on mount with full snapshot
  - [ ] `resize` + `orientationchange` listeners re-collect and call `updateData`
  - [ ] Listeners cleaned up on unmount
  - [ ] Responsive two-column key/value grid (min panel width 280px, no overflow)
  - [ ] Four section dividers: Screen, Viewport, Browser, Network
  - [ ] UA string wraps with `word-break: break-all`
  - [ ] `connection.*` fields guarded with optional chaining (Chrome-only API)
  - [ ] `screen.orientation?.type` guarded (Safari < 16.4)
  - [ ] Exported `deviceInfoModule` constant (`DebuggerModuleDefinition`)

- [ ] Create `src/modules/predefined/index.ts` — barrel export

- [ ] Update `src/index.ts` — add `deviceInfoModule` to public barrel

## Snapshot Integration

- [ ] `updateData` keys match the documented snapshot shape
- [ ] After mount, Copy button includes `"device-info"` slice in copied JSON
- [ ] Snapshot updates when viewport is resized (re-collect fired on `resize`)

## Style / Responsiveness

- [ ] No horizontal scroll at 280px panel width
- [ ] Key column ≤ 130px, value column fills remainder
- [ ] Matches panel dark aesthetic (no external CSS)
- [ ] Section dividers visible and non-intrusive

## Public API

- [ ] `import { deviceInfoModule } from 'debugger-pro-plus-3000'` resolves correctly
- [ ] TypeScript: no type errors (`tsc --noEmit`)
- [ ] Lint: no ESLint warnings (`eslint . --max-warnings 0`)

## Manual Verification

- [ ] Module appears in panel accordion as "Device Info", expanded by default
- [ ] All fields populated correctly in browser
- [ ] DPR shows correct value (e.g. 2 on Retina)
- [ ] Viewport width/height updates on window resize
- [ ] Copy snapshot includes `"device-info"` with all fields
- [ ] Panel at narrow width (≤ 320px) — no overflow, UA wraps
