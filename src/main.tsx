/* eslint-disable react-refresh/only-export-components -- dev preview entry, not consumed by HMR boundaries */
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Debugger, useDebuggerConfig, useDebuggerApi, deviceInfoModule, logsModule, useDebuggerLog } from './index'
import debuggerConfig from '../config.debugger.js'

function ConfigPanel() {
  const cfg = useDebuggerConfig()
  const { moduleData } = useDebuggerApi()
  return (
    <div>
      <p style={{ color: '#aef', margin: 0 }}>
        primaryColor: <strong>{cfg.style.primaryColor}</strong>
      </p>
      <pre style={{ color: '#8f8', fontSize: 11, marginTop: 8 }}>
        {JSON.stringify({ moduleData, config: cfg }, null, 2)}
      </pre>
    </div>
  )
}

function DemoLogger() {
  const logApi = useDebuggerLog('api')
  const logAuth = useDebuggerLog('auth')
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
      <button
        onClick={() => logApi(`fetch /api/users — ${Date.now()}`)}
        style={{ background: '#1a2a3e', border: '1px solid #1a6eb5', color: '#7ab8f5', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}
      >
        Log API
      </button>
      <button
        onClick={() => logAuth('token refreshed')}
        style={{ background: '#1a2a3e', border: '1px solid #1a6eb5', color: '#7ab8f5', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}
      >
        Log Auth
      </button>
    </div>
  )
}

function NetworkPanel() {
  const { emit, subscribe, moduleData } = useDebuggerApi()

  useEffect(() => {
    return subscribe('highlight', (payload) => {
      console.log('[network] highlight event received:', payload)
    })
  }, [subscribe])

  return (
    <div>
      <p style={{ color: '#aef', margin: '0 0 8px' }}>
        baseUrl: <strong>{String(moduleData.baseUrl ?? '—')}</strong>
      </p>
      <button
        onClick={() => emit('request', { url: '/api/users', method: 'GET' })}
        style={{
          background: '#ff00aa22',
          border: '1px solid #ff00aa',
          color: '#ff00aa',
          borderRadius: 4,
          padding: '4px 12px',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: 12,
        }}
      >
        Emit request event
      </button>
      <p style={{ color: '#888', fontSize: 11, marginTop: 8 }}>
        (check console for onModuleEvent output)
      </p>
    </div>
  )
}

function StatePanel() {
  const { moduleData } = useDebuggerApi()
  return (
    <div>
      <p style={{ color: '#aef', margin: '0 0 8px' }}>Module data from config:</p>
      <pre style={{ color: '#8f8', fontSize: 11, margin: 0 }}>
        {JSON.stringify(moduleData, null, 2)}
      </pre>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ fontFamily: 'sans-serif', padding: 40 }}>
      <h1>Debugger Pro Plus 3000 — Dev Preview</h1>
      <p>
        Click the floating button to open the debugger. Each section in the panel is a module —
        click the header to expand/collapse. Modules are registered via the{' '}
        <code>modules</code> prop.
      </p>
      <p style={{ color: '#666', fontSize: 13 }}>
        Loaded <code>config.debugger.js</code> →{' '}
        <code>primaryColor: {debuggerConfig.style?.primaryColor}</code>,{' '}
        <code>panel.title: {debuggerConfig.panel?.title}</code>
      </p>
      <DemoLogger />
    </div>
    <Debugger
      config={debuggerConfig}
      modules={[
        logsModule,
        deviceInfoModule,
        { id: 'network', render: () => <NetworkPanel /> },
        { id: 'state', render: () => <StatePanel /> },
        { id: 'config', render: () => <ConfigPanel /> },
      ]}
      onModuleEvent={(id, event, payload) => {
        console.log(`[module:${id}] ${event}`, payload)
      }}
    />
  </StrictMode>,
)
