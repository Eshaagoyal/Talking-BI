/**
 * Backend base URL. Set VITE_API_BASE_URL in production (no trailing slash).
 * Example: VITE_API_BASE_URL=https://your-api.railway.app
 */
const raw = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"

export const API_BASE = String(raw).replace(/\/$/, "")

export function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`
  return `${API_BASE}${p}`
}
