import NewDashboardForm from "./NewDashboardForm"
import DashboardPage from "./DashboardPage"
import LoadingScreen from "./LoadingScreen"

export default function MainArea({ showForm, onGenerate, loading, error, dashboard, onNew, onEdit }) {
  return (
    <div style={{ flex: 1, minHeight: "100vh", overflow: "auto" }}>

      {loading && (
        <div style={{ padding: 32 }}>
          <LoadingScreen />
        </div>
      )}

      {!loading && showForm && (
        <div style={{ padding: 32, maxWidth: 860, margin: "0 auto" }}>
          <NewDashboardForm onGenerate={onGenerate} error={error} />
        </div>
      )}

      {!loading && !showForm && dashboard && (
        <DashboardPage dashboard={dashboard} onNew={onNew} onEdit={onEdit} />
      )}

    </div>
  )
}