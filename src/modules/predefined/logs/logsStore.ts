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
  persistLogs: boolean
  _subs: Set<() => void>
}

declare global {
  interface Window {
    __debuggerLogs?: LogsStore
  }
}

const MAX_ENTRIES = 500
const SPLICE_BATCH = 50
const LS_KEY = '__debugger_logs__'
const LS_MAX = 50

export function getStore(): LogsStore {
  if (!window.__debuggerLogs) {
    window.__debuggerLogs = {
      registered: new Map(),
      enabled: new Set(),
      entries: [],
      persistLogs: false,
      _subs: new Set(),
    }
  }
  return window.__debuggerLogs
}

function _loadFromStorage(): LogEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is LogEntry =>
        typeof e === 'object' &&
        e !== null &&
        typeof e.id === 'string' &&
        typeof e.prefix === 'string' &&
        typeof e.text === 'string' &&
        typeof e.timestamp === 'number',
    )
  } catch {
    return []
  }
}

function _saveToStorage(entries: LogEntry[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(-LS_MAX)))
  } catch {
    // silent: private mode, quota exceeded, etc.
  }
}

export function initLogsStore(logs: LogConfig[], persistLogs: boolean): void {
  const store = getStore()
  store.persistLogs = persistLogs
  for (const { id, prefix } of logs) {
    store.registered.set(id, prefix)
    if (!store.enabled.has(id)) store.enabled.add(id)
  }
  if (persistLogs) {
    const saved = _loadFromStorage()
    if (saved.length > 0) {
      const existing = new Set(store.entries.map((e) => `${e.timestamp}:${e.id}`))
      const fresh = saved.filter((e) => !existing.has(`${e.timestamp}:${e.id}`))
      store.entries = [...fresh, ...store.entries].slice(-MAX_ENTRIES)
    }
  }
}

export function pushEntry(entry: LogEntry): void {
  const store = getStore()
  if (store.entries.length >= MAX_ENTRIES) {
    store.entries.splice(0, SPLICE_BATCH)
  }
  store.entries.push(entry)
  store._subs.forEach((cb) => cb())
  if (store.persistLogs) _saveToStorage(store.entries)
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
  if (store.persistLogs) localStorage.removeItem(LS_KEY)
}

export function setPersistLogs(on: boolean): void {
  const store = getStore()
  store.persistLogs = on
  if (on) {
    _saveToStorage(store.entries)
  } else {
    localStorage.removeItem(LS_KEY)
  }
  store._subs.forEach((cb) => cb())
}
