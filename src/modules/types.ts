import type React from 'react'

export type ModuleEventHandler = (payload: unknown) => void

export interface DebuggerModuleDefinition {
  id: string
  title?: string
  defaultExpanded?: boolean
  data?: Record<string, unknown>
  render: () => React.ReactNode
}

export interface RegisteredModule {
  id: string
  title: string
  expanded: boolean
  data: Record<string, unknown>
  render: () => React.ReactNode
}

export interface ViewportChangePayload {
  width: number
  height: number
  orientation: string
  devicePixelRatio: number
}

export interface DebuggerApi {
  emit(event: string, payload?: unknown): void
  subscribe(event: string, handler: ModuleEventHandler): () => void
  moduleData: Record<string, unknown>
  updateData(patch: Record<string, unknown>): void
}

export interface DebuggerApiContextValue {
  _modules: RegisteredModule[]
  _toggleExpanded(id: string): void
  _emit(moduleId: string, event: string, payload: unknown): void
  _subscribe(moduleId: string, event: string, handler: ModuleEventHandler): () => void
  _send(moduleId: string, event: string, payload: unknown): void
  _updateData(moduleId: string, patch: Record<string, unknown>): void
  _getDebugSnapshot(): Record<string, Record<string, unknown>>
}
