// Executive Prompt Builder — assembles the exact payload that will be sent
// to a future LLM provider (OpenAI / Claude / Gemini). This file is an
// inspection layer only: it does not call any external service.
import type { ExecutiveContext } from "./context-builder";
import { AGENT_PERSONAS, AGENT_ORDER, type AgentId, type AgentPersona } from "./agent-personas";
import type { ExecutiveDecision } from "@/lib/api/types";
import { tokenSimilarity } from "./memory-engine";

export interface AgentPromptObject {
  role: AgentId;
  title: string;
  decisionStyle: AgentPersona["decisionStyle"];
  goals: string[];
  metrics: string[];
  domain: string[];
  currentQuestion: string;
  historicalContext: Array<{
    decision: string;
    question: string;
    status: ExecutiveDecision["status"];
    consensus: number;
    daysAgo: number;
  }>;
  activeInitiatives: Array<{ title: string; status: string; progress: number }>;
  kpiSummary: Array<{ label: string; value: number; format: string; delta?: number | null }>;
  strategicObjectives: Array<{ title: string; priority: string; progress: number }>;
  expectedSchema: {
    observation: "string";
    insight: "string";
    recommendation: "string";
    rationale: "string";
    stance: "Support | Conditional | Neutral | Oppose";
    support: "0-100";
    confidence: "0-100";
  };
}

export interface ExecutivePromptBundle {
  systemPrompt: string;
  userPrompt: string;
  contextPayload: Record<string, unknown>;
  agentPrompts: AgentPromptObject[];
}

const SYSTEM_PROMPT_BASE = `You are the orchestrator of ExecutiveOS — a virtual C-suite that debates strategic questions
grounded in real business intelligence and historical decisions. For each round you will receive:
1. A strategic question from the human operator.
2. A briefing object: KPIs, intelligence, active initiatives, strategic objectives.
3. Executive memory: prior board decisions with their status and outcomes.
4. Per-agent persona cards (CEO, CFO, CMO, COO, Risk, Forecast, Consultant).

You must reason per agent in character, produce a structured response per agent, then synthesize
a single board decision. Always cite the historical decisions and active initiatives you relied on.
Never hallucinate KPIs. If a value is missing in the briefing, say so explicitly. Conflicts with
in-flight initiatives must be surfaced. Decisions must include guardrails and success metrics.`;

function historicalContextFor(persona: AgentPersona, ctx: ExecutiveContext, limit = 3) {
  const pool = [
    ...ctx.relatedDecisions.related,
    ...ctx.relatedDecisions.open,
    ...ctx.relatedDecisions.similarHistorical,
  ];
  const seen = new Set<string>();
  const dedup = pool.filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));
  const domain = persona.domain.join(" ");
  return dedup
    .map((d) => ({
      d,
      score:
        tokenSimilarity(`${d.question} ${d.decision}`, ctx.question) * 0.6 +
        tokenSimilarity(`${d.question} ${d.decision}`, domain) * 0.4,
    }))
    .filter((x) => x.score > 0.04)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => ({
      decision: x.d.decision,
      question: x.d.question,
      status: x.d.status,
      consensus: x.d.consensus_score,
      daysAgo: Math.max(0, Math.round((Date.now() - new Date(x.d.created_at).getTime()) / 86400000)),
    }));
}

export function buildAgentPrompts(ctx: ExecutiveContext): AgentPromptObject[] {
  const kpiSummary = (ctx.kpis?.metrics ?? []).map((m) => ({
    label: m.label,
    value: m.value,
    format: m.format,
    delta: m.delta ?? null,
  }));
  const strategicObjectives = ctx.strategicObjectives.map((o) => ({
    title: o.title,
    priority: o.priority,
    progress: o.progress,
  }));
  const activeInitiatives = [...ctx.initiatives.active, ...ctx.missionPriorities]
    .filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i)
    .slice(0, 5)
    .map((i) => ({ title: i.title, status: i.status, progress: i.progress }));

  return AGENT_ORDER.map((id) => {
    const p = AGENT_PERSONAS[id];
    return {
      role: p.id,
      title: p.title,
      decisionStyle: p.decisionStyle,
      goals: p.goals,
      metrics: p.metrics,
      domain: p.domain,
      currentQuestion: ctx.question,
      historicalContext: historicalContextFor(p, ctx),
      activeInitiatives,
      kpiSummary,
      strategicObjectives,
      expectedSchema: {
        observation: "string",
        insight: "string",
        recommendation: "string",
        rationale: "string",
        stance: "Support | Conditional | Neutral | Oppose",
        support: "0-100",
        confidence: "0-100",
      },
    };
  });
}

