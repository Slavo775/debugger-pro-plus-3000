import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Debugger } from './index'

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ fontFamily: 'sans-serif', padding: 40 }}>
      <h1>Debugger Pro Plus 3000 — Dev Preview</h1>
      <p>The debugger panel is in the bottom-right corner.</p>
    </div>
    <Debugger plugins={[demoPlugin]} defaultOpen={true} />
  </StrictMode>,
)
