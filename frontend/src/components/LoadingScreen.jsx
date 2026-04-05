import { useState, useEffect } from "react"

const AGENTS = [
  { icon:"🔍", name:"SQLAgent", desc:"Exploring database schema...", color:"#0d9488" },
  { icon:"🧹", name:"DeepPrep", desc:"Planning dashboard layouts...", color:"#4f46e5" },
  { icon:"📊", name:"Doc2Chart", desc:"Building chart data...", color:"#2563eb" },
  { icon:"🧠", name:"InsightEval", desc:"Scoring KPI coverage...", color:"#7c3aed" },
]

export default function LoadingScreen() {
  const [activeAgent, setActiveAgent] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActiveAgent(a => (a + 1) % AGENTS.length), 2500)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      minHeight:"70vh", padding:32
    }}>
      {/* Animated icon */}
      <div style={{
        width:64, height:64, borderRadius:"50%",
        background:`${AGENTS[activeAgent].color}20`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:28, marginBottom:16,
        border:`2px solid ${AGENTS[activeAgent].color}40`,
        transition:"all 0.4s"
      }}>
        {AGENTS[activeAgent].icon}
      </div>

      <h2 style={{ fontSize:20, fontWeight:700, color:"#0f172a", marginBottom:6 }}>
        Generating your dashboards
      </h2>
      <p style={{ fontSize:13, color:"#94a3b8", marginBottom:32 }}>
        4 AI agents are working on your query...
      </p>

      {/* Agent cards */}
      <div style={{ display:"flex", flexDirection:"column", gap:8, width:"100%", maxWidth:400 }}>
        {AGENTS.map((agent, i) => (
          <div key={i} style={{
            display:"flex", alignItems:"center", gap:12,
            background: i === activeAgent ? `${agent.color}08` : "#fff",
            border:`1px solid ${i === activeAgent ? agent.color + "30" : "#e2e8f0"}`,
            borderRadius:10, padding:"12px 16px",
            transition:"all 0.3s"
          }}>
            <div style={{
              width:36, height:36, borderRadius:8, flexShrink:0,
              background: i === activeAgent ? `${agent.color}15` : "#f8fafc",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:18
            }}>{agent.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{
                fontSize:13, fontWeight:600,
                color: i === activeAgent ? "#0f172a" : "#64748b"
              }}>{agent.name}</div>
              <div style={{ fontSize:11, color:"#94a3b8" }}>{agent.desc}</div>
            </div>
            <div style={{ display:"flex", gap:3 }}>
              {i === activeAgent ? (
                [0,1,2].map(j => (
                  <div key={j} style={{
                    width:4, height:4, borderRadius:"50%",
                    background:agent.color,
                    animation:`pulse 1s ease-in-out ${j * 0.2}s infinite alternate`
                  }} />
                ))
              ) : i < activeAgent ? (
                <span style={{ fontSize:12, color:"#10b981", fontWeight:600 }}>✓</span>
              ) : (
                <div style={{ width:12, height:12, borderRadius:"50%", background:"#e2e8f0" }} />
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          from { opacity: 0.4; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}