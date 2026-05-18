import type { CSSProperties } from "react";

export const colors = {
  bg: "#f8fafc",
  surface: "#ffffff",
  text: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#64748b",
  textFaint: "#94a3b8",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",
  primary: "#0f172a",
  primaryHover: "#1e293b",
  danger: "#dc2626",
  accent: "#3b82f6",
  accentSoft: "#eff6ff",
} as const;

export const fontFamily =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export const page: CSSProperties = {
  maxWidth: 1120,
};

export const pageHeader: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 24,
  marginBottom: 32,
};

export const pageHeaderStack: CSSProperties = {
  flex: 1,
  minWidth: 0,
};

export const h1: CSSProperties = {
  margin: 0,
  fontSize: 28,
  fontWeight: 600,
  letterSpacing: "-0.025em",
  lineHeight: 1.25,
  color: colors.text,
};

export const subtitle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 15,
  lineHeight: 1.5,
  color: colors.textMuted,
};

export const h2: CSSProperties = {
  margin: "0 0 16px",
  fontSize: 17,
  fontWeight: 600,
  letterSpacing: "-0.01em",
  color: colors.text,
};

export const section: CSSProperties = {
  marginTop: 40,
};

export const card: CSSProperties = {
  padding: 20,
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

export const listCard: CSSProperties = {
  ...card,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

export const listCardTitle: CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: colors.text,
};

export const listCardBody: CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.5,
  color: colors.textSecondary,
};

export const meta: CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: colors.textFaint,
};

export const statGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 20,
};

export const statCard: CSSProperties = {
  ...card,
  padding: 20,
};

export const statLabel: CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 500,
  color: colors.textMuted,
};

export const statValue: CSSProperties = {
  margin: "8px 0 4px",
  fontSize: 32,
  fontWeight: 600,
  letterSpacing: "-0.03em",
  color: colors.text,
  lineHeight: 1.1,
};

export const statHint: CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: colors.textFaint,
};

export const emptyState: CSSProperties = {
  padding: 32,
  textAlign: "center",
  fontSize: 14,
  lineHeight: 1.5,
  color: colors.textMuted,
  background: colors.surface,
  border: `1px dashed ${colors.borderStrong}`,
  borderRadius: 12,
};

export const form: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

export const formNarrow: CSSProperties = {
  maxWidth: 480,
};

export const field: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

export const label: CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: colors.text,
};

export const input: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  fontSize: 14,
  lineHeight: 1.5,
  color: colors.text,
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
};

export const textarea: CSSProperties = {
  ...input,
  minHeight: 120,
  resize: "vertical",
  fontFamily: fontFamily,
};

export const btnPrimary: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 500,
  lineHeight: 1,
  color: "#fff",
  background: colors.primary,
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

export const btnSecondary: CSSProperties = {
  ...btnPrimary,
  color: colors.text,
  background: colors.surface,
  border: `1px solid ${colors.border}`,
};

export const stack: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

export const galleryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: 16,
  marginTop: 24,
};

export const galleryImage: CSSProperties = {
  width: "100%",
  height: 168,
  objectFit: "cover",
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
};
