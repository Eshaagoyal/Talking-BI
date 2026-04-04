import { useState } from "react"
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts"

const COLOR_PALETTES = {
  indigo:  ["#4f46e5","#6366f1","#818cf8","#a5b4fc","#3730a3","#312e81","#c7d2fe"],
  violet:  ["#7c3aed","#8b5cf6","#a78bfa","#c4b5fd","#6d28d9","#5b21b6","#ddd6fe"],
  emerald: ["#059669","#10b981","#34d399","#6ee7b7","#047857","#065f46","#a7f3d0"],
  amber:   ["#d97706","#f59e0b","#fbbf24","#fcd34d","#b45309","#92400e","#fde68a"],
  rose:    ["#e11d48","#f43f5e","#fb7185","#fda4af","#be123c","#9f1239","#fecdd3"],
  sky:     ["#0284c7","#0ea5e9","#38bdf8","#7dd3fc","#0369a1","#075985","#bae6fd"],
}

const fmt = (val) => {
  if (typeof val !== "number") return val
  if (val >= 1000000) return `$${(val/1000000).toFixed(2)}M`
  if (val >= 1000) return `$${(val/1000).toFixed(1)}K`
  return `$${val.toFixed(2)}`
}

function Chart({ dashboard, colors, height = 280 }) {
  const { chart_type, data } = dashboard
  if (!data?.length) return (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
      No data available
    </div>
  )

  const margin = { top: 8, right: 16, left: 8, bottom: height > 180 ? 50 : 25 }
  const axisTick = { fill: "var(--text-muted)", fontSize: height > 180 ? 11 : 9 }
  const tooltip = {
    contentStyle: {
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 8, boxShadow: "var(--shadow)", fontSize: 12,
      fontFamily: "'DM Sans', sans-serif"
    },
    labelStyle: { color: "var(--text-primary)", fontWeight: 600 }
  }
  const grid = { stroke: "#e8ecf4", strokeDasharray: "3 3" }

  if (chart_type === "bar") return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={margin} barCategoryGap="30%">
        <CartesianGrid {...grid} vertical={false} />
        <XAxis dataKey="name" tick={{ ...axisTick, angle: -30, textAnchor: "end" }} interval={0} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} tickFormatter={fmt} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => [fmt(v), "Value"]} {...tooltip} cursor={{ fill: "rgba(79,70,229,0.05)" }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )

  if (chart_type === "line") return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={margin}>
        <CartesianGrid {...grid} />
        <XAxis dataKey="name" tick={{ ...axisTick, angle: -30, textAnchor: "end" }} interval={0} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} tickFormatter={fmt} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => [fmt(v), "Value"]} {...tooltip} />
        <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2.5}
          dot={{ fill: colors[0], r: height > 180 ? 4 : 2, strokeWidth: 0 }}
          activeDot={{ r: 6 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )

  if (chart_type === "area") return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={margin}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colors[0]} stopOpacity={0.15} />
            <stop offset="95%" stopColor={colors[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...grid} />
        <XAxis dataKey="name" tick={{ ...axisTick, angle: -30, textAnchor: "end" }} interval={0} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} tickFormatter={fmt} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => [fmt(v), "Value"]} {...tooltip} />
        <Area type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2.5}
          fill="url(#areaGrad)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )

  if (chart_type === "pie") return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name"
          cx="50%" cy="45%"
          outerRadius={height > 180 ? 90 : 50}
          innerRadius={height > 180 ? 35 : 15}
          paddingAngle={2}
          label={height > 180 ? ({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%` : false}
          labelLine={height > 180}
          isAnimationActive={false}
        >
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => [fmt(v)]} {...tooltip} />
        {height > 180 && <Legend formatter={(v) => <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{v}</span>} />}
      </PieChart>
    </ResponsiveContainer>
  )

  return null
}

// ── KPI Metric Card ──────────────────────────────────────────────────────────
function KpiCard({ kpi, dashboards, colors }) {
  // Find the best value for this KPI from dashboards
  let bestValue = null
  let topName = ""
  for (const dash of Object.values(dashboards)) {
    const col = dash.y_axis?.toLowerCase() || ""
    if (col.includes(kpi.toLowerCase()) && dash.data?.length > 0) {
      const total = dash.data.reduce((s, d) => s + (d.value || 0), 0)
      bestValue = total
      topName = dash.data[0]?.name || ""
      break
    }
  }

  const color = colors[0]

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", padding: "16px 20px",
      boxShadow: "var(--shadow-sm)", flex: 1, minWidth: 160,
      borderTop: `3px solid ${color}`,
      position: "relative", overflow: "hidden"
    }}>
      <div style={{
        position: "absolute", top: -10, right: -10,
        width: 60, height: 60, borderRadius: "50%",
        background: `${color}10`
      }} />
      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        {kpi}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
        {bestValue !== null ? fmt(bestValue) : "—"}
      </div>
      {topName && (
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Top: <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{topName}</span>
        </div>
      )}
    </div>
  )
}

// ── Main Dashboard View ──────────────────────────────────────────────────────
export default function DashboardView({ result }) {
  const [activeTab, setActiveTab] = useState(0)
  const { dashboards, insights, kpis, sql_used, color_schema, row_count } = result
  const dashList = Object.values(dashboards)
  const active = dashList[activeTab]
  const colors = COLOR_PALETTES[color_schema] || COLOR_PALETTES.indigo
  const primaryColor = colors[0]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── KPI Cards row ── */}
      {kpis?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, fontWeight: 600 }}>
            Key Performance Indicators
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {kpis.map((kpi, i) => (
              <KpiCard key={i} kpi={kpi} dashboards={dashboards} colors={[colors[i % colors.length]]} />
            ))}
            {/* Extra stat cards */}
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", padding: "16px 20px",
              boxShadow: "var(--shadow-sm)", flex: 1, minWidth: 160,
              borderTop: `3px solid ${colors[2] || "#818cf8"}`
            }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Rows analysed</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{row_count?.toLocaleString()}</div>
            </div>
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", padding: "16px 20px",
              boxShadow: "var(--shadow-sm)", flex: 1, minWidth: 160,
              borderTop: `3px solid ${insights.kpi_coverage_percent >= 80 ? "var(--green)" : "var(--amber)"}`
            }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>KPI Coverage</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: insights.kpi_coverage_percent >= 80 ? "var(--green)" : "var(--amber)" }}>
                {insights.kpi_coverage_percent}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SQL Viewer ── */}
      <details style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", overflow: "hidden"
      }}>
        <summary style={{
          padding: "10px 16px", cursor: "pointer",
          fontSize: 12, color: "var(--text-muted)", fontWeight: 500,
          display: "flex", alignItems: "center", gap: 6,
          userSelect: "none", listStyle: "none"
        }}>
          <span style={{ fontSize: 14 }}>🔍</span> View SQL generated by Gemini
        </summary>
        <pre style={{
          padding: "12px 16px", fontSize: 12, lineHeight: 1.7,
          color: "#1e40af", background: "#eff6ff",
          fontFamily: "'DM Mono', monospace", overflowX: "auto",
          borderTop: "1px solid var(--border)"
        }}>{sql_used}</pre>
      </details>

      {/* ── Dashboard tabs ── */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow)",
        overflow: "hidden"
      }}>
        {/* Tab bar */}
        <div style={{
          display: "flex", borderBottom: "1px solid var(--border)",
          background: "var(--surface2)", padding: "0 16px"
        }}>
          {dashList.map((dash, i) => (
            <button key={i} onClick={() => setActiveTab(i)} style={{
              padding: "12px 20px", border: "none", background: "none",
              cursor: "pointer", fontSize: 13, fontWeight: activeTab === i ? 600 : 400,
              color: activeTab === i ? primaryColor : "var(--text-secondary)",
              borderBottom: activeTab === i ? `2px solid ${primaryColor}` : "2px solid transparent",
              transition: "all 0.15s", whiteSpace: "nowrap",
              marginBottom: -1
            }}>
              {dash.title}
            </button>
          ))}
        </div>

        {/* Active chart */}
        {active && (
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  {active.title}
                </h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                  {active.description}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{
                  background: "var(--surface2)", border: "1px solid var(--border)",
                  borderRadius: 20, padding: "3px 10px", fontSize: 11,
                  color: "var(--text-secondary)", fontWeight: 500
                }}>{active.chart_type}</span>
                <span style={{
                  background: "var(--surface2)", border: "1px solid var(--border)",
                  borderRadius: 20, padding: "3px 10px", fontSize: 11,
                  color: "var(--text-secondary)"
                }}>{active.total_points} points</span>
              </div>
            </div>
            <Chart dashboard={active} colors={colors} height={320} />
          </div>
        )}
      </div>

      {/* ── 4 mini dashboard previews ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${dashList.length}, minmax(0, 1fr))`,
        gap: 12
      }}>
        {dashList.map((dash, i) => (
          <div key={i} onClick={() => setActiveTab(i)} style={{
            background: "var(--surface)", border: `1.5px solid ${i === activeTab ? primaryColor : "var(--border)"}`,
            borderRadius: "var(--radius)", padding: "14px 16px",
            cursor: "pointer", boxShadow: i === activeTab ? `0 0 0 3px ${primaryColor}20` : "var(--shadow-sm)",
            transition: "all 0.2s"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", margin: 0, lineHeight: 1.3 }}>
                {dash.title}
              </p>
              <span style={{
                fontSize: 9, background: i === activeTab ? `${primaryColor}15` : "var(--surface2)",
                color: i === activeTab ? primaryColor : "var(--text-muted)",
                padding: "2px 6px", borderRadius: 4, textTransform: "uppercase",
                fontWeight: 600, flexShrink: 0, marginLeft: 4
              }}>{dash.chart_type}</span>
            </div>
            <Chart dashboard={dash} colors={colors} height={130} />
          </div>
        ))}
      </div>

      {/* ── Insight Summary Panel ── */}
      <InsightPanel insights={insights} kpis={kpis} primaryColor={primaryColor} />

    </div>
  )
}

// ── Insight Panel ────────────────────────────────────────────────────────────
function InsightPanel({ insights, kpis, primaryColor }) {
  const coverage = insights.kpi_coverage_percent || 0
  const coverageColor = coverage >= 80 ? "var(--green)" : coverage >= 50 ? "var(--amber)" : "var(--red)"
  const clean = (t) => t?.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1") || ""

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)", overflow: "hidden",
      boxShadow: "var(--shadow)"
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 24px", borderBottom: "1px solid var(--border)",
        background: "var(--surface2)", display: "flex", alignItems: "center", gap: 8
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: primaryColor, display: "inline-block"
        }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
          AI Insight Summary
        </span>
        <span style={{
          marginLeft: "auto", fontSize: 11,
          background: `${primaryColor}15`, color: primaryColor,
          padding: "2px 8px", borderRadius: 20, fontWeight: 500
        }}>
          InsightEval
        </span>
      </div>

      <div style={{ padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>

          {/* KPI Coverage */}
          <div style={{
            background: "var(--surface2)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", padding: "18px 20px"
          }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              KPI Coverage
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: coverageColor }}>{coverage}%</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>covered</span>
            </div>
            <div style={{ background: "var(--border)", borderRadius: 4, height: 5, marginBottom: 12 }}>
              <div style={{
                background: coverageColor, borderRadius: 4, height: 5,
                width: `${coverage}%`, transition: "width 1s"
              }} />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(insights.kpis_covered || []).map(k => (
                <span key={k} style={{
                  background: "var(--green-light)", color: "var(--green)",
                  border: "1px solid #a7f3d0", borderRadius: 20,
                  padding: "2px 8px", fontSize: 11, fontWeight: 500
                }}>✓ {k}</span>
              ))}
              {(insights.kpis_missing || []).map(k => (
                <span key={k} style={{
                  background: "var(--red-light)", color: "var(--red)",
                  border: "1px solid #fca5a5", borderRadius: 20,
                  padding: "2px 8px", fontSize: 11, fontWeight: 500
                }}>✗ {k}</span>
              ))}
            </div>
          </div>

          {/* Top Finding */}
          <div style={{
            background: "var(--surface2)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", padding: "18px 20px"
          }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              Top Finding
            </div>
            <p style={{
              fontSize: 13, color: primaryColor,
              lineHeight: 1.7, fontStyle: "italic", margin: 0
            }}>
              "{clean(insights.top_insight)}"
            </p>
          </div>
        </div>

        {/* Business Insight */}
        <div style={{
          background: "var(--surface2)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", padding: "16px 20px", marginBottom: 16
        }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Business Insight Summary
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, margin: 0 }}>
            {clean(insights.insight_summary)}
          </p>
        </div>

        {/* Recommendations */}
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Recommendations
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(insights.recommendations || []).map((rec, i) => (
              <div key={i} style={{
                display: "flex", gap: 12, alignItems: "flex-start",
                background: "var(--surface2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius)", padding: "12px 16px"
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  background: `${primaryColor}15`, color: primaryColor,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700
                }}>{i + 1}</span>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                  {clean(rec)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}