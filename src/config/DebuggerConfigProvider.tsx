import { useMemo, type ReactNode } from 'react'
import { DebuggerConfigContext } from './DebuggerConfigContext'
import { mergeWithDefaults } from './merge'
import type { DebuggerConfig } from './types'

export interface DebuggerConfigProviderProps {
  config?: DebuggerConfig
  children: ReactNode
}

export function DebuggerConfigProvider({ config, children }: DebuggerConfigProviderProps) {
  const resolved = useMemo(() => mergeWithDefaults(config ?? {}), [config])
  return (
    <DebuggerConfigContext.Provider value={resolved}>{children}</DebuggerConfigContext.Provider>
  )
}
