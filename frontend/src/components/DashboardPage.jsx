import { useState } from "react"
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts"

const PALETTES = {
  cyan:    ["#0d9488","#14b8a6","#2dd4bf","#5eead4","#0f766e","#134e4a","#99f6e4"],
  indigo:  ["#4f46e5","#6366f1","#818cf8","#a5b4fc","#3730a3","#312e81","#c7d2fe"],
  blue:    ["#2563eb","#3b82f6","#60a5fa","#93c5fd","#1d4ed8","#1e40af","#bfdbfe"],
  violet:  ["#7c3aed","#8b5cf6","#a78bfa","#c4b5fd","#6d28d9","#5b21b6","#ddd6fe"],
  emerald: ["#059669","#10b981","#34d399","#6ee7b7","#047857","#065f46","#a7f3d0"],
  rose:    ["#e11d48","#f43f5e","#fb7185","#fda4af","#be123c","#9f1239","#fecdd3"],
}

const THEME_COLORS = {
  cyan: "#0d9488", indigo: "#4f46e5", blue: "#2563eb",
  violet: "#7c3aed", emerald: "#059669", rose: "#e11d48"
}

const fmt = (v) => {
  if (typeof v !== "number") return v
  if (v >= 1000000) return `$${(v/1000000).toFixed(2)}M`
  if (v >= 1000) return `$${(v/1000).toFixed(1)}K`
  return `$${v.toFixed(2)}`
}

