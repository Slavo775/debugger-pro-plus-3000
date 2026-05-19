import { useState } from 'react'
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

function DebuggerPanel({ plugins = [], defaultOpen = false }: Omit<DebuggerProps, 'config'>) {
  const { style, button } = useDebuggerConfig()
  const [corner, setCorner] = useFabPosition(button.position, button.draggable)
  const [open, setOpen] = useState(defaultOpen)
  const [activePlugin, setActivePlugin] = useState<string | null>(plugins[0]?.id ?? null)

  if (!open) {
    return <DebuggerFab corner={corner} onCornerChange={setCorner} onOpen={() => setOpen(true)} />
  }

  const active = plugins.find((p) => p.id === activePlugin)
  const primaryColor = style.primaryColor

  return (
    <div style={panelStyle(corner)}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 600, fontSize: 12 }}>Debugger Pro Plus 3000</span>
        <button onClick={() => setOpen(false)} style={closeButtonStyle} aria-label="Close debugger">
          ✕
        </button>
      </div>

      {plugins.length > 0 && (
        <div style={tabBarStyle}>
          {plugins.map((p) => (
            <button
              key={p.id}
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
    </div>
  )
}

function panelStyle(corner: ButtonCorner): React.CSSProperties {
  return {
    position: 'fixed',
    ...cornerCoords(corner),
    zIndex: 9999,
    width: 360,
    maxHeight: 480,
    background: '#1a1a2e',
    color: '#e2e2e2',
    border: '1px solid #333',
    borderRadius: 8,
    fontFamily: 'monospace',
    fontSize: 12,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  }
}

function cornerCoords(corner: ButtonCorner): React.CSSProperties {
  switch (corner) {
    case 'leftTop':
      return { top: 16, left: 16 }
    case 'rightTop':
      return { top: 16, right: 16 }
    case 'leftBottom':
      return { bottom: 16, left: 16 }
    case 'rightBottom':
    default:
      return { bottom: 16, right: 16 }
  }
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 12px',
  borderBottom: '1px solid #333',
  background: '#16213e',
}

const closeButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  fontSize: 14,
  lineHeight: 1,
  padding: 0,
}

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 2,
  padding: '6px 8px',
  borderBottom: '1px solid #333',
  flexWrap: 'wrap',
}

function tabStyle(active: boolean, primaryColor: string): React.CSSProperties {
  return {
    background: active ? primaryColor : 'transparent',
    border: active ? `1px solid ${primaryColor}` : '1px solid transparent',
    color: active ? '#e2e2e2' : '#888',
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: 'monospace',
  }
}

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 12,
}
