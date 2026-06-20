// Dynamic Consensus Engine — translates per-agent support scores into a
// transparent consensus distribution. Replaces the prior "average support"
// shortcut so the UI can show how the number was actually computed.
import type { BoardroomAgentResponse } from "@/lib/api/mission";

export type Stance = "Support" | "Conditional" | "Neutral" | "Oppose";

export interface AgentStance {
  agent: BoardroomAgentResponse["agent"];
  stance: Stance;
  score: number;       // normalized stance score (0/50/60/100)
  rawSupport: number;  // original 0-100 support from debate engine
  confidence: number;
}

export interface ConsensusBreakdown {
  agents: AgentStance[];
  supportCount: number;
  conditionalCount: number;
  neutralCount: number;
  opposeCount: number;
  averageScore: number;       // average of stance scores
  averageRawSupport: number;  // average of raw supports
  consensusScore: number;     // canonical headline score (uses stance scores)
  distribution: Array<{ stance: Stance; count: number; pct: number }>;
}

export function classify(support: number): { stance: Stance; score: number } {
  if (support >= 75) return { stance: "Support", score: 100 };
  if (support >= 60) return { stance: "Conditional", score: 60 };
  if (support >= 45) return { stance: "Neutral", score: 50 };
  return { stance: "Oppose", score: 0 };
}

export function calculateConsensus(responses: BoardroomAgentResponse[]): ConsensusBreakdown {
  const agents: AgentStance[] = responses.map((r) => {
    const c = classify(r.support);
    return {
      agent: r.agent,
      stance: c.stance,
      score: c.score,
      rawSupport: r.support,
      confidence: r.confidence,
    };
  });

  const supportCount = agents.filter((a) => a.stance === "Support").length;
  const conditionalCount = agents.filter((a) => a.stance === "Conditional").length;
  const neutralCount = agents.filter((a) => a.stance === "Neutral").length;
  const opposeCount = agents.filter((a) => a.stance === "Oppose").length;

  const n = Math.max(1, agents.length);
  const averageScore = Math.round(agents.reduce((a, b) => a + b.score, 0) / n);
  const averageRawSupport = Math.round(agents.reduce((a, b) => a + b.rawSupport, 0) / n);

  const distribution: ConsensusBreakdown["distribution"] = (
    ["Support", "Conditional", "Neutral", "Oppose"] as Stance[]
  ).map((stance) => {
    const count = agents.filter((a) => a.stance === stance).length;
    return { stance, count, pct: Math.round((count / n) * 100) };
  });

  return {
    agents,
    supportCount,
    conditionalCount,
    neutralCount,
    opposeCount,
    averageScore,
    averageRawSupport,
    consensusScore: averageScore,
    distribution,
  };
}
