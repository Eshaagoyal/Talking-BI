import { useState } from "react"
import Sidebar from "./components/Sidebar"
import MainArea from "./components/MainArea"
import "./index.css"

export default function App() {
  const [savedDashboards, setSavedDashboards] = useState([])
  const [activeDashboard, setActiveDashboard] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showNewForm, setShowNewForm] = useState(true)

  const handleGenerate = async (formData) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("http://127.0.0.1:8000/generate-dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Something went wrong")
      }
      const data = await res.json()
      const newDash = { id: Date.now(), query: formData.query, ...data }
      setSavedDashboards(prev => [newDash, ...prev])
      setActiveDashboard(newDash)
      setShowNewForm(false)
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
        onSelect={d => { setActiveDashboard(d); setShowNewForm(false) }}
        onNew={() => setShowNewForm(true)}
      />
      <MainArea
        showForm={showNewForm}
        onGenerate={handleGenerate}
        loading={loading}
        error={error}
        dashboard={activeDashboard}
        onNew={() => setShowNewForm(true)}
        onEdit={() => setShowNewForm(true)}
      />
    </div>
  )
}