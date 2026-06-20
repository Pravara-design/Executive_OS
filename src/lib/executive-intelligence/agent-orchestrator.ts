// Agent Orchestrator — the single boundary the boardroom calls. Today it wraps
// the existing heuristic executiveDebate(); tomorrow swap the inner call for an
// LLM (OpenAI/Gemini) without changing the boardroom UI. Every reasoning step
// (per-agent take, referenced-decisions, conflicts, alignment) flows through
// the ExecutiveContext built by context-builder.ts.
import type { SimulationScenario } from "@/lib/api/types";
import {
  executiveDebate,
  type BoardroomAgentResponse,
  type BoardDecision,
} from "@/lib/api/mission";
import type { ExecutiveContext } from "./context-builder";
import { tokenize, tokenSimilarity } from "./memory-engine";
import type { RetrievedInitiative } from "./initiative-retriever";
import type { ExecutiveDecision } from "@/lib/api/types";

export interface ConflictFlag {
  with: string;          // initiative or decision title in conflict
  kind: "initiative" | "decision";
  reason: string;        // human-readable explanation
}

export interface OrchestratedAgentResponse extends BoardroomAgentResponse {
  referencedDecisions: ExecutiveDecision[];
}

export interface OrchestratedDebate {
  responses: OrchestratedAgentResponse[];
  decision: BoardDecision;
  conflicts: ConflictFlag[];
  strategicAlignment: number; // 0-100
  alignment: {
    alignedInitiatives: RetrievedInitiative[];
    supportingDecisions: ExecutiveDecision[];
  };
}

// Each agent has a "domain vocabulary" used to select which historical
// decisions it would naturally cite. This is the same surface an LLM tool
// description would consume.
const AGENT_DOMAIN: Record<BoardroomAgentResponse["agent"], string[]> = {
  CEO: ["growth", "market", "vision", "priority", "expansion", "company", "strategic"],
  CFO: ["margin", "profit", "cost", "capital", "cash", "budget", "investment", "finance"],
  CMO: ["marketing", "brand", "demand", "channel", "campaign", "customer", "acquisition"],
  COO: ["operations", "capacity", "execution", "process", "supply", "delivery", "headcount"],
  Risk: ["risk", "concentration", "exposure", "compliance", "hedge", "diversification"],
  Forecast: ["forecast", "trend", "projection", "scenario", "consistency", "trajectory"],
  Consultant: ["strategy", "transformation", "sequence", "prioritize", "gate"],
};

function pickReferencesFor(
  agent: BoardroomAgentResponse["agent"],
  question: string,
  pool: ExecutiveDecision[],
  limit = 2,
): ExecutiveDecision[] {
  if (!pool.length) return [];
  const domain = AGENT_DOMAIN[agent].join(" ");
  const scored = pool.map((d) => {
    const hay = `${d.question} ${d.decision} ${(d.next_actions || []).join(" ")}`;
    const qSim = tokenSimilarity(hay, question);
    const dSim = tokenSimilarity(hay, domain);
    return { d, score: qSim * 0.6 + dSim * 0.4 };
  });
  return scored
    .filter((x) => x.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.d);
}

// Heuristic conflict detection. Keyword-driven rules between the proposed
// action and (a) active/open initiatives and (b) open decisions.
function detectConflicts(action: string, ctx: ExecutiveContext): ConflictFlag[] {
  const a = action.toLowerCase();
  const flags: ConflictFlag[] = [];
  const wantsMoreMarketing = /(increase|raise|grow|expand|boost).{0,20}(marketing|spend|budget)/.test(a)
    || /\bmarketing\b.{0,20}(\+|increase|up\b)/.test(a);
  const wantsPriceDown = /(reduce|cut|lower|drop|discount).{0,20}(price|pricing)/.test(a) || /\bdiscount\b/.test(a);
  const wantsExpand = /(expand|new region|international|new market|launch)/.test(a);
  const wantsHire = /(hire|headcount|recruit|expand team|new team)/.test(a);

  const initiativesOpen = [...ctx.initiatives.active, ...ctx.initiatives.planned, ...ctx.initiatives.blocked];
  const margin = initiativesOpen.find((i) => /margin/i.test(i.title));
  const customerDiv = initiativesOpen.find((i) => /diversif|customer/i.test(i.title));
  const recovery = initiativesOpen.find((i) => /recovery|kpi|risk|hedge/i.test(i.title));

  if (margin && (wantsMoreMarketing || wantsPriceDown)) {
    flags.push({
      with: margin.title,
      kind: "initiative",
      reason: wantsMoreMarketing
        ? "Higher marketing spend compresses profitability while a margin-defense program is in-flight."
        : "A price reduction reverses the margin-defense thesis already in execution.",
    });
  }
  if (customerDiv && wantsExpand) {
    flags.push({
      with: customerDiv.title,
      kind: "initiative",
      reason: "Expansion adds new concentration before the diversification motion has rebalanced existing exposure.",
    });
  }
  if (recovery && wantsHire) {
    flags.push({
      with: recovery.title,
      kind: "initiative",
      reason: "Adding fixed cost during an active recovery sprint widens the gap to plan before lift materializes.",
    });
  }

  // Decision-level conflicts: open decision whose direction is opposite.
  ctx.relatedDecisions.open.forEach((d) => {
    const dt = `${d.decision} ${d.question}`.toLowerCase();
    const opposite =
      (wantsPriceDown && /(hold|raise|protect).{0,15}(price|margin)/.test(dt))
      || (wantsMoreMarketing && /(cut|reduce).{0,15}(spend|marketing|budget)/.test(dt));
    if (opposite) {
      flags.push({
        with: d.decision,
        kind: "decision",
        reason: "Directly reverses a prior board decision that is still in execution.",
      });
    }
  });

  return flags;
}

