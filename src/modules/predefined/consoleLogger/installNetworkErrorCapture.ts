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
 * Idempotent — safe to call multiple times.
 */
export function installNetworkErrorCapture(): void {
  if (window.__debuggerNetworkErrorCapture?.installed) return

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
