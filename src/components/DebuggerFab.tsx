import { useState } from 'react'
import { useDebuggerConfig } from '../config/useDebuggerConfig'
import type { ButtonCorner } from '../config/types'

const FAB_INSET = 16
const CLICK_THRESHOLD_PX = 5

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

export function DebuggerFab({ corner, onCornerChange, onOpen }: DebuggerFabProps) {
  const { style, button } = useDebuggerConfig()
  const draggable = button.draggable
  const size = button.size
  const [drag, setDrag] = useState<DragState | null>(null)
  const [hovered, setHovered] = useState(false)

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
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
    setDrag(null)
    if (moved <= CLICK_THRESHOLD_PX) {
      onOpen()
      return
    }
    onCornerChange(nearestCorner(e.clientX, e.clientY))
  }

  const handleClick = () => {
    if (!draggable) onOpen()
  }

  const positionStyle: React.CSSProperties = drag
    ? { position: 'fixed', left: drag.x, top: drag.y }
    : { position: 'fixed', ...cornerCoords(corner) }

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
        transform: hovered && !drag ? 'scale(1.05)' : 'scale(1)',
        transition: drag ? 'none' : 'transform 120ms ease, box-shadow 120ms ease',
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

function nearestCorner(x: number, y: number): ButtonCorner {
  const isRight = x > window.innerWidth / 2
  const isBottom = y > window.innerHeight / 2
  if (isRight && isBottom) return 'rightBottom'
  if (isRight && !isBottom) return 'rightTop'
  if (!isRight && isBottom) return 'leftBottom'
  return 'leftTop'
}
