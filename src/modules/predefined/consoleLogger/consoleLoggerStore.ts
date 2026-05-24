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
  _callCount: number
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
      _callCount: 0,
    }
  }
  return window.__debuggerConsoleLogger
}

export interface SerializedError {
  __error: true
  name: string
  message: string
  stack?: string
}

const MAX_SERIALIZE_DEPTH = 6

function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value) as object | null
  return proto === Object.prototype || proto === null
}

function serializeValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value
  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean') return value
  if (t === 'bigint') return `${String(value)}n`
  if (t === 'symbol') return String(value)
  if (t === 'function') {
    const fn = value as { name?: string }
    return `[Function: ${fn.name || 'anonymous'}]`
  }
  if (value instanceof Error) {
    return {
      __error: true,
      name: value.name,
      message: value.message,
      stack: value.stack,
    } satisfies SerializedError
  }
  if (typeof value === 'object') {
    const obj = value as object
    if (seen.has(obj)) return '[Circular]'
    if (depth >= MAX_SERIALIZE_DEPTH) return '[MaxDepth]'
    seen.add(obj)
    if (Array.isArray(value)) {
      return value.map((item) => serializeValue(item, depth + 1, seen))
    }
    if (isPlainObject(obj)) {
      const out: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        out[key] = serializeValue(val, depth + 1, seen)
      }
      return out
    }
    // Non-plain object (Date, RegExp, Map, Set, custom class, etc.) — stringify
    return String(value)
  }
  return value
}

function serializeArg(arg: unknown): unknown {
  return serializeValue(arg, 0, new WeakSet())
}

function pushEntry(level: ConsoleLogLevel, args: unknown[]): void {
  const store = getConsoleLoggerStore()
  store._callCount++
  store.entries.push({
    id: store._nextId++,
    ts: Date.now(),
    level,
    args: args.map(serializeArg),
  })
  if (store.entries.length > store.maxEntries) {
    store.entries.splice(0, store.entries.length - store.maxEntries)
  }
  store._subs.forEach((cb) => cb())
}

function assignConsoleMethod(level: ConsoleLogLevel, fn: ConsoleMethod): void {
  // Prefer defineProperty so a non-writable descriptor (rare, but possible with
  // sandboxes or other monkey-patches) doesn't silently swallow the assignment.
  try {
    Object.defineProperty(window.console, level, {
      configurable: true,
      writable: true,
      value: fn,
    })
  } catch {
    ;(window.console as unknown as Record<ConsoleLogLevel, ConsoleMethod>)[level] = fn
  }
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
    assignConsoleMethod(level, wrapper)
  }
  store._patched = true
}

export function restoreConsole(): void {
  const store = getConsoleLoggerStore()
  if (!store._patched) return
  for (const level of LEVELS) {
    const original = store._originals[level]
    if (original) {
      assignConsoleMethod(level, original)
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
