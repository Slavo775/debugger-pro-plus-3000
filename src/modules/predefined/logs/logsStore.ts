import type { LogConfig } from '../../../config/types'

export interface LogEntry {
  id: string
  prefix: string
  text: string
  timestamp: number
}

interface LogsStore {
  registered: Map<string, string>
  enabled: Set<string>
  entries: LogEntry[]
  _subs: Set<() => void>
}

declare global {
  interface Window {
    __debuggerLogs?: LogsStore
  }
}

const MAX_ENTRIES = 500
const SPLICE_BATCH = 50

export function getStore(): LogsStore {
  if (!window.__debuggerLogs) {
    window.__debuggerLogs = {
      registered: new Map(),
      enabled: new Set(),
      entries: [],
      _subs: new Set(),
    }
  }
  return window.__debuggerLogs
}

export function initLogsStore(logs: LogConfig[]): void {
  const store = getStore()
  for (const { id, prefix } of logs) {
    store.registered.set(id, prefix)
    if (!store.enabled.has(id)) store.enabled.add(id)
  }
}

export function pushEntry(entry: LogEntry): void {
  const store = getStore()
  if (store.entries.length >= MAX_ENTRIES) {
    store.entries.splice(0, SPLICE_BATCH)
  }
  store.entries.push(entry)
  store._subs.forEach((cb) => cb())
}

export function setEnabled(id: string, on: boolean): void {
  const store = getStore()
  if (on) store.enabled.add(id)
  else store.enabled.delete(id)
  store._subs.forEach((cb) => cb())
}

export function clearEntries(): void {
  const store = getStore()
  store.entries = []
  store._subs.forEach((cb) => cb())
}
