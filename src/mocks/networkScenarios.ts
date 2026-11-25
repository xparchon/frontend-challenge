const latencyStorageKey = 'kurio.mock.networkLatencyMs'
const searchLatencyStorageKey = 'kurio.mock.networkLatencyBySearchMs'
const orderResponseDelayStorageKey = 'kurio.mock.orderResponseDelayMs'
const networkUnavailableStorageKey = 'kurio.mock.networkOffline'

function configuredSearchLatency(request?: Request) {
  const search = request ? new URL(request.url).searchParams.get('search') : null
  const rawOverrides = localStorage.getItem(searchLatencyStorageKey)
  if (!search || !rawOverrides) return undefined

  try {
    const overrides: unknown = JSON.parse(rawOverrides)
    if (typeof overrides !== 'object' || overrides === null || Array.isArray(overrides)) return undefined
    const latency = (overrides as Record<string, unknown>)[search]
    return typeof latency === 'number' && Number.isFinite(latency) && latency >= 0
      ? Math.min(latency, 10_000)
      : undefined
  } catch {
    return undefined
  }
}

export async function waitForConfiguredNetworkLatency(request?: Request) {
  const latency = configuredSearchLatency(request) ?? Number(localStorage.getItem(latencyStorageKey) ?? '0')
  if (!Number.isFinite(latency) || latency <= 0) return

  await new Promise<void>((resolve) => window.setTimeout(resolve, Math.min(latency, 10_000)))
}

export function isNetworkUnavailable() {
  return localStorage.getItem(networkUnavailableStorageKey) === 'true'
}

export async function waitForConfiguredOrderResponseDelay() {
  const delay = Number(localStorage.getItem(orderResponseDelayStorageKey) ?? '0')
  localStorage.removeItem(orderResponseDelayStorageKey)
  if (!Number.isFinite(delay) || delay <= 0) return

  await new Promise<void>((resolve) => window.setTimeout(resolve, Math.min(delay, 30_000)))
}
