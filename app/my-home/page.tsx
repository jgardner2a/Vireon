import {
  emptyState,
  h1,
  h2,
  page,
  section,
  statCard,
  statGrid,
  statHint,
  statLabel,
  statValue,
  subtitle,
  pageHeader,
  pageHeaderStack,
} from "./ui";

export default function Dashboard() {
  return (
    <div style={page}>
      <header style={pageHeader}>
        <div style={pageHeaderStack}>
          <h1 style={h1}>Dashboard</h1>
          <p style={subtitle}>Your rental overview and activity</p>
        </div>
      </header>

      <div style={statGrid}>
        <div style={statCard}>
          <p style={statLabel}>Properties</p>
          <p style={statValue}>0</p>
          <p style={statHint}>Saved homes</p>
        </div>

        <div style={statCard}>
          <p style={statLabel}>Open issues</p>
          <p style={statValue}>0</p>
          <p style={statHint}>Needs attention</p>
        </div>

        <div style={statCard}>
          <p style={statLabel}>Vault entries</p>
          <p style={statValue}>0</p>
          <p style={statHint}>Stored evidence</p>
        </div>
      </div>

      <section style={section}>
        <h2 style={h2}>Recent activity</h2>
        <div style={emptyState}>
          No activity yet — add your first property or issue.
        </div>
      </section>
    </div>
  );
}
