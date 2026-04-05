import { useState, useRef, useEffect } from "react"
import { THEME_OPTIONS, themeAccent } from "../themeOptions"
import VoiceMicButton from "./VoiceMicButton"

const CHART_PRESET_GROUPS = ["Recommended", "Single chart", "Combinations"]

const CHART_PRESETS = [
  { value: "auto", label: "Automatic (recommended)", types: [], group: "Recommended" },
  { value: "bar", label: "Bar — comparisons", types: ["bar"], group: "Single chart" },
  { value: "line", label: "Line — trends", types: ["line"], group: "Single chart" },
  { value: "area", label: "Area — filled trends", types: ["area"], group: "Single chart" },
  { value: "pie", label: "Pie — proportions", types: ["pie"], group: "Single chart" },
  { value: "bar_line", label: "Bar & line mix", types: ["bar", "line"], group: "Combinations" },
  { value: "mixed", label: "All types (rotate)", types: ["bar", "line", "area", "pie"], group: "Combinations" },
]

function presetFromTypes(types) {
  if (!Array.isArray(types) || types.length === 0) return "auto"
  const norm = [...new Set(types.map((t) => String(t).toLowerCase()))].sort().join(",")
  const hit = CHART_PRESETS.find((p) => [...p.types].sort().join(",") === norm)
  return hit ? hit.value : "auto"
}

function typesForPreset(value) {
  return CHART_PRESETS.find((p) => p.value === value)?.types ?? []
}

const selectStyle = {
  width: "100%",
  background: "#fff",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "12px 16px",
  fontSize: 14,
  color: "var(--text-1)",
  outline: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 16px center",
  paddingRight: 42,
}

