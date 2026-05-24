import { patchConsole } from './consoleLoggerStore'
import { DEFAULT_DEBUGGER_CONFIG } from '../../../config/defaults'

export interface InstallConsoleCaptureOptions {
  maxEntries?: number
}

/**
 * Eagerly install the `window.console` patch so messages fired before React
 * mounts (Vite client, framework boot logs, early app logs) are captured by
 * the consoleLogger panel.
 *
 * Call this from the top of your app's entry file BEFORE `createRoot`. Without
 * this call, the panel only shows messages fired after the panel mounts.
 *
 * Idempotent — safe to call multiple times.
 */
export function installConsoleCapture(opts: InstallConsoleCaptureOptions = {}): void {
  patchConsole(opts.maxEntries ?? DEFAULT_DEBUGGER_CONFIG.consoleLogger.maxEntries)
}
