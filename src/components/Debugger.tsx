import { useCallback, useContext, useEffect, useRef, useState, type CSSProperties } from 'react'
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

export interface DebuggerProps {
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

function DebuggerPanelRoot({ defaultOpen = false }: InnerProps) {
  const { style, button, panel } = useDebuggerConfig()
  const registryCtx = useContext(DebuggerModuleRegistryContext)
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
          {registryCtx && <CopyExportButton getSnapshot={registryCtx._getDebugSnapshot} />}
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

      <ModuleStack primaryColor={style.primaryColor} />
    </section>
  )
}

interface ModuleStackProps {
  primaryColor: string
}

function ModuleStack({ primaryColor }: ModuleStackProps) {
  const registryCtx = useContext(DebuggerModuleRegistryContext)
  const modules: RegisteredModule[] = registryCtx?._modules ?? []

  if (modules.length === 0) {
    return (
      <div style={emptyStyle}>
        <span>No modules loaded.</span>
      </div>
    )
  }

  return (
    <ul style={moduleListStyle} role="list">
      {modules.map((mod) => (
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
      setMaxHeight(0)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setMaxHeight(measured))
      })
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

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface CopyExportButtonProps {
  getSnapshot: () => Record<string, Record<string, unknown>>
}

function CopyExportButton({ getSnapshot }: CopyExportButtonProps) {
  const [copied, setCopied] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const groupRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const onMouseDown = (e: MouseEvent) => {
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [dropdownOpen])

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }, [])

  const handleCopy = useCallback(() => {
    const json = JSON.stringify(getSnapshot(), null, 2)
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), 1500)
    })
  }, [getSnapshot])

  const handleDownload = useCallback((format: 'json' | 'txt') => {
    const content = JSON.stringify(getSnapshot(), null, 2)
    const filename = format === 'json' ? 'debug-snapshot.json' : 'debug-snapshot.txt'
    const mime = format === 'json' ? 'application/json' : 'text/plain'
    downloadBlob(content, filename, mime)
    setDropdownOpen(false)
  }, [getSnapshot])

  return (
    <div ref={groupRef} style={splitGroupStyle}>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy debug snapshot to clipboard"
        style={splitPrimaryStyle}
      >
        <span aria-hidden="true">{copied ? '✓' : '⎘'}</span>
        <span style={{ fontSize: 10, marginLeft: 3 }}>{copied ? 'Copied' : 'Copy'}</span>
      </button>
      <button
        type="button"
        onClick={() => setDropdownOpen((v) => !v)}
        aria-label="Export options"
        aria-expanded={dropdownOpen}
        aria-haspopup="menu"
        style={splitChevronStyle}
      >
        <span aria-hidden="true" style={{ display: 'inline-block', transition: 'transform 150ms ease', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
      </button>
      {dropdownOpen && (
        <ul role="menu" style={dropdownStyle}>
          <li role="none">
            <button type="button" role="menuitem" style={dropdownItemStyle} onClick={() => handleDownload('json')}>
              ⬇ Download .json
            </button>
          </li>
          <li role="none">
            <button type="button" role="menuitem" style={dropdownItemStyle} onClick={() => handleDownload('txt')}>
              ⬇ Download .txt
            </button>
          </li>
        </ul>
      )}
    </div>
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

const splitGroupStyle: CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  border: '1px solid #4a4a6a',
  borderRadius: 6,
  overflow: 'visible',
}

const splitPrimaryStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 28,
  padding: '0 8px',
  background: 'transparent',
  border: 'none',
  borderRight: '1px solid #4a4a6a',
  borderRadius: '5px 0 0 5px',
  color: '#d8d8d8',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 12,
  lineHeight: 1,
}

const splitChevronStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 22,
  minHeight: 28,
  padding: '0 4px',
  background: 'transparent',
  border: 'none',
  borderRadius: '0 5px 5px 0',
  color: '#d8d8d8',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 12,
  lineHeight: 1,
}

const dropdownStyle: CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  right: 0,
  zIndex: 10001,
  background: '#1e1e3a',
  border: '1px solid #4a4a6a',
  borderRadius: 6,
  padding: '4px 0',
  margin: 0,
  listStyle: 'none',
  minWidth: 150,
  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
}

const dropdownItemStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '7px 12px',
  background: 'transparent',
  border: 'none',
  color: '#d8d8d8',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 12,
  textAlign: 'left',
  whiteSpace: 'nowrap',
}
