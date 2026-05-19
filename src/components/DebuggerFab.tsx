import { useEffect, useState } from 'react'
import { useDebuggerConfig } from '../config/useDebuggerConfig'
import type { ButtonCorner } from '../config/types'

const FAB_INSET = 16
const CLICK_THRESHOLD_PX = 5
const SNAP_DURATION_MS = 220
const SNAP_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

export interface DebuggerFabProps {
  corner: ButtonCorner
  onCornerChange: (next: ButtonCorner) => void
  onOpen: () => void
}

interface DragState {
  x: number
  y: number
  grabDx: number
  grabDy: number
  startX: number
  startY: number
}

interface SnapState {
  fromX: number
  fromY: number
  toX: number
  toY: number
  phase: 'pre' | 'animating'
}

export function DebuggerFab({ corner, onCornerChange, onOpen }: DebuggerFabProps) {
  const { style, button } = useDebuggerConfig()
  const draggable = button.draggable
  const size = button.size
  const [drag, setDrag] = useState<DragState | null>(null)
  const [snap, setSnap] = useState<SnapState | null>(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (!snap) return
    if (snap.phase === 'pre') {
      const raf = requestAnimationFrame(() => {
        setSnap((s) => (s ? { ...s, phase: 'animating' } : null))
      })
      return () => cancelAnimationFrame(raf)
    }
    const t = setTimeout(() => setSnap(null), SNAP_DURATION_MS)
    return () => clearTimeout(t)
  }, [snap])

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    if (snap) setSnap(null)
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({
      x: rect.left,
      y: rect.top,
      grabDx: e.clientX - rect.left,
      grabDy: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
    })
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag) return
    setDrag({
      ...drag,
      x: e.clientX - drag.grabDx,
      y: e.clientY - drag.grabDy,
    })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag) return
    const moved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    const releaseX = drag.x
    const releaseY = drag.y
    setDrag(null)
    if (moved <= CLICK_THRESHOLD_PX) {
      onOpen()
      return
    }
    const newCorner = nearestCorner(e.clientX, e.clientY)
    const target = cornerToAbsolutePx(newCorner, size)
    setSnap({ fromX: releaseX, fromY: releaseY, toX: target.x, toY: target.y, phase: 'pre' })
    onCornerChange(newCorner)
  }

  const handleClick = () => {
    if (!draggable) onOpen()
  }

  const positionStyle: React.CSSProperties = drag
    ? { position: 'fixed', left: drag.x, top: drag.y }
    : snap
      ? snap.phase === 'pre'
        ? { position: 'fixed', left: snap.fromX, top: snap.fromY }
        : { position: 'fixed', left: snap.toX, top: snap.toY }
      : { position: 'fixed', ...cornerCoords(corner) }

  const transition =
    drag || (snap && snap.phase === 'pre')
      ? 'none'
      : snap
        ? `left ${SNAP_DURATION_MS}ms ${SNAP_EASING}, top ${SNAP_DURATION_MS}ms ${SNAP_EASING}, box-shadow 120ms ease`
        : 'transform 120ms ease, box-shadow 120ms ease'

  return (
    <button
      type="button"
      aria-label="Open debugger"
      onPointerDown={draggable ? handlePointerDown : undefined}
      onPointerMove={draggable && drag ? handlePointerMove : undefined}
      onPointerUp={draggable ? handlePointerUp : undefined}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...positionStyle,
        width: size,
        height: size,
        borderRadius: '50%',
        background: style.primaryColor,
        border: 'none',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1,
        cursor: draggable ? (drag ? 'grabbing' : 'grab') : 'pointer',
        zIndex: 9999,
        boxShadow: hovered
          ? '0 6px 18px rgba(0, 0, 0, 0.4)'
          : '0 4px 12px rgba(0, 0, 0, 0.3)',
        transform: hovered && !drag && !snap ? 'scale(1.05)' : 'scale(1)',
        transition,
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      DBG
    </button>
  )
}

function cornerCoords(corner: ButtonCorner): React.CSSProperties {
  switch (corner) {
    case 'leftTop':
      return { top: FAB_INSET, left: FAB_INSET }
    case 'rightTop':
      return { top: FAB_INSET, right: FAB_INSET }
    case 'leftBottom':
      return { bottom: FAB_INSET, left: FAB_INSET }
    case 'rightBottom':
    default:
      return { bottom: FAB_INSET, right: FAB_INSET }
  }
}

function cornerToAbsolutePx(corner: ButtonCorner, size: number): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: FAB_INSET, y: FAB_INSET }
  const right = window.innerWidth - FAB_INSET - size
  const bottom = window.innerHeight - FAB_INSET - size
  switch (corner) {
    case 'leftTop':
      return { x: FAB_INSET, y: FAB_INSET }
    case 'rightTop':
      return { x: right, y: FAB_INSET }
    case 'leftBottom':
      return { x: FAB_INSET, y: bottom }
    case 'rightBottom':
    default:
      return { x: right, y: bottom }
  }
}

function nearestCorner(x: number, y: number): ButtonCorner {
  const isRight = x > window.innerWidth / 2
  const isBottom = y > window.innerHeight / 2
  if (isRight && isBottom) return 'rightBottom'
  if (isRight && !isBottom) return 'rightTop'
  if (!isRight && isBottom) return 'leftBottom'
  return 'leftTop'
}
