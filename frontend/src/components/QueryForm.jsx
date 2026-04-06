import { useState } from "react"

const EXAMPLES = [
  { query: "Show me sales and profit by category and region", kpis: ["sales", "profit"] },
  { query: "Analyse monthly sales trends over all years", kpis: ["sales", "quantity"] },
  { query: "Which customer segments generate the most revenue and profit?", kpis: ["sales", "profit"] },
  { query: "Show shipping cost and discount impact by market", kpis: ["shipping cost", "discount"] },
]

const COLORS = [
  { name: "indigo", primary: "#4f46e5", light: "#eef2ff" },
  { name: "violet", primary: "#7c3aed", light: "#f5f3ff" },
  { name: "emerald", primary: "#059669", light: "#ecfdf5" },
  { name: "amber", primary: "#d97706", light: "#fffbeb" },
  { name: "rose", primary: "#e11d48", light: "#fff1f2" },
  { name: "sky", primary: "#0284c7", light: "#f0f9ff" },
]

export default function QueryForm({ onSubmit, loading }) {
  const [query, setQuery] = useState("")
  const [kpis, setKpis] = useState([])
  const [kpiInput, setKpiInput] = useState("")
  const [color, setColor] = useState("indigo")
  const [numViz, setNumViz] = useState(4)

  const addKpi = () => {
    const k = kpiInput.trim().toLowerCase()
    if (k && !kpis.includes(k)) {
      setKpis([...kpis, k])
      setKpiInput("")
    }
  }

  const removeKpi = (k) => setKpis(kpis.filter(x => x !== k))

  const handleSubmit = () => {
    if (!query.trim() || kpis.length === 0) return
    const selectedColor = COLORS.find(c => c.name === color)
    onSubmit({
      query,
      kpis,
      num_visualizations: numViz,
      color_schema: color,
      color_primary: selectedColor?.primary,
    })
  }

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)", padding: 24,
      boxShadow: "var(--shadow-sm)", marginBottom: 24
    }}>
      {/* Example queries */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "center", marginRight: 4 }}>
          Try:
        </span>
        {EXAMPLES.map((ex, i) => (
          <button key={i} onClick={() => { setQuery(ex.query); setKpis(ex.kpis) }} style={{
            background: "var(--surface2)", border: "1px solid var(--border)",
            borderRadius: 20, padding: "3px 12px", fontSize: 11,
            color: "var(--text-secondary)", cursor: "pointer",
            transition: "all 0.15s"
          }}>
            {ex.query.substring(0, 38)}...
          </button>
        ))}
      </div>

      {/* Main query input */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSubmit())}
          placeholder="Ask anything about your sales data... e.g. Show me revenue and profit trends by region for 2014"
          rows={2}
          style={{
            width: "100%", background: "var(--surface2)",
            border: "1.5px solid var(--border)", borderRadius: "var(--radius)",
            padding: "12px 16px", color: "var(--text-primary)",
            fontSize: 14, resize: "none", outline: "none",
            fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6,
            transition: "border-color 0.15s"
          }}
          onFocus={e => e.target.style.borderColor = "#4f46e5"}
          onBlur={e => e.target.style.borderColor = "var(--border)"}
        />
      </div>

      {/* Controls row */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>

        {/* KPI input */}
        <div style={{ flex: 3, minWidth: 240 }}>
          <label style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
            KPIs to track (required)
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={kpiInput}
              onChange={e => setKpiInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addKpi()}
              placeholder="e.g. revenue, profit, quantity..."
              style={{
                flex: 1, background: "var(--surface2)",
                border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                padding: "8px 12px", color: "var(--text-primary)",
                fontSize: 13, outline: "none", fontFamily: "inherit"
              }}
            />
            <button onClick={addKpi} style={{
              background: "var(--accent)", border: "none",
              borderRadius: "var(--radius-sm)", padding: "8px 16px",
              color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500
            }}>Add</button>
          </div>
          {/* KPI tags */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, minHeight: 28 }}>
            {kpis.map(k => (
              <span key={k} style={{
                background: "var(--accent-light)", color: "var(--accent)",
                border: "1px solid #c7d2fe", borderRadius: 20,
                padding: "3px 10px", fontSize: 12, fontWeight: 500,
                display: "flex", alignItems: "center", gap: 5
              }}>
                {k}
                <span onClick={() => removeKpi(k)} style={{ cursor: "pointer", opacity: 0.6, fontSize: 14, lineHeight: 1 }}>×</span>
              </span>
            ))}
            {kpis.length === 0 && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "center" }}>
                Add at least one KPI before generating
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 60, background: "var(--border)", flexShrink: 0 }} />

        {/* Color schema */}
        <div>
          <label style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
            Color theme
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            {COLORS.map(c => (
              <div key={c.name} onClick={() => setColor(c.name)} style={{
                width: 24, height: 24, borderRadius: 6, cursor: "pointer",
                background: c.primary,
                border: color === c.name ? `2px solid ${c.primary}` : "2px solid transparent",
                outline: color === c.name ? `2px solid white` : "none",
                outlineOffset: color === c.name ? "1px" : "0",
                boxShadow: color === c.name ? `0 0 0 3px ${c.primary}40` : "none",
                transition: "all 0.15s"
              }} />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 60, background: "var(--border)", flexShrink: 0 }} />

        {/* Num dashboards */}
        <div>
          <label style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
            Dashboards
          </label>
          <div style={{ display: "flex", gap: 4 }}>
            {[2, 3, 4].map(n => (
              <button key={n} onClick={() => setNumViz(n)} style={{
                width: 36, height: 36, borderRadius: "var(--radius-sm)",
                border: numViz === n ? "none" : "1px solid var(--border)",
                background: numViz === n ? "var(--accent)" : "var(--surface2)",
                color: numViz === n ? "#fff" : "var(--text-secondary)",
                cursor: "pointer", fontSize: 14, fontWeight: 600,
                transition: "all 0.15s"
              }}>{n}</button>
            ))}
          </div>
        </div>

        {/* Submit button */}
        <button onClick={handleSubmit} disabled={loading || !query.trim() || kpis.length === 0} style={{
          flex: 1, minWidth: 200, height: 42,
          background: loading || !query.trim() || kpis.length === 0
            ? "var(--border)"
            : "linear-gradient(135deg, #4f46e5, #7c3aed)",
          border: "none", borderRadius: "var(--radius)",
          color: loading || !query.trim() || kpis.length === 0 ? "var(--text-muted)" : "#fff",
          fontSize: 14, fontWeight: 600, cursor: loading || !query.trim() || kpis.length === 0 ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          boxShadow: loading || !query.trim() || kpis.length === 0 ? "none" : "0 4px 14px rgba(79,70,229,0.35)",
          transition: "all 0.2s"
        }}>
          {loading ? "⏳ Generating..." : "✨ Generate Dashboards"}
        </button>
      </div>
    </div>
  )
}