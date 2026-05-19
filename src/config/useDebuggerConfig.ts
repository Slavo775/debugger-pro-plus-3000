import { useContext } from 'react'
import { DebuggerConfigContext } from './DebuggerConfigContext'
import type { ResolvedDebuggerConfig } from './types'

export function useDebuggerConfig(): ResolvedDebuggerConfig {
  const ctx = useContext(DebuggerConfigContext)
  if (ctx === null) {
    throw new Error(
      '[debugger-pro-plus-3000] useDebuggerConfig() must be used inside a <DebuggerConfigProvider>.',
    )
  }
  return ctx
}
