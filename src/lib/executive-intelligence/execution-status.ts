// Phase 9 · Execution status taxonomy. Shared by AgentExecutor,
// BoardSynthesizer, and the execution-timeline UI.
export type ExecutionStatus = "Queued" | "Running" | "Completed" | "Failed";

export type ExecutionStageKey =
  | "context-built"
  | "prompts-generated"
  | "agents-executed"
  | "consensus-generated"
  | "decision-produced"
  | "ceo-executed"
  | "ceo-validated";

export interface ExecutionStage {
  key: ExecutionStageKey;
  label: string;
  status: ExecutionStatus;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  detail: string;
  error?: string;
}

export interface AgentExecutionStatus {
  agent: string;
  status: ExecutionStatus;
  attempts: number;
  durationMs: number;
  provider: string;
  validationErrors: string[];
  fellBackToHeuristic: boolean;
  error?: string;
}

export function newStage(
  key: ExecutionStage["key"],
  label: string,
  detail = "",
): ExecutionStage {
  return {
    key,
    label,
    status: "Queued",
    startedAt: null,
    completedAt: null,
    durationMs: null,
    detail,
  };
}

export function startStage(stage: ExecutionStage, detail?: string): ExecutionStage {
  return {
    ...stage,
    status: "Running",
    startedAt: new Date().toISOString(),
    detail: detail ?? stage.detail,
  };
}

export function completeStage(stage: ExecutionStage, detail?: string): ExecutionStage {
  const completedAt = new Date().toISOString();
  const durationMs = stage.startedAt
    ? new Date(completedAt).getTime() - new Date(stage.startedAt).getTime()
    : 0;
  return {
    ...stage,
    status: "Completed",
    completedAt,
    durationMs,
    detail: detail ?? stage.detail,
  };
}

export function failStage(stage: ExecutionStage, error: string): ExecutionStage {
  const completedAt = new Date().toISOString();
  const durationMs = stage.startedAt
    ? new Date(completedAt).getTime() - new Date(stage.startedAt).getTime()
    : 0;
  return {
    ...stage,
    status: "Failed",
    completedAt,
    durationMs,
    error,
    detail: error,
  };
}
