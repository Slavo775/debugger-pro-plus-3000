import { useEffect, useReducer, useState, type CSSProperties } from 'react'
import { useDebuggerApi } from '../../useDebuggerApi'
import { useDebuggerConfig } from '../../../config/useDebuggerConfig'
import { getStore, setEnabled, clearEntries, type LogEntry } from './logsStore'

function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${hh}:${mm}:${ss}.${ms}`
}

export function LogsPanel() {
  const { subscribe, updateData } = useDebuggerApi()
  const cfg = useDebuggerConfig()
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)

  const store = getStore()

  const [activeFilters, setActiveFilters] = useState<Set<string>>(
    () => new Set([...store.registered.keys(), '__route__']),
  )

  useEffect(() => {
    const s = getStore()
    const notify = () => {
      updateData({ logOutput: [...s.entries] })
      forceUpdate()
    }
    s._subs.add(notify)
    return () => { s._subs.delete(notify) }
  }, [updateData])

  useEffect(() => {
    return subscribe('route-change', forceUpdate)
  }, [subscribe])

  // Re-sync activeFilters when log channels change (e.g. new channels registered)
  useEffect(() => {
    setActiveFilters(new Set([...getStore().registered.keys(), '__route__']))
  }, [cfg.logs])

  const entries = [...store.entries].reverse()

  const visibleEntries = entries.filter((e) => {
    if (e.id === '__route__') return activeFilters.has('__route__')
    if (!store.enabled.has(e.id)) return false
    return activeFilters.has(e.id)
  })

  function toggleFilter(id: string) {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div style={containerStyle}>
      <div style={sectionStyle}>
        <span style={sectionLabelStyle}>Channels</span>
        {cfg.logs.length === 0 ? (
          <p style={emptyChannelsStyle}>
            No log channels configured. Add <code style={codeStyle}>logs</code> to your debugger config.
          </p>
        ) : (
          <div style={checkboxGroupStyle}>
            {cfg.logs.map(({ id, prefix }) => (
              <label key={id} style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={store.enabled.has(id)}
                  onChange={(e) => setEnabled(id, e.target.checked)}
                  style={checkboxStyle}
                />
                <span style={checkboxTextStyle}>{prefix}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div style={logHeaderStyle}>
        <span style={sectionLabelStyle}>Log output</span>
        <button type="button" style={clearButtonStyle} onClick={clearEntries}>
          Clear
        </button>
      </div>

      <div style={chipRowStyle}>
        {[...store.registered.entries()].map(([id, prefix]) => (
          <button
            key={id}
            type="button"
            onClick={() => toggleFilter(id)}
            style={chipStyle(activeFilters.has(id), cfg.style.primaryColor)}
          >
            {prefix}
          </button>
        ))}
        <button
          type="button"
          onClick={() => toggleFilter('__route__')}
          style={chipStyle(activeFilters.has('__route__'), cfg.style.primaryColor)}
        >
          Navigation
        </button>
      </div>

      <div style={logListStyle}>
        {visibleEntries.length === 0 ? (
          <div style={emptyLogsStyle}>No logs yet.</div>
        ) : (
          visibleEntries.map((entry, i) => (
            <LogRow key={`${entry.timestamp}-${i}`} entry={entry} />
          ))
        )}
      </div>
    </div>
  )
}

function LogRow({ entry }: { entry: LogEntry }) {
  const isRoute = entry.id === '__route__'
  return (
    <div style={logRowStyle}>
      <span style={timestampStyle}>{formatTime(entry.timestamp)}</span>
      {isRoute ? (
        <span style={routeTextStyle}>⇒ {entry.text}</span>
      ) : (
        <span style={logTextStyle}>
          <span style={prefixStyle}>[{entry.prefix}]</span> {entry.text}
        </span>
      )}
    </div>
  )
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  minWidth: 0,
}

const sectionStyle: CSSProperties = {
  padding: '0 0 8px',
}

const sectionLabelStyle: CSSProperties = {
  display: 'block',
  color: '#888',
  fontFamily: 'monospace',
  fontSize: 10,
  letterSpacing: 1,
  marginBottom: 6,
}

const emptyChannelsStyle: CSSProperties = {
  color: '#666',
  fontFamily: 'monospace',
  fontSize: 11,
  margin: 0,
}

const codeStyle: CSSProperties = {
  color: '#aaa',
  background: '#2a2a3e',
  padding: '1px 4px',
  borderRadius: 3,
}

const checkboxGroupStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px 12px',
}

const checkboxLabelStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  cursor: 'pointer',
  userSelect: 'none',
}

const checkboxStyle: CSSProperties = {
  accentColor: '#1a6eb5',
  cursor: 'pointer',
  margin: 0,
}

const checkboxTextStyle: CSSProperties = {
  color: '#d8d8d8',
  fontFamily: 'monospace',
  fontSize: 11,
}

const logHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 0 4px',
  borderTop: '1px solid #2a2a3e',
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

const logListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  maxHeight: 300,
  overflowY: 'auto',
  minWidth: 0,
}

const emptyLogsStyle: CSSProperties = {
  color: '#555',
  fontFamily: 'monospace',
  fontSize: 11,
  padding: '8px 0',
  textAlign: 'center',
}

const logRowStyle: CSSProperties = {
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

const logTextStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  color: '#e2e2e2',
  fontFamily: 'monospace',
  fontSize: 11,
  lineHeight: '16px',
  wordBreak: 'break-word',
}

const prefixStyle: CSSProperties = {
  color: '#7ab8f5',
}

const routeTextStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  color: '#a8e6a3',
  fontFamily: 'monospace',
  fontSize: 11,
  lineHeight: '16px',
  wordBreak: 'break-word',
}

const chipRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4px 6px',
  padding: '4px 0 6px',
}

function chipStyle(active: boolean, primaryColor: string): CSSProperties {
  return {
    background: active ? primaryColor : 'transparent',
    border: active ? 'none' : '1px solid #444',
    borderRadius: 999,
    color: active ? '#fff' : '#888',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '2px 10px',
  }
}
