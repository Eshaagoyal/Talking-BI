import NewDashboardForm from "./NewDashboardForm"
import DashboardPage from "./DashboardPage"
import LoadingScreen from "./LoadingScreen"
import SavedDashboardsStrip from "./SavedDashboardsStrip"
import DashboardPreviewStep from "./DashboardPreviewStep"

export default function MainArea({
  showForm,
  previewDashboard,
  onConfirmPreview,
  onDismissPreview,
  onGenerate,
  loading,
  error,
  dashboard,
  onNew,
  onEdit,
  onDismissForm,
  savedDashboards,
  onSelectSaved,
}) {
  if (loading) {
    return (
      <div style={{ flex: 1, minHeight: "100vh", background: "transparent", overflowY: "auto" }}>
        <LoadingScreen />
      </div>
    )
  }

  const editingId = showForm && dashboard ? dashboard.id : null
  const stripAccent = previewDashboard?.color_schema || dashboard?.color_schema || "cyan"

  return (
    <div style={{ flex: 1, minHeight: "100vh", background: "transparent", overflowY: "auto" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", width: "100%" }}>
        {savedDashboards.length > 0 && (
          <div className="no-print" style={{ padding: "24px 28px 0" }}>
            <SavedDashboardsStrip
              savedDashboards={savedDashboards}
              activeSavedId={previewDashboard?.id ?? dashboard?.id}
              onSelectSaved={onSelectSaved}
              onNew={onNew}
              accentKey={stripAccent}
            />
          </div>
        )}

        {previewDashboard ? (
          <DashboardPreviewStep
            dashboard={previewDashboard}
            onConfirm={onConfirmPreview}
            onBack={onDismissPreview}
          />
        ) : showForm || !dashboard ? (
          <NewDashboardForm
            key={editingId ?? "new"}
            onGenerate={(fd) => onGenerate(fd, editingId ? { replaceId: editingId } : {})}
            loading={loading}
            error={error}
            onCancel={onDismissForm}
            initialQuery={editingId ? dashboard?.query : ""}
            initialTheme={editingId ? dashboard?.color_schema : undefined}
            initialNumViz={editingId ? dashboard?.num_dashboards : undefined}
            initialKpis={editingId ? dashboard?.kpis : undefined}
            initialChartTypes={editingId ? dashboard?.preferred_chart_types : undefined}
          />
        ) : (
          <DashboardPage
            dashboard={dashboard}
            onNew={onNew}
            onEdit={onEdit}
            onRegenerate={(fd) => onGenerate(fd, { replaceId: dashboard.id })}
          />
        )}
      </div>
    </div>
  )
}
