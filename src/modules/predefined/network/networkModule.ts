import { createElement } from 'react'
import { NetworkPanel } from './NetworkPanel'
import type { DebuggerModuleDefinition } from '../../types'

export const networkModule: DebuggerModuleDefinition = {
  id: 'network',
  title: 'Network',
  defaultExpanded: true,
  render: () => createElement(NetworkPanel),
}
