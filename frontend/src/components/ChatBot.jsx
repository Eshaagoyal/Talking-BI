import { useState, useRef, useEffect } from "react"
import { themeAccent } from "../themeOptions"
import VoiceMicButton from "./VoiceMicButton"
import { speakText, stopSpeaking } from "../utils/voiceOutput"
import { apiUrl } from "../api"

const segBase = {
  display: "inline-flex",
  borderRadius: 10,
  padding: 3,
  gap: 2,
  background: "rgba(255,255,255,0.14)",
  border: "1px solid rgba(255,255,255,0.22)",
}
const segBtn = (on) => ({
  border: "none",
  borderRadius: 8,
  padding: "5px 10px",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  transition: "background 0.15s, color 0.15s",
  background: on ? "rgba(255,255,255,0.95)" : "transparent",
  color: on ? "#0f172a" : "rgba(255,255,255,0.92)",
})

export default function GlobalChat({ activeDashboard }) {
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState("")
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [autoReadAloud, setAutoReadAloud] = useState(false)
  const spokenUpToLength = useRef(0)

  const themeColor = themeAccent(activeDashboard?.color_schema)

  useEffect(() => {
    return () => stopSpeaking()
  }, [])

  useEffect(() => {
    if (!autoReadAloud || history.length === 0) return
    const last = history[history.length - 1]
    if (last.role !== "ai") return
    if (history.length <= spokenUpToLength.current) return
    spokenUpToLength.current = history.length
    speakText(last.text)
  }, [history, autoReadAloud])

  const submitMessage = async (text) => {
    const t = text.trim()
    if (!t || loading) return
    setHistory((h) => [...h, { role: "user", text: t }])
    setLoading(true)
    try {
      const dashList = activeDashboard ? Object.values(activeDashboard.dashboards || {}) : []

      const res = await fetch(apiUrl("/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: t,
          dashboard_context: activeDashboard
            ? {
                query: activeDashboard.query,
                kpis: activeDashboard.kpis,
                insight_summary: activeDashboard.insights?.insight_summary,
                dashboards: Object.fromEntries(dashList.map((d) => [d.title, { data: d.data?.slice(0, 15) }])),
              }
            : { query: "No dashboard loaded yet. Answer general BI questions." },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const d = data.detail
        const errMsg =
          typeof d === "string" ? d : Array.isArray(d) ? d.map((x) => x.msg || String(x)).join("; ") : "Request failed."
        setHistory((h) => [...h, { role: "ai", text: errMsg }])
        return
      }
      const reply = (data.response && String(data.response).trim()) || "Sorry, I couldn't answer that."
      setHistory((h) => [...h, { role: "ai", text: reply }])
    } catch {
      setHistory((h) => [...h, { role: "ai", text: "Connection error. Make sure the backend is running." }])
    } finally {
      setLoading(false)
    }
  }

  const sendFromInput = async () => {
    if (!msg.trim() || loading) return
    const t = msg.trim()
    setMsg("")
    await submitMessage(t)
  }

  const appendVoiceToInput = (text) => {
    setMsg((m) => (m ? `${m.trim()} ${text}` : text))
  }

  return (
    <div className="no-print" style={{ position: "fixed", bottom: 28, right: 28, zIndex: 1000 }}>
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: 64,
            right: 0,
            width: 380,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            overflow: "hidden",
            animation: "slideUp 0.2s ease",
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, ${themeColor} 0%, #0f172a 100%)`,
              padding: "14px 16px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: "#fff",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Ask AI
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.78)", marginTop: 4, lineHeight: 1.45 }}>
                  Type or speak · Spoken replies optional
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 10,
                  width: 32,
                  height: 32,
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Read replies aloud
              </span>
              <div style={segBase} role="group" aria-label="Read replies aloud">
                <button type="button" style={segBtn(!autoReadAloud)} onClick={() => { setAutoReadAloud(false); stopSpeaking() }}>
                  Off
                </button>
                <button type="button" style={segBtn(autoReadAloud)} onClick={() => setAutoReadAloud(true)}>
                  On
                </button>
              </div>
            </div>
          </div>

          <div
            style={{
              height: 288,
              overflowY: "auto",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              background: "var(--surface2)",
            }}
          >
            {history.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--text-3)", fontSize: 12, paddingTop: 72 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                {activeDashboard
                  ? "Type a question or use the mic—answers use your dashboard context."
                  : "Type or speak a BI question. Generate a dashboard first for data-aware answers."}
              </div>
            )}
            {history.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "92%",
                }}
              >
                <div
                  style={{
                    background: m.role === "user" ? themeColor : "var(--surface)",
                    color: m.role === "user" ? "#fff" : "var(--text-1)",
                    border: m.role === "ai" ? "1px solid var(--border)" : "none",
                    borderRadius: m.role === "user" ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                    padding: "9px 13px",
                    fontSize: 13,
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                  }}
                >
                  {m.text}
                </div>
                {m.role === "ai" && (
                  <button
                    type="button"
                    title="Play voice"
                    onClick={() => speakText(m.text)}
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      color: themeColor,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px 0",
                    }}
                  >
                    🔊 Speak
                  </button>
                )}
              </div>
            ))}
            {loading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "14px 14px 14px 3px",
                  padding: "9px 14px",
                  fontSize: 12,
                  color: "var(--text-3)",
                  display: "flex",
                  gap: 4,
                  alignItems: "center",
                }}
              >
                <span style={{ animation: "pulse 1s infinite" }}>●</span>
                <span style={{ animation: "pulse 1s infinite 0.2s" }}>●</span>
                <span style={{ animation: "pulse 1s infinite 0.4s" }}>●</span>
              </div>
            )}
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: 8,
              alignItems: "center",
              background: "var(--surface)",
            }}
          >
            <VoiceMicButton onTranscript={appendVoiceToInput} disabled={loading} accent={themeColor} />
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendFromInput()}
              placeholder="Type a question…"
              style={{
                flex: 1,
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 13,
                color: "var(--text-1)",
                outline: "none",
                minWidth: 0,
              }}
            />
            <button
              type="button"
              onClick={sendFromInput}
              disabled={!msg.trim() || loading}
              style={{
                background: !msg.trim() || loading ? "var(--surface2)" : themeColor,
                border: "none",
                borderRadius: 10,
                padding: "0 14px",
                height: 36,
                color: !msg.trim() || loading ? "var(--text-3)" : "#fff",
                cursor: !msg.trim() || loading ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
              }}
            >
              Send <span aria-hidden>↑</span>
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={open ? "Close" : "Ask AI"}
        style={{
          background: open ? "#0f172a" : `linear-gradient(135deg, ${themeColor}, #0f766e)`,
          border: "none",
          borderRadius: 999,
          padding: open ? "12px 18px" : "12px 22px",
          minHeight: 48,
          color: "#fff",
          cursor: "pointer",
          boxShadow: `0 6px 28px ${themeColor}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          fontSize: 14,
          fontWeight: 700,
          transition: "all 0.2s",
        }}
      >
        <span style={{ fontSize: 18 }}>{open ? "×" : "💬"}</span>
        {!open && <span>Ask AI</span>}
      </button>
    </div>
  )
}
