export default function Sidebar({ saved, active, onSelect, onNew }) {
  return (
    <div style={{
      width: 240, minHeight: "100vh", background: "var(--surface)",
      borderRight: "1px solid var(--border)", display: "flex",
      flexDirection: "column", position: "sticky", top: 0, height: "100vh",
      flexShrink: 0
    }}>
      {/* Brand */}
      <div style={{
        padding: "20px 20px 16px",
        borderBottom: "1px solid var(--border)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg,#0d9488,#0284c7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16
          }}>📊</div>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>
            Talking BI
          </span>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 40 }}>
          Dashboards & floating AI chat
        </p>
      </div>

      {/* Nav */}
      <div style={{ padding: "12px 12px 0" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "var(--accent)", color: "#fff",
          borderRadius: "var(--r)", padding: "8px 14px",
          fontSize: 13, fontWeight: 500, cursor: "pointer"
        }}>
          <span>⊞</span> Home
        </div>
      </div>

      {/* Saved dashboards */}
      {saved.length > 0 && (
        <div style={{ padding: "16px 12px 0", flex: 1, overflowY: "auto" }}>
          <div style={{
            fontSize: 10, color: "var(--text-3)", textTransform: "uppercase",
            letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8, paddingLeft: 4
          }}>
            Saved Dashboards
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {saved.map(d => (
              <div key={d.id} onClick={() => onSelect(d)} style={{
                padding: "8px 10px", borderRadius: "var(--r)", cursor: "pointer",
                background: active?.id === d.id ? "var(--accent-light)" : "transparent",
                color: active?.id === d.id ? "var(--accent)" : "var(--text-2)",
                fontSize: 12, fontWeight: active?.id === d.id ? 600 : 400,
                border: active?.id === d.id ? "1px solid var(--accent-mid)" : "1px solid transparent",
                transition: "all 0.15s",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
              }}>
                "{d.query.substring(0, 28)}{d.query.length > 28 ? "..." : ""}"
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New dashboard button */}
      <div style={{ padding: 12, marginTop: "auto", borderTop: "1px solid var(--border)" }}>
        <button onClick={onNew} style={{
          width: "100%", padding: "9px 0", borderRadius: "var(--r)",
          border: "1.5px dashed var(--border2)", background: "var(--surface2)",
          color: "var(--text-2)", fontSize: 12, fontWeight: 500,
          cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 6, transition: "all 0.15s"
        }}>
          + New dashboard
        </button>
      </div>
    </div>
  )
}