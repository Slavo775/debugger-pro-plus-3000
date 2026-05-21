import type { LogConfig } from '../../../config/types'

export interface LogEntry {
  id: string
  prefix: string
  text: string
  timestamp: number
}

interface PersistedLogs {
  persistLog: boolean
  logOutput: LogEntry[]
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

function _loadFromStorage(): PersistedLogs | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.persistLog !== 'boolean' ||
      !Array.isArray(parsed.logOutput)
    ) return null
    const logOutput = (parsed.logOutput as unknown[]).filter(
      (e): e is LogEntry =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as LogEntry).id === 'string' &&
        typeof (e as LogEntry).prefix === 'string' &&
        typeof (e as LogEntry).text === 'string' &&
        typeof (e as LogEntry).timestamp === 'number',
    )
    return { persistLog: parsed.persistLog, logOutput }
  } catch {
    return null
  }
}

function _saveToStorage(persistLog: boolean, entries: LogEntry[]): void {
  try {
    const payload: PersistedLogs = { persistLog, logOutput: entries.slice(-LS_MAX) }
    localStorage.setItem(LS_KEY, JSON.stringify(payload))
  } catch {
    // silent: private mode, quota exceeded, etc.
  }
}

export function initLogsStore(logs: LogConfig[], persistLogs: boolean): void {
  const store = getStore()
  for (const { id, prefix } of logs) {
    store.registered.set(id, prefix)
    if (!store.enabled.has(id)) store.enabled.add(id)
  }

  const stored = _loadFromStorage()
  // stored UI choice wins over config default
  const effective = stored !== null ? stored.persistLog : persistLogs

  if (!effective) {
    store.persistLogs = false
    if (stored !== null) localStorage.removeItem(LS_KEY)
    return
  }

  store.persistLogs = true
  if (stored && stored.logOutput.length > 0) {
    const existing = new Set(store.entries.map((e) => `${e.timestamp}:${e.id}`))
    const fresh = stored.logOutput.filter((e) => !existing.has(`${e.timestamp}:${e.id}`))
    store.entries = [...fresh, ...store.entries].slice(-MAX_ENTRIES)
  }
}

export function pushEntry(entry: LogEntry): void {
  const store = getStore()
  if (store.entries.length >= MAX_ENTRIES) {
    store.entries.splice(0, SPLICE_BATCH)
  }
  store.entries.push(entry)
  store._subs.forEach((cb) => cb())
  if (store.persistLogs) _saveToStorage(store.persistLogs, store.entries)
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
  if (store.persistLogs) _saveToStorage(store.persistLogs, [])
}

export function setPersistLogs(on: boolean): void {
  const store = getStore()
  store.persistLogs = on
  _saveToStorage(on, store.entries)
  store._subs.forEach((cb) => cb())
}
