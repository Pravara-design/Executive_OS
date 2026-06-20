// Agent brain registry. Import a brain (or its composed system prompt) from
// here, or look one up by id. Each brain lives in its own file and is
// independently editable.
import { type AgentBrain } from "./types";
import { dataAgentBrain } from "./data-agent";
import { kpiAgentBrain } from "./kpi-agent";
import { ceoAgentBrain } from "./ceo-agent";
import { forecastAgentBrain } from "./forecast-agent";
import { researchAgentBrain } from "./research-agent";
import { consultantAgentBrain } from "./consultant-agent";
import { decisionAgentBrain } from "./decision-agent";
import { boardroomAgentBrain } from "./boardroom-agent";
import { executionAgentBrain } from "./execution-agent";
import { monitoringAgentBrain } from "./monitoring-agent";
import { chatBrain } from "./chat-brain";

export { composeSystemPrompt, type AgentBrain } from "./types";
export * from "./data-agent";
export * from "./kpi-agent";
export * from "./ceo-agent";
export * from "./forecast-agent";
export * from "./research-agent";
export * from "./consultant-agent";
export * from "./decision-agent";
export * from "./boardroom-agent";
export * from "./execution-agent";
export * from "./monitoring-agent";
export * from "./chat-brain";

/** Pipeline agent brains, in execution order. */
export const AGENT_BRAINS: AgentBrain[] = [
  dataAgentBrain,
  kpiAgentBrain,
  forecastAgentBrain,
  researchAgentBrain,
  consultantAgentBrain,
  ceoAgentBrain,
  decisionAgentBrain,
  boardroomAgentBrain,
  executionAgentBrain,
  monitoringAgentBrain,
];

const BY_ID: Record<string, AgentBrain> = Object.fromEntries(
  [...AGENT_BRAINS, chatBrain].map((b) => [b.id, b]),
);

export function getBrain(id: string): AgentBrain | undefined {
  return BY_ID[id];
}
