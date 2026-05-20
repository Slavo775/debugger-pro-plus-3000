/* eslint-disable react-refresh/only-export-components -- module descriptor lives next to its view; not an HMR boundary */
import { useEffect, useState } from 'react'
import type { DebuggerModule } from '../types'

interface DeviceInfoSnapshot {
  userAgent: string
  platform: string
  language: string
  online: boolean
  viewportWidth: number
  viewportHeight: number
  screenWidth: number
  screenHeight: number
  devicePixelRatio: number
  prefersDark: boolean
}

function readSnapshot(): DeviceInfoSnapshot | null {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return null
  const prefersDark =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    online: navigator.onLine,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    screenWidth: typeof screen !== 'undefined' ? screen.width : 0,
    screenHeight: typeof screen !== 'undefined' ? screen.height : 0,
    devicePixelRatio: window.devicePixelRatio ?? 1,
    prefersDark,
  }
}

function DeviceInfoView() {
  const [snap, setSnap] = useState<DeviceInfoSnapshot | null>(() => readSnapshot())

  useEffect(() => {
    if (typeof window === 'undefined') return
    const refresh = () => setSnap(readSnapshot())
    window.addEventListener('resize', refresh)
    window.addEventListener('online', refresh)
    window.addEventListener('offline', refresh)
    const mql =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null
    mql?.addEventListener?.('change', refresh)
    return () => {
      window.removeEventListener('resize', refresh)
      window.removeEventListener('online', refresh)
      window.removeEventListener('offline', refresh)
      mql?.removeEventListener?.('change', refresh)
    }
  }, [])

  if (!snap) {
    return <div style={fallbackStyle}>Device info unavailable outside a browser.</div>
  }

  const rows: Array<[string, React.ReactNode]> = [
    ['User agent', <span style={valueWrapStyle}>{snap.userAgent}</span>],
    ['Platform', snap.platform || '—'],
    ['Language', snap.language],
    ['Online', snap.online ? 'yes' : 'no'],
    ['Viewport', `${snap.viewportWidth} × ${snap.viewportHeight}`],
    ['Screen', `${snap.screenWidth} × ${snap.screenHeight}`],
    ['Device pixel ratio', snap.devicePixelRatio],
    ['Prefers color scheme', snap.prefersDark ? 'dark' : 'light'],
  ]

  return (
    <dl style={listStyle}>
      {rows.map(([label, value], i) => (
        <div key={label} style={rowStyle(i)}>
          <dt style={labelStyle}>{label}</dt>
          <dd style={valueStyle}>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

const listStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  fontSize: 12,
}

function rowStyle(i: number): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: '140px 1fr',
    gap: 8,
    padding: '6px 8px',
    background: i % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  }
}

const labelStyle: React.CSSProperties = {
  margin: 0,
  color: '#888',
  fontWeight: 500,
}

const valueStyle: React.CSSProperties = {
  margin: 0,
  color: '#e2e2e2',
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
}

const valueWrapStyle: React.CSSProperties = {
  display: 'inline-block',
  wordBreak: 'break-all',
}

const fallbackStyle: React.CSSProperties = {
  color: '#888',
  fontSize: 12,
  padding: 4,
}

export const deviceInfoModule: DebuggerModule<void> = {
  id: 'device-info',
  defaultTitle: 'Device',
  render: () => <DeviceInfoView />,
}
