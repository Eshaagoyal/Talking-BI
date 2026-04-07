import { useState, useRef, useEffect, useCallback } from "react"
import { THEME_OPTIONS, themeAccent } from "../themeOptions"
import VoiceMicButton from "./VoiceMicButton"
import { apiUrl } from "../api"

function sanitizeTableName(filename) {
  const stem = (filename || "dataset").replace(/\.[^.]+$/i, "")
  let s = stem.replace(/[^a-zA-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "uploaded_dataset"
  if (!/^[a-zA-Z_]/.test(s)) s = `ds_${s}`
  return s.slice(0, 63)
}



const selectStyle = {
  width: "100%",
  background: "var(--surface2)",
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
  initialDatasetKey,
}) {
  const [query, setQuery] = useState(initialQuery)
  const [kpis, setKpis] = useState([])
  const [theme, setTheme] = useState(() =>
    THEME_OPTIONS.some((t) => t.key === initialTheme) ? initialTheme : "cyan"
  )
  const [datasets, setDatasets] = useState([])
  const [datasetsLoading, setDatasetsLoading] = useState(true)
  const [datasetsErr, setDatasetsErr] = useState(null)
  const [datasetKey, setDatasetKey] = useState(() => initialDatasetKey || "primary")
  const [pendingFile, setPendingFile] = useState(null)
  const [uploadName, setUploadName] = useState(null)
  const [uploadTableName, setUploadTableName] = useState("")
  const [uploadErr, setUploadErr] = useState(null)
  const fileRef = useRef(null)


  const loadDatasets = useCallback(async () => {
    setDatasetsLoading(true)
    setDatasetsErr(null)
    try {
      const res = await fetch(apiUrl("/datasets"))
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setDatasets(Array.isArray(data.datasets) ? data.datasets : [])
    } catch (e) {
      setDatasetsErr(e.message || "Could not load tables from the database.")
      setDatasets([])
    } finally {
      setDatasetsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDatasets()
  }, [loadDatasets])

  useEffect(() => {
    if (!datasets.length) return
    setDatasetKey((prev) => {
      if (prev === "primary") return "primary"
      if (datasets.some((d) => d.name === prev)) return prev
      const init = initialDatasetKey
      if (init === "primary") return "primary"
      if (init && datasets.some((d) => d.name === init)) return init
      return datasets[0].name
    })
  }, [datasets, initialDatasetKey])

  useEffect(() => {
    setQuery(initialQuery)
    setTheme(THEME_OPTIONS.some((t) => t.key === initialTheme) ? initialTheme : "cyan")
    if (initialDatasetKey) setDatasetKey(initialDatasetKey)
  }, [initialQuery, initialTheme, initialDatasetKey])

  const accent = themeAccent(theme)



  const onFile = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    setPendingFile(f)
    setUploadName(f.name)
    setUploadTableName((prev) => (prev.trim() ? prev : sanitizeTableName(f.name)))
  }

  const clearPendingUpload = () => {
    setPendingFile(null)
    setUploadName(null)
  }

  const handleSubmit = async () => {
    if (!query.trim()) return
    setUploadErr(null)

    let targetDataset = datasetKey

    if (pendingFile) {
      const tn = uploadTableName.trim()
      if (!tn || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tn)) {
        setUploadErr("Enter a valid table name: start with a letter or underscore; use only letters, numbers, and underscores.")
        return
      }
      try {
        const fd = new FormData()
        fd.append("file", pendingFile)
        const up = await fetch(apiUrl(`/upload-csv?table_name=${encodeURIComponent(tn)}`), {
          method: "POST",
          body: fd,
        })
        if (!up.ok) {
          const err = await up.json().catch(() => ({}))
          const d = err.detail
          setUploadErr(typeof d === "string" ? d : "Upload failed")
          return
        }
        targetDataset = tn
        clearPendingUpload()
        await loadDatasets()
        setDatasetKey(tn)
      } catch {
        setUploadErr("Could not reach the backend for upload.")
        return
      }
    } else if (!datasetKey) {
      setUploadErr("Choose a table from the list, or import a file with a table name.")
      return
    }

    onGenerate({
      query: query.trim(),
      kpis: [],
      num_visualizations: 0,
      color_schema: theme,
      preferred_chart_types: [],
      dataset_key: targetDataset,
    })
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
          Dashboard builder
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
        <p style={{ margin: "12px 0 0", fontSize: 14, color: "var(--text-2)", lineHeight: 1.55, maxWidth: 560 }}>
          Describe the analysis you need. We generate the query, visuals, and metric coverage—you can refine the result or ask the assistant.
        </p>
      </header>

      <div
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #f8fbfd 100%)",
          borderRadius: 18,
          border: `1px solid ${accent}1f`,
          boxShadow: `0 16px 42px -24px ${accent}52, var(--shadow-card)`,
          padding: "36px 40px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <section
            style={{
              background: `linear-gradient(180deg, ${accent}0d 0%, #ffffff 100%)`,
              border: `1px solid ${accent}2b`,
              borderRadius: 16,
              padding: "22px 24px",
              boxShadow: `0 0 0 1px ${accent}0f`,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: accent, letterSpacing: "-0.02em" }}>
                  Data source
                </h2>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-3)", lineHeight: 1.5, maxWidth: 520 }}>
                  Select a table already in your warehouse, or import a file. Imports are written to the same database connection as your app.
                </p>
              </div>
              <button
                type="button"
                onClick={() => loadDatasets()}
                disabled={datasetsLoading}
                style={{
                  background: "#ffffff",
                  border: `1px solid ${accent}35`,
                  borderRadius: 10,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: accent,
                  cursor: datasetsLoading ? "not-allowed" : "pointer",
                  boxShadow: `0 2px 10px ${accent}22`,
                  flexShrink: 0,
                }}
              >
                {datasetsLoading ? "Syncing…" : "Sync tables"}
              </button>
            </div>
            {datasetsErr && (
              <div
                style={{
                  fontSize: 13,
                  color: "#b91c1c",
                  marginBottom: 14,
                  padding: "10px 12px",
                  background: "#fef2f2",
                  borderRadius: 10,
                  border: "1px solid #fecaca",
                }}
              >
                {datasetsErr}
              </div>
            )}
            <p style={{ ...labelStyle, marginBottom: 8 }}>Existing table</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "stretch" }}>
              <select
                value={datasetKey}
                onChange={(e) => setDatasetKey(e.target.value)}
                disabled={!!pendingFile}
                style={{ ...selectStyle, flex: "1 1 260px", minHeight: 46, opacity: pendingFile ? 0.55 : 1 }}
              >
                <option value="primary">Auto-select (recommended)</option>
                {datasets.map((d) => {
                  const n = typeof d.row_count === "number" ? d.row_count.toLocaleString() : d.row_count
                  return (
                    <option key={d.name} value={d.name}>
                      {d.name} · {n} rows
                    </option>
                  )
                })}
              </select>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xlsm" hidden onChange={onFile} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: `linear-gradient(180deg, ${accent}18, ${accent}0f)`,
                  border: `1px solid ${accent}55`,
                  borderRadius: 12,
                  padding: "0 22px",
                  minHeight: 46,
                  fontSize: 14,
                  fontWeight: 600,
                  color: accent,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: `0 6px 18px -10px ${accent}80`,
                }}
              >
                Import CSV or Excel
              </button>
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--text-3)", lineHeight: 1.55 }}>
              Auto-select chooses a primary fact table when available (e.g. global_superstore or sales), otherwise the largest suitable table.
            </p>

            {(uploadName || pendingFile) && (
              <div
                style={{
                  marginTop: 20,
                  padding: "16px 18px",
                  background: "#ffffff",
                  borderRadius: 12,
                  border: `1px solid ${accent}30`,
                  boxShadow: `0 10px 28px -22px ${accent}65`,
                }}
              >
                <p style={{ ...labelStyle, marginBottom: 10 }}>Import details</p>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px",
                      borderRadius: 8,
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text-1)",
                      maxWidth: "100%",
                    }}
                  >
                    <span style={{ color: "var(--text-3)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      File
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{uploadName}</span>
                  </span>
                  <button
                    type="button"
                    onClick={clearPendingUpload}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: "6px 4px",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-3)",
                      cursor: "pointer",
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                    }}
                  >
                    Remove
                  </button>
                </div>
                <label style={{ ...labelStyle, marginBottom: 6 }}>Save as table</label>
                <input
                  value={uploadTableName}
                  onChange={(e) => setUploadTableName(e.target.value)}
                  placeholder="e.g. finance_q4_2024"
                  style={{
                    width: "100%",
                    maxWidth: 360,
                    boxSizing: "border-box",
                    background: "#ffffff",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "11px 14px",
                    fontSize: 14,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    color: "var(--text-1)",
                  }}
                />
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>
                  Use letters, numbers, and underscores only; start with a letter or underscore. Re-importing replaces an existing table with the same name.
                </p>
              </div>
            )}
          </section>

          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
              <label style={{ ...labelStyle, margin: 0 }}>Analysis question</label>
              <VoiceMicButton onTranscript={appendVoice} disabled={loading} accent={accent} />
            </div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Focus on discount impact and payment methods vs last question."
              rows={4}
              style={{
                width: "100%",
                background: "#ffffff",
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



          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
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

          {uploadErr && (
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
              {uploadErr}
            </div>
          )}

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
                background: "#ffffff",
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
              {loading ? "Generating…" : `Generate dashboard`}
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
              <div style={{ fontSize: 14, fontWeight: 700, color: accent, marginBottom: 10 }}>Preparing your dashboard…</div>
              {["Data preparation", "Layout & chart selection", "Metric coverage"].map((s, i) => (
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



const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-2)",
  letterSpacing: "0.01em",
  display: "block",
  marginBottom: 8,
}
