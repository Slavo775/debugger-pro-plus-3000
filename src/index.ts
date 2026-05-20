export { Debugger } from './components/Debugger'
export type { DebuggerProps } from './components/Debugger'

export { loadDebuggerConfig } from './config/loadDebuggerConfig'
export type { LoadDebuggerConfigOptions } from './config/loadDebuggerConfig'
export { DebuggerConfigProvider } from './config/DebuggerConfigProvider'
export type { DebuggerConfigProviderProps } from './config/DebuggerConfigProvider'
export { useDebuggerConfig } from './config/useDebuggerConfig'
export { DEFAULT_DEBUGGER_CONFIG } from './config/defaults'
export type {
  ButtonCorner,
  DebuggerButtonConfig,
  DebuggerConfig,
  DebuggerPanelConfig,
  DebuggerPanelStyleConfig,
  DebuggerStyleConfig,
  ResolvedDebuggerConfig,
} from './config/types'

// Module API
export type {
  DebuggerModule,
  DebuggerModuleEntry,
  DebuggerModuleEntryObject,
  ModuleContext,
  ResolvedModule,
} from './modules/types'
export { BUILT_IN_MODULES } from './modules/registry'
export type { BuiltInModuleId } from './modules/registry'
export { resolveModules } from './modules/resolve'
export { deviceInfoModule } from './modules/builtin/deviceInfo'
