import { useState, useRef, useEffect } from "react"
import { THEME_OPTIONS, themeLabel } from "../themeOptions"
import { ChartBlock, fmt } from "./ChartBlock"
import VoiceMicButton from "./VoiceMicButton"
import { downloadDashboardPdf } from "../utils/printDashboard"

const PALETTES = {
  cyan:    ["#0d9488","#14b8a6","#2dd4bf","#5eead4","#0f766e","#134e4a","#99f6e4"],
  indigo:  ["#4f46e5","#6366f1","#818cf8","#a5b4fc","#3730a3","#312e81","#c7d2fe"],
  blue:    ["#2563eb","#3b82f6","#60a5fa","#93c5fd","#1d4ed8","#1e40af","#bfdbfe"],
  violet:  ["#7c3aed","#8b5cf6","#a78bfa","#c4b5fd","#6d28d9","#5b21b6","#ddd6fe"],
  emerald: ["#059669","#10b981","#34d399","#6ee7b7","#047857","#065f46","#a7f3d0"],
  rose:    ["#e11d48","#f43f5e","#fb7185","#fda4af","#be123c","#9f1239","#fecdd3"],
}

const THEME = {
  cyan: "#0d9488", indigo: "#4f46e5", blue: "#2563eb",
  violet: "#7c3aed", emerald: "#059669", rose: "#e11d48"
}

const pct = (v, total) => total > 0 ? `${((v/total)*100).toFixed(1)}%` : "—"

