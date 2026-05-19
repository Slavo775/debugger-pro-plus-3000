/* eslint-disable react-refresh/only-export-components -- dev preview entry, not consumed by HMR boundaries */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Debugger, useDebuggerConfig } from './index'
import debuggerConfig from '../config.debugger.js'

function ConfigEcho() {
  const cfg = useDebuggerConfig()
  return (
    <div>
      <p style={{ color: '#aef', margin: 0 }}>
        primaryColor from config: <strong>{cfg.style.primaryColor}</strong>
      </p>
      <pre style={{ color: '#8f8', fontSize: 11, marginTop: 8 }}>
        {JSON.stringify(cfg, null, 2)}
      </pre>
    </div>
  )
}

const demoPlugin = {
  id: 'demo',
  label: 'Demo',
  render: () => (
    <div>
      <p style={{ color: '#aef', margin: 0 }}>Hello from plugin!</p>
      <pre style={{ color: '#8f8', fontSize: 11, marginTop: 8 }}>
        {JSON.stringify({ time: new Date().toISOString() }, null, 2)}
      </pre>
    </div>
  ),
}

const configEchoPlugin = {
  id: 'config',
  label: 'Config',
  render: () => <ConfigEcho />,
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ fontFamily: 'sans-serif', padding: 40 }}>
      <h1>Debugger Pro Plus 3000 — Dev Preview</h1>
      <p>The debugger panel is in the bottom-right corner.</p>
      <p style={{ color: '#666', fontSize: 13 }}>
        Loaded <code>config.debugger.js</code> →{' '}
        <code>primaryColor: {debuggerConfig.style.primaryColor}</code>
      </p>
    </div>
    <Debugger
      plugins={[demoPlugin, configEchoPlugin]}
      defaultOpen={true}
      config={debuggerConfig}
    />
  </StrictMode>,
)
