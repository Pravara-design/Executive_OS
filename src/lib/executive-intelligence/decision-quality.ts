// Phase 8 · Decision Quality Score — composite 0-100 across:
//   Consensus · Strategic Alignment · Execution Readiness ·
//   Risk Exposure · Forecast Confidence.
import type { ExecutiveContext } from "./context-builder";
import type { BoardDecision } from "@/lib/api/mission";

export interface DecisionQuality {
  score: number;
  inputs: {
    consensus: number;
    strategicAlignment: number;
    executionReadiness: number;
    riskExposure: number;   // higher = lower exposure (already inverted)
    forecastConfidence: number;
  };
  band: "Strong" | "Acceptable" | "Weak";
}

function riskExposureScore(decision: BoardDecision): number {
  // Invert risk: Low risk → high "exposure score" (good), High risk → low.
  if (decision.riskLevel === "Low") return 85;
  if (decision.riskLevel === "Medium") return 60;
  return 30;
}

function executionReadinessScore(ctx: ExecutiveContext): number {
  const { active, blocked, avgProgress } = ctx.executionStatus;
  const drag = Math.min(40, blocked * 12);
  const load = Math.min(20, Math.max(0, active - 4) * 5);
  return Math.max(0, Math.min(100, 70 + (avgProgress - 50) * 0.4 - drag - load));
}

function forecastConfidenceScore(ctx: ExecutiveContext): number {
  const consistency = ctx.intel?.trendConsistency ?? 50;
  const memory = ctx.memoryStats.total > 0 ? ctx.memoryStats.avgConsensus : 50;
  return Math.round(consistency * 0.7 + memory * 0.3);
}

export function computeDecisionQuality(
  weightedConsensus: number,
  strategicAlignment: number,
  decision: BoardDecision,
  ctx: ExecutiveContext,
): DecisionQuality {
  const consensus = weightedConsensus;
  const executionReadiness = Math.round(executionReadinessScore(ctx));
  const riskExposure = riskExposureScore(decision);
  const forecastConfidence = forecastConfidenceScore(ctx);

  const score = Math.round(
    consensus * 0.30 +
    strategicAlignment * 0.25 +
    executionReadiness * 0.20 +
    riskExposure * 0.15 +
    forecastConfidence * 0.10,
  );
  const band: DecisionQuality["band"] = score >= 75 ? "Strong" : score >= 55 ? "Acceptable" : "Weak";
  return {
    score,
    band,
    inputs: { consensus, strategicAlignment, executionReadiness, riskExposure, forecastConfidence },
  };
}
