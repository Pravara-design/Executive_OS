// Executive Memory Engine — the central reasoning surface that loads, normalizes
// and scores past executive decisions. All retrieval/context helpers depend on
// this module so a future OpenAI/Gemini call can be slotted into the orchestrator
// without touching call-sites.
import type { ExecutiveDecision } from "@/lib/api/types";

export interface ScoredDecision {
  decision: ExecutiveDecision;
  score: number;
  ageDays: number;
}

const STOP = new Set([
  "the","and","for","with","that","this","from","into","over","under","about",
  "should","would","could","next","quarter","year","month","week","what","when",
  "where","which","while","there","their","they","them","have","been","than",
  "into","more","most","less","need","want","make","take","help","best","good","plan",
]);

export function tokenize(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
}

export function tokenSimilarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (!ta.size || !tb.size) return 0;
  let hits = 0;
  ta.forEach((t) => { if (tb.has(t)) hits++; });
  // Jaccard-ish: hits / size of smaller set, capped to 1.
  const denom = Math.max(1, Math.min(ta.size, tb.size));
  return Math.min(1, hits / denom);
}

export function ageInDays(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000));
}

export function scoreDecision(d: ExecutiveDecision, question: string): ScoredDecision {
  const haystack = `${d.question} ${d.decision} ${(d.next_actions || []).join(" ")}`;
  const sim = tokenSimilarity(haystack, question);
  const days = ageInDays(d.created_at);
  // Recency decays from 1.0 (today) to ~0.5 at 60 days.
  const recency = 1 / (1 + days / 60);
  // Open/in-progress decisions are more salient than completed ones.
  const statusBoost =
    d.status === "In Progress" ? 0.15 :
    d.status === "Blocked" ? 0.10 :
    d.status === "Not Started" ? 0.08 : 0;
  const score = sim * 0.7 + recency * 0.2 + statusBoost;
  return { decision: d, score, ageDays: days };
}

export interface MemoryStats {
  total: number;
  completed: number;
  inFlight: number;
  blocked: number;
  notStarted: number;
  avgConsensus: number;
  successRate: number; // completed / total
}

export function memoryStats(memory: ExecutiveDecision[]): MemoryStats {
  if (!memory.length) {
    return { total: 0, completed: 0, inFlight: 0, blocked: 0, notStarted: 0, avgConsensus: 0, successRate: 0 };
  }
  const completed = memory.filter((m) => m.status === "Completed").length;
  const inFlight = memory.filter((m) => m.status === "In Progress").length;
  const blocked = memory.filter((m) => m.status === "Blocked").length;
  const notStarted = memory.filter((m) => m.status === "Not Started").length;
  const avgConsensus = Math.round(memory.reduce((a, m) => a + m.consensus_score, 0) / memory.length);
  return {
    total: memory.length,
    completed,
    inFlight,
    blocked,
    notStarted,
    avgConsensus,
    successRate: Math.round((completed / memory.length) * 100),
  };
}
