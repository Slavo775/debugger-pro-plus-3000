import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { DebuggerConfigProvider } from '../config/DebuggerConfigProvider'
import { useDebuggerConfig } from '../config/useDebuggerConfig'
import type { ButtonCorner, DebuggerConfig } from '../config/types'
import { DebuggerFab } from './DebuggerFab'
import { useFabPosition } from './useFabPosition'
import { DebuggerModuleRegistryProvider } from '../modules/DebuggerModuleRegistryProvider'
import {
  DebuggerModuleRegistryContext,
  DebuggerModuleIdContext,
} from '../modules/DebuggerModuleRegistryContext'
import type { DebuggerModuleDefinition, RegisteredModule } from '../modules/types'

export interface DebuggerPlugin {
  id: string
  label: string
  render: () => React.ReactNode
}

export interface DebuggerProps {
  plugins?: DebuggerPlugin[]
  defaultOpen?: boolean
  config?: DebuggerConfig
  modules?: DebuggerModuleDefinition[]
  onModuleEvent?: (moduleId: string, event: string, payload: unknown) => void
}

export function Debugger({ config, modules = [], onModuleEvent, ...rest }: DebuggerProps) {
  return (
    <DebuggerConfigProvider config={config}>
      <DebuggerModuleSetup modules={modules} onModuleEvent={onModuleEvent} panelProps={rest} />
    </DebuggerConfigProvider>
  )
}

interface SetupProps {
  modules: DebuggerModuleDefinition[]
  onModuleEvent?: DebuggerProps['onModuleEvent']
  panelProps: InnerProps
}

function DebuggerModuleSetup({ modules, onModuleEvent, panelProps }: SetupProps) {
  const { modules: moduleConfigs } = useDebuggerConfig()
  return (
    <DebuggerModuleRegistryProvider
      moduleDefinitions={modules}
      moduleConfigs={moduleConfigs}
      onModuleEvent={onModuleEvent}
    >
      <DebuggerPanelRoot {...panelProps} />
    </DebuggerModuleRegistryProvider>
  )
}

type PanelSide = 'left' | 'right'

function sideFromCorner(corner: ButtonCorner): PanelSide {
  return corner === 'leftTop' || corner === 'leftBottom' ? 'left' : 'right'
}

type InnerProps = Omit<DebuggerProps, 'config' | 'modules' | 'onModuleEvent'>

function DebuggerPanelRoot({ plugins = [], defaultOpen = false }: InnerProps) {
  const { style, button, panel } = useDebuggerConfig()
  const [corner, setCorner] = useFabPosition(button.position, button.draggable)
  const [open, setOpen] = useState(defaultOpen)
  const [isFullscreen, setIsFullscreen] = useState(false)

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

      <ModuleStack plugins={plugins} primaryColor={style.primaryColor} />
    </section>
  )
}

interface ModuleStackProps {
  plugins: DebuggerPlugin[]
  primaryColor: string
}

function ModuleStack({ plugins, primaryColor }: ModuleStackProps) {
  const registryCtx = useContext(DebuggerModuleRegistryContext)

  const syntheticModules: RegisteredModule[] = plugins.map((p) => ({
    id: p.id,
    title: p.label,
    expanded: true,
    data: {},
    render: p.render,
  }))

  const registeredModules: RegisteredModule[] = registryCtx?._modules ?? []
  const allModules = [...syntheticModules, ...registeredModules]

  if (allModules.length === 0) {
    return (
      <div style={emptyStyle}>
        <span>No modules loaded.</span>
      </div>
    )
  }

  return (
    <ul style={moduleListStyle} role="list">
      {allModules.map((mod) => (
        <AccordionItem
          key={mod.id}
          module={mod}
          primaryColor={primaryColor}
          onToggle={() => registryCtx?._toggleExpanded(mod.id)}
        />
      ))}
    </ul>
  )
}

interface AccordionItemProps {
  module: RegisteredModule
  primaryColor: string
  onToggle: () => void
}

function AccordionItem({ module, primaryColor, onToggle }: AccordionItemProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [maxHeight, setMaxHeight] = useState<number | null>(module.expanded ? null : 0)
  const [bodyOverflow, setBodyOverflow] = useState<'hidden' | 'visible'>(
    module.expanded ? 'visible' : 'hidden',
  )
  const prevExpanded = useRef(module.expanded)

  useEffect(() => {
    if (prevExpanded.current === module.expanded) return
    prevExpanded.current = module.expanded

    const el = bodyRef.current
    if (!el) return

    if (module.expanded) {
      const measured = el.scrollHeight
      setBodyOverflow('hidden')
      setMaxHeight(measured)
    } else {
      setBodyOverflow('hidden')
      const measured = el.scrollHeight
      setMaxHeight(measured)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setMaxHeight(0))
      })
    }
  }, [module.expanded])

  const handleTransitionEnd = useCallback(() => {
    if (module.expanded) {
      setMaxHeight(null)
      setBodyOverflow('visible')
    }
  }, [module.expanded])

  const bodyStyle: React.CSSProperties = {
    overflow: bodyOverflow,
    maxHeight: maxHeight === null ? undefined : `${maxHeight}px`,
    transition: 'max-height 220ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms ease',
    opacity: module.expanded ? 1 : 0,
  }

  return (
    <li style={accordionItemStyle}>
      <button
        type="button"
        onClick={onToggle}
        style={accordionHeaderStyle(primaryColor)}
        aria-expanded={module.expanded}
      >
        <span style={accordionTitleStyle}>{module.title}</span>
        <span
          aria-hidden="true"
          style={{
            transition: 'transform 200ms ease',
            transform: module.expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            fontSize: 14,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ▾
        </span>
      </button>
      <div ref={bodyRef} style={bodyStyle} onTransitionEnd={handleTransitionEnd}>
        <div style={accordionBodyStyle}>
          <DebuggerModuleIdContext.Provider value={module.id}>
            {module.render()}
          </DebuggerModuleIdContext.Provider>
        </div>
      </div>
    </li>
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

const moduleListStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  margin: 0,
  padding: 0,
  listStyle: 'none',
  minHeight: 0,
}

const emptyStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#888',
  fontSize: 12,
  fontFamily: 'monospace',
}

const accordionItemStyle: React.CSSProperties = {
  borderBottom: '1px solid #2a2a3e',
}

function accordionHeaderStyle(primaryColor: string): React.CSSProperties {
  return {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '10px 12px',
    background: '#16213e',
    border: 'none',
    borderBottom: '1px solid #2a2a3e',
    borderLeft: `3px solid ${primaryColor}`,
    color: '#e2e2e2',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 600,
    textAlign: 'left',
    outline: 'none',
    boxSizing: 'border-box',
  }
}

const accordionTitleStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const accordionBodyStyle: React.CSSProperties = {
  padding: 12,
}
