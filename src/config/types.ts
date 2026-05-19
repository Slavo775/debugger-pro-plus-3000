export type ButtonCorner = 'rightTop' | 'leftTop' | 'rightBottom' | 'leftBottom'

export interface DebuggerStyleConfig {
  primaryColor?: string
}

export interface DebuggerButtonConfig {
  draggable?: boolean
  position?: ButtonCorner
  size?: number
}

export interface DebuggerPanelStyleConfig {
  width?: number
}

export interface DebuggerPanelConfig {
  title?: string
  style?: DebuggerPanelStyleConfig
}

export interface DebuggerConfig {
  style?: DebuggerStyleConfig
  button?: DebuggerButtonConfig
  panel?: DebuggerPanelConfig
}

export type ResolvedDebuggerConfig = Required<{
  style: Required<DebuggerStyleConfig>
  button: Required<DebuggerButtonConfig>
  panel: Required<{
    title: string
    style: Required<DebuggerPanelStyleConfig>
  }>
}>
