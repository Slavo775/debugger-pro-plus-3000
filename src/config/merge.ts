import { DEFAULT_DEBUGGER_CONFIG } from './defaults'
import type { DebuggerConfig, ResolvedDebuggerConfig } from './types'

export function mergeWithDefaults(userConfig: DebuggerConfig): ResolvedDebuggerConfig {
  return {
    style: {
      ...DEFAULT_DEBUGGER_CONFIG.style,
      ...userConfig.style,
    },
    button: {
      ...DEFAULT_DEBUGGER_CONFIG.button,
      ...userConfig.button,
    },
    panel: {
      ...DEFAULT_DEBUGGER_CONFIG.panel,
      ...userConfig.panel,
      style: {
        ...DEFAULT_DEBUGGER_CONFIG.panel.style,
        ...userConfig.panel?.style,
      },
    },
  }
}
