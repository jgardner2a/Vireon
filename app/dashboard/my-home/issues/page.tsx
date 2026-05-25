export default function IssuesPage() {
  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Issues</h1>
      <section className="dashboard-card" aria-label="Issues empty state">
        <p className="dashboard-subtitle" style={{ margin: 0 }}>
          No issues yet
        </p>
        <button type="button" className="dashboard-btn-primary">
          Create issue
        </button>
      </section>
    </div>
  );
}
