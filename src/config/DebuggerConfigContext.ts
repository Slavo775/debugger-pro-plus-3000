import { createContext } from 'react'
import type { ResolvedDebuggerConfig } from './types'

export const DebuggerConfigContext = createContext<ResolvedDebuggerConfig | null>(null)