export default function NewDashboardForm({
  onGenerate,
  loading,
  error,
  onCancel,
  initialQuery = "",
  initialTheme = "cyan",
  initialNumViz = 4,
  initialKpis,
  initialChartTypes,
}) {
  const [query, setQuery] = useState(initialQuery)
  const [kpis, setKpis] = useState(() => (Array.isArray(initialKpis) ? initialKpis : []))
  const [kpiInput, setKpiInput] = useState("")
  const [numViz, setNumViz] = useState(() => Math.min(8, Math.max(2, initialNumViz ?? 4)))
  const [theme, setTheme] = useState(() =>
    THEME_OPTIONS.some((t) => t.key === initialTheme) ? initialTheme : "cyan"
  )
  const [datasetKey, setDatasetKey] = useState("primary")
  const [uploadName, setUploadName] = useState(null)
  const [chartPreset, setChartPreset] = useState(() => presetFromTypes(initialChartTypes))
  const [detecting, setDetecting] = useState(false)
  const fileRef = useRef(null)
  const kpiRef = useRef(null)

  useEffect(() => {
    setQuery(initialQuery)
    setTheme(THEME_OPTIONS.some((t) => t.key === initialTheme) ? initialTheme : "cyan")
    setNumViz(Math.min(8, Math.max(2, initialNumViz ?? 4)))
    setKpis(Array.isArray(initialKpis) ? initialKpis : [])
    setChartPreset(presetFromTypes(initialChartTypes))
  }, [initialQuery, initialTheme, initialNumViz, initialKpis, initialChartTypes])

  const accent = themeAccent(theme)

  const addKpi = (val) => {
    const t = val.trim()
    if (t && !kpis.includes(t)) setKpis((k) => [...k, t])
    setKpiInput("")
  }

  const handleKpiKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addKpi(kpiInput)
    } else if (e.key === "Backspace" && kpiInput === "" && kpis.length > 0) {
      setKpis((k) => k.slice(0, -1))
    }
  }

  const autoDetect = async () => {
    if (!query.trim()) return
    setDetecting(true)
    try {
      const res = await fetch("http://127.0.0.1:8000/extract-kpis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      if (data.kpis?.length) setKpis(data.kpis)
    } catch {
      /* ignore */
    } finally {
      setDetecting(false)
    }
  }

  const onFile = (e) => {
    const f = e.target.files?.[0]
    setUploadName(f ? f.name : null)
    if (f) setDatasetKey("uploaded_sales_data")
    e.target.value = ""
  }

  const handleSubmit = () => {
    if (!query.trim()) return
    const sent = Math.min(4, Math.max(2, numViz))
    onGenerate({
      query: query.trim(),
      kpis,
      num_visualizations: sent,
      color_schema: theme,
      preferred_chart_types: typesForPreset(chartPreset),
    })
  }

  const bumpViz = (delta) => {
    setNumViz((n) => Math.min(8, Math.max(2, n + delta)))
  }

  const appendVoice = (text) => {
    setQuery((q) => (q ? `${q.trim()} ${text}` : text))
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "20px 28px 88px" }}>
      <header
        style={{
          marginBottom: 28,
          position: "relative",
          paddingBottom: 22,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: 56,
            height: 4,
            borderRadius: 4,
            background: `linear-gradient(90deg, ${accent}, ${accent}55, transparent)`,
          }}
          aria-hidden
        />
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: accent,
            marginBottom: 10,
            padding: "5px 12px",
            borderRadius: 999,
            background: `${accent}10`,
            border: `1px solid ${accent}22`,
          }}
        >
          Query-driven layouts
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: "var(--text-1)",
            margin: 0,
            letterSpacing: "-0.035em",
            lineHeight: 1.15,
          }}
        >
          New dashboard
        </h1>
        <p style={{ margin: "12px 0 0", fontSize: 14, color: "var(--text-2)", lineHeight: 1.55, maxWidth: 520 }}>
          Describe what you want to see. We’ll plan SQL, charts, and KPIs—then you can refine or ask the AI.
        </p>
      </header>

      <div
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)",
          borderRadius: 18,
          border: "1px solid rgba(15, 23, 42, 0.07)",
          boxShadow: "var(--shadow-card), 0 32px 64px -28px rgba(15, 23, 42, 0.14)",
          padding: "36px 40px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <section>
            <label style={labelStyle}>Dataset</label>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <select
                value={datasetKey}
                onChange={(e) => {
                  const v = e.target.value
                  setDatasetKey(v)
                  if (v === "primary") setUploadName(null)
                }}
                style={{ ...selectStyle, flex: "1 1 220px" }}
              >
                <option value="primary">global_superstore</option>
                <option value="uploaded_sales_data">
                  {uploadName ? `uploaded_sales_data · ${uploadName}` : "uploaded_sales_data"}
                </option>
              </select>
              <input ref={fileRef} type="file" accept=".csv,.json,.xlsx,.xls" hidden onChange={onFile} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#fff",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "0 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-1)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: 16 }}>⬆</span>
                Upload
              </button>
            </div>
          </section>

          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
              <label style={{ ...labelStyle, margin: 0 }}>Your analytics question (new KPI / focus)</label>
              <VoiceMicButton onTranscript={appendVoice} disabled={loading} accent={accent} />
            </div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Focus on discount impact and payment methods vs last question."
              rows={4}
              style={{
                width: "100%",
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "14px 16px",
                fontSize: 15,
                color: "var(--text-1)",
                resize: "vertical",
                outline: "none",
                lineHeight: 1.65,
                fontFamily: "inherit",
                boxSizing: "border-box",
                minHeight: 120,
              }}
              onFocus={(e) => {
                e.target.style.borderColor = accent
                e.target.style.boxShadow = `0 0 0 3px ${accent}18`
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)"
                e.target.style.boxShadow = "none"
              }}
            />
          </section>

          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <label style={{ ...labelStyle, margin: 0 }}>KPIs (optional)</label>
              <button
                type="button"
                onClick={autoDetect}
                disabled={detecting || !query.trim()}
                style={{
                  background: `${accent}12`,
                  border: `1px solid ${accent}35`,
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: accent,
                  cursor: detecting || !query.trim() ? "not-allowed" : "pointer",
                  opacity: !query.trim() ? 0.5 : 1,
                }}
              >
                {detecting ? "Detecting…" : "✨ Auto-detect from query"}
              </button>
            </div>
            <div
              onClick={() => kpiRef.current?.focus()}
              style={{
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "8px 12px",
                minHeight: 46,
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                alignItems: "center",
                cursor: "text",
              }}
            >
              {kpis.map((k) => (
                <span
                  key={k}
                  style={{
                    background: `${accent}12`,
                    color: accent,
                    border: `1px solid ${accent}30`,
                    borderRadius: 999,
                    padding: "3px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {k}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setKpis((kp) => kp.filter((x) => x !== k))
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: accent,
                      padding: 0,
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                ref={kpiRef}
                value={kpiInput}
                onChange={(e) => setKpiInput(e.target.value)}
                onKeyDown={handleKpiKeyDown}
                onBlur={() => kpiInput && addKpi(kpiInput)}
                placeholder={kpis.length === 0 ? "e.g. sales, profit — Enter to add" : ""}
                style={{
                  flex: 1,
                  minWidth: 140,
                  border: "none",
                  outline: "none",
                  fontSize: 13,
                  background: "transparent",
                }}
              />
            </div>
          </section>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
            <section>
              <label style={labelStyle}>Visualizations (total)</label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "#fff",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 4,
                  maxWidth: 200,
                }}
              >
                <button type="button" onClick={() => bumpViz(-1)} disabled={numViz <= 2} style={stepBtn(numViz <= 2)}>
                  −
                </button>
                <input
                  type="number"
                  min={2}
                  max={8}
                  value={numViz}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10)
                    if (!Number.isNaN(n)) setNumViz(Math.min(8, Math.max(2, n)))
                  }}
                  style={{
                    flex: 1,
                    border: "none",
                    background: "transparent",
                    textAlign: "center",
                    fontSize: 17,
                    fontWeight: 700,
                    color: "var(--text-1)",
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
                <button type="button" onClick={() => bumpViz(1)} disabled={numViz >= 8} style={stepBtn(numViz >= 8)}>
                  +
                </button>
              </div>
            </section>
            <section>
              <label style={labelStyle}>Chart preference</label>
              <select value={chartPreset} onChange={(e) => setChartPreset(e.target.value)} style={selectStyle}>
                {CHART_PRESET_GROUPS.map((g) => (
                  <optgroup key={g} label={g}>
                    {CHART_PRESETS.filter((p) => p.group === g).map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </section>
            <section>
              <label style={labelStyle}>Full-page color theme</label>
              <select value={theme} onChange={(e) => setTheme(e.target.value)} style={selectStyle}>
                {THEME_OPTIONS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </section>
          </div>

          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 12,
                padding: "12px 16px",
                fontSize: 14,
                color: "#b91c1c",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => onCancel?.()}
              style={{
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "14px 26px",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-2)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !query.trim()}
              style={{
                flex: "1 1 220px",
                background: loading || !query.trim() ? "var(--surface)" : `linear-gradient(180deg, ${accent}, ${accent}dd)`,
                border: "none",
                borderRadius: 12,
                padding: "14px 26px",
                fontSize: 15,
                fontWeight: 700,
                color: loading || !query.trim() ? "var(--text-3)" : "#fff",
                cursor: loading || !query.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                boxShadow: loading || !query.trim() ? "none" : `0 10px 28px ${accent}45`,
              }}
            >
              {loading ? "Generating…" : `+ Save & generate ${Math.min(4, numViz)} views`}
            </button>
          </div>

          {loading && (
            <div
              style={{
                background: `${accent}0d`,
                border: `1px solid ${accent}28`,
                borderRadius: 14,
                padding: "16px 18px",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: accent, marginBottom: 10 }}>Generating previews…</div>
              {["Analysis & cleaning", "Layout options (3–4)", "Charts & KPI coverage"].map((s, i) => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text-2)", marginBottom: 6 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: accent,
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function stepBtn(disabled) {
  return {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: "none",
    background: disabled ? "transparent" : "#fff",
    color: disabled ? "var(--text-3)" : "var(--text-1)",
    fontSize: 20,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    lineHeight: 1,
    boxShadow: disabled ? "none" : "var(--shadow)",
  }
}

const labelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-3)",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: 8,
}
