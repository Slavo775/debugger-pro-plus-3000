import { createElement } from 'react'
import { DeviceInfoPanel } from './DeviceInfoPanel'
import type { DebuggerModuleDefinition } from '../types'

export const deviceInfoModule: DebuggerModuleDefinition = {
  id: 'device-info',
  title: 'Device Info',
  defaultExpanded: true,
  render: () => createElement(DeviceInfoPanel),
}
