const API_BASE = '/api'

function getSessionId() {
  let id = localStorage.getItem('session-id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('session-id', id)
  }
  return id
}

async function request(url, options = {}) {
  const headers = { ...options.headers, 'X-Session-Id': getSessionId() }
  const response = await fetch(`${API_BASE}${url}`, { ...options, headers })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.detail || response.statusText)
  }
  return response.json()
}

export const api = {
  uploadSource: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return request('/source', { method: 'POST', body: formData })
  },

  getSources: () => request('/source'),

  getSource: (sourceId) => request(`/source/${sourceId}`),

  annotateSource: (sourceId, start, end, key, value) =>
    request(`/source/${sourceId}/annotation`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start, end, annotation: { key, value } }),
    }),

  getAnnotationKeys: () => request('/annotation/keys'),

  getKeyValues: (key) => request(`/annotation/keys/${key}`),

  createKeyValue: (key, name) =>
    request(`/annotation/keys/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),

  getLogs: () => request('/logs'),
}
