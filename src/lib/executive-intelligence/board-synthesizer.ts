// Phase 9 · BoardSynthesizer — accepts all validated agent envelopes and
// produces the final BoardDecision. Wraps the deterministic decision
// engine but enriches it with weighted consensus, stance distribution,
// and the conflicts surfaced by the orchestrator. When a real LLM
// synthesis pass is wired in later, swap the inner call.
import type { BoardDecision } from "@/lib/api/mission";
import type { AgentResponseEnvelope } from "./schema-validator";
import type { ConflictFlag } from "./agent-orchestrator";
import { VOTE_WEIGHTS, type WeightedConsensus } from "./weighted-consensus";
import type { Stance } from "./consensus-engine";

export interface SynthesisInput {
  envelopes: AgentResponseEnvelope[];
  baseDecision: BoardDecision;
  weighted: WeightedConsensus;
  conflicts: ConflictFlag[];
  strategicAlignment: number;
}

export interface StanceDistribution {
  stance: Stance;
  agents: string[];
  weight: number;
}

export interface FinalBoardDecision extends BoardDecision {
  weightedConsensus: number;
  stanceDistribution: StanceDistribution[];
  conflicts: ConflictFlag[];
  strategicAlignment: number;
  synthesisSummary: string;
  source: "BoardSynthesizer";
  synthesizedAt: string;
}

const STANCES: Stance[] = ["Support", "Conditional", "Neutral", "Oppose"];

export class BoardSynthesizer {
  synthesize(input: SynthesisInput): FinalBoardDecision {
    const { envelopes, baseDecision, weighted, conflicts, strategicAlignment } = input;

    const stanceDistribution: StanceDistribution[] = STANCES.map((stance) => {
      const matching = envelopes.filter((e) => e.stance === stance);
      const weight = matching.reduce((a, e) => a + (VOTE_WEIGHTS[e.role] ?? 0), 0);
      return {
        stance,
        agents: matching.map((m) => m.role),
        weight: Math.round(weight * 100),
      };
    });

    const parts: string[] = [];
    stanceDistribution
      .filter((s) => s.agents.length)
      .forEach((s) => parts.push(`${s.agents.join(", ")} ${s.stance.toLowerCase()} (${s.weight}% weight)`));
    const conflictsLine = conflicts.length
      ? ` ${conflicts.length} strategic conflict${conflicts.length === 1 ? "" : "s"} flagged against active execution.`
      : "";
    const synthesisSummary = `${parts.join(" · ")}. Weighted consensus ${weighted.score}/100, strategic alignment ${strategicAlignment}/100.${conflictsLine}`;

    // Conflicts elevate risk if synthesis confirms an oppose/conditional split.
    let riskLevel = baseDecision.riskLevel;
    const opposed = stanceDistribution.find((s) => s.stance === "Oppose");
    if ((conflicts.length > 0 || (opposed && opposed.agents.length >= 2)) && riskLevel === "Low") {
      riskLevel = "Medium";
    }

    return {
      ...baseDecision,
      riskLevel,
      consensusScore: weighted.score || baseDecision.consensusScore,
      weightedConsensus: weighted.score,
      stanceDistribution,
      conflicts,
      strategicAlignment,
      synthesisSummary,
      source: "BoardSynthesizer",
      synthesizedAt: new Date().toISOString(),
    };
  }
}
