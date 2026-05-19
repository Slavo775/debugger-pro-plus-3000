import { useCallback, useState } from 'react'
import type { ButtonCorner } from '../config/types'

const STORAGE_KEY = 'debugger_fab_position'
const VALID_CORNERS: readonly ButtonCorner[] = [
  'rightTop',
  'leftTop',
  'rightBottom',
  'leftBottom',
]

function readStored(): ButtonCorner | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw !== null && (VALID_CORNERS as readonly string[]).includes(raw)) {
      return raw as ButtonCorner
    }
    return null
  } catch {
    return null
  }
}

function writeStored(value: ButtonCorner): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // ignore quota / privacy-mode failures
  }
}

export function useFabPosition(
  configured: ButtonCorner,
  draggable: boolean,
): [ButtonCorner, (next: ButtonCorner) => void] {
  const [userChosen, setUserChosen] = useState<ButtonCorner | null>(() =>
    draggable ? readStored() : null,
  )

  const corner: ButtonCorner = draggable && userChosen !== null ? userChosen : configured

  const setCorner = useCallback(
    (next: ButtonCorner): void => {
      setUserChosen(next)
      if (draggable) writeStored(next)
    },
    [draggable],
  )

  return [corner, setCorner]
}
