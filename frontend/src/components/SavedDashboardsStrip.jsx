import { themeAccent } from "../themeOptions"

/**
 * Top strip like reference mocks: SAVED DASHBOARDS pills + + New dashboard.
 */
export default function SavedDashboardsStrip({
  savedDashboards = [],
  activeSavedId,
  onSelectSaved,
  accentKey = "cyan",
}) {
  const accent = themeAccent(accentKey)

  const pill = (active) => ({
    background: active ? `linear-gradient(180deg, ${accent}, ${accent}dd)` : "linear-gradient(180deg, #f1f5f9 0%, #e9eef5 100%)",
    border: active ? "1px solid transparent" : `1px solid rgba(11,79,108,0.18)`,
    borderRadius: 999,
    padding: "7px 16px",
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    color: active ? "#fff" : "var(--text-1)",
    cursor: "pointer",
    maxWidth: 260,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flexShrink: 0,
    boxShadow: active ? `0 8px 22px -10px ${accent}72` : "0 6px 14px -12px rgba(15,23,42,0.45)",
    transition: "background 0.18s, color 0.18s, box-shadow 0.18s, border-color 0.18s",
  })

  return (
    <div
      className="saved-strip"
      style={{
        marginBottom: 24,
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbfd 100%)",
        borderRadius: 16,
        padding: "14px 18px",
        border: `1px solid ${accent}26`,
        boxShadow: `0 12px 30px -22px ${accent}75`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: "var(--text-3)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          Saved dashboards
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            flex: 1,
            minWidth: 0,
            overflowX: "auto",
            paddingBottom: 2,
            scrollbarWidth: "thin",
          }}
        >
          {savedDashboards.map((d) => (
            <button key={d.id} type="button" onClick={() => onSelectSaved?.(d)} style={pill(activeSavedId === d.id)} title={d.query}>
              {d.query?.slice(0, 36)}
              {d.query?.length > 36 ? "…" : ""}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
