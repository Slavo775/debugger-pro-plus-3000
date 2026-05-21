import { DEFAULT_DEBUGGER_CONFIG } from './defaults'
import type { DebuggerConfig, DebuggerModuleConfig, ResolvedDebuggerConfig } from './types'

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
    modules: mergeModules(DEFAULT_DEBUGGER_CONFIG.modules, userConfig.modules ?? []),
    logs: userConfig.logs ?? DEFAULT_DEBUGGER_CONFIG.logs,
    persistLogs: userConfig.persistLogs ?? DEFAULT_DEBUGGER_CONFIG.persistLogs,
    network: {
      ...DEFAULT_DEBUGGER_CONFIG.network,
      ...userConfig.network,
    },
  }
}

function mergeModules(
  base: DebuggerModuleConfig[],
  overrides: DebuggerModuleConfig[],
): DebuggerModuleConfig[] {
  const map = new Map<string, DebuggerModuleConfig>()
  for (const m of base) map.set(m.id, m)
  for (const m of overrides) map.set(m.id, { ...map.get(m.id), ...m })
  return Array.from(map.values())
}
