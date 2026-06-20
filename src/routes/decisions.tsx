import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/page-header";
import { ActiveDecisions, useDashboardData, computeIntelligence } from "./index";

export const Route = createFileRoute("/decisions")({
  head: () => ({ meta: [{ title: "Decisions Requiring Attention, ExecutiveOS" }] }),
  component: DecisionsPage,
});

function DecisionsPage() {
  const { dataset, rows, kpis, intel, hasData } = useDashboardData();
  const resolvedIntel = intel ?? (hasData && dataset ? computeIntelligence(rows, dataset.schema) : null);
  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Decisions Requiring Attention"
        description="What needs a call from you, escalated from signals and risk."
      />
      {!hasData ? (
        <EmptyState
          title="No decisions pending"
          description="Upload a dataset from the panel on the left and decisions will surface here once your team flags risk."
        />
      ) : (
        <ActiveDecisions kpis={kpis} intel={resolvedIntel} hasData={hasData} onUpload={() => {}} />
      )}
    </>
  );
}
