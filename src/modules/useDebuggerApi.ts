import { useContext, useCallback } from 'react'
import { DebuggerModuleRegistryContext, DebuggerModuleIdContext } from './DebuggerModuleRegistryContext'
import type { DebuggerApi, ModuleEventHandler } from './types'

export function useDebuggerApi(): DebuggerApi {
  const registry = useContext(DebuggerModuleRegistryContext)
  const moduleId = useContext(DebuggerModuleIdContext)

  if (!registry || moduleId === null) {
    throw new Error(
      '[debugger-pro-plus-3000] useDebuggerApi() must be called inside a module render function passed to <Debugger modules={[{ id, render }]} />.',
    )
  }

  const emit = useCallback(
    (event: string, payload?: unknown) => {
      registry._emit(moduleId, event, payload)
    },
    [registry, moduleId],
  )

  const subscribe = useCallback(
    (event: string, handler: ModuleEventHandler): (() => void) => {
      return registry._subscribe(moduleId, event, handler)
    },
    [registry, moduleId],
  )

  const moduleData = registry._modules.find((m) => m.id === moduleId)?.data ?? {}

  return { emit, subscribe, moduleData }
}
