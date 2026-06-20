// Decision Retriever — search Executive Memory for decisions that are
// relevant to a question. Returns ranked, related, open, similar historical
// and recent strategic buckets so the orchestrator can choose what to inject.
import type { ExecutiveDecision } from "@/lib/api/types";
import { scoreDecision, type ScoredDecision } from "./memory-engine";

export interface RetrievedDecisions {
  related: ExecutiveDecision[];      // top relevance, any status
  open: ExecutiveDecision[];         // In Progress / Not Started / Blocked
  similarHistorical: ExecutiveDecision[]; // Completed but topically similar
  recentStrategic: ExecutiveDecision[];   // last N by date
  ranked: ScoredDecision[];          // full ranked list for downstream use
}

export function getRelevantDecisions(
  question: string,
  memory: ExecutiveDecision[],
  limit = 3,
): RetrievedDecisions {
  if (!memory.length) {
    return { related: [], open: [], similarHistorical: [], recentStrategic: [], ranked: [] };
  }
  const ranked = memory
    .map((d) => scoreDecision(d, question))
    .sort((a, b) => b.score - a.score);

  const related = ranked.filter((x) => x.score > 0.05).slice(0, limit).map((x) => x.decision);

  const open = ranked
    .filter((x) => x.decision.status !== "Completed")
    .slice(0, limit)
    .map((x) => x.decision);

  const similarHistorical = ranked
    .filter((x) => x.decision.status === "Completed" && x.score > 0.05)
    .slice(0, limit)
    .map((x) => x.decision);

  const recentStrategic = [...memory]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);

  return { related, open, similarHistorical, recentStrategic, ranked };
}
