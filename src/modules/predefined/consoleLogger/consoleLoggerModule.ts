import { createElement } from 'react'
import { ConsoleLoggerPanel } from './ConsoleLoggerPanel'
import type { DebuggerModuleDefinition } from '../../types'

export const consoleLoggerModule: DebuggerModuleDefinition = {
  id: 'consoleLogger',
  title: 'Console',
  defaultExpanded: true,
  render: () => createElement(ConsoleLoggerPanel),
}
