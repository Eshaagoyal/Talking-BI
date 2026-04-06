/**
 * Backend base URL. Set VITE_API_BASE_URL in production (no trailing slash).
 * Example: VITE_API_BASE_URL=https://your-api.railway.app
 */
const raw = "http://16.171.238.112:8000"
export const API_BASE = String(raw).replace(/\/$/, "")

export function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`
  return `${API_BASE}${p}`
}
