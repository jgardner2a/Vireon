export default function NotesPage() {
  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Notes</h1>
      <section className="dashboard-card" aria-label="Notes empty state">
        <p className="dashboard-subtitle" style={{ margin: 0 }}>
          No notes yet
        </p>
        <button type="button" className="dashboard-btn-primary">
          Add note
        </button>
      </section>
    </div>
  );
}
