// Phase 8 · Strategic Tensions — detect agent-vs-agent disagreements and
// surface them as named, severity-scored conflicts (Growth vs Profitability,
// Expansion vs Capacity, Speed vs Risk, Revenue vs Margin, ...).
import type { BoardroomAgentResponse } from "@/lib/api/mission";
import type { AgentId } from "./agent-personas";

export interface StrategicTension {
  id: string;        // e.g. "growth-vs-profitability"
  label: string;     // "Growth vs Profitability"
  agentA: AgentId;
  agentB: AgentId;
  gap: number;       // |supportA - supportB|
  severity: number;  // 0-100
  detail: string;
}

interface TensionDef {
  id: string;
  label: string;
  a: AgentId;
  b: AgentId;
}

const TENSION_DEFS: TensionDef[] = [
  { id: "growth-vs-profitability", label: "Growth vs Profitability", a: "CEO", b: "CFO" },
  { id: "expansion-vs-capacity", label: "Expansion vs Capacity", a: "CEO", b: "COO" },
  { id: "speed-vs-risk", label: "Speed vs Risk", a: "CMO", b: "Risk" },
  { id: "revenue-vs-margin", label: "Revenue vs Margin", a: "CMO", b: "CFO" },
  { id: "ambition-vs-forecast", label: "Ambition vs Forecast Confidence", a: "CEO", b: "Forecast" },
  { id: "execution-vs-risk", label: "Execution vs Risk", a: "COO", b: "Risk" },
];

const GAP_THRESHOLD = 20; // points of support delta to qualify as a tension

export function detectTensions(responses: BoardroomAgentResponse[]): StrategicTension[] {
  const byAgent = new Map(responses.map((r) => [r.agent, r]));
  const out: StrategicTension[] = [];
  for (const def of TENSION_DEFS) {
    const a = byAgent.get(def.a);
    const b = byAgent.get(def.b);
    if (!a || !b) continue;
    const gap = Math.abs(a.support - b.support);
    if (gap < GAP_THRESHOLD) continue;
    const high = a.support >= b.support ? a : b;
    const low = a.support >= b.support ? b : a;
    const severity = Math.min(100, Math.round(gap * 1.2 + (100 - low.confidence) * 0.2));
    out.push({
      id: def.id,
      label: def.label,
      agentA: def.a,
      agentB: def.b,
      gap,
      severity,
      detail: `${high.agent} supports the move at ${high.support}% while ${low.agent} sits at ${low.support}% — a ${gap}-point split on the board.`,
    });
  }
  return out.sort((x, y) => y.severity - x.severity);
}
