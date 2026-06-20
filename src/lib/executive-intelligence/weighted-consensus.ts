// Phase 8 · Weighted Consensus Engine — replaces equal voting with a
// role-weighted average that mirrors a real executive committee.
import type { BoardroomAgentResponse } from "@/lib/api/mission";
import type { AgentId } from "./agent-personas";

export const VOTE_WEIGHTS: Record<AgentId, number> = {
  CEO: 0.25,
  CFO: 0.20,
  COO: 0.15,
  CMO: 0.15,
  Risk: 0.10,
  Forecast: 0.10,
  Consultant: 0.05,
};

export interface WeightedContribution {
  agent: AgentId;
  support: number;
  weight: number;
  contribution: number; // support × weight
}

export interface WeightedConsensus {
  score: number; // 0-100
  contributions: WeightedContribution[];
  totalWeight: number;
}

export function computeWeightedConsensus(responses: BoardroomAgentResponse[]): WeightedConsensus {
  const contributions: WeightedContribution[] = responses.map((r) => {
    const weight = VOTE_WEIGHTS[r.agent] ?? 0;
    return {
      agent: r.agent,
      support: r.support,
      weight,
      contribution: r.support * weight,
    };
  });
  const totalWeight = contributions.reduce((a, c) => a + c.weight, 0) || 1;
  const score = Math.round(contributions.reduce((a, c) => a + c.contribution, 0) / totalWeight);
  return { score, contributions, totalWeight };
}
