export type ConsoleLogLevel =
  | 'log'
  | 'info'
  | 'warn'
  | 'error'
  | 'debug'
  | 'table'
  | 'trace'
  | 'assert'

export interface ConsoleLogEntry {
  id: number
  ts: number
  level: ConsoleLogLevel
  args: unknown[]
}

type ConsoleMethod = (...args: unknown[]) => void

interface ConsoleLoggerStore {
  entries: ConsoleLogEntry[]
  maxEntries: number
  _subs: Set<() => void>
  _originals: Partial<Record<ConsoleLogLevel, ConsoleMethod>>
  _nextId: number
  _patched: boolean
}

declare global {
  interface Window {
    __debuggerConsoleLogger?: ConsoleLoggerStore
  }
}

const LEVELS: readonly ConsoleLogLevel[] = [
  'log',
  'info',
  'warn',
  'error',
  'debug',
  'table',
  'trace',
  'assert',
]

const DEFAULT_MAX_ENTRIES = 500

export function getConsoleLoggerStore(): ConsoleLoggerStore {
  if (!window.__debuggerConsoleLogger) {
    window.__debuggerConsoleLogger = {
      entries: [],
      maxEntries: DEFAULT_MAX_ENTRIES,
      _subs: new Set(),
      _originals: {},
      _nextId: 1,
      _patched: false,
    }
  }
  return window.__debuggerConsoleLogger
}

function pushEntry(level: ConsoleLogLevel, args: unknown[]): void {
  const store = getConsoleLoggerStore()
  store.entries.push({
    id: store._nextId++,
    ts: Date.now(),
    level,
    args,
  })
  if (store.entries.length > store.maxEntries) {
    store.entries.splice(0, store.entries.length - store.maxEntries)
  }
  store._subs.forEach((cb) => cb())
}

export function patchConsole(maxEntries: number): void {
  const store = getConsoleLoggerStore()
  store.maxEntries = maxEntries
  if (store._patched) return

  const consoleRef = window.console as unknown as Record<ConsoleLogLevel, ConsoleMethod>

  for (const level of LEVELS) {
    const original = consoleRef[level].bind(window.console) as ConsoleMethod
    store._originals[level] = original
    const wrapper: ConsoleMethod = (...args: unknown[]) => {
      original(...args)
      if (level === 'assert') {
        const condition = args[0]
        if (condition) return
        pushEntry(level, args.slice(1))
        return
      }
      pushEntry(level, args)
    }
    consoleRef[level] = wrapper
  }
  store._patched = true
}

export function restoreConsole(): void {
  const store = getConsoleLoggerStore()
  if (!store._patched) return
  const consoleRef = window.console as unknown as Record<ConsoleLogLevel, ConsoleMethod>
  for (const level of LEVELS) {
    const original = store._originals[level]
    if (original) {
      consoleRef[level] = original
    }
  }
  store._originals = {}
  store._patched = false
}

export function subscribeConsoleLogger(cb: () => void): () => void {
  const store = getConsoleLoggerStore()
  store._subs.add(cb)
  return () => {
    store._subs.delete(cb)
  }
}

export function clearConsoleLogEntries(): void {
  const store = getConsoleLoggerStore()
  store.entries = []
  store._subs.forEach((cb) => cb())
}
