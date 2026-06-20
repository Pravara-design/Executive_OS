// Board Decision Framework — promotes the heuristic BoardDecision into the
// canonical schema the future LLM contract will return. The orchestrator
// hydrates this object from the debate + consensus engine + alignment data.
import type { BoardDecision } from "@/lib/api/mission";
import type { AgentId } from "./agent-personas";
import type { ConsensusBreakdown } from "./consensus-engine";
import type { ExecutiveContext } from "./context-builder";

export interface BoardDecisionRecord {
  recommendedAction: string;
  strategicObjective: string;
  owner: string;
  timeline: string;
  expectedRevenueImpact: string;
  expectedProfitImpact: string;
  riskLevel: BoardDecision["riskLevel"];
  confidence: number;
  consensusScore: number;
  strategicAlignmentScore: number;
  supportingAgents: AgentId[];
  conditionalAgents: AgentId[];
  opposingAgents: AgentId[];
  successMetrics: string[];
  requiredGuardrails: string[];
}

function deriveObjective(action: string, context: ExecutiveContext): string {
  const a = action.toLowerCase();
  // Prefer an aligned mission objective whose title overlaps the action.
  const aligned = context.strategicObjectives.find((o) =>
    a.includes(o.title.toLowerCase().split(" ")[0]),
  );
  if (aligned) return aligned.title;
  if (/margin|profit|cost/.test(a)) return "Defend Profitability";
  if (/expand|launch|new market|new region/.test(a)) return "Accelerate Growth";
  if (/risk|hedge|diversif|concentration/.test(a)) return "Reduce Strategic Risk";
  if (/customer|retention|churn/.test(a)) return "Strengthen Customer Base";
  if (/execution|operational|capacity|hire/.test(a)) return "Build Execution Capacity";
  return context.strategicObjectives[0]?.title ?? "Strategic Priority";
}

function successMetricsFor(action: string): string[] {
  const a = action.toLowerCase();
  const out: string[] = [];
  if (/margin|profit|cost/.test(a)) out.push("Gross margin +200bps within 2 quarters");
  if (/revenue|growth|expand|launch/.test(a)) out.push("New-bookings run-rate +15% by Q+2");
  if (/customer|retention|churn/.test(a)) out.push("Net retention >= 105% within 90 days");
  if (/risk|hedge|diversif|concentration/.test(a)) out.push("Top-customer concentration reduced 500bps");
  if (/forecast|trend|trajectory/.test(a)) out.push("Forecast variance under 8% two periods running");
  if (!out.length) {
    out.push("Plan-attainment >= 95% at first checkpoint");
    out.push("Decision NPV positive within 2 quarters");
  }
  return out.slice(0, 3);
}

function guardrailsFor(action: string, riskLevel: BoardDecision["riskLevel"]): string[] {
  const a = action.toLowerCase();
  const rails: string[] = [];
  if (/marketing|spend|campaign/.test(a)) rails.push("Cap incremental marketing at 1.2x payback or pause");
  if (/price|pricing|discount/.test(a)) rails.push("Roll back if gross margin drops > 150bps in any month");
  if (/hire|headcount/.test(a)) rails.push("Hire under a 2-quarter productivity ramp gate");
  if (/expand|launch|new market|new region/.test(a)) rails.push("Stage-gate: kill if pipeline coverage < 2.5x");
  if (/discount|cut|reduce/.test(a)) rails.push("Hold a 5% margin floor — no exceptions without CFO sign-off");
  if (riskLevel === "High") rails.push("Weekly board check-in until risk level steps down");
  if (rails.length < 2) rails.push("Re-evaluate at 30 days against success metrics");
  return rails.slice(0, 4);
}

export function buildDecisionRecord(
  decision: BoardDecision,
  consensus: ConsensusBreakdown,
  context: ExecutiveContext,
  strategicAlignmentScore: number,
): BoardDecisionRecord {
  const supportingAgents = consensus.agents.filter((a) => a.stance === "Support").map((a) => a.agent);
  const conditionalAgents = consensus.agents.filter((a) => a.stance === "Conditional" || a.stance === "Neutral").map((a) => a.agent);
  const opposingAgents = consensus.agents.filter((a) => a.stance === "Oppose").map((a) => a.agent);

  return {
    recommendedAction: decision.recommendedAction,
    strategicObjective: deriveObjective(decision.recommendedAction, context),
    owner: decision.recommendedOwner,
    timeline: decision.timeline,
    expectedRevenueImpact: decision.expectedRevenueImpact,
    expectedProfitImpact: decision.expectedProfitImpact,
    riskLevel: decision.riskLevel,
    confidence: decision.confidence,
    consensusScore: consensus.consensusScore,
    strategicAlignmentScore,
    supportingAgents,
    conditionalAgents,
    opposingAgents,
    successMetrics: successMetricsFor(decision.recommendedAction),
    requiredGuardrails: guardrailsFor(decision.recommendedAction, decision.riskLevel),
  };
}
