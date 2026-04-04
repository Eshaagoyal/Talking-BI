import { useState, useEffect } from "react"

const STEPS = [
  { icon: "🔍", label: "SQLAgent", desc: "Exploring database schema autonomously..." },
  { icon: "⚡", label: "Gemini", desc: "Writing optimal SQL query..." },
  { icon: "🧹", label: "DeepPrep", desc: "Cleaning and structuring data..." },
  { icon: "📊", label: "Doc2Chart", desc: "Planning dashboard layouts..." },
  { icon: "🧠", label: "InsightEval", desc: "Evaluating KPI coverage..." },
  { icon: "✅", label: "Done", desc: "Generating insight summary..." },
]

export default function LoadingScreen() {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % STEPS.length), 2200)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--r-lg)", padding: "52px 32px",
      boxShadow: "var(--shadow)", textAlign: "center", maxWidth: 500, margin: "0 auto"
    }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>{STEPS[step].icon}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
        {STEPS[step].label}
      </div>
      <div style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 28 }}>
        {STEPS[step].desc}
      </div>
      <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 24 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{
            height: 3, borderRadius: 2, width: i === step ? 24 : 8,
            background: i === step ? "var(--accent)" : "var(--border)",
            transition: "all 0.3s"
          }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap" }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 11,
            background: i < step ? "#dcfce7" : i === step ? "var(--accent-light)" : "var(--surface2)",
            color: i < step ? "#166534" : i === step ? "var(--accent)" : "var(--text-3)",
            border: `1px solid ${i < step ? "#86efac" : i === step ? "var(--accent-mid)" : "var(--border)"}`,
            fontWeight: i === step ? 600 : 400, transition: "all 0.3s"
          }}>
            {i < step ? "✓ " : ""}{s.label}
          </div>
        ))}
      </div>
    </div>
  )
}