function Chart({ dashboard, colors, height = 260 }) {
  const { chart_type, data } = dashboard
  if (!data?.length) return (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: 12 }}>
      No data available
    </div>
  )

  const margin = { top: 8, right: 12, left: 4, bottom: height > 180 ? 50 : 24 }
  const axisTick = { fill: "var(--text-3)", fontSize: height > 180 ? 11 : 9 }
  const grid = { stroke: "#f1f5f9", strokeDasharray: "3 3" }
  const tip = {
    contentStyle: {
      background: "#fff", border: "1px solid var(--border)",
      borderRadius: 8, boxShadow: "var(--shadow)", fontSize: 12
    },
    labelStyle: { color: "var(--text-1)", fontWeight: 600 }
  }

  if (chart_type === "bar") return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={margin} barCategoryGap="32%">
        <CartesianGrid {...grid} vertical={false} />
        <XAxis dataKey="name" tick={{ ...axisTick, angle: -28, textAnchor: "end" }} interval={0} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} tickFormatter={fmt} axisLine={false} tickLine={false} width={56} />
        <Tooltip formatter={(v) => [fmt(v)]} {...tip} cursor={{ fill: `${colors[0]}10` }} />
        <Bar dataKey="value" radius={[5,5,0,0]} isAnimationActive={false}>
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )

  if (chart_type === "line") return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={margin}>
        <CartesianGrid {...grid} />
        <XAxis dataKey="name" tick={{ ...axisTick, angle: -28, textAnchor: "end" }} interval={0} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} tickFormatter={fmt} axisLine={false} tickLine={false} width={56} />
        <Tooltip formatter={(v) => [fmt(v)]} {...tip} />
        <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2.5}
          dot={{ fill: colors[0], r: height > 180 ? 4 : 2, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: colors[0] }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )

  if (chart_type === "area") return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={margin}>
        <defs>
          <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colors[0]} stopOpacity={0.12}/>
            <stop offset="95%" stopColor={colors[0]} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid {...grid} />
        <XAxis dataKey="name" tick={{ ...axisTick, angle: -28, textAnchor: "end" }} interval={0} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} tickFormatter={fmt} axisLine={false} tickLine={false} width={56} />
        <Tooltip formatter={(v) => [fmt(v)]} {...tip} />
        <Area type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2.5}
          fill="url(#ag)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )

  if (chart_type === "pie") return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name"
          cx="50%" cy="45%"
          outerRadius={height > 180 ? 88 : 48}
          innerRadius={height > 180 ? 32 : 14}
          paddingAngle={2}
          label={height > 180 ? ({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%` : false}
          labelLine={height > 180} isAnimationActive={false}
        >
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => [fmt(v)]} {...tip} />
        {height > 180 && <Legend formatter={(v) => <span style={{ fontSize: 11, color: "var(--text-2)" }}>{v}</span>} />}
      </PieChart>
    </ResponsiveContainer>
  )
  return null
}

// Sparkline icon (decorative)
function Spark({ color }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 8,
      background: `${color}15`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 16, flexShrink: 0
    }}>📈</div>
  )
}

export default function DashboardPage({ dashboard, onNew, onEdit }) {
  const [activeTab, setActiveTab] = useState(0)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMsg, setChatMsg] = useState("")
  const [chatHistory, setChatHistory] = useState([])
  const [chatLoading, setChatLoading] = useState(false)

  const { dashboards, insights, kpis, sql_used, color_schema, row_count, query } = dashboard
  const dashList = Object.values(dashboards || {})
  const active = dashList[activeTab]
  const themeColor = THEME_COLORS[color_schema] || THEME_COLORS.cyan
  const colors = PALETTES[color_schema] || PALETTES.cyan
  const clean = (t) => t?.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1") || ""
  const coverage = insights?.kpi_coverage_percent || 0

  const sendChat = async () => {
    if (!chatMsg.trim()) return
    const msg = chatMsg.trim()
    setChatMsg("")
    setChatHistory(h => [...h, { role: "user", text: msg }])
    setChatLoading(true)
    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          dashboard_context: {
            query, kpis,
            insight_summary: insights?.insight_summary,
            dashboards: Object.fromEntries(
              dashList.map(d => [d.title, { data: d.data?.slice(0, 6) }])
            )
          }
        })
      })
      const data = await res.json()
      setChatHistory(h => [...h, { role: "ai", text: data.response || "I couldn't process that." }])
    } catch {
      setChatHistory(h => [...h, { role: "ai", text: "Connection error. Make sure backend is running." }])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", position: "relative" }}>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <button onClick={onNew} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r)", padding: "7px 14px",
          fontSize: 12, fontWeight: 500, color: "var(--text-2)", cursor: "pointer"
        }}>+ New dashboard</button>
        <button onClick={onEdit} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r)", padding: "7px 14px",
          fontSize: 12, fontWeight: 500, color: "var(--text-2)", cursor: "pointer"
        }}>← Edit query & regenerate</button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{
            background: coverage >= 80 ? "#dcfce7" : "#fef9c3",
            color: coverage >= 80 ? "#166534" : "#854d0e",
            border: `1px solid ${coverage >= 80 ? "#86efac" : "#fde047"}`,
            borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600
          }}>
            KPI coverage: {coverage}%
          </span>
          <button style={{
            background: themeColor, border: "none", borderRadius: "var(--r)",
            padding: "7px 14px", color: "#fff", fontSize: 12, fontWeight: 500,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6
          }}>
            📄 Download PDF
          </button>
        </div>
      </div>

      {/* Dashboard title + description */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)", marginBottom: 8 }}>
          {query}
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, maxWidth: 780 }}>
          {clean(insights?.insight_summary?.substring(0, 200))}...
        </p>
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-3)" }}>
          Plan: AI planner · Theme: {color_schema} · {row_count?.toLocaleString()} rows analysed
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12, marginBottom: 24
      }}>
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
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--r)", padding: "16px 18px",
              boxShadow: "var(--shadow-sm)", borderTop: `3px solid ${c}`
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                  {kpi.replace(/_/g, " ")}
                </span>
                <Spark color={c} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-1)", marginBottom: 4 }}>
                {val !== null ? fmt(val) : "—"}
              </div>
              {topName && (
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                  Top: <span style={{ color: "var(--text-2)", fontWeight: 500 }}>{topName}</span>
                </div>
              )}
            </div>
          )
        })}
        {/* Rows card */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r)", padding: "16px 18px",
          boxShadow: "var(--shadow-sm)", borderTop: `3px solid #94a3b8`
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Rows Analysed</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🗄️</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-1)" }}>
            {row_count?.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Tabbed dashboards */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)", boxShadow: "var(--shadow)",
        overflow: "hidden", marginBottom: 20
      }}>
        {/* Tab bar */}
        <div style={{
          display: "flex", borderBottom: "1px solid var(--border)",
          background: "var(--surface2)", padding: "0 20px", overflowX: "auto"
        }}>
          {dashList.map((d, i) => (
            <button key={i} onClick={() => setActiveTab(i)} style={{
              padding: "13px 20px", border: "none", background: "none",
              cursor: "pointer", fontSize: 13, whiteSpace: "nowrap",
              fontWeight: activeTab === i ? 600 : 400,
              color: activeTab === i ? themeColor : "var(--text-2)",
              borderBottom: activeTab === i ? `2.5px solid ${themeColor}` : "2.5px solid transparent",
              transition: "all 0.15s", marginBottom: -1
            }}>
              {d.title}
            </button>
          ))}
        </div>

        {/* Active chart */}
        {active && (
          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: themeColor, display: "inline-block"
                  }} />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
                    {active.title}
                  </h3>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0, paddingLeft: 14 }}>
                  {active.description}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{
                  background: "var(--surface2)", border: "1px solid var(--border)",
                  borderRadius: 6, padding: "3px 8px", fontSize: 10,
                  color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase"
                }}>{active.chart_type}</span>
                <span style={{
                  background: "var(--surface2)", border: "1px solid var(--border)",
                  borderRadius: 6, padding: "3px 8px", fontSize: 10, color: "var(--text-3)"
                }}>{active.total_points} points</span>
              </div>
            </div>
            <Chart dashboard={active} colors={colors} height={300} />
          </div>
        )}
      </div>

      {/* Mini previews */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${dashList.length}, minmax(0, 1fr))`,
        gap: 12, marginBottom: 20
      }}>
        {dashList.map((d, i) => (
          <div key={i} onClick={() => setActiveTab(i)} style={{
            background: "var(--surface)", border: `1.5px solid ${i === activeTab ? themeColor : "var(--border)"}`,
            borderRadius: "var(--r)", padding: "12px 14px", cursor: "pointer",
            boxShadow: i === activeTab ? `0 0 0 3px ${themeColor}18` : "var(--shadow-sm)",
            transition: "all 0.2s"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-1)", margin: 0, lineHeight: 1.3 }}>
                {d.title}
              </p>
              <span style={{
                fontSize: 9, textTransform: "uppercase", fontWeight: 700,
                color: i === activeTab ? themeColor : "var(--text-3)",
                background: i === activeTab ? `${themeColor}12` : "var(--surface2)",
                padding: "1px 5px", borderRadius: 3, flexShrink: 0, marginLeft: 4
              }}>{d.chart_type}</span>
            </div>
            <Chart dashboard={d} colors={colors} height={120} />
          </div>
        ))}
      </div>

      {/* Insight Summary */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)", overflow: "hidden",
        boxShadow: "var(--shadow)", marginBottom: 80
      }}>
        <div style={{
          padding: "12px 20px", borderBottom: "1px solid var(--border)",
          background: "var(--surface2)", display: "flex", alignItems: "center", gap: 8
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: themeColor, display: "inline-block" }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>AI Insight Summary</span>
          <span style={{
            marginLeft: "auto", fontSize: 10, background: `${themeColor}12`,
            color: themeColor, padding: "2px 8px", borderRadius: 20, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.05em"
          }}>InsightEval</span>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {/* Coverage */}
            <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "14px 16px" }}>
              <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 10 }}>KPI Coverage</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: coverage >= 80 ? "var(--green)" : "var(--amber)" }}>{coverage}%</span>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>covered</span>
              </div>
              <div style={{ background: "var(--border)", borderRadius: 3, height: 4, marginBottom: 10 }}>
                <div style={{ background: coverage >= 80 ? "var(--green)" : "var(--amber)", borderRadius: 3, height: 4, width: `${coverage}%` }} />
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {(insights?.kpis_covered || []).map(k => (
                  <span key={k} style={{ background: "#dcfce7", color: "#166534", border: "1px solid #86efac", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 500 }}>✓ {k}</span>
                ))}
                {(insights?.kpis_missing || []).map(k => (
                  <span key={k} style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 500 }}>✗ {k}</span>
                ))}
              </div>
            </div>
            {/* Top finding */}
            <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "14px 16px" }}>
              <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 10 }}>Top Finding</div>
              <p style={{ fontSize: 13, color: themeColor, lineHeight: 1.7, fontStyle: "italic", margin: 0 }}>
                "{clean(insights?.top_insight)}"
              </p>
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "14px 16px", marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 8 }}>Business Insight Summary</div>
            <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.8, margin: 0 }}>{clean(insights?.insight_summary)}</p>
          </div>

          {/* Recommendations */}
          <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 8 }}>Recommendations</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(insights?.recommendations || []).map((r, i) => (
              <div key={i} style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                background: "var(--surface2)", border: "1px solid var(--border)",
                borderRadius: "var(--r)", padding: "10px 14px"
              }}>
                <span style={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                  background: `${themeColor}15`, color: themeColor,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700
                }}>{i+1}</span>
                <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>{clean(r)}</p>
              </div>
            ))}
          </div>

          {/* SQL */}
          <details style={{ marginTop: 12, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden" }}>
            <summary style={{ padding: "10px 14px", cursor: "pointer", fontSize: 12, color: "var(--text-3)", fontWeight: 500, userSelect: "none", listStyle: "none" }}>
              🔍 View SQL generated by Gemini
            </summary>
            <pre style={{ padding: "10px 14px", fontSize: 11, lineHeight: 1.7, color: "#1d4ed8", background: "#eff6ff", fontFamily: "'JetBrains Mono', monospace", overflowX: "auto", borderTop: "1px solid var(--border)" }}>
              {sql_used}
            </pre>
          </details>
        </div>
      </div>

      {/* Floating Ask AI button */}
      <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 200 }}>
        {chatOpen && (
          <div style={{
            position: "absolute", bottom: 56, right: 0,
            width: 340, background: "var(--surface)",
            border: "1px solid var(--border)", borderRadius: "var(--r-lg)",
            boxShadow: "var(--shadow-lg)", overflow: "hidden"
          }}>
            {/* Chat header */}
            <div style={{
              background: themeColor, padding: "12px 16px",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Ask AI</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Ask about this dashboard</div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{
                background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 6,
                width: 24, height: 24, color: "#fff", cursor: "pointer", fontSize: 14
              }}>×</button>
            </div>

            {/* Messages */}
            <div style={{
              height: 240, overflowY: "auto", padding: 12,
              display: "flex", flexDirection: "column", gap: 8
            }}>
              {chatHistory.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--text-3)", fontSize: 12, paddingTop: 60 }}>
                  Ask anything about your dashboard data...
                </div>
              )}
              {chatHistory.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  background: m.role === "user" ? themeColor : "var(--surface2)",
                  color: m.role === "user" ? "#fff" : "var(--text-1)",
                  border: m.role === "ai" ? "1px solid var(--border)" : "none",
                  borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  padding: "8px 12px", fontSize: 12, lineHeight: 1.5,
                  maxWidth: "85%"
                }}>
                  {m.text}
                </div>
              ))}
              {chatLoading && (
                <div style={{
                  alignSelf: "flex-start", background: "var(--surface2)",
                  border: "1px solid var(--border)", borderRadius: "12px 12px 12px 2px",
                  padding: "8px 14px", fontSize: 12, color: "var(--text-3)"
                }}>
                  Thinking...
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{
              padding: "8px 10px", borderTop: "1px solid var(--border)",
              display: "flex", gap: 6
            }}>
              <input
                value={chatMsg}
                onChange={e => setChatMsg(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendChat()}
                placeholder="Ask about this dashboard..."
                style={{
                  flex: 1, background: "var(--surface2)", border: "1px solid var(--border)",
                  borderRadius: "var(--r)", padding: "7px 10px", fontSize: 12,
                  color: "var(--text-1)", outline: "none"
                }}
              />
              <button onClick={sendChat} style={{
                background: themeColor, border: "none", borderRadius: "var(--r)",
                width: 32, height: 32, color: "#fff", cursor: "pointer", fontSize: 14,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>↑</button>
            </div>
          </div>
        )}

        <button onClick={() => setChatOpen(o => !o)} style={{
          background: themeColor, border: "none", borderRadius: "50%",
          width: 48, height: 48, color: "#fff", cursor: "pointer", fontSize: 20,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.2s"
        }}>
          💬
        </button>
      </div>

    </div>
  )
}