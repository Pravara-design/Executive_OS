import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { ExecutiveTeam, useDashboardData } from "./index";

export const Route = createFileRoute("/team")({
  head: () => ({ meta: [{ title: "Executive Team Activity, ExecutiveOS" }] }),
  component: TeamPage,
});

function TeamPage() {
  const { hasData } = useDashboardData();
  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Executive Team Activity"
        description="Your AI C-suite, and what each officer is working on right now."
      />
      <ExecutiveTeam hasData={hasData} />
    </>
  );
}
