export default function Dashboard() {
  return (
    <div>
      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>
          Dashboard
        </h1>
        <p style={{ color: "#666" }}>
          Your rental overview and activity
        </p>
      </div>

      {/* GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        {/* CARD 1 */}
        <div style={card}>
          <h3 style={cardTitle}>Properties</h3>
          <p style={cardValue}>0</p>
          <p style={cardSub}>Saved homes</p>
        </div>

        {/* CARD 2 */}
        <div style={card}>
          <h3 style={cardTitle}>Open Issues</h3>
          <p style={cardValue}>0</p>
          <p style={cardSub}>Needs attention</p>
        </div>

        {/* CARD 3 */}
        <div style={card}>
          <h3 style={cardTitle}>Vault Entries</h3>
          <p style={cardValue}>0</p>
          <p style={cardSub}>Stored evidence</p>
        </div>
      </div>

      {/* RECENT ACTIVITY */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
          Recent Activity
        </h2>

        <div style={emptyState}>
          No activity yet — add your first property or issue.
        </div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  padding: 16,
  border: "1px solid #eaeaea",
  borderRadius: 12,
  background: "#fff",
};

const cardTitle: React.CSSProperties = {
  fontSize: 14,
  color: "#666",
  marginBottom: 8,
};

const cardValue: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  margin: 0,
};

const cardSub: React.CSSProperties = {
  fontSize: 12,
  color: "#888",
};

const emptyState: React.CSSProperties = {
  padding: 20,
  border: "1px dashed #ddd",
  borderRadius: 12,
  color: "#888",
  background: "#fafafa",
};