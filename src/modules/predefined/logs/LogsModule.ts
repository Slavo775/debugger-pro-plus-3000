import { createElement } from 'react'
import { LogsPanel } from './LogsPanel'
import type { DebuggerModuleDefinition } from '../../types'

export const logsModule: DebuggerModuleDefinition = {
  id: 'logs',
  title: 'Logs',
  defaultExpanded: true,
  render: () => createElement(LogsPanel),
}
