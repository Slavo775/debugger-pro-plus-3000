import type { ApiEndpointConfig } from '../../../config/types'

export type ApiStatusState = 'loading' | 'success' | 'error'

export interface ApiStatus {
  url: string
  label: string
  method: string
  status: ApiStatusState
  httpStatus: number | null
  data: unknown
  error: string | null
  timestamp: number | null
}

interface NetworkStore {
  apis: ApiStatus[]
  _subs: Set<() => void>
}

declare global {
  interface Window {
    __debuggerNetwork?: NetworkStore
  }
}

function getStore(): NetworkStore {
  if (!window.__debuggerNetwork) {
    window.__debuggerNetwork = {
      apis: [],
      _subs: new Set(),
    }
  }
  return window.__debuggerNetwork
}

function notify(): void {
  const store = getStore()
  store._subs.forEach((cb) => cb())
}

async function _fetchOne(index: number, endpoint: ApiEndpointConfig): Promise<void> {
  const store = getStore()
  const method = endpoint.method ?? 'GET'

  const init: RequestInit = { method }
  if (endpoint.body !== undefined) {
    init.body = JSON.stringify(endpoint.body)
    init.headers = { 'Content-Type': 'application/json' }
  }

  try {
    const response = await fetch(endpoint.url, init)
    let body: unknown
    try {
      body = await response.json()
    } catch {
      body = await response.text()
    }

    if (response.ok) {
      store.apis[index] = {
        ...store.apis[index],
        status: 'success',
        httpStatus: response.status,
        data: body,
        error: null,
        timestamp: Date.now(),
      }
    } else {
      store.apis[index] = {
        ...store.apis[index],
        status: 'error',
        httpStatus: response.status,
        data: null,
        error: response.statusText || String(response.status),
        timestamp: Date.now(),
      }
    }
  } catch (err) {
    store.apis[index] = {
      ...store.apis[index],
      status: 'error',
      httpStatus: null,
      data: null,
      error: err instanceof Error ? err.message : String(err),
      timestamp: Date.now(),
    }
  }

  notify()
}

function _fetchAll(endpoints: ApiEndpointConfig[]): void {
  endpoints.forEach((endpoint, index) => {
    void _fetchOne(index, endpoint)
  })
}

export function initNetworkStore(endpoints: ApiEndpointConfig[]): void {
  const store = getStore()
  store.apis = endpoints.map((ep) => ({
    url: ep.url,
    label: ep.label ?? ep.url,
    method: ep.method ?? 'GET',
    status: 'loading',
    httpStatus: null,
    data: null,
    error: null,
    timestamp: null,
  }))
  notify()
  _fetchAll(endpoints)
}

export function subscribeNetwork(cb: () => void): () => void {
  const store = getStore()
  store._subs.add(cb)
  return () => { store._subs.delete(cb) }
}

export function getNetworkApis(): ApiStatus[] {
  return getStore().apis
}
