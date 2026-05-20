import type { DebuggerModule } from './types'
import { deviceInfoModule } from './builtin/deviceInfo'

/**
 * Registry of modules that ship in the package. Hosts opt into these
 * declaratively via `config.modules`.
 *
 * `as const satisfies` preserves the literal key union (so
 * `BuiltInModuleId` is `'device-info' | ...` rather than `string`)
 * while validating that each entry conforms to `DebuggerModule`.
 * `Object.freeze` prevents host code from monkey-patching the
 * registry at runtime.
 */
export const BUILT_IN_MODULES = Object.freeze({
  'device-info': deviceInfoModule,
} as const satisfies Record<string, DebuggerModule>)

export type BuiltInModuleId = keyof typeof BUILT_IN_MODULES
