// Initiative Retriever — surfaces Mission Control initiatives in the shape the
// boardroom orchestrator and (future) LLM agents need: active, planned, blocked,
// high-priority — with owner, status, progress and expected impact.
import type { MissionInitiative } from "@/lib/api/mission";

export interface RetrievedInitiative {
  id: string;
  title: string;
  why: string;
  owner: string;
  status: MissionInitiative["status"];
  priority: MissionInitiative["priority"];
  progress: number;                    // synthetic, derived from status
  expectedRevenueImpact: number;
  expectedProfitImpact: number;
  riskLevel: MissionInitiative["riskLevel"];
  driver: MissionInitiative["driver"];
}

function progressFor(status: MissionInitiative["status"]): number {
  switch (status) {
    case "Completed": return 100;
    case "In Progress": return 55;
    case "Planned": return 20;
    case "Backlog": return 5;
  }
}

function shape(i: MissionInitiative): RetrievedInitiative {
  return {
    id: i.id,
    title: i.title,
    why: i.why,
    owner: i.owner,
    status: i.status,
    priority: i.priority,
    progress: progressFor(i.status),
    expectedRevenueImpact: i.revenueImpact,
    expectedProfitImpact: i.profitImpact,
    riskLevel: i.riskLevel,
    driver: i.driver,
  };
}

export interface RetrievedInitiatives {
  active: RetrievedInitiative[];
  planned: RetrievedInitiative[];
  blocked: RetrievedInitiative[];
  highPriority: RetrievedInitiative[];
  all: RetrievedInitiative[];
}

export function getActiveInitiatives(initiatives: MissionInitiative[]): RetrievedInitiatives {
  const all = initiatives.map(shape);
  return {
    active: all.filter((i) => i.status === "In Progress"),
    planned: all.filter((i) => i.status === "Planned"),
    blocked: all.filter((i) => i.priority === "Critical" && i.status === "Backlog"),
    highPriority: all.filter((i) => i.priority === "Critical" || i.priority === "High"),
    all,
  };
}
