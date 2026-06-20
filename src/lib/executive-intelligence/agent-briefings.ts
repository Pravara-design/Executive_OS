// Phase 8 · Agent Context Filtering — role-specific briefing packets.
// Instead of every agent receiving the entire ExecutiveContext, each persona
// gets only the slice it needs to reason. The Consultant alone receives the
// full briefing (it's the synthesis role). The shape is intentionally a flat
// JSON object — drop-in for a future LLM tool/function input.
import type { ExecutiveContext } from "./context-builder";
import type { AgentId } from "./agent-personas";

export interface AgentBriefing {
  agent: AgentId;
  focus: string;
  sections: string[];        // ordered labels of what's included
  data: Record<string, unknown>;
}

function kpiByKey(ctx: ExecutiveContext, keys: string[]) {
  return (ctx.kpis?.metrics ?? [])
    .filter((m) => keys.includes(m.key))
    .map((m) => ({ key: m.key, label: m.label, value: m.value, delta: m.delta }));
}

export function buildAgentBriefing(agent: AgentId, ctx: ExecutiveContext): AgentBriefing {
  const intel = ctx.intel;
  const base = { question: ctx.question, hasIntel: !!intel };

  switch (agent) {
    case "CEO":
      return {
        agent, focus: "Growth · Strategic Positioning",
        sections: ["Growth Metrics", "Strategic Objectives", "Expansion Initiatives", "Market Positioning", "Historical Decisions"],
        data: {
          ...base,
          growthMetrics: kpiByKey(ctx, ["revenue", "growth"]),
          growthPct: intel?.growthPct ?? null,
          trendDirection: intel?.trendDirection ?? null,
          strategicObjectives: ctx.strategicObjectives.map((o) => ({ title: o.title, priority: o.priority, progress: o.progress })),
          expansionInitiatives: [...ctx.initiatives.active, ...ctx.initiatives.planned]
            .filter((i) => /expan|launch|new|grow|market/i.test(`${i.title} ${i.why}`))
            .map((i) => ({ title: i.title, status: i.status, priority: i.priority })),
          marketPositioning: {
            categoryLeader: intel?.bestCategory?.name ?? null,
            regionLeader: intel?.bestRegion?.name ?? null,
            categoryShare: intel?.categoryConcentrationPct ?? null,
          },
          historicalDecisions: ctx.relatedDecisions.related.slice(0, 3).map((d) => ({ decision: d.decision, status: d.status, consensus: d.consensus_score })),
        },
      };
    case "CFO":
      return {
        agent, focus: "Margin · Profitability · Capital",
        sections: ["Margin Metrics", "Profitability", "ROI Signals", "Capital Allocation", "Forecast Risk"],
        data: {
          ...base,
          marginPct: intel?.marginPct ?? null,
          totalProfit: intel?.totalProfit ?? null,
          totalRevenue: intel?.totalRevenue ?? null,
          marginMetrics: kpiByKey(ctx, ["margin", "profit"]),
          marketingRoi: intel?.marketingRoi ?? null,
          forecastRisk: {
            consistency: intel?.trendConsistency ?? null,
            upsidePct: intel?.forecastUpsidePct ?? null,
          },
          capitalAllocation: ctx.initiatives.active.map((i) => ({ title: i.title, owner: i.owner, priority: i.priority })),
        },
      };
    case "CMO":
      return {
        agent, focus: "Demand · Brand · Channels",
        sections: ["Customer Metrics", "Growth", "Demand Signals", "Brand Initiatives", "Market Opportunities"],
        data: {
          ...base,
          customerConcentrationPct: intel?.customerConcentrationPct ?? null,
          topCustomers: intel?.topCustomers?.slice(0, 5).map((c) => ({ name: c.name, share: c.share })) ?? [],
          growthMetrics: kpiByKey(ctx, ["revenue", "growth"]),
          demandSignals: intel?.highlights?.filter((h) => /customer|demand|category|growth/i.test(h)) ?? [],
          brandInitiatives: [...ctx.initiatives.active, ...ctx.initiatives.planned]
            .filter((i) => /brand|market|customer|demand|campaign/i.test(`${i.title} ${i.why}`))
            .map((i) => ({ title: i.title, status: i.status })),
          marketOpportunities: {
            bestCategory: intel?.bestCategory?.name ?? null,
            bestRegion: intel?.bestRegion?.name ?? null,
          },
        },
      };
    case "COO":
      return {
        agent, focus: "Execution · Capacity · Delivery",
        sections: ["Execution Status", "Capacity Utilization", "Delivery Confidence", "Operational Readiness"],
        data: {
          ...base,
          executionStatus: ctx.executionStatus,
          activeInitiatives: ctx.initiatives.active.map((i) => ({ title: i.title, progress: i.progress, status: i.status, owner: i.owner })),
          blockedInitiatives: ctx.initiatives.blocked.map((i) => ({ title: i.title, owner: i.owner })),
          capacityUtilization: Math.min(100, (ctx.initiatives.active.length + ctx.initiatives.blocked.length) * 18),
          deliveryConfidence: ctx.executionStatus.avgProgress,
        },
      };
    case "Risk":
      return {
        agent, focus: "Concentration · Forecast · Execution Risk",
        sections: ["Concentration", "Forecast Consistency", "Execution Risk", "Initiative Dependencies"],
        data: {
          ...base,
          concentration: {
            category: intel?.categoryConcentrationPct ?? null,
            region: intel?.regionConcentrationPct ?? null,
            customer: intel?.customerConcentrationPct ?? null,
          },
          forecastConsistency: intel?.trendConsistency ?? null,
          executionRisk: {
            blocked: ctx.initiatives.blocked.length,
            avgProgress: ctx.executionStatus.avgProgress,
            openDecisions: ctx.relatedDecisions.open.length,
          },
          initiativeDependencies: ctx.initiatives.active.slice(0, 4).map((i) => ({ title: i.title, priority: i.priority })),
        },
      };
    case "Forecast":
      return {
        agent, focus: "Trend · Variance · Scenarios",
        sections: ["Trend Metrics", "Historical Performance", "Variance", "Scenario Assumptions"],
        data: {
          ...base,
          trendDirection: intel?.trendDirection ?? null,
          trendConsistency: intel?.trendConsistency ?? null,
          growthPct: intel?.growthPct ?? null,
          forecastUpsidePct: intel?.forecastUpsidePct ?? null,
          historicalPerformance: {
            avgConsensus: ctx.memoryStats.avgConsensus,
            successRate: ctx.memoryStats.successRate,
            totalDecisions: ctx.memoryStats.total,
          },
          variance: 100 - (intel?.trendConsistency ?? 50),
          scenarioAssumptions: ctx.kpis?.series?.slice(-4) ?? [],
        },
      };
    case "Consultant":
      return {
        agent, focus: "Full Synthesis",
        sections: ["Full Executive Context"],
        data: {
          ...base,
          intel: intel ?? null,
          kpiSummary: ctx.kpis?.metrics ?? [],
          strategicObjectives: ctx.strategicObjectives,
          initiatives: {
            active: ctx.initiatives.active.length,
            planned: ctx.initiatives.planned.length,
            blocked: ctx.initiatives.blocked.length,
            highPriority: ctx.initiatives.highPriority.length,
          },
          memoryStats: ctx.memoryStats,
          relatedDecisions: ctx.relatedDecisions.related.length,
          openDecisions: ctx.relatedDecisions.open.length,
        },
      };
  }
}

export function buildAllBriefings(ctx: ExecutiveContext): AgentBriefing[] {
  return (["CEO", "CFO", "CMO", "COO", "Risk", "Forecast", "Consultant"] as AgentId[])
    .map((a) => buildAgentBriefing(a, ctx));
}