// Data table below each chart
function DataTable({ data, colors, themeColor }) {
  if (!data?.length) return null
  const total = data.reduce((s, r) => s + (r.value || 0), 0)
  return (
    <table style={{ width:"100%", borderCollapse:"collapse", marginTop:12 }}>
      <thead>
        <tr style={{ background:`${themeColor}12` }}>
          <th style={{ padding:"6px 10px", textAlign:"left", fontSize:10, fontWeight:700, color:themeColor, textTransform:"uppercase", letterSpacing:"0.06em" }}>Name</th>
          <th style={{ padding:"6px 10px", textAlign:"right", fontSize:10, fontWeight:700, color:themeColor, textTransform:"uppercase", letterSpacing:"0.06em" }}>Value</th>
          <th style={{ padding:"6px 10px", textAlign:"right", fontSize:10, fontWeight:700, color:themeColor, textTransform:"uppercase", letterSpacing:"0.06em" }}>Share</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} style={{ borderTop:"1px solid #f1f5f9" }}>
            <td style={{ padding:"6px 10px", fontSize:12, color:"#0f172a", display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:colors[i % colors.length], display:"inline-block", flexShrink:0 }} />
              {row.name}
            </td>
            <td style={{ padding:"6px 10px", fontSize:12, textAlign:"right", fontWeight:600, color:"#0f172a" }}>{fmt(row.value)}</td>
            <td style={{ padding:"6px 10px", fontSize:12, textAlign:"right", color:"#64748b" }}>{pct(row.value, total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Single dashboard card (for 2x2 grid)
function DashboardCard({ dashboard, index, colors, themeColor, emphasized }) {
  return (
    <div style={{
      background:"#fff",
      border: emphasized ? `2px solid ${themeColor}` : "1px solid #e2e8f0",
      borderRadius:16, overflow:"hidden",
      boxShadow: emphasized
        ? `0 12px 40px -12px ${themeColor}40, 0 4px 16px rgba(15,23,42,0.08)`
        : "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
      transition: "border-color 0.2s, box-shadow 0.2s",
    }}>
      {/* Card header */}
      <div style={{
        padding:"14px 16px 10px",
        borderBottom:"1px solid #f1f5f9",
        display:"flex", justifyContent:"space-between", alignItems:"flex-start"
      }}>
        <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
          <div style={{
            width:26, height:26, borderRadius:8,
            background:`${themeColor}15`, color:themeColor,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:12, fontWeight:700, flexShrink:0
          }}>{index}</div>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:"#0f172a", margin:0, lineHeight:1.3 }}>
              {dashboard.title}
            </p>
            <p style={{ fontSize:11, color:"#94a3b8", margin:"3px 0 0", lineHeight:1.4 }}>
              {dashboard.description}
            </p>
          </div>
        </div>
        <span style={{
          fontSize:9, textTransform:"uppercase", fontWeight:700,
          background:`${themeColor}12`, color:themeColor,
          padding:"3px 7px", borderRadius:4, flexShrink:0, marginLeft:8
        }}>{dashboard.chart_type}</span>
      </div>

      {/* Chart */}
      <div style={{ padding:"12px 16px 0" }}>
        <ChartBlock dashboard={dashboard} colors={colors} height={220} />
      </div>

      {/* Data table */}
      <div style={{ padding:"0 16px 14px" }}>
        <DataTable data={dashboard.data} colors={colors} themeColor={themeColor} />
      </div>
    </div>
  )
}

const dashSelectStyle = {
  minWidth: 160,
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13,
  color: "#0f172a",
  fontFamily: "inherit",
  cursor: "pointer",
  outline: "none",
}

export default function DashboardPage({ dashboard, onNew, onEdit, onRegenerate }) {
  const printRef = useRef(null)
  const cardRefs = useRef([])
  const { dashboards, insights, kpis, sql_used, color_schema, row_count, query } = dashboard
  const [editQuery, setEditQuery] = useState(query || "")
  const [editTheme, setEditTheme] = useState(color_schema || "cyan")
  const [activeViz, setActiveViz] = useState(0)
  const [pdfBusy, setPdfBusy] = useState(false)

  useEffect(() => {
    setEditQuery(query || "")
    setEditTheme(color_schema || "cyan")
    setActiveViz(typeof dashboard.preferredTab === "number" ? dashboard.preferredTab : 0)
    cardRefs.current = []
  }, [dashboard?.id, query, color_schema, dashboard.preferredTab])
  const dashList = Object.values(dashboards || {})
  const themeColor = THEME[color_schema] || THEME.cyan
  const colors = PALETTES[color_schema] || PALETTES.cyan
  const clean = (t) => t?.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1") || ""
  const coverage = insights?.kpi_coverage_percent || 0
  const coverageColor = coverage >= 80 ? "#10b981" : coverage >= 50 ? "#f59e0b" : "#ef4444"

  const handleDownloadPDF = async () => {
    if (pdfBusy) return
    setPdfBusy(true)
    try {
      await downloadDashboardPdf({
        elementId: "pdf-clean-dashboards",
        fileName: query || "dashboard",
      })
    } catch (e) {
      console.error(e)
    } finally {
      setPdfBusy(false)
    }
  }

  const runRegenerate = () => {
    if (!editQuery.trim() || !onRegenerate) return
    const n = dashboard.num_dashboards || 4
    onRegenerate({
      query: editQuery.trim(),
      kpis: kpis || [],
      num_visualizations: Math.min(4, Math.max(2, n)),
      color_schema: editTheme,
      preferred_chart_types: dashboard.preferred_chart_types || [],
    })
  }

  return (
    <div style={{ padding:"8px 28px 32px", minHeight:"100vh", position:"relative" }}>

      {/* Editor chrome — excluded from report PDF & browser print */}
      <div className="no-print" style={{ marginBottom: 24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", marginBottom: 16 }}>
          <button type="button" onClick={onNew} style={{
            display:"inline-flex", alignItems:"center", gap:8,
            background:"var(--surface)", border:"1px solid var(--border)",
            borderRadius:12, padding:"10px 18px", fontSize:13,
            fontWeight:600, color:"var(--text-2)", cursor:"pointer",
            boxShadow:"var(--shadow)"
          }}>+ New dashboard</button>
          <button type="button" onClick={onEdit} style={{
            display:"inline-flex", alignItems:"center", gap:8,
            background:"var(--surface2)", border:"1px solid var(--border)",
            borderRadius:12, padding:"10px 18px", fontSize:13,
            fontWeight:600, color:"var(--text-2)", cursor:"pointer"
          }}>← Edit query & regenerate</button>
        </div>
        <div style={{
          background:"var(--surface)",
          border:"1px solid rgba(15,23,42,0.06)",
          borderRadius:18,
          padding:20,
          boxShadow:"0 1px 2px rgba(15,23,42,0.04), 0 20px 48px -16px rgba(15,23,42,0.08)"
        }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:16, alignItems:"flex-end" }}>
            <div style={{ flex:"1 1 260px", minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <label style={{ fontSize:12, fontWeight:700, color:"var(--text-3)", display:"block", margin:0 }}>Query</label>
                <VoiceMicButton accent={themeColor} onTranscript={(t) => setEditQuery((q) => (q ? `${q.trim()} ${t}` : t))} />
              </div>
              <textarea
                value={editQuery}
                onChange={e => setEditQuery(e.target.value)}
                rows={2}
                style={{
                  width:"100%", resize:"vertical", minHeight:56, maxHeight:120,
                  background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:12,
                  padding:"12px 14px", fontSize:14, color:"var(--text-1)", fontFamily:"inherit", outline:"none", boxSizing:"border-box"
                }}
              />
            </div>
            <div style={{ flex:"0 1 220px" }}>
              <label style={{ fontSize:12, fontWeight:700, color:"var(--text-3)", display:"block", marginBottom:8 }}>Full-page color theme</label>
              <select value={editTheme} onChange={e => setEditTheme(e.target.value)} style={{ ...dashSelectStyle, width:"100%", borderRadius:12, padding:"12px 14px" }}>
                {THEME_OPTIONS.map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={runRegenerate} disabled={!editQuery.trim()}
              style={{
                background: !editQuery.trim() ? "var(--surface2)" : `linear-gradient(180deg, ${themeColor}, ${themeColor}dd)`,
                border:"none", borderRadius:12, padding:"12px 22px", color: !editQuery.trim() ? "var(--text-3)" : "#fff",
                fontSize:14, fontWeight:700, cursor: !editQuery.trim() ? "not-allowed" : "pointer", height:46, whiteSpace:"nowrap",
                boxShadow: !editQuery.trim() ? "none" : `0 8px 20px ${themeColor}40`
              }}
            >Regenerate</button>
          </div>
        </div>
      </div>

      {/* Report PDF: title, KPIs, charts, narrative insights (no sidebar / SQL / editor) */}
      <div id="pdf-clean-dashboards" ref={printRef}>
        <div style={{ marginBottom:24 }}>
          <div style={{ display:"flex", flexWrap:"wrap", alignItems:"flex-start", justifyContent:"space-between", gap:16, marginBottom:12 }}>
            <h1 style={{ fontSize:26, fontWeight:800, color:"var(--text-1)", margin:0, letterSpacing:"-0.02em", lineHeight:1.2, flex:"1 1 min(100%, 420px)", textTransform:"none" }}>
              {query}
            </h1>
            <div className="no-print" style={{ display:"flex", flexWrap:"wrap", gap:10, alignItems:"center", flexShrink:0 }}>
              <span style={{
                background: coverage >= 80 ? "#dcfce7" : "#fef9c3",
                color: coverage >= 80 ? "#166534" : "#854d0e",
                border:`1px solid ${coverage >= 80 ? "#86efac" : "#fde047"}`,
                borderRadius:999, padding:"8px 16px", fontSize:12, fontWeight:700
              }}>KPI coverage: {coverage}%</span>
              <button type="button" onClick={handleDownloadPDF} disabled={pdfBusy}
                title="Save dashboard + insights as a PDF file (one page)"
                style={{
                background: pdfBusy ? "#94a3b8" : `linear-gradient(180deg, ${themeColor}, ${themeColor}dd)`,
                border:"none", borderRadius:12,
                padding:"10px 18px", color:"#fff", fontSize:13,
                fontWeight:600, cursor: pdfBusy ? "wait" : "pointer", display:"flex",
                alignItems:"center", gap:8,
                boxShadow: pdfBusy ? "none" : `0 8px 20px ${themeColor}44`,
                opacity: pdfBusy ? 0.85 : 1,
              }}>
                <span aria-hidden>{pdfBusy ? "⏳" : "📄"}</span> {pdfBusy ? "Preparing…" : "Download PDF"}
              </button>
            </div>
          </div>
          <p className="print-only" style={{ fontSize:12, color:"#64748b", margin:"0 0 8px", fontWeight:600 }}>
            KPI coverage {coverage}% · {themeLabel(color_schema)} · {row_count?.toLocaleString()} rows
          </p>
          <p className="no-print" style={{ fontSize:14, color:"var(--text-2)", lineHeight:1.75, maxWidth:820, margin:0 }}>
            {clean(insights?.insight_summary?.substring(0, 220))}
            {insights?.insight_summary && insights.insight_summary.length > 220 ? "…" : ""}
          </p>
          <div style={{ fontSize:12, color:"var(--text-3)", marginTop:10 }}>
            Plan: AI planner · Theme: {themeLabel(color_schema)} · {row_count?.toLocaleString()} rows analysed
          </div>
        </div>

        {/* KPI metric cards */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",
          gap:10, marginBottom:24
        }}>
          {/* KPI cards from detected KPIs */}
          {kpis?.map((kpi, i) => {
            let val = null, topName = ""
            for (const d of dashList) {
              const col = (d.y_axis || "").toLowerCase()
              if (col.includes(kpi.toLowerCase()) && d.data?.length > 0) {
                val = d.data.reduce((s, r) => s + (r.value || 0), 0)
                topName = d.data[0]?.name || ""
                break
              }
            }
            const c = colors[i % colors.length]
            return (
              <div key={i} style={{
                background:"var(--surface)", border:"1px solid var(--border)",
                borderRadius:14, padding:"16px 18px",
                boxShadow:"var(--shadow)",
                borderTop:`3px solid ${c}`
              }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontSize:10, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:600 }}>
                    {kpi.replace(/_/g," ")}
                  </span>
                  <span style={{ fontSize:16, background:`${c}15`, width:28, height:28, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" }}>📈</span>
                </div>
                <div style={{ fontSize:22, fontWeight:800, color:"#0f172a", marginBottom:3 }}>
                  {val !== null ? fmt(val) : "—"}
                </div>
                {topName && (
                  <div style={{ fontSize:11, color:"#94a3b8" }}>
                    Top: <span style={{ color:"#475569", fontWeight:500 }}>{topName}</span>
                  </div>
                )}
              </div>
            )
          })}
          {/* Rows card */}
          <div style={{
            background:"var(--surface)", border:"1px solid var(--border)",
            borderRadius:14, padding:"16px 18px",
            boxShadow:"var(--shadow)",
            borderTop:"3px solid #94a3b8"
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:10, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:600 }}>Rows Analysed</span>
              <span style={{ fontSize:16, background:"#f1f5f9", width:28, height:28, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" }}>🗄️</span>
            </div>
            <div style={{ fontSize:22, fontWeight:800, color:"#0f172a" }}>
              {row_count?.toLocaleString()}
            </div>
          </div>
        </div>

        {/* View tabs — hidden in clean PDF */}
        {dashList.length > 0 && (
          <div
            className="no-print"
            style={{
              display:"flex",
              flexWrap:"wrap",
              gap:10,
              marginBottom:18,
            }}
          >
            {dashList.map((d, i) => {
              const on = activeViz === i
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setActiveViz(i)
                    cardRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "nearest" })
                  }}
                  style={{
                    flex:"1 1 160px",
                    textAlign:"left",
                    background: on ? themeColor : "var(--surface2)",
                    color: on ? "#fff" : "var(--text-2)",
                    border: on ? "none" : "1px solid var(--border)",
                    borderRadius:14,
                    padding:"12px 16px",
                    fontSize:13,
                    fontWeight: on ? 700 : 600,
                    cursor:"pointer",
                    lineHeight:1.35,
                    boxShadow: on ? `0 8px 24px ${themeColor}44` : "none",
                    transition: "background 0.18s, color 0.18s, box-shadow 0.18s",
                  }}
                >
                  {d.title}
                </button>
              )
            })}
          </div>
        )}

        {/* Dashboard panels */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"1fr 1fr",
          gap:18, marginBottom:28
        }}>
          {dashList.map((d, i) => (
            <div
              key={i}
              ref={(el) => { cardRefs.current[i] = el }}
            >
              <DashboardCard
                dashboard={d}
                index={i + 1}
                colors={colors}
                themeColor={themeColor}
                emphasized={activeViz === i}
              />
            </div>
          ))}
        </div>

        {/* Full insights — included in PDF report */}
        <div
          className="pdf-report-insights"
          style={{
            display:"grid", gridTemplateColumns:"1fr 1fr",
            gap:16, marginBottom:20
          }}
        >
          {/* Business Insight Summary */}
          <div style={{
            background:"#fff", border:"1px solid #e2e8f0",
            borderRadius:12, padding:"18px 20px"
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12 }}>
              <span style={{ fontSize:16 }}>📋</span>
              <span style={{ fontSize:12, fontWeight:700, color:"#0f172a", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                Business Insight Summary
              </span>
            </div>
            <p style={{ fontSize:13, color:"#475569", lineHeight:1.8, marginBottom:16 }}>
              {clean(insights?.insight_summary)}
            </p>
            {insights?.top_insight && (
              <blockquote style={{
                borderLeft:`3px solid ${themeColor}`,
                paddingLeft:12, margin:0,
                fontStyle:"italic", fontSize:13,
                color:themeColor, lineHeight:1.6
              }}>
                "{clean(insights.top_insight)}"
              </blockquote>
            )}
          </div>

          {/* KPI Coverage + Recommendations */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {/* Coverage card */}
            <div style={{
              background:"#fff", border:"1px solid #e2e8f0",
              borderRadius:12, padding:"16px 20px"
            }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>
                KPI Coverage
              </div>
              <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:8 }}>
                <span style={{ fontSize:32, fontWeight:800, color:coverageColor }}>{coverage}%</span>
                <span style={{ fontSize:12, color:"#94a3b8" }}>covered</span>
              </div>
              <div style={{ background:"#f1f5f9", borderRadius:3, height:4, marginBottom:10 }}>
                <div style={{ background:coverageColor, borderRadius:3, height:4, width:`${coverage}%` }} />
              </div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {(insights?.kpis_covered || []).map(k => (
                  <span key={k} style={{ background:"#dcfce7", color:"#166534", border:"1px solid #86efac", borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:500 }}>✓ {k}</span>
                ))}
                {(insights?.kpis_missing || []).map(k => (
                  <span key={k} style={{ background:"#fef2f2", color:"#991b1b", border:"1px solid #fca5a5", borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:500 }}>✗ {k}</span>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div style={{
              background:"#fff", border:"1px solid #e2e8f0",
              borderRadius:12, padding:"16px 20px", flex:1
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
                <span style={{ fontSize:14 }}>💡</span>
                <span style={{ fontSize:12, fontWeight:700, color:"#0f172a", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  Recommendations
                </span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {(insights?.recommendations || []).map((r, i) => (
                  <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                    <span style={{
                      width:18, height:18, borderRadius:"50%", flexShrink:0,
                      background:`${themeColor}15`, color:themeColor,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:10, fontWeight:700
                    }}>{i+1}</span>
                    <p style={{ fontSize:12, color:"#475569", lineHeight:1.6, margin:0 }}>{clean(r)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>{/* end pdf-clean-dashboards */}

        {/* SQL — screen only */}
        <details className="no-print" style={{
          background:"#fff", border:"1px solid #e2e8f0",
          borderRadius:10, overflow:"hidden", marginBottom:80
        }}>
          <summary style={{
            padding:"10px 16px", cursor:"pointer",
            fontSize:12, color:"#94a3b8", fontWeight:500,
            display:"flex", alignItems:"center", gap:6,
            userSelect:"none", listStyle:"none"
          }}>
            🔍 View SQL generated by Gemini
          </summary>
          <pre style={{
            padding:"12px 16px", fontSize:11, lineHeight:1.8,
            color:"#1d4ed8", background:"#eff6ff",
            fontFamily:"'JetBrains Mono', monospace", overflowX:"auto",
            borderTop:"1px solid #e2e8f0"
          }}>{sql_used}</pre>
        </details>

    </div>
  )
}