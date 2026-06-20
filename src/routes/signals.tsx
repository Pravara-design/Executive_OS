import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/page-header";
import { StrategicSignals, useDashboardData, computeIntelligence } from "./index";

export const Route = createFileRoute("/signals")({
  head: () => ({ meta: [{ title: "Strategic Signals, ExecutiveOS" }] }),
  component: SignalsPage,
});

function SignalsPage() {
  const { dataset, rows, kpis, forecast, intel, hasData } = useDashboardData();
  const resolvedIntel = intel ?? (hasData && dataset ? computeIntelligence(rows, dataset.schema) : null);
  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Strategic Signals"
        description="Board-ready conclusions, KPIs, trend, forecast and anomaly detection."
      />
      {!hasData || !kpis ? (
        <EmptyState
          title="No dataset briefed yet"
          description="Upload a dataset from the panel on the left, then your Strategic Signals will appear here."
        />
      ) : (
        <StrategicSignals kpis={kpis} forecast={forecast} intel={resolvedIntel!} dataset={dataset!} />
      )}
    </>
  );
}
