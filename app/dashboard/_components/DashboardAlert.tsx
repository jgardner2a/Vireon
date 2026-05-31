"use client";

type DashboardAlertProps = {
  message: string;
  className?: string;
  /** @deprecated plan-limit is styled the same as error (red). */
  variant?: "error" | "plan-limit";
};

export function DashboardAlert({
  message,
  className = "",
  variant = "error",
}: DashboardAlertProps) {
  const resolvedVariant = variant === "plan-limit" ? "error" : variant;

  return (
    <p
      className={`dashboard-alert dashboard-alert--${resolvedVariant}${className ? ` ${className}` : ""}`}
      role="alert"
    >
      {message}
    </p>
  );
}
