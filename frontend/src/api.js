const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const USER_ID = 'guest-device'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!response.ok) throw new Error(`API request failed: ${response.status}`)
  return response.json()
}

export function loadRemoteState() {
  return request(`/state/${USER_ID}`)
}

export function saveRemoteState(state) {
  return request(`/state/${USER_ID}`, { method: 'PUT', body: JSON.stringify(state) })
}

export function sendChatMessage(messages) {
  return request('/chat', { method: 'POST', body: JSON.stringify({ messages }) })
}
