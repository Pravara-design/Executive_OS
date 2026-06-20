// Phase 8 · Decision Pressure Engine — per-agent alignment scoring.
// Each agent gets four sub-scores then a composite Alignment Score 0-100.
//   · Strategic Alignment — does the action align with strategic objectives?
//   · Role Alignment      — does the action sit inside the agent's mandate?
//   · Goal Alignment      — does it advance the agent's stated goals?
//   · Risk Alignment      — is the action's risk acceptable to this agent?
import type { BoardroomAgentResponse, BoardDecision } from "@/lib/api/mission";
import type { ExecutiveContext } from "./context-builder";
import { AGENT_PERSONAS, type AgentId } from "./agent-personas";
import { tokenSimilarity } from "./memory-engine";

export interface AgentAlignment {
  agent: AgentId;
  strategic: number;
  role: number;
  goal: number;
  risk: number;
  score: number; // composite 0-100
}

// Risk tolerance per agent — higher = more comfortable with risk.
const RISK_TOLERANCE: Record<AgentId, number> = {
  CEO: 75, CFO: 35, COO: 50, CMO: 70, Risk: 25, Forecast: 55, Consultant: 60,
};

function riskToScore(level: BoardDecision["riskLevel"]) {
  return level === "Low" ? 25 : level === "Medium" ? 55 : 85;
}

export function computeAgentAlignment(
  response: BoardroomAgentResponse,
  decision: BoardDecision,
  ctx: ExecutiveContext,
  strategicAlignmentOverall: number,
): AgentAlignment {
  const persona = AGENT_PERSONAS[response.agent];
  const action = decision.recommendedAction;
  const domain = persona.domain.join(" ");
  const goals = persona.goals.join(" ");

  // Strategic: blend overall strategic alignment with action↔objectives similarity.
  const objText = ctx.strategicObjectives.map((o) => o.title).join(" ");
  const objSim = objText ? tokenSimilarity(action, objText) : 0;
  const strategic = Math.round(Math.max(0, Math.min(100, strategicAlignmentOverall * 0.6 + objSim * 100 * 0.4)));

  // Role: action vs agent domain vocabulary.
  const roleSim = tokenSimilarity(action, domain);
  const role = Math.round(Math.max(0, Math.min(100, 40 + roleSim * 100 * 0.8)));

  // Goal: agent's support × goal-keyword overlap with the action.
  const goalSim = tokenSimilarity(action, goals);
  const goal = Math.round(Math.max(0, Math.min(100, response.support * 0.55 + goalSim * 100 * 0.45)));

  // Risk: distance between agent tolerance and decision risk.
  const decisionRisk = riskToScore(decision.riskLevel);
  const tolerance = RISK_TOLERANCE[response.agent];
  const distance = Math.abs(decisionRisk - tolerance);
  const risk = Math.round(Math.max(0, Math.min(100, 100 - distance * 1.1)));

  const score = Math.round(strategic * 0.3 + role * 0.25 + goal * 0.25 + risk * 0.2);
  return { agent: response.agent, strategic, role, goal, risk, score };
}

export function computeAllAlignments(
  responses: BoardroomAgentResponse[],
  decision: BoardDecision,
  ctx: ExecutiveContext,
  strategicAlignmentOverall: number,
): AgentAlignment[] {
  return responses.map((r) => computeAgentAlignment(r, decision, ctx, strategicAlignmentOverall));
}
