const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export async function triggerIncident(payload) {
  const targetFile = payload?.targetFile

  if (!targetFile || typeof targetFile !== 'string') {
    throw new Error('targetFile is required to trigger a push.')
  }

  const response = await fetch(`${API_BASE_URL}/agents/trigger-git-push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      targetFile,
      source: payload?.source || 'dashboard',
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || `Trigger failed with HTTP ${response.status}`)
  }

  return data
}