function computeAlignment(action: string, ctx: ExecutiveContext): {
  score: number;
  alignedInitiatives: RetrievedInitiative[];
  supportingDecisions: ExecutiveDecision[];
} {
  const a = action.toLowerCase();
  if (!a) return { score: 50, alignedInitiatives: [], supportingDecisions: [] };

  const initiativesOpen = [
    ...ctx.initiatives.active,
    ...ctx.initiatives.planned,
    ...ctx.missionPriorities,
  ];
  const aligned = initiativesOpen.filter((i) => {
    const sim = tokenSimilarity(`${i.title} ${i.why}`, action);
    return sim >= 0.12;
  });
  const supporting = ctx.relatedDecisions.related.filter((d) => {
    const sim = tokenSimilarity(`${d.decision} ${d.question}`, action);
    return sim >= 0.12;
  });

  // Base 45 + initiative alignment + decision alignment - conflict drag.
  const initWeight = Math.min(35, aligned.length * 12);
  const decWeight = Math.min(15, supporting.length * 6);
  const priorityBoost = aligned.some((i) => i.priority === "Critical") ? 6 : 0;
  const score = Math.max(0, Math.min(100, 45 + initWeight + decWeight + priorityBoost));
  return { score, alignedInitiatives: aligned, supportingDecisions: supporting };
}

/**
 * Single entry point for boardroom reasoning. Today the inner debate is the
 * heuristic engine in `mission.ts`. To plug in an LLM in the future, replace
 * the `executiveDebate` call with a fetch to OpenAI/Gemini that consumes the
 * same `ExecutiveContext` and returns the same `BoardroomAgentResponse[]` +
 * `BoardDecision` shape — no UI or call-site change required.
 */
export function orchestrate(
  context: ExecutiveContext,
  scenario?: SimulationScenario | null,
): OrchestratedDebate {
  const { question, intel } = context;
  const { responses, decision } = executiveDebate(question, intel, scenario);

  const referencePool = [
    ...context.relatedDecisions.related,
    ...context.relatedDecisions.open,
    ...context.relatedDecisions.similarHistorical,
  ];
  // Dedupe by id.
  const seen = new Set<string>();
  const pool = referencePool.filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));

  const enriched: OrchestratedAgentResponse[] = responses.map((r) => ({
    ...r,
    referencedDecisions: pickReferencesFor(r.agent, question, pool, 2),
  }));

  const conflicts = detectConflicts(decision.recommendedAction, context);
  const alignment = computeAlignment(decision.recommendedAction, context);
  // Conflict drag on alignment score.
  const strategicAlignment = Math.max(0, alignment.score - conflicts.length * 18);

  // Conflicts also nudge risk level if currently Low.
  if (conflicts.length && decision.riskLevel === "Low") {
    decision.riskLevel = "Medium";
  }

  return {
    responses: enriched,
    decision,
    conflicts,
    strategicAlignment,
    alignment: {
      alignedInitiatives: alignment.alignedInitiatives,
      supportingDecisions: alignment.supportingDecisions,
    },
  };
}

// Re-exports so call-sites only import from the orchestrator.
export type { ExecutiveContext } from "./context-builder";
export { buildExecutiveContext } from "./context-builder";
export { getRelevantDecisions } from "./decision-retriever";
export { getActiveInitiatives } from "./initiative-retriever";
