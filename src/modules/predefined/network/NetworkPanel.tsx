import { useEffect, useReducer, type CSSProperties } from 'react'
import { subscribeNetwork, getNetworkApis, type ApiStatus, type ApiStatusState } from './networkStore'

function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${hh}:${mm}:${ss}.${ms}`
}

function formatBody(data: unknown): string {
  if (data === null || data === undefined) return ''
  if (typeof data === 'string') return data
  return JSON.stringify(data, null, 2)
}

const STATUS_COLORS: Record<ApiStatusState, string> = {
  loading: '#888',
  success: '#4caf7d',
  error: '#e05c5c',
}

export function NetworkPanel() {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)

  useEffect(() => {
    const unsub = subscribeNetwork(forceUpdate)
    forceUpdate()
    return unsub
  }, [])

  const apis = getNetworkApis()

  if (apis.length === 0) {
    return <div style={emptyStyle}>No API endpoints configured.</div>
  }

  return (
    <div style={containerStyle}>
      {apis.map((api, i) => (
        <ApiCard key={api.url + i} api={api} isLast={i === apis.length - 1} />
      ))}
    </div>
  )
}

function ApiCard({ api, isLast }: { api: ApiStatus; isLast: boolean }) {
  const badgeColor = STATUS_COLORS[api.status]
  const bodyContent = api.data !== null ? formatBody(api.data) : api.error !== null ? api.error : null

  return (
    <div style={cardStyle(isLast)}>
      <div style={headerRowStyle}>
        <span style={badgeStyle(badgeColor)}>{api.status}</span>
        <span style={labelStyle}>{api.label}</span>
        <span style={methodBadgeStyle}>{api.method}</span>
      </div>

      <div style={metaRowStyle}>
        <span style={mutedStyle}>{api.url}</span>
      </div>

      <div style={metaRowStyle}>
        <span style={metaKeyStyle}>HTTP</span>
        <span style={metaValueStyle}>
          {api.httpStatus !== null ? api.httpStatus : '—'}
        </span>
        <span style={{ ...metaKeyStyle, marginLeft: 12 }}>Time</span>
        <span style={metaValueStyle}>
          {api.timestamp !== null ? formatTimestamp(api.timestamp) : '—'}
        </span>
      </div>

      {bodyContent !== null && (
        <pre style={preStyle}>{bodyContent}</pre>
      )}
    </div>
  )
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
}

const emptyStyle: CSSProperties = {
  color: '#666',
  fontFamily: 'monospace',
  fontSize: 11,
  padding: '4px 0',
}

function cardStyle(isLast: boolean): CSSProperties {
  return {
    padding: '8px 0',
    borderBottom: isLast ? 'none' : '1px solid #2a2a3e',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  }
}

const headerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  minWidth: 0,
}

function badgeStyle(color: string): CSSProperties {
  return {
    flexShrink: 0,
    background: color,
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 0.5,
    padding: '1px 6px',
    borderRadius: 999,
    textTransform: 'uppercase',
  }
}

const labelStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  color: '#e2e2e2',
  fontFamily: 'monospace',
  fontSize: 11,
  fontWeight: 600,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const methodBadgeStyle: CSSProperties = {
  flexShrink: 0,
  color: '#7ab8f5',
  fontFamily: 'monospace',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 0.5,
  border: '1px solid #2a4a7a',
  borderRadius: 3,
  padding: '1px 5px',
}

const metaRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  minWidth: 0,
}

const mutedStyle: CSSProperties = {
  color: '#666',
  fontFamily: 'monospace',
  fontSize: 10,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: 1,
  minWidth: 0,
}

const metaKeyStyle: CSSProperties = {
  color: '#666',
  fontFamily: 'monospace',
  fontSize: 10,
  flexShrink: 0,
}

const metaValueStyle: CSSProperties = {
  color: '#aaa',
  fontFamily: 'monospace',
  fontSize: 10,
  flexShrink: 0,
}

const preStyle: CSSProperties = {
  margin: 0,
  marginTop: 2,
  padding: '6px 8px',
  background: '#0f0f1e',
  border: '1px solid #2a2a3e',
  borderRadius: 4,
  color: '#c8c8d8',
  fontFamily: 'monospace',
  fontSize: 10,
  lineHeight: 1.5,
  maxHeight: 120,
  overflowY: 'auto',
  wordBreak: 'break-all',
  whiteSpace: 'pre-wrap',
}
