import { createContext } from 'react'
import type { DebuggerApiContextValue } from './types'

export const DebuggerModuleRegistryContext = createContext<DebuggerApiContextValue | null>(null)

export const DebuggerModuleIdContext = createContext<string | null>(null)
