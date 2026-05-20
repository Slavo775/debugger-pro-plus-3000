export type {
  DebuggerModule,
  DebuggerModuleEntry,
  DebuggerModuleEntryObject,
  ModuleContext,
  ResolvedModule,
} from './types'
export { BUILT_IN_MODULES } from './registry'
export type { BuiltInModuleId } from './registry'
export { resolveModules } from './resolve'
export { deviceInfoModule } from './builtin/deviceInfo'
