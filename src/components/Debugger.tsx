import { useCallback, useEffect, useMemo, useState } from 'react'
import { DebuggerConfigProvider } from '../config/DebuggerConfigProvider'
import { useDebuggerConfig } from '../config/useDebuggerConfig'
import type { ButtonCorner, DebuggerConfig } from '../config/types'
import { DebuggerFab } from './DebuggerFab'
import { useFabPosition } from './useFabPosition'
import type { DebuggerModule } from '../modules/types'
import { BUILT_IN_MODULES } from '../modules/registry'
import { resolveModules } from '../modules/resolve'

export interface DebuggerProps {
  modules?: DebuggerModule<unknown>[]
  defaultOpen?: boolean
  config?: DebuggerConfig
}

export function Debugger({ config, ...rest }: DebuggerProps) {
  return (
    <DebuggerConfigProvider config={config}>
      <DebuggerPanel {...rest} />
    </DebuggerConfigProvider>
  )
}

type PanelSide = 'left' | 'right'

function sideFromCorner(corner: ButtonCorner): PanelSide {
  return corner === 'leftTop' || corner === 'leftBottom' ? 'left' : 'right'
}

function DebuggerPanel({ modules = [], defaultOpen = false }: Omit<DebuggerProps, 'config'>) {
  const { style, button, panel, modules: configModules } = useDebuggerConfig()
  const [corner, setCorner] = useFabPosition(button.position, button.draggable)
  const [open, setOpen] = useState(defaultOpen)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const resolved = useMemo(
    () => resolveModules(configModules, modules, BUILT_IN_MODULES),
    [configModules, modules],
  )

  const [activeModuleId, setActiveModuleId] = useState<string | null>(
    resolved[0]?.instanceKey ?? null,
  )

  useEffect(() => {
    if (resolved.length === 0) {
      setActiveModuleId(null)
      return
    }
    if (!resolved.some((m) => m.instanceKey === activeModuleId)) {
      setActiveModuleId(resolved[0].instanceKey)
    }
  }, [resolved, activeModuleId])

  const closePanel = useCallback(() => {
    setOpen(false)
    setIsFullscreen(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, closePanel])

  if (!open) {
    return <DebuggerFab corner={corner} onCornerChange={setCorner} onOpen={() => setOpen(true)} />
  }

  const side = sideFromCorner(corner)
  const primaryColor = style.primaryColor
  const active = resolved.find((m) => m.instanceKey === activeModuleId)

  return (
    <section
      role="complementary"
      aria-label={panel.title || 'Debugger panel'}
      style={panelStyle(side, panel.style.width, isFullscreen)}
    >
      <header style={headerStyle}>
        <h2 style={titleStyle}>{panel.title}</h2>
        <div style={headerActionsStyle}>
          <button
            type="button"
            onClick={() => setIsFullscreen((v) => !v)}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            aria-pressed={isFullscreen}
            style={iconButtonStyle}
          >
            <span aria-hidden="true">{isFullscreen ? '⤡' : '⤢'}</span>
          </button>
          <button
            type="button"
            onClick={closePanel}
            aria-label="Close debugger"
            style={iconButtonStyle}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      </header>

      {resolved.length > 0 && (
        <div style={tabBarStyle} role="tablist">
          {resolved.map((m) => (
            <button
              key={m.instanceKey}
              type="button"
              role="tab"
              aria-selected={m.instanceKey === activeModuleId}
              onClick={() => setActiveModuleId(m.instanceKey)}
              style={tabStyle(m.instanceKey === activeModuleId, primaryColor)}
            >
              {m.title}
            </button>
          ))}
        </div>
      )}

      <div style={contentStyle}>
        {active ? (
          active.render()
        ) : (
          <span style={{ color: '#888', fontSize: 12 }}>No modules loaded.</span>
        )}
      </div>
    </section>
  )
}

function panelStyle(
  side: PanelSide,
  configuredWidth: number,
  isFullscreen: boolean,
): React.CSSProperties {
  const width = isFullscreen ? '100vw' : `min(${configuredWidth}px, 100vw)`
  return {
    position: 'fixed',
    top: 0,
    [side]: 0,
    width,
    height: '100dvh',
    zIndex: 9999,
    background: '#1a1a2e',
    color: '#e2e2e2',
    borderLeft: side === 'right' ? '1px solid #333' : 'none',
    borderRight: side === 'left' ? '1px solid #333' : 'none',
    fontFamily: 'monospace',
    fontSize: 12,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: side === 'right' ? '-8px 0 32px rgba(0,0,0,0.5)' : '8px 0 32px rgba(0,0,0,0.5)',
  }
}

const HIT_TARGET_PX = 32
const TAB_HIT_TARGET_PX = 28
const ICON_GLYPH_PX = 18

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '8px 12px',
  borderBottom: '1px solid #333',
  background: '#16213e',
  minHeight: 48,
  flexShrink: 0,
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  fontFamily: 'monospace',
  color: '#e2e2e2',
  minWidth: 0,
  flex: 1,
}

const headerActionsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  flexShrink: 0,
}

const iconButtonStyle: React.CSSProperties = {
  minWidth: HIT_TARGET_PX,
  minHeight: HIT_TARGET_PX,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: '1px solid transparent',
  borderRadius: 6,
  color: '#d8d8d8',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: ICON_GLYPH_PX,
  lineHeight: 1,
  padding: 0,
}

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  padding: '6px 8px',
  borderBottom: '1px solid #333',
  flexWrap: 'wrap',
  flexShrink: 0,
}

function tabStyle(active: boolean, primaryColor: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: active ? primaryColor : 'transparent',
    border: active ? `1px solid ${primaryColor}` : '1px solid transparent',
    color: active ? '#fff' : '#cfcfcf',
    borderRadius: 4,
    padding: '4px 12px',
    minHeight: TAB_HIT_TARGET_PX,
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'monospace',
    lineHeight: 1,
  }
}

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 12,
  minHeight: 0,
}
