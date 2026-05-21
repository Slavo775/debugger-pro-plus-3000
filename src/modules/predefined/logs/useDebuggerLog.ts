import { useCallback } from 'react'
import { getStore, pushEntry } from './logsStore'

export function useDebuggerLog(id: string): (text: string) => void {
  return useCallback(
    (text: string) => {
      if (!window.__debuggerLogs) {
        console.warn(
          '[debugger-pro-plus-3000] useDebuggerLog: store not ready — is <Debugger> mounted?',
        )
        return
      }
      const store = getStore()
      if (!store.registered.has(id)) {
        console.warn(
          `[debugger-pro-plus-3000] useDebuggerLog: unknown log id "${id}". Register it in config.logs.`,
        )
        return
      }
      if (!store.enabled.has(id)) return
      const prefix = store.registered.get(id)!
      console.log(`[${prefix}] ${text}`)
      pushEntry({ id, prefix, text, timestamp: Date.now() })
    },
    [id],
  )
}
