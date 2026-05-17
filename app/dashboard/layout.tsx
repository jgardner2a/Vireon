export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: "yellow", padding: 40 }}>
      <h1>LAYOUT IS LOADING</h1>
      {children}
    </div>
  );
}