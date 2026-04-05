const P = "#0b4f6c"

export default function Sidebar({ saved, active, pendingDashboardId, onSelect, onNew }) {
  const homeActive = active === null && pendingDashboardId == null
  return (
    <div
      className="no-print"
      style={{
        width: 248,
        minWidth: 248,
        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 55%, #f1f5f9 100%)",
        borderRight: "1px solid rgba(15, 23, 42, 0.08)",
        boxShadow: "4px 0 24px rgba(15, 23, 42, 0.04)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: `linear-gradient(145deg, ${P}, #0e7490)`,
              borderRadius: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              boxShadow: "0 4px 14px rgba(11,79,108,0.25)",
              outline: "2px solid rgba(255,255,255,0.35)",
              outlineOffset: 1,
            }}
          >
            📊
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-1)", lineHeight: 1.15 }}>Talking BI</div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, lineHeight: 1.35 }}>
              Dashboards & floating AI chat
            </div>
          </div>
        </div>
      </div>

      {/* Home — screenshot: solid primary when active */}
      <div style={{ padding: "16px 14px 10px" }}>
        <button
          type="button"
          onClick={onNew}
          style={{
            width: "100%",
            background: homeActive ? P : "transparent",
            border: homeActive ? "none" : "1px solid var(--border)",
            borderRadius: 12,
            padding: "11px 14px",
            fontSize: 14,
            fontWeight: 600,
            color: homeActive ? "#fff" : "var(--text-2)",
            cursor: "pointer",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: homeActive ? "0 4px 16px rgba(11,79,108,0.28)" : "none",
            transition: "background 0.15s, color 0.15s, box-shadow 0.15s",
          }}
        >
          <span style={{ fontSize: 17, opacity: homeActive ? 1 : 0.85 }}>▦</span>
          Home
        </button>
      </div>

      <div style={{ padding: "0 14px 14px" }}>
        <button
          type="button"
          onClick={onNew}
          style={{
            width: "100%",
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-2)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          + New dashboard
        </button>
      </div>

      {/* Saved dashboards */}
      {saved.length > 0 && (
        <>
          <div
            style={{
              padding: "4px 20px 10px",
              fontSize: 10,
              fontWeight: 700,
              color: "var(--text-3)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Saved dashboards
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 10px 16px" }}>
            {saved.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelect(d)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: active?.id === d.id || pendingDashboardId === d.id ? "rgba(11,79,108,0.09)" : "transparent",
                  border: active?.id === d.id || pendingDashboardId === d.id ? "1px solid rgba(11,79,108,0.22)" : "1px solid transparent",
                  borderRadius: 10,
                  padding: "10px 12px",
                  marginBottom: 6,
                  fontSize: 13,
                  fontWeight: active?.id === d.id || pendingDashboardId === d.id ? 600 : 500,
                  color: active?.id === d.id || pendingDashboardId === d.id ? P : "var(--text-2)",
                  cursor: "pointer",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  transition: "border-color 0.15s, background 0.15s",
                }}
                title={d.query}
              >
                {d.query?.slice(0, 40)}
                {d.query?.length > 40 ? "…" : ""}
              </button>
            ))}
          </div>
        </>
      )}

      {saved.length === 0 && (
        <div style={{ flex: 1, padding: "24px 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", lineHeight: 1.65 }}>
            No dashboards yet.
            <br />
            Create one from Home.
          </p>
        </div>
      )}
    </div>
  )
}
