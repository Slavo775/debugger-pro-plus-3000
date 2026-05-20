import type { DebuggerModule } from './types'
import { deviceInfoModule } from './builtin/deviceInfo'

export const BUILT_IN_MODULES: Record<string, DebuggerModule<unknown>> = {
  'device-info': deviceInfoModule as DebuggerModule<unknown>,
}

export type BuiltInModuleId = keyof typeof BUILT_IN_MODULES
