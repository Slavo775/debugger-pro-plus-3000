import { useMemo, useRef, useState, useCallback, type ReactNode } from 'react'
import { DebuggerModuleRegistryContext } from './DebuggerModuleRegistryContext'
import type {
  DebuggerModuleDefinition,
  DebuggerApiContextValue,
  ModuleEventHandler,
  RegisteredModule,
} from './types'
import type { DebuggerModuleConfig } from '../config/types'

interface Props {
  moduleDefinitions: DebuggerModuleDefinition[]
  moduleConfigs: DebuggerModuleConfig[]
  onModuleEvent?: (moduleId: string, event: string, payload: unknown) => void
  children: ReactNode
}

export function DebuggerModuleRegistryProvider({
  moduleDefinitions,
  moduleConfigs,
  onModuleEvent,
  children,
}: Props) {
  const configMap = useMemo(() => {
    const m = new Map<string, DebuggerModuleConfig>()
    for (const c of moduleConfigs) m.set(c.id, c)
    return m
  }, [moduleConfigs])

  const resolvedModules = useMemo<Omit<RegisteredModule, 'expanded'>[]>(() => {
    return moduleDefinitions.map((def) => {
      const cfg = configMap.get(def.id)
      const title = cfg?.title ?? def.title ?? def.id
      const data: Record<string, unknown> = { ...def.data, ...cfg?.data }
      return { id: def.id, title, data, render: def.render }
    })
  }, [moduleDefinitions, configMap])

  const defaultExpandedMap = useMemo(() => {
    const m = new Map<string, boolean>()
    for (const def of moduleDefinitions) {
      const cfg = configMap.get(def.id)
      const val = cfg?.defaultExpanded ?? def.defaultExpanded ?? true
      m.set(def.id, val)
    }
    return m
  }, [moduleDefinitions, configMap])

  const [expandedState, setExpandedState] = useState<Map<string, boolean>>(() => {
    return new Map(defaultExpandedMap)
  })

  const prevDefaultsRef = useRef(defaultExpandedMap)
  if (prevDefaultsRef.current !== defaultExpandedMap) {
    prevDefaultsRef.current = defaultExpandedMap
    setExpandedState((prev) => {
      const next = new Map(prev)
      for (const [id, val] of defaultExpandedMap) {
        if (!next.has(id)) next.set(id, val)
      }
      return next
    })
  }

  const modules: RegisteredModule[] = useMemo(() => {
    return resolvedModules.map((m) => ({
      ...m,
      expanded: expandedState.get(m.id) ?? true,
    }))
  }, [resolvedModules, expandedState])

  const _toggleExpanded = useCallback((id: string) => {
    setExpandedState((prev) => {
      const next = new Map(prev)
      next.set(id, !(next.get(id) ?? true))
      return next
    })
  }, [])

  const listenersRef = useRef(new Map<string, Map<string, Set<ModuleEventHandler>>>())

  const _subscribe = useCallback(
    (moduleId: string, event: string, handler: ModuleEventHandler): (() => void) => {
      const listeners = listenersRef.current
      if (!listeners.has(moduleId)) listeners.set(moduleId, new Map())
      const byEvent = listeners.get(moduleId)!
      if (!byEvent.has(event)) byEvent.set(event, new Set())
      byEvent.get(event)!.add(handler)
      return () => {
        byEvent.get(event)?.delete(handler)
      }
    },
    [],
  )

  const _send = useCallback((moduleId: string, event: string, payload: unknown) => {
    const byEvent = listenersRef.current.get(moduleId)
    if (!byEvent) return
    byEvent.get(event)?.forEach((h) => h(payload))
  }, [])

  const onModuleEventRef = useRef(onModuleEvent)
  onModuleEventRef.current = onModuleEvent

  const _emit = useCallback((moduleId: string, event: string, payload: unknown) => {
    onModuleEventRef.current?.(moduleId, event, payload)
  }, [])

  const ctx: DebuggerApiContextValue = useMemo(
    () => ({ _modules: modules, _toggleExpanded, _emit, _subscribe, _send }),
    [modules, _toggleExpanded, _emit, _subscribe, _send],
  )

  return (
    <DebuggerModuleRegistryContext.Provider value={ctx}>
      {children}
    </DebuggerModuleRegistryContext.Provider>
  )
}
