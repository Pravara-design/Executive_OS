// Phase 8 · Agent Influence Engine — derives a historical "accuracy" score
// for each agent from Executive Memory. Today the underlying memory does not
// store per-agent stances, so accuracy is inferred from outcomes of the
// decisions each persona's domain most resembles. This is a deterministic
// stand-in that any future LLM-or-survey signal can replace without changing
// the public shape.
import type { ExecutiveDecision } from "@/lib/api/types";
import { AGENT_PERSONAS, AGENT_ORDER, type AgentId } from "./agent-personas";
import { tokenSimilarity } from "./memory-engine";

export interface AgentInfluence {
  agent: AgentId;
  accuracy: number;        // 0-100
  decisionsConsidered: number;
  completedShare: number;  // 0-100
  notes: string;
}

const BASELINE: Record<AgentId, number> = {
  CEO: 68, CFO: 74, COO: 70, CMO: 66, Risk: 78, Forecast: 72, Consultant: 71,
};

export function computeAgentInfluence(memory: ExecutiveDecision[]): AgentInfluence[] {
  return AGENT_ORDER.map<AgentInfluence>((agent) => {
    const persona = AGENT_PERSONAS[agent];
    const domain = persona.domain.join(" ");
    const scored = memory
      .map((d) => ({ d, score: tokenSimilarity(`${d.question} ${d.decision}`, domain) }))
      .filter((x) => x.score > 0.05);

    if (scored.length === 0) {
      return {
        agent,
        accuracy: BASELINE[agent],
        decisionsConsidered: 0,
        completedShare: 0,
        notes: "No matching prior decisions yet — using calibrated baseline.",
      };
    }

    const completed = scored.filter((x) => x.d.status === "Completed").length;
    const inProg = scored.filter((x) => x.d.status === "In Progress").length;
    const blocked = scored.filter((x) => x.d.status === "Blocked").length;
    const avgConsensus = Math.round(scored.reduce((a, x) => a + x.d.consensus_score, 0) / scored.length);
    const avgProgress = Math.round(scored.reduce((a, x) => a + x.d.progress, 0) / scored.length);

    // Accuracy = blend of completed share, average progress, average consensus
    // (consensus is a proxy for the board agreeing with the call), softly
    // anchored to the persona baseline.
    const completedShare = Math.round((completed / scored.length) * 100);
    const raw = completedShare * 0.4 + avgProgress * 0.3 + avgConsensus * 0.2 + BASELINE[agent] * 0.1;
    const accuracy = Math.max(0, Math.min(100, Math.round(raw - blocked * 4)));

    return {
      agent,
      accuracy,
      decisionsConsidered: scored.length,
      completedShare,
      notes: `${completed} completed · ${inProg} in flight · ${blocked} blocked across ${scored.length} domain-matched decisions.`,
    };
  });
}
