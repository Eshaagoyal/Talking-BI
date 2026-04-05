import { useState, useCallback } from "react"

/**
 * Web Speech API — appends transcript to controlled text (query field).
 */
export default function VoiceMicButton({ onTranscript, disabled, accent }) {
  const [listening, setListening] = useState(false)

  const toggle = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      window.alert("Voice input is not supported in this browser. Try Chrome or Edge.")
      return
    }
    if (listening) return
    const rec = new SR()
    rec.lang = "en-US"
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onstart = () => setListening(true)
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript?.trim()
      if (text) onTranscript(text)
      setListening(false)
    }
    try {
      rec.start()
    } catch {
      setListening(false)
    }
  }, [listening, onTranscript])

  return (
    <button
      type="button"
      title={listening ? "Listening…" : "Speak your question"}
      disabled={disabled || listening}
      onClick={toggle}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 40,
        height: 40,
        borderRadius: 10,
        border: listening ? `2px solid ${accent}` : "1px solid var(--border)",
        background: listening ? `${accent}12` : "var(--surface)",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 18,
        flexShrink: 0,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {listening ? "●" : "🎤"}
    </button>
  )
}
