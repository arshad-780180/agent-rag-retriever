const MOCK_TRIGGER_EVENT = 'incident:mock-trigger'

export async function triggerMockIncident(payload) {
  const detail = {
    log: payload?.log || payload?.rawLog || '',
    source: payload?.source || 'dashboard',
  }

  if (!detail.log.trim()) {
    throw new Error('Log text is required to trigger an incident.')
  }

  window.dispatchEvent(new CustomEvent(MOCK_TRIGGER_EVENT, { detail }))
  return { queued: true }
}

export function subscribeToMockIncidents(handler) {
  const listener = (event) => handler(event.detail)
  window.addEventListener(MOCK_TRIGGER_EVENT, listener)
  return () => window.removeEventListener(MOCK_TRIGGER_EVENT, listener)
}
