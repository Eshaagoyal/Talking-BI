import { useState } from "react"
import Sidebar from "./components/Sidebar"
import MainArea from "./components/MainArea"
import ChatBot from "./components/ChatBot"
import "./index.css"

export default function App() {
  const [savedDashboards, setSavedDashboards] = useState([])
  const [activeDashboard, setActiveDashboard] = useState(null)
  const [previewDashboard, setPreviewDashboard] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showNewForm, setShowNewForm] = useState(true)

  const confirmPreview = (preferredTab) => {
    if (!previewDashboard) return
    const merged = { ...previewDashboard, preferredTab }
    setSavedDashboards((prev) => prev.map((x) => (x.id === merged.id ? merged : x)))
    setActiveDashboard(merged)
    setPreviewDashboard(null)
  }

  const dismissPreview = () => {
    setPreviewDashboard(null)
    setShowNewForm(true)
  }

  const handleGenerate = async (formData, { replaceId } = {}) => {
    setLoading(true)
    setError(null)
    try {
      const payload = {
        query: formData.query,
        kpis: formData.kpis ?? [],
        num_visualizations: formData.num_visualizations ?? 4,
        color_schema: formData.color_schema ?? "cyan",
        preferred_chart_types: formData.preferred_chart_types ?? [],
      }
      const res = await fetch("http://127.0.0.1:8000/generate-dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Something went wrong")
      }
      const data = await res.json()
      const id = replaceId ?? Date.now()
      const newDash = {
        id,
        query: formData.query,
        color_schema: formData.color_schema,
        preferred_chart_types: formData.preferred_chart_types ?? [],
        ...data,
      }
      setSavedDashboards((prev) =>
        replaceId ? prev.map((d) => (d.id === replaceId ? newDash : d)) : [newDash, ...prev]
      )
      if (replaceId) {
        setActiveDashboard(newDash)
        setPreviewDashboard(null)
        setShowNewForm(false)
      } else {
        setPreviewDashboard(newDash)
        setActiveDashboard(null)
        setShowNewForm(false)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        saved={savedDashboards}
        active={activeDashboard}
        pendingDashboardId={previewDashboard?.id ?? null}
        onSelect={(d) => {
          setPreviewDashboard(null)
          setActiveDashboard(d)
          setShowNewForm(false)
        }}
        onNew={() => {
          setPreviewDashboard(null)
          setShowNewForm(true)
          setActiveDashboard(null)
        }}
      />
      <MainArea
        showForm={showNewForm}
        previewDashboard={previewDashboard}
        onConfirmPreview={confirmPreview}
        onDismissPreview={dismissPreview}
        onGenerate={handleGenerate}
        loading={loading}
        error={error}
        dashboard={activeDashboard}
        savedDashboards={savedDashboards}
        onSelectSaved={(d) => {
          setPreviewDashboard(null)
          setActiveDashboard(d)
          setShowNewForm(false)
        }}
        onNew={() => {
          setPreviewDashboard(null)
          setShowNewForm(true)
          setActiveDashboard(null)
        }}
        onDismissForm={() => setShowNewForm(false)}
        onEdit={() => setShowNewForm(true)}
      />
      <ChatBot activeDashboard={activeDashboard} />
    </div>
  )
}
