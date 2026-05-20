import type { CSSProperties } from "react";

export const PAGE_CLASS = "my-home-page";

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

export const space = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const fontFamily =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

/** @deprecated Prefer PAGE_CLASS on layout wrapper; kept for narrow forms */
export const page: CSSProperties = {
  width: "100%",
};

export const pageHeader: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: space.lg,
  marginBottom: space.xl,
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
  margin: `${space.xs}px 0 0`,
  fontSize: 15,
  lineHeight: 1.5,
  color: colors.textMuted,
};

export const h2: CSSProperties = {
  margin: `0 0 ${space.md}px`,
  fontSize: 17,
  fontWeight: 600,
  letterSpacing: "-0.01em",
  color: colors.text,
};

export const cardTitle: CSSProperties = {
  margin: `0 0 ${space.md}px`,
  fontSize: 15,
  fontWeight: 600,
  color: colors.text,
};

export const section: CSSProperties = {
  marginTop: space.xxl,
};

export const card: CSSProperties = {
  padding: space.lg,
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

export const listCard: CSSProperties = {
  ...card,
  padding: space.md,
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

export const bodyText: CSSProperties = {
  margin: 0,
  fontSize: 15,
  lineHeight: 1.6,
  color: colors.textSecondary,
};

export const meta: CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: colors.textFaint,
};

export const rowBetween: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: space.sm,
  flexWrap: "wrap",
};

export const statGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: space.lg,
};

export const statCard: CSSProperties = {};

export const statLabel: CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 500,
  color: colors.textMuted,
};

export const statValue: CSSProperties = {
  margin: `${space.xs}px 0 4px`,
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
  padding: space.xl,
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
  gap: space.lg,
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

export const btnPrimary: CSSProperties = {};

export const btnSecondary: CSSProperties = {};

export const stack: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: space.sm,
};

export const galleryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: space.md,
  marginTop: space.lg,
};

export const galleryImage: CSSProperties = {
  width: "100%",
  height: 168,
  objectFit: "cover",
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
};

export const definitionGrid: CSSProperties = {
  margin: 0,
  display: "grid",
  gridTemplateColumns: "120px 1fr",
  gap: "10px 16px",
  fontSize: 14,
};

export const definitionTerm: CSSProperties = {
  margin: 0,
  color: colors.textMuted,
  fontWeight: 500,
};

export const definitionDetail: CSSProperties = {
  margin: 0,
  color: colors.text,
};
