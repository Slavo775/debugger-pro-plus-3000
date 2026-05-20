import { useEffect, type CSSProperties } from 'react'
import { useDebuggerApi } from '../useDebuggerApi'

interface DeviceData {
  'screen.width': number
  'screen.height': number
  'screen.availWidth': number
  'screen.availHeight': number
  'screen.colorDepth': number
  devicePixelRatio: number
  orientation: string
  'viewport.width': number
  'viewport.height': number
  userAgent: string
  platform: string
  hardwareConcurrency: number
  maxTouchPoints: number
  'connection.effectiveType': string
  'connection.downlink': number | null
}

function collectDeviceData(): DeviceData {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; downlink?: number }
  }
  return {
    'screen.width': screen.width,
    'screen.height': screen.height,
    'screen.availWidth': screen.availWidth,
    'screen.availHeight': screen.availHeight,
    'screen.colorDepth': screen.colorDepth,
    devicePixelRatio: window.devicePixelRatio,
    orientation: screen.orientation?.type ?? 'unknown',
    'viewport.width': window.innerWidth,
    'viewport.height': window.innerHeight,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    maxTouchPoints: navigator.maxTouchPoints,
    'connection.effectiveType': nav.connection?.effectiveType ?? 'unknown',
    'connection.downlink': nav.connection?.downlink ?? null,
  }
}

export function DeviceInfoPanel() {
  const { updateData } = useDebuggerApi()

  useEffect(() => {
    const collect = () => {
      const data = collectDeviceData()
      updateData(data as unknown as Record<string, unknown>)
    }
    collect()
    window.addEventListener('resize', collect)
    window.addEventListener('orientationchange', collect)
    return () => {
      window.removeEventListener('resize', collect)
      window.removeEventListener('orientationchange', collect)
    }
  }, [updateData])

  const data = collectDeviceData()

  return (
    <div style={gridStyle}>
      <SectionDivider label="Screen" />
      <Row label="screen.width" value={`${data['screen.width']}px`} />
      <Row label="screen.height" value={`${data['screen.height']}px`} />
      <Row label="availWidth" value={`${data['screen.availWidth']}px`} />
      <Row label="availHeight" value={`${data['screen.availHeight']}px`} />
      <Row label="colorDepth" value={`${data['screen.colorDepth']}bit`} />
      <Row label="pixelRatio" value={String(data.devicePixelRatio)} />
      <Row label="orientation" value={data.orientation} />

      <SectionDivider label="Viewport" />
      <Row label="innerWidth" value={`${data['viewport.width']}px`} />
      <Row label="innerHeight" value={`${data['viewport.height']}px`} />

      <SectionDivider label="Browser" />
      <Row label="platform" value={data.platform} />
      <Row label="cpuCores" value={String(data.hardwareConcurrency)} />
      <Row label="touchPoints" value={String(data.maxTouchPoints)} />
      <Row label="userAgent" value={data.userAgent} wrap />

      <SectionDivider label="Network" />
      <Row label="effectiveType" value={data['connection.effectiveType']} />
      <Row
        label="downlink"
        value={data['connection.downlink'] !== null ? `${data['connection.downlink']} Mbps` : 'unknown'}
      />
    </div>
  )
}

interface RowProps {
  label: string
  value: string
  wrap?: boolean
}

function Row({ label, value, wrap = false }: RowProps) {
  return (
    <div style={rowStyle}>
      <span style={keyStyle}>{label}</span>
      <span style={wrap ? { ...valueStyle, ...valueWrapStyle } : valueStyle}>{value}</span>
    </div>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={dividerStyle}>
      <span style={dividerLabelStyle}>── {label} ──</span>
    </div>
  )
}

const gridStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  width: '100%',
  minWidth: 0,
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  padding: '3px 0',
  minWidth: 0,
}

const keyStyle: CSSProperties = {
  flexShrink: 0,
  width: 120,
  minWidth: 100,
  color: '#aaa',
  fontFamily: 'monospace',
  fontSize: 11,
  paddingRight: 8,
  lineHeight: '16px',
}

const valueStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  color: '#e2e2e2',
  fontFamily: 'monospace',
  fontSize: 11,
  lineHeight: '16px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const valueWrapStyle: CSSProperties = {
  whiteSpace: 'normal',
  wordBreak: 'break-all',
  overflow: 'visible',
  textOverflow: 'clip',
}

const dividerStyle: CSSProperties = {
  width: '100%',
  padding: '8px 0 4px',
  textAlign: 'center',
}

const dividerLabelStyle: CSSProperties = {
  color: '#555',
  fontFamily: 'monospace',
  fontSize: 10,
  letterSpacing: 1,
}
