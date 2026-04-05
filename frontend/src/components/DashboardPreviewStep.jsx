import { useState, useMemo } from "react"
import { themeAccent, themeLabel } from "../themeOptions"
import { ChartBlock } from "./ChartBlock"

const PALETTES = {
  cyan: ["#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#0f766e", "#134e4a", "#99f6e4"],
  indigo: ["#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#3730a3", "#312e81", "#c7d2fe"],
  blue: ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#1d4ed8", "#1e40af", "#bfdbfe"],
  violet: ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#6d28d9", "#5b21b6", "#ddd6fe"],
  emerald: ["#059669", "#10b981", "#34d399", "#6ee7b7", "#047857", "#065f46", "#a7f3d0"],
  rose: ["#e11d48", "#f43f5e", "#fb7185", "#fda4af", "#be123c", "#9f1239", "#fecdd3"],
}

const THEME = {
  cyan: "#0d9488",
  indigo: "#4f46e5",
  blue: "#2563eb",
  violet: "#7c3aed",
  emerald: "#059669",
  rose: "#e11d48",
}

function clean(t) {
  return t?.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1") || ""
}

/**
 * Whiteboard flow: show 3–4 layout previews + insight summary; user picks primary panel then continues.
 */
export default function DashboardPreviewStep({ dashboard, onConfirm, onBack }) {
  const dashList = Object.values(dashboard.dashboards || {})
  const color_schema = dashboard.color_schema || "cyan"
  const themeColor = THEME[color_schema] || THEME.cyan
  const colors = PALETTES[color_schema] || PALETTES.cyan
  const accent = themeAccent(color_schema)
  const [selected, setSelected] = useState(0)

  const coverage = dashboard.insights?.kpi_coverage_percent ?? 0
  const coverageColor = coverage >= 80 ? "#10b981" : coverage >= 50 ? "#f59e0b" : "#ef4444"

  const summary = useMemo(() => clean(dashboard.insights?.insight_summary), [dashboard.insights?.insight_summary])

  return (
    <div style={{ padding: "12px 28px 56px", maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ marginBottom: 28, position: "relative", paddingBottom: 20 }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: 64,
            height: 4,
            borderRadius: 4,
            background: `linear-gradient(90deg, ${accent}, ${accent}55, transparent)`,
          }}
          aria-hidden
        />
        <div
          style={{
            display: "inline-flex",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: accent,
            background: `${accent}12`,
            border: `1px solid ${accent}28`,
            borderRadius: 999,
            padding: "6px 14px",
            marginBottom: 14,
          }}
        >
          Preview · choose a layout
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: "var(--text-1)", margin: "0 0 10px", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
          {dashboard.query}
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.65, margin: 0, maxWidth: 720 }}>
          {summary?.slice(0, 280)}
          {summary?.length > 280 ? "…" : ""}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginTop: 14 }}>
          <span
            style={{
              background: `${coverageColor}18`,
              color: coverageColor,
              border: `1px solid ${coverageColor}40`,
              borderRadius: 999,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            KPI coverage: {coverage}%
          </span>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>
            Theme: {themeLabel(color_schema)} · {dashboard.row_count?.toLocaleString?.() ?? "—"} rows
          </span>
        </div>
      </header>

      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", marginBottom: 16 }}>
        Select which view opens first (you can switch anytime on the full dashboard):
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 18,
          marginBottom: 32,
          padding: 20,
          borderRadius: 18,
          background: "linear-gradient(165deg, rgba(255,255,255,0.95) 0%, var(--surface2) 100%)",
          border: "1px solid rgba(15, 23, 42, 0.06)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {dashList.map((d, i) => {
          const on = selected === i
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              style={{
                textAlign: "left",
                padding: 0,
                border: on ? `2px solid ${themeColor}` : "1px solid var(--border)",
                borderRadius: 16,
                overflow: "hidden",
                cursor: "pointer",
                background: "var(--surface)",
                boxShadow: on ? `0 12px 36px -8px ${themeColor}55` : "var(--shadow)",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", lineHeight: 1.35 }}>{d.title}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: themeColor,
                    background: `${themeColor}14`,
                    padding: "2px 8px",
                    borderRadius: 6,
                    flexShrink: 0,
                  }}
                >
                  {on ? "Selected" : `${i + 1}`}
                </span>
              </div>
              <div style={{ padding: "8px 10px 12px", height: 200, pointerEvents: "none" }}>
                <ChartBlock dashboard={d} colors={colors} height={180} />
              </div>
            </button>
          )
        })}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => onConfirm(selected)}
          style={{
            background: `linear-gradient(180deg, ${accent}, ${accent}dd)`,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "14px 28px",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: `0 10px 28px ${accent}45`,
          }}
        >
          Open full dashboard
        </button>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "14px 24px",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text-2)",
            cursor: "pointer",
          }}
        >
          ← Back to edit
        </button>
      </div>
    </div>
  )
}
