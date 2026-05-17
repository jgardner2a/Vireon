export default function Dashboard() {
  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Vireon Dashboard</h1>

      <p>Welcome back.</p>

      <section style={{ marginTop: 30 }}>
        <h2>Your Properties</h2>
        <div style={{ padding: 20, border: "1px solid #ddd", marginTop: 10 }}>
          No properties yet.
        </div>
      </section>

      <section style={{ marginTop: 30 }}>
        <h2>Vireon IQ</h2>
        <div style={{ padding: 20, border: "1px solid #ddd", marginTop: 10 }}>
          Score: -- (not calculated yet)
        </div>
      </section>

      <section style={{ marginTop: 30 }}>
        <h2>Actions</h2>
        <ul>
          <li>Upload property evidence</li>
          <li>Create new report</li>
          <li>View history</li>
        </ul>
      </section>
    </main>
  );
}
