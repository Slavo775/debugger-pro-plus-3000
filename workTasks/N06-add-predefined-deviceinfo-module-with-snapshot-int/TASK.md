# N06 — Add predefined DeviceInfo module with snapshot integration

**PR:** https://github.com/Slavo775/debugger-pro-plus-3000/pull/7

## Goal

Ship the first pre-defined module: **Device Information**. It collects everything the browser exposes about the current device — screen, viewport, pixel ratio, orientation, color depth, touch, connection, and user agent — renders it as a compact responsive key/value grid inside the debugger panel, and registers all data into the copy/export snapshot via `updateData`.

---

## Context

Current state (post-N05):
- `useDebuggerApi()` exposes `emit`, `subscribe`, `moduleData`, `updateData` (shallow-merges a patch into the module's snapshot slice).
- `_getDebugSnapshot()` on the registry aggregates all module data → used by the Copy/Export button in the panel header.
- `DebuggerModuleDefinition` is the public shape consumers pass as `modules={[]}`.
- `src/index.ts` is the public barrel — pre-defined modules must be exported from here.

Relevant files:
- `src/modules/types.ts` — `DebuggerModuleDefinition`, `DebuggerApi`
- `src/modules/useDebuggerApi.ts` — `updateData` lives here
- `src/components/Debugger.tsx` — panel, accordion, styles
- `src/index.ts` — public barrel

---

## Deliverables

### 1. `src/modules/predefined/DeviceInfoModule.tsx`

A self-contained React component that:

1. **Collects device data** on mount and on `resize`/`orientationchange`:
   - `screen.width`, `screen.height` — physical screen resolution
   - `screen.availWidth`, `screen.availHeight` — available (sans taskbar) screen space
   - `window.devicePixelRatio` — DPR (display pixel ratio)
   - `screen.colorDepth` — colour depth in bits
   - `window.innerWidth`, `window.innerHeight` — current viewport (layout viewport)
   - `screen.orientation?.type` — e.g. `"landscape-primary"` (with `?` for Safari < 16.4)
   - `navigator.userAgent` — raw UA string
   - `navigator.platform` — OS platform string
   - `navigator.hardwareConcurrency` — logical CPU cores
   - `navigator.maxTouchPoints` — touch support (0 = no touch)
   - `(navigator as any).connection?.effectiveType` — `"4g"`, `"3g"`, etc. (optional, Chrome only)
   - `(navigator as any).connection?.downlink` — Mbps estimate (optional, Chrome only)

2. **Calls `updateData`** with the full snapshot on mount and on every resize/orientation change:
   ```ts
   const { updateData } = useDebuggerApi()
   updateData({
     'screen.width': screen.width,
     'screen.height': screen.height,
     // ... all fields
   })
   ```

3. **Renders a responsive key/value grid** inside the accordion body:
   - Two-column layout: key (dimmed monospace label) | value (bright monospace value)
   - Sections separated by a dim divider row: `── Screen ──`, `── Viewport ──`, `── Browser ──`, `── Network ──`
   - Long UA string wraps (don't truncate) — use `word-break: break-all`
   - No external dependencies; inline `CSSProperties` only (matching panel aesthetic: dark bg, `#e2e2e2` text, `monospace` font, 12px)
   - Panel can be as narrow as 280 px — grid must not overflow; key column is fixed ~120px, value column fills remainder

4. **Exports** a pre-built `DebuggerModuleDefinition` ready to drop in:
   ```ts
   export const deviceInfoModule: DebuggerModuleDefinition = {
     id: 'device-info',
     title: 'Device Info',
     defaultExpanded: true,
     render: () => <DeviceInfoPanel />,
   }
   ```

### 2. `src/modules/predefined/index.ts`

Barrel for all future pre-defined modules:
```ts
export { deviceInfoModule } from './DeviceInfoModule'
```

### 3. `src/index.ts` — add public export

```ts
export { deviceInfoModule } from './modules/predefined'
```

---

## Data Shape (snapshot slice)

The key names passed to `updateData` become the fields visible in the copied snapshot under `"device-info"`:

```json
{
  "device-info": {
    "screen.width": 2560,
    "screen.height": 1440,
    "screen.availWidth": 2560,
    "screen.availHeight": 1417,
    "screen.colorDepth": 24,
    "devicePixelRatio": 2,
    "orientation": "landscape-primary",
    "viewport.width": 1280,
    "viewport.height": 900,
    "userAgent": "Mozilla/5.0 ...",
    "platform": "MacIntel",
    "hardwareConcurrency": 10,
    "maxTouchPoints": 0,
    "connection.effectiveType": "4g",
    "connection.downlink": 10
  }
}
```

---

## Responsiveness Requirements

- The panel can be as narrow as **280 px**.
- Key column: `min-width: 100px`, `max-width: 130px`, right-padded 8px.
- Value column: `flex: 1`, `min-width: 0`, `word-break: break-all` (UA strings are long).
- Section dividers span full width, centered, dimmer color (`#555`).
- No horizontal scrollbar at any panel width.

---

## Style Constraints

Follow existing panel aesthetic (from `Debugger.tsx`):
- Background: `#1a1a2e` (panel) / `#16213e` (header)
- Text: `#e2e2e2`
- Dim text: `#888` or `#aaa`
- Font: `monospace`, `12px`
- No external CSS or classnames

---

## Non-goals

- No settings/config integration for this module in N06.
- No unit tests in N06 (visual/integration only).
- No connection polling — read `navigator.connection` once at mount (connection changes are rare and the module already re-collects on resize).
