import { DEFAULT_DEBUGGER_CONFIG } from './defaults'
import type { ButtonCorner, DebuggerConfig, ResolvedDebuggerConfig } from './types'
import { mergeWithDefaults } from './merge'

const ALLOWED_CORNERS: readonly ButtonCorner[] = [
  'rightTop',
  'leftTop',
  'rightBottom',
  'leftBottom',
]

declare const process: { cwd?: () => string } | undefined

const CONFIG_FILENAME = 'config.debugger.js'
const ERROR_PREFIX = '[debugger-pro-plus-3000]'

export interface LoadDebuggerConfigOptions {
  /**
   * Directory to resolve `config.debugger.js` from.
   * Defaults to `process.cwd()` when available, otherwise `.`.
   */
  cwd?: string
}

/**
 * Load `config.debugger.js` from the consumer project root.
 *
 * Designed for build-time / Node contexts (Vite/webpack config, SSR, tests).
 * For pure-browser bundles, import the config directly and pass it to
 * `<Debugger config={...} />` or `<DebuggerConfigProvider>`.
 *
 * Behavior:
 *  - Missing file → returns defaults (no throw).
 *  - Malformed shape → throws with a clearly-prefixed message.
 *  - Supports both ESM `export default` and CJS `module.exports`.
 */
export async function loadDebuggerConfig(
  options: LoadDebuggerConfigOptions = {},
): Promise<ResolvedDebuggerConfig> {
  const cwd = options.cwd ?? getCwd()
  const filePath = joinPath(cwd, CONFIG_FILENAME)
  const fileUrl = toFileUrl(filePath)

  let imported: unknown
  try {
    imported = await import(/* @vite-ignore */ fileUrl)
  } catch (err) {
    if (isModuleNotFoundError(err)) {
      return mergeWithDefaults({})
    }
    throw err
  }

  const userConfig = unwrapDefault(imported)
  assertValidConfig(userConfig, filePath)
  return mergeWithDefaults(userConfig)
}

function getCwd(): string {
  if (typeof process !== 'undefined' && typeof process?.cwd === 'function') {
    return process.cwd()
  }
  return '.'
}

function joinPath(cwd: string, file: string): string {
  if (cwd.endsWith('/') || cwd.endsWith('\\')) {
    return cwd + file
  }
  return cwd + '/' + file
}

function toFileUrl(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, '/')
  const encoded = normalized
    .split('/')
    .map((segment) => (/^[A-Za-z]:$/.test(segment) ? segment : encodeURIComponent(segment)))
    .join('/')
  return encoded.startsWith('/') ? `file://${encoded}` : `file:///${encoded}`
}

function unwrapDefault(mod: unknown): unknown {
  if (mod && typeof mod === 'object' && 'default' in mod) {
    const def = (mod as { default: unknown }).default
    if (def !== undefined) return def
  }
  return mod
}

function isModuleNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const code = (err as { code?: string }).code
  return code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND' || code === 'ENOENT'
}

function assertValidConfig(value: unknown, filePath: string): asserts value is DebuggerConfig {
  if (value === null || value === undefined) {
    throw new Error(
      `${ERROR_PREFIX} ${filePath} must export an object; got ${value === null ? 'null' : 'undefined'}.`,
    )
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${ERROR_PREFIX} ${filePath} must export a plain object.`)
  }
  const config = value as Record<string, unknown>
  if (config.style !== undefined) {
    if (typeof config.style !== 'object' || config.style === null || Array.isArray(config.style)) {
      throw new Error(`${ERROR_PREFIX} \`style\` in ${filePath} must be a plain object.`)
    }
    const style = config.style as Record<string, unknown>
    if (style.primaryColor !== undefined && typeof style.primaryColor !== 'string') {
      throw new Error(`${ERROR_PREFIX} \`style.primaryColor\` in ${filePath} must be a string.`)
    }
  }
  if (config.button !== undefined) {
    if (
      typeof config.button !== 'object' ||
      config.button === null ||
      Array.isArray(config.button)
    ) {
      throw new Error(`${ERROR_PREFIX} \`button\` in ${filePath} must be a plain object.`)
    }
    const button = config.button as Record<string, unknown>
    if (button.draggable !== undefined && typeof button.draggable !== 'boolean') {
      throw new Error(`${ERROR_PREFIX} \`button.draggable\` in ${filePath} must be a boolean.`)
    }
    if (
      button.position !== undefined &&
      !ALLOWED_CORNERS.includes(button.position as ButtonCorner)
    ) {
      throw new Error(
        `${ERROR_PREFIX} \`button.position\` in ${filePath} must be one of: ${ALLOWED_CORNERS.join(', ')}.`,
      )
    }
  }
}

export { DEFAULT_DEBUGGER_CONFIG }
