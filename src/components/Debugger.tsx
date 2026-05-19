import { useEffect, useState } from 'react'
import { DebuggerConfigProvider } from '../config/DebuggerConfigProvider'
import { useDebuggerConfig } from '../config/useDebuggerConfig'
import type { ButtonCorner, DebuggerConfig } from '../config/types'
import { DebuggerFab } from './DebuggerFab'
import { useFabPosition } from './useFabPosition'

export interface DebuggerPlugin {
  id: string
  label: string
  render: () => React.ReactNode
}

export interface DebuggerProps {
  plugins?: DebuggerPlugin[]
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

function DebuggerPanel({ plugins = [], defaultOpen = false }: Omit<DebuggerProps, 'config'>) {
  const { style, button, panel } = useDebuggerConfig()
  const [corner, setCorner] = useFabPosition(button.position, button.draggable)
  const [open, setOpen] = useState(defaultOpen)
  const [activePlugin, setActivePlugin] = useState<string | null>(plugins[0]?.id ?? null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const closePanel = () => {
    setOpen(false)
    setIsFullscreen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setIsFullscreen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) {
    return <DebuggerFab corner={corner} onCornerChange={setCorner} onOpen={() => setOpen(true)} />
  }

  const side = sideFromCorner(corner)
  const primaryColor = style.primaryColor
  const active = plugins.find((p) => p.id === activePlugin)

  return (
    <section
      role="complementary"
      aria-label={panel.title}
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

      {plugins.length > 0 && (
        <div style={tabBarStyle} role="tablist">
          {plugins.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={p.id === activePlugin}
              onClick={() => setActivePlugin(p.id)}
              style={tabStyle(p.id === activePlugin, primaryColor)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div style={contentStyle}>
        {active ? (
          active.render()
        ) : (
          <span style={{ color: '#888', fontSize: 12 }}>No plugins loaded.</span>
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
    bottom: 0,
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

const HIT_TARGET_PX = 24

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '8px 12px',
  borderBottom: '1px solid #333',
  background: '#16213e',
  minHeight: 44,
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
  borderRadius: 4,
  color: '#aaa',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 14,
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
    background: active ? primaryColor : 'transparent',
    border: active ? `1px solid ${primaryColor}` : '1px solid transparent',
    color: active ? '#fff' : '#aaa',
    borderRadius: 4,
    padding: '4px 10px',
    minHeight: HIT_TARGET_PX,
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: 'monospace',
  }
}

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 12,
  minHeight: 0,
}
