import { useEffect, useReducer, type CSSProperties } from 'react'
import { useDebuggerApi } from '../../useDebuggerApi'
import { useDebuggerConfig } from '../../../config/useDebuggerConfig'
import {
  clearConsoleLogEntries,
  getConsoleLoggerStore,
  patchConsole,
  restoreConsole,
  type ConsoleLogEntry,
  type ConsoleLogLevel,
} from './consoleLoggerStore'

function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${hh}:${mm}:${ss}.${ms}`
}

function formatArg(arg: unknown): string {
  if (arg === null) return 'null'
  if (arg === undefined) return 'undefined'
  if (arg instanceof Error) return arg.stack ?? `${arg.name}: ${arg.message}`
  if (typeof arg === 'string') return arg
  if (typeof arg === 'object') {
    try {
      return JSON.stringify(arg)
    } catch {
      return String(arg)
    }
  }
  return String(arg)
}

function formatEntryBody(level: ConsoleLogLevel, args: unknown[]): string {
  if (level === 'table' && args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
    try {
      return JSON.stringify(args[0], null, 2)
    } catch {
      // fall through to default formatter
    }
  }
  return args.map(formatArg).join(' ')
}

const LEVEL_TEXT_COLOR: Record<ConsoleLogLevel, string> = {
  log: '#e2e2e2',
  info: '#7ab8f5',
  warn: '#f0c674',
  error: '#e05c5c',
  debug: '#888',
  table: '#5cc4d4',
  trace: '#a0a0a0',
  assert: '#ff5050',
}

const LEVEL_EXTRA_STYLE: Partial<Record<ConsoleLogLevel, CSSProperties>> = {
  trace: { fontStyle: 'italic' },
  assert: { fontWeight: 700 },
}

export function ConsoleLoggerPanel() {
  const { updateData } = useDebuggerApi()
  const { consoleLogger } = useDebuggerConfig()
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)
  const maxEntries = consoleLogger.maxEntries

  useEffect(() => {
    patchConsole(maxEntries)
    const store = getConsoleLoggerStore()
    const notify = () => {
      updateData({ consoleLogs: [...store.entries] })
      forceUpdate()
    }
    store._subs.add(notify)
    notify()
    return () => {
      store._subs.delete(notify)
      restoreConsole()
    }
  }, [maxEntries, updateData])

  const entries = [...getConsoleLoggerStore().entries].reverse()

  return (
    <div style={containerStyle}>
      <div style={headerRowStyle}>
        <span style={sectionLabelStyle}>Console output</span>
        <button type="button" style={clearButtonStyle} onClick={clearConsoleLogEntries}>
          Clear
        </button>
      </div>
      <div style={listStyle}>
        {entries.length === 0 ? (
          <div style={emptyStyle}>No console output yet.</div>
        ) : (
          entries.map((entry) => <LogRow key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  )
}

function LogRow({ entry }: { entry: ConsoleLogEntry }) {
  const baseColor = LEVEL_TEXT_COLOR[entry.level]
  const extra = LEVEL_EXTRA_STYLE[entry.level] ?? {}
  const messageStyle: CSSProperties = {
    ...messageBaseStyle,
    color: baseColor,
    ...extra,
  }
  const levelStyle: CSSProperties = {
    ...levelBadgeBaseStyle,
    color: baseColor,
    ...extra,
  }
  return (
    <div style={rowStyle}>
      <span style={timestampStyle}>{formatTime(entry.ts)}</span>
      <span style={levelStyle}>[{entry.level.toUpperCase()}]</span>
      <span style={messageStyle}>{formatEntryBody(entry.level, entry.args)}</span>
    </div>
  )
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  minWidth: 0,
}

const headerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 0 6px',
}

const sectionLabelStyle: CSSProperties = {
  color: '#888',
  fontFamily: 'monospace',
  fontSize: 10,
  letterSpacing: 1,
}

const clearButtonStyle: CSSProperties = {
  background: 'transparent',
  border: '1px solid #4a4a6a',
  borderRadius: 4,
  color: '#888',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 10,
  padding: '2px 8px',
}

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  maxHeight: 300,
  overflowY: 'auto',
  minWidth: 0,
}

const emptyStyle: CSSProperties = {
  color: '#555',
  fontFamily: 'monospace',
  fontSize: 11,
  padding: '8px 0',
  textAlign: 'center',
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  padding: '2px 0',
  minWidth: 0,
}

const timestampStyle: CSSProperties = {
  flexShrink: 0,
  color: '#555',
  fontFamily: 'monospace',
  fontSize: 10,
  lineHeight: '16px',
  whiteSpace: 'nowrap',
}

const levelBadgeBaseStyle: CSSProperties = {
  flexShrink: 0,
  fontFamily: 'monospace',
  fontSize: 10,
  lineHeight: '16px',
}

const messageBaseStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontFamily: 'monospace',
  fontSize: 11,
  lineHeight: '16px',
  wordBreak: 'break-word',
  whiteSpace: 'pre-wrap',
}