export function buildContextPayload(ctx: ExecutiveContext): Record<string, unknown> {
  return {
    question: ctx.question,
    timestamp: new Date().toISOString(),
    intelligence: ctx.intel
      ? {
          totalRevenue: ctx.intel.totalRevenue,
          growthPct: ctx.intel.growthPct,
          marginPct: ctx.intel.marginPct,
          forecastConsistency: ctx.intel.trendConsistency,
          categoryConcentrationPct: ctx.intel.categoryConcentrationPct,
          customerConcentrationPct: ctx.intel.customerConcentrationPct,
        }
      : null,
    kpis: (ctx.kpis?.metrics ?? []).map((m) => ({ label: m.label, value: m.value, format: m.format, delta: m.delta ?? null })),
    strategicObjectives: ctx.strategicObjectives.map((o) => ({
      title: o.title,
      priority: o.priority,
      progress: o.progress,
      owner: o.owner,
    })),
    initiatives: {
      active: ctx.initiatives.active.map((i) => ({ title: i.title, status: i.status, progress: i.progress })),
      planned: ctx.initiatives.planned.map((i) => i.title),
      blocked: ctx.initiatives.blocked.map((i) => i.title),
    },
    memory: {
      total: ctx.memoryStats.total,
      inFlight: ctx.memoryStats.inFlight,
      avgConsensus: ctx.memoryStats.avgConsensus,
      successRate: ctx.memoryStats.successRate,
      relevant: ctx.relatedDecisions.related.map((d) => ({
        decision: d.decision,
        status: d.status,
        consensus: d.consensus_score,
      })),
      openDecisions: ctx.relatedDecisions.open.map((d) => ({ decision: d.decision, status: d.status })),
    },
  };
}

export function buildUserPrompt(ctx: ExecutiveContext): string {
  const intel = ctx.intel;
  const lines: string[] = [];
  lines.push(`STRATEGIC QUESTION: ${ctx.question}`);
  lines.push("");
  lines.push("BUSINESS SNAPSHOT");
  if (intel) {
    lines.push(`- Revenue: ${intel.totalRevenue} · Growth: ${intel.growthPct}% · Margin: ${intel.marginPct}%`);
    lines.push(`- Forecast consistency: ${intel.trendConsistency}% · Category concentration: ${intel.categoryConcentrationPct}% · Customer concentration: ${intel.customerConcentrationPct}%`);
  } else {
    lines.push("- (no intelligence available)");
  }
  lines.push("");
  lines.push("ACTIVE INITIATIVES");
  if (ctx.initiatives.active.length === 0) lines.push("- None");
  ctx.initiatives.active.slice(0, 5).forEach((i) => lines.push(`- ${i.title} (${i.status} · ${i.progress}% complete)`));
  lines.push("");
  lines.push("RELEVANT PRIOR DECISIONS");
  if (ctx.relatedDecisions.related.length === 0) lines.push("- None");
  ctx.relatedDecisions.related.slice(0, 4).forEach((d) =>
    lines.push(`- "${d.decision}" — status ${d.status}, consensus ${d.consensus_score}/100`),
  );
  lines.push("");
  lines.push(
    "Produce: per-agent response (observation/insight/recommendation/rationale/stance/support/confidence), then a single synthesized BoardDecision with strategic objective, owner, timeline, success metrics, guardrails, and any strategic conflicts.",
  );
  return lines.join("\n");
}

export function buildExecutivePrompt(ctx: ExecutiveContext): ExecutivePromptBundle {
  return {
    systemPrompt: SYSTEM_PROMPT_BASE,
    userPrompt: buildUserPrompt(ctx),
    contextPayload: buildContextPayload(ctx),
    agentPrompts: buildAgentPrompts(ctx),
  };
}
