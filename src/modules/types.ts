import type { ReactNode } from 'react'

export interface ModuleContext<TSettings> {
  settings: TSettings
  title: string
}

export interface DebuggerModule<TSettings = unknown> {
  /** Stable unique identifier. Built-ins use slug-IDs (e.g. 'device-info'). */
  id: string
  /** Human-readable label shown in the tab bar when the user hasn't overridden it. */
  defaultTitle: string
  /** Optional defaults for module-specific settings. */
  defaultSettings?: TSettings
  /**
   * Renders the module's content. Receives the resolved settings + title.
   * Method syntax (not arrow property) so heterogeneous modules can live
   * together in a single registry without per-entry casts.
   */
  render(ctx: ModuleContext<TSettings>): ReactNode
}

export interface DebuggerModuleEntryObject {
  id: string
  title?: string
  settings?: Record<string, unknown>
}

export type DebuggerModuleEntry = string | DebuggerModuleEntryObject

export interface ResolvedModule {
  id: string
  title: string
  render: () => ReactNode
  /** Stable per-instance key. Defaults to `id` in v1 (one instance per module). */
  instanceKey: string
}
