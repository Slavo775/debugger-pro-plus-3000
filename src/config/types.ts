export interface DebuggerStyleConfig {
  primaryColor?: string
}

export interface DebuggerConfig {
  style?: DebuggerStyleConfig
}

export type ResolvedDebuggerConfig = Required<{
  style: Required<DebuggerStyleConfig>
}>
