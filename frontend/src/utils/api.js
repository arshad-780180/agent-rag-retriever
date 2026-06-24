const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export async function triggerIncident(payload) {
  const rawLog = payload?.rawLog || payload?.log || ''

  if (!rawLog.trim()) {
    throw new Error('Log text is required to trigger an incident.')
  }

  const response = await fetch(`${API_BASE_URL}/agents/trigger-incident`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rawLog,
      source: payload?.source || 'dashboard',
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || `Trigger failed with HTTP ${response.status}`)
  }

  return data
}
