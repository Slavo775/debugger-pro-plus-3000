import { getConsoleLoggerStore } from './consoleLoggerStore'

declare global {
  interface Window {
    __debuggerNetworkErrorCapture?: { installed: boolean; original: typeof fetch }
  }
}

function getRequestInfo(args: Parameters<typeof fetch>): { url: string; method: string } {
  const input = args[0]
  const init = args[1]
  if (typeof input === 'string') return { url: input, method: init?.method ?? 'GET' }
  if (input instanceof URL) return { url: input.toString(), method: init?.method ?? 'GET' }
  return { url: input.url, method: input.method }
}

/**
 * Wrap `window.fetch` so failed requests (both network rejections and
 * non-2xx responses) are surfaced via `console.error`. When paired with
 * `installConsoleCapture`, these failures flow through the patched console
 * and land in the consoleLogger panel.
 *
 * Browser-emitted network log lines (the red `GET ... net::ERR_*` entries
 * DevTools writes itself) cannot be intercepted from JavaScript — this
 * wrapper produces equivalent entries via `console.error` so they ARE
 * visible inside the debugger panel.
 *
 * Idempotent — safe to call multiple times. If `installConsoleCapture`
 * has not yet been called, emits a one-time warning so the operator knows
 * fetch failures will show in DevTools but not in the panel.
 */
export function installNetworkErrorCapture(): void {
  if (window.__debuggerNetworkErrorCapture?.installed) return

  if (!getConsoleLoggerStore()._patched) {
    // Use the native warn directly: if the patched console were installed,
    // this would route through us, defeating the purpose of the warning.
    window.console.warn(
      '[debugger-pro-plus-3000] installNetworkErrorCapture() called before installConsoleCapture() — fetch failures will appear in DevTools but not in the consoleLogger panel.',
    )
  }

  const original = window.fetch.bind(window)
  window.__debuggerNetworkErrorCapture = { installed: true, original }

  window.fetch = async (...args: Parameters<typeof fetch>) => {
    try {
      const response = await original(...args)
      if (!response.ok) {
        const { url, method } = getRequestInfo(args)
        console.error(`[fetch] ${method} ${url} → ${response.status} ${response.statusText}`)
      }
      return response
    } catch (err) {
      const { url, method } = getRequestInfo(args)
      console.error(`[fetch] ${method} ${url} failed:`, err)
      throw err
    }
  }
}

/**
 * Restore the original `window.fetch`, undoing `installNetworkErrorCapture`.
 * Idempotent — no-op if capture was never installed (or already uninstalled).
 */
export function uninstallNetworkErrorCapture(): void {
  const cap = window.__debuggerNetworkErrorCapture
  if (!cap?.installed) return
  window.fetch = cap.original
  cap.installed = false
}
