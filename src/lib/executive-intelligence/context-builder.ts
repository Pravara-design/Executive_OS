// Executive Context Builder — assembles the single object every reasoning
// surface (heuristic agents today, OpenAI/Gemini calls tomorrow) consumes.
// Keeping this stable means future LLM integration only changes the
// agent-orchestrator, never the call-sites.
import type { ExecutiveDecision, KpiSummary } from "@/lib/api/types";
import type { BusinessIntelligence } from "@/lib/api/intelligence";
import type { BoardroomConversation } from "@/lib/api/types";
import type { MissionInitiative } from "@/lib/api/mission";
import { deriveObjectives, type MissionObjective } from "@/lib/api/mission";
import { getRelevantDecisions, type RetrievedDecisions } from "./decision-retriever";
import { getActiveInitiatives, type RetrievedInitiatives, type RetrievedInitiative } from "./initiative-retriever";
import { memoryStats, type MemoryStats } from "./memory-engine";

export interface ExecutiveContext {
  question: string;
  intel: BusinessIntelligence | null;
  kpis: KpiSummary | null;
  relatedDecisions: RetrievedDecisions;
  initiatives: RetrievedInitiatives;
  strategicObjectives: MissionObjective[];
  missionPriorities: RetrievedInitiative[]; // top critical/high initiatives
  executionStatus: {
    active: number;
    planned: number;
    blocked: number;
    avgProgress: number;
  };
  boardroomHistory: BoardroomConversation[];
  memoryStats: MemoryStats;
}

export interface ContextInputs {
  question: string;
  memory: ExecutiveDecision[];
  initiatives: MissionInitiative[];
  intel: BusinessIntelligence | null;
  kpis: KpiSummary | null;
  meetings: BoardroomConversation[];
}

export function buildExecutiveContext(inputs: ContextInputs): ExecutiveContext {
  const { question, memory, initiatives, intel, kpis, meetings } = inputs;
  const relatedDecisions = getRelevantDecisions(question, memory);
  const retrieved = getActiveInitiatives(initiatives);
  const strategicObjectives = deriveObjectives(intel, kpis);
  const missionPriorities = retrieved.highPriority.slice(0, 5);
  const avgProgress = retrieved.all.length
    ? Math.round(retrieved.all.reduce((a, i) => a + i.progress, 0) / retrieved.all.length)
    : 0;

  return {
    question,
    intel,
    kpis,
    relatedDecisions,
    initiatives: retrieved,
    strategicObjectives,
    missionPriorities,
    executionStatus: {
      active: retrieved.active.length,
      planned: retrieved.planned.length,
      blocked: retrieved.blocked.length,
      avgProgress,
    },
    boardroomHistory: meetings.slice(0, 5),
    memoryStats: memoryStats(memory),
  };
}
