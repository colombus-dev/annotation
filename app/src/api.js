const API_BASE = `${import.meta.env.BASE_URL}api`

function getToken() {
  return localStorage.getItem('jwt_token')
}

export function setToken(token) {
  localStorage.setItem('jwt_token', token)
}

export function clearToken() {
  localStorage.removeItem('jwt_token')
}

export function isAuthenticated() {
  return !!getToken()
}

async function request(url, options = {}) {
  const token = getToken()
  const headers = { ...options.headers }
  if (token) {
    headers['x-jwt-token'] = token
  }
  const response = await fetch(`${API_BASE}${url}`, { ...options, headers })
  if (response.status === 401) {
    clearToken()
    window.location.reload()
    throw new Error('Session expired')
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.detail || response.statusText)
  }
  return response.json()
}

export const api = {
  getAuthConfig: () => request('/auth/config'),

  authGoogle: (credential) =>
    request('/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    }),

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
