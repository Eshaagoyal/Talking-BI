/** Browser text-to-speech (voice output) — whiteboard: voice + text for answers */
export function speakText(text) {
  if (!text || typeof window === "undefined") return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = "en-US"
    u.rate = 1
    window.speechSynthesis.speak(u)
  } catch {
    /* ignore */
  }
}

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel()
  } catch {
    /* ignore */
  }
}
