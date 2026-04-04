import { useState, useEffect } from "react"

const EXAMPLES = [
  { query: "Show me sales and profit by category and region", kpis: ["sales", "profit"] },
  { query: "Analyse monthly sales trends over all years", kpis: ["sales", "quantity"] },
  { query: "Which customer segments generate the most revenue and profit?", kpis: ["revenue", "profit"] },
  { query: "Show shipping cost and discount impact by market", kpis: ["shipping cost", "discount"] },
]

const THEMES = [
  { name: "cyan", label: "Arctic Cyan", color: "#0d9488" },
  { name: "indigo", label: "Deep Indigo", color: "#4f46e5" },
  { name: "blue", label: "Ocean Blue", color: "#2563eb" },
  { name: "violet", label: "Royal Violet", color: "#7c3aed" },
  { name: "emerald", label: "Emerald", color: "#059669" },
  { name: "rose", label: "Rose", color: "#e11d48" },
]

export default function NewDashboardForm({ onGenerate, error }) {
  const [query, setQuery] = useState("")
  const [kpis, setKpis] = useState([])
  const [kpiInput, setKpiInput] = useState("")
  const [numViz, setNumViz] = useState(4)
  const [theme, setTheme] = useState("cyan")
  const [detecting, setDetecting] = useState(false)

  useEffect(() => {
    if (!query.trim() || query.length < 15) return
    const t = setTimeout(() => autoDetect(query), 900)
    return () => clearTimeout(t)
  }, [query])

  const autoDetect = async (q) => {
    setDetecting(true)
    try {
      const res = await fetch("http://127.0.0.1:8000/extract-kpis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q })
      })
      const data = await res.json()
      if (data.kpis?.length > 0) setKpis(data.kpis)
    } catch (e) {}
    finally { setDetecting(false) }
  }

  const addKpi = () => {
    const k = kpiInput.trim().toLowerCase()
    if (k && !kpis.includes(k)) { setKpis([...kpis, k]); setKpiInput("") }
  }

  const handleSubmit = () => {
    if (!query.trim()) return
    onGenerate({ query, kpis: kpis.length > 0 ? kpis : ["sales", "profit"], num_visualizations: numViz, color_schema: theme })
  }

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-1)", marginBottom: 8 }}>
        New dashboard
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 28, lineHeight: 1.6 }}>
        Ask any analytics question. The AI pipeline will fetch data, clean it, and generate smart dashboards automatically.
      </p>

      {/* Dataset indicator */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, display: "block", marginBottom: 8 }}>
          Dataset
        </label>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r)", padding: "10px 14px"
        }}>
          <span style={{ fontSize: 16 }}>🗄️</span>
          <span style={{ fontSize: 13, color: "var(--text-1)", fontWeight: 500 }}>
            Connected database
          </span>
          <span style={{
            marginLeft: "auto", fontSize: 11, background: "#dcfce7",
            color: "#166534", padding: "2px 8px", borderRadius: 20, fontWeight: 600
          }}>● Live</span>
        </div>
      </div>

      {/* Quick examples */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 8 }}>
          Quick examples
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => { setQuery(ex.query); setKpis(ex.kpis) }} style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 20, padding: "4px 12px", fontSize: 11,
              color: "var(--text-2)", cursor: "pointer", transition: "all 0.15s"
            }}>
              {ex.query.substring(0, 42)}...
            </button>
          ))}
        </div>
      </div>

      {/* Query input */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, display: "block", marginBottom: 8 }}>
          Your analytics question
        </label>
        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="e.g. Focus on discount impact and payment methods vs last question."
          rows={3}
          style={{
            width: "100%", background: "var(--surface)",
            border: "1.5px solid var(--border)", borderRadius: "var(--r)",
            padding: "12px 14px", color: "var(--text-1)", fontSize: 13,
            resize: "none", outline: "none", lineHeight: 1.6,
            transition: "border-color 0.15s"
          }}
          onFocus={e => e.target.style.borderColor = "var(--accent)"}
          onBlur={e => e.target.style.borderColor = "var(--border)"}
        />
      </div>

      {/* KPIs */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, display: "block", marginBottom: 8 }}>
          KPIs (Key Performance Indicators)
          {detecting && <span style={{ color: "var(--accent)", marginLeft: 8, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>auto-detecting...</span>}
        </label>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input
            value={kpiInput}
            onChange={e => setKpiInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addKpi()}
            placeholder="Type a KPI and press Enter or Add..."
            style={{
              flex: 1, background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--r)", padding: "9px 12px", color: "var(--text-1)",
              fontSize: 13, outline: "none"
            }}
          />
          <button onClick={addKpi} style={{
            background: "var(--accent)", border: "none", borderRadius: "var(--r)",
            padding: "9px 18px", color: "#fff", fontSize: 13, fontWeight: 500,
            cursor: "pointer"
          }}>Add</button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", minHeight: 28 }}>
          {kpis.map(k => (
            <span key={k} style={{
              background: "var(--accent-light)", color: "var(--accent)",
              border: "1px solid var(--accent-mid)", borderRadius: 20,
              padding: "3px 10px", fontSize: 12, fontWeight: 500,
              display: "flex", alignItems: "center", gap: 5
            }}>
              {k}
              <span onClick={() => setKpis(kpis.filter(x => x !== k))} style={{ cursor: "pointer", opacity: 0.6 }}>×</span>
            </span>
          ))}
          {kpis.length === 0 && (
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>
              Will auto-detect from your query, or defaults to sales + profit
            </span>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>

        {/* Num visualizations */}
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, display: "block", marginBottom: 8 }}>
            Visualizations (total)
          </label>
          <div style={{ display: "flex", gap: 4 }}>
            {[2, 3, 4].map(n => (
              <button key={n} onClick={() => setNumViz(n)} style={{
                flex: 1, padding: "9px 0", borderRadius: "var(--r)",
                border: numViz === n ? "none" : "1px solid var(--border)",
                background: numViz === n ? "var(--accent)" : "var(--surface)",
                color: numViz === n ? "#fff" : "var(--text-2)",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "all 0.15s"
              }}>{n}</button>
            ))}
          </div>
        </div>

        {/* Color theme */}
        <div style={{ flex: 2, minWidth: 200 }}>
          <label style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, display: "block", marginBottom: 8 }}>
            Full-page color theme
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {THEMES.map(t => (
              <button key={t.name} onClick={() => setTheme(t.name)} style={{
                padding: "6px 12px", borderRadius: "var(--r)",
                border: theme === t.name ? `2px solid ${t.color}` : "1px solid var(--border)",
                background: theme === t.name ? `${t.color}10` : "var(--surface)",
                color: theme === t.name ? t.color : "var(--text-2)",
                fontSize: 11, fontWeight: theme === t.name ? 600 : 400,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                transition: "all 0.15s"
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.color, display: "inline-block" }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          marginTop: 16, background: "#fef2f2", border: "1px solid #fca5a5",
          borderRadius: "var(--r)", padding: "10px 14px", color: "var(--red)", fontSize: 12
        }}>⚠️ {error}</div>
      )}

      {/* Submit */}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button style={{
          flex: 1, padding: "0 20px", height: 44,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r)", color: "var(--text-2)", fontSize: 13,
          fontWeight: 500, cursor: "pointer"
        }}>Cancel</button>
        <button onClick={handleSubmit} disabled={!query.trim()} style={{
          flex: 3, height: 44,
          background: query.trim() ? "var(--accent)" : "var(--border)",
          border: "none", borderRadius: "var(--r)",
          color: query.trim() ? "#fff" : "var(--text-3)",
          fontSize: 14, fontWeight: 600, cursor: query.trim() ? "pointer" : "not-allowed",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          boxShadow: query.trim() ? "0 4px 14px rgba(13,148,136,0.3)" : "none",
          transition: "all 0.2s"
        }}>
          ✨ Save & generate {numViz} views
        </button>
      </div>
    </div>
  )
}