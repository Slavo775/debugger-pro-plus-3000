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
      <p>
        Click the floating button to open the debugger. Drag the FAB to any corner — the position
        is saved to <code>localStorage[&quot;debugger_fab_position&quot;]</code> and survives
        reloads. The panel now opens full-height on the same side the FAB is anchored to.
      </p>
      <p style={{ color: '#666', fontSize: 13 }}>
        Loaded <code>config.debugger.js</code> →{' '}
        <code>primaryColor: {debuggerConfig.style?.primaryColor}</code>,{' '}
        <code>panel.title: {debuggerConfig.panel?.title}</code>,{' '}
        <code>panel.style.width: {debuggerConfig.panel?.style?.width}</code>
      </p>
      <p style={{ color: '#666', fontSize: 13 }}>
        Use the ⤢ button in the panel header to toggle fullscreen. Press <kbd>Esc</kbd> to close.
      </p>
    </div>
    <Debugger plugins={[demoPlugin, configEchoPlugin]} config={debuggerConfig} />
  </StrictMode>,
)
