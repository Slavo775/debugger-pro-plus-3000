import { patchConsole } from './consoleLoggerStore'

export interface InstallConsoleCaptureOptions {
  maxEntries?: number
}

const DEFAULT_MAX_ENTRIES = 500

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
  patchConsole(opts.maxEntries ?? DEFAULT_MAX_ENTRIES)
}
