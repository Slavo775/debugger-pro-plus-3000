/* eslint-disable react-refresh/only-export-components -- dev preview entry, not consumed by HMR boundaries */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Debugger, useDebuggerConfig } from './index'
import type { DebuggerModule } from './index'
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

// A custom module passed at runtime via the `modules` prop — appears in
// the tab bar after any modules selected through `config.modules`.
const configEchoModule: DebuggerModule<void> = {
  id: 'config-echo',
  defaultTitle: 'Config',
  render: () => <ConfigEcho />,
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ fontFamily: 'sans-serif', padding: 40 }}>
      <h1>Debugger Pro Plus 3000 — Dev Preview</h1>
      <p>
        Click the floating button to open the debugger. Drag the FAB to any corner — the position
        is saved to <code>localStorage[&quot;debugger_fab_position&quot;]</code> and survives
        reloads. The panel opens full-height on the same side the FAB is anchored to.
      </p>
      <p style={{ color: '#666', fontSize: 13 }}>
        Built-in modules come from <code>config.modules</code>. Custom modules can still be passed
        at runtime via the <code>modules</code> prop on <code>&lt;Debugger&gt;</code> (the
        &quot;Config&quot; tab below is one).
      </p>
      <p style={{ color: '#666', fontSize: 13 }}>
        Use the ⤢ button in the panel header to toggle fullscreen. Press <kbd>Esc</kbd> to close.
      </p>
    </div>
    <Debugger modules={[configEchoModule]} config={debuggerConfig} />
  </StrictMode>,
)
