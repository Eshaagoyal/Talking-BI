/** Shared theme keys for full-page color schema (matches backend / charts). */
export const THEME_OPTIONS = [
  { key: "cyan", label: "Arctic Cyan", color: "#0d9488" },
  { key: "indigo", label: "Deep Indigo", color: "#4f46e5" },
  { key: "blue", label: "Ocean Blue", color: "#2563eb" },
  { key: "violet", label: "Royal Violet", color: "#7c3aed" },
  { key: "emerald", label: "Forest Emerald", color: "#059669" },
  { key: "rose", label: "Crimson Rose", color: "#e11d48" },
]

export function themeAccent(key) {
  return THEME_OPTIONS.find((t) => t.key === key)?.color ?? "#0B4F6C"
}

export function themeLabel(key) {
  return THEME_OPTIONS.find((t) => t.key === key)?.label ?? "Arctic Cyan"
}
