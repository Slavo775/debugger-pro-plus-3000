export type ButtonCorner = 'rightTop' | 'leftTop' | 'rightBottom' | 'leftBottom'

export interface DebuggerStyleConfig {
  primaryColor?: string
}

export interface DebuggerButtonConfig {
  draggable?: boolean
  position?: ButtonCorner
}

export interface DebuggerConfig {
  style?: DebuggerStyleConfig
  button?: DebuggerButtonConfig
}

export type ResolvedDebuggerConfig = Required<{
  style: Required<DebuggerStyleConfig>
  button: Required<DebuggerButtonConfig>
}>
