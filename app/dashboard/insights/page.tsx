"use client";

import { PlanFeatureGate } from "@/app/dashboard/_components/PlanFeatureGate";
import "./insights.css";

function InsightsContent() {
  return (
    <div className="dashboard-container">
      <header className="insights-header">
        <h1 className="dashboard-title">Insights</h1>
        <p className="dashboard-subtitle">
          Documentation trends and summaries for your active property.
        </p>
      </header>

      <section className="insights-section" aria-label="Insights content">
        <div className="insights-card">
          <p className="insights-placeholder">Insights coming soon.</p>
        </div>
      </section>
    </div>
  );
}

export default function InsightsPage() {
  return (
    <PlanFeatureGate
      feature="insights"
      title="Insights"
      description="Documentation trends and summaries for your active property."
    >
      <InsightsContent />
    </PlanFeatureGate>
  );
}
