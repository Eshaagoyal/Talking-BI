export default function InsightPanel({ insights, kpis }) {
  const coverage = insights.kpi_coverage_percent || 0
  const coverageColor = coverage >= 80 ? "#10b981" : coverage >= 50 ? "#f59e0b" : "#ef4444"

  // Strip **bold** markdown from Gemini output
  const cleanText = (text) => text?.replace(/\*\*(.*?)\*\*/g, "$1") || ""

  return (
    <div style={{
      background: "#1a1d27", border: "1px solid #2d3148",
      borderRadius: 16, padding: 28
    }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0", marginBottom: 20 }}>
        🧠 AI Insight Summary
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

        {/* KPI Coverage */}
        <div style={{ background: "#252837", borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            KPI Coverage
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 40, fontWeight: 700, color: coverageColor }}>{coverage}%</span>
            <span style={{ fontSize: 13, color: "#6b7280" }}>of requested KPIs covered</span>
          </div>
          <div style={{ background: "#1a1d27", borderRadius: 4, height: 6, marginBottom: 12 }}>
            <div style={{
              background: coverageColor, borderRadius: 4, height: 6,
              width: `${coverage}%`, transition: "width 1s ease"
            }} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(insights.kpis_covered || []).map(k => (
              <span key={k} style={{
                background: "#064e3b", color: "#6ee7b7",
                borderRadius: 6, padding: "3px 10px", fontSize: 12
              }}>✓ {k}</span>
            ))}
            {(insights.kpis_missing || []).map(k => (
              <span key={k} style={{
                background: "#450a0a", color: "#fca5a5",
                borderRadius: 6, padding: "3px 10px", fontSize: 12
              }}>✗ {k}</span>
            ))}
          </div>
        </div>

        {/* Top Finding */}
        <div style={{ background: "#252837", borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Top Finding
          </p>
          <p style={{ fontSize: 14, color: "#a5b4fc", lineHeight: 1.6, fontStyle: "italic" }}>
            "{cleanText(insights.top_insight)}"
          </p>
        </div>
      </div>

      {/* Business Insight Summary */}
      <div style={{ background: "#252837", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Business Insight Summary
        </p>
        <p style={{ fontSize: 14, color: "#d1d5db", lineHeight: 1.8, margin: 0 }}>
          {cleanText(insights.insight_summary)}
        </p>
      </div>

      {/* Recommendations */}
      <div>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Recommendations
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(insights.recommendations || []).map((rec, i) => (
            <div key={i} style={{
              display: "flex", gap: 12, alignItems: "flex-start",
              background: "#252837", borderRadius: 10, padding: "12px 16px"
            }}>
              <span style={{
                background: "#312e81", color: "#a5b4fc",
                borderRadius: "50%", width: 24, height: 24,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, flexShrink: 0
              }}>{i + 1}</span>
              <p style={{ fontSize: 13, color: "#d1d5db", lineHeight: 1.6, margin: 0 }}>
                {cleanText(rec)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
