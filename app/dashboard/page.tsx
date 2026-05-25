/** Protected dashboard stub — auth gate is in layout.tsx */
export default function DashboardPage() {
  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Dashboard</h1>
      <p className="dashboard-subtitle">
        You are signed in. This workspace is a placeholder for future features.
      </p>
      <section className="dashboard-card" aria-label="Workspace status">
        <p className="dashboard-subtitle" style={{ margin: 0 }}>
          No application data is loaded in this build.
        </p>
      </section>
    </div>
  );
}
