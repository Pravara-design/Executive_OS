// Phase 9 · AgentExecutor — accepts an Agent Contract, system prompt, user
// prompt, and role-specific context, dispatches to a ProviderAdapter,
// validates the structured output, retries on malformed JSON, and falls
// back to the local heuristic adapter when the primary provider fails or
// is not connected.
import type { AgentId } from "./agent-personas";
import type { AgentPromptObject } from "./prompt-builder";
import type { AgentContract } from "./agent-contracts";
import type { BoardroomAgentResponse } from "@/lib/api/mission";
import {
  validateAgentResponse,
  parseJsonLoose,
  type AgentResponseEnvelope,
} from "./schema-validator";
import {
  getAdapter,
  pickPrimaryAdapter,
  ProviderNotConnectedError,
  type ProviderAdapter,
  type ProviderId,
  type ProviderRequest,
  type ProviderResponse,
} from "./provider-adapters";
import type { AgentExecutionStatus } from "./execution-status";

export interface AgentExecutionRequest {
  agent: AgentId;
  systemPrompt: string;
  userPrompt: string;
  contextPayload: Record<string, unknown>;
  agentPrompt: AgentPromptObject;
  contract: AgentContract;
  fallbackResponse: BoardroomAgentResponse;
  preferredProvider?: ProviderId;
  maxRetries?: number;
}

export interface AgentExecutionResult {
  status: AgentExecutionStatus;
  envelope: AgentResponseEnvelope | null;
  raw: string;
  provider: ProviderId;
  model: string;
  promptTokens: number;
  responseTokens: number;
  attempts: number;
  validationErrors: string[];
  payloadPreview: ExecutorPayload;
}

export interface ExecutorPayload {
  agent: AgentId;
  provider: ProviderId;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  contractSummary: string;
  agentPrompt: AgentPromptObject;
  contextPayload: Record<string, unknown>;
  responseSchema: Record<string, unknown>;
}

function summarizeContract(c: AgentContract): string {
  return [
    `Role: ${c.agent}`,
    `Decision rules: ${c.decisionRules.join("; ")}`,
    `Must consider: ${c.mustConsider.join(", ")}`,
    `Allowed stances: ${c.allowedStances.join(", ")}`,
    `Output rules: <=${c.outputInstructions.maxObservationWords} words observation, mustReferenceData=${c.outputInstructions.mustReferenceData}`,
  ].join("\n");
}

function buildPayload(req: AgentExecutionRequest, adapter: ProviderAdapter): ExecutorPayload {
  return {
    agent: req.agent,
    provider: adapter.id,
    model: adapter.defaultModel,
    systemPrompt: req.systemPrompt,
    userPrompt: req.userPrompt,
    contractSummary: summarizeContract(req.contract),
    agentPrompt: req.agentPrompt,
    contextPayload: req.contextPayload,
    responseSchema: req.contract.expectedSchema as unknown as Record<string, unknown>,
  };
}

async function runOnce(
  adapter: ProviderAdapter,
  req: AgentExecutionRequest,
  repairHint?: string[],
): Promise<{ response: ProviderResponse; envelope: AgentResponseEnvelope | null; errors: string[] }> {
  const providerRequest: ProviderRequest = {
    agent: req.agent,
    systemPrompt: req.systemPrompt,
    userPrompt: req.userPrompt,
    contextPayload: req.contextPayload,
    agentPrompt: req.agentPrompt,
    contractSummary: summarizeContract(req.contract),
    fallbackResponse: req.fallbackResponse,
    repairHint,
  };
  const response = await adapter.execute(providerRequest);
  // Prefer an envelope the adapter already validated; otherwise parse raw.
  let envelope = response.envelope;
  let errors: string[] = [];
  if (!envelope) {
    const parsed = response.parsed ?? parseJsonLoose(response.raw);
    const v = validateAgentResponse(parsed);
    envelope = v.value;
    errors = v.errors;
  }
  return { response, envelope, errors };
}

export class AgentExecutor {
  constructor(private readonly preferred?: ProviderId) {}

  async execute(req: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const t0 = performance.now();
    const maxRetries = req.maxRetries ?? 1;
    const primary = req.preferredProvider
      ? getAdapter(req.preferredProvider)
      : pickPrimaryAdapter(this.preferred);
    let adapter = primary;
    let attempts = 0;
    let validationErrors: string[] = [];
    let fellBack = false;
    let lastError: string | undefined;
    let lastResponse: ProviderResponse | null = null as ProviderResponse | null;
    let envelope: AgentResponseEnvelope | null = null;

    const tryAdapter = async (a: ProviderAdapter) => {
      let repairHint: string[] | undefined;
      for (let i = 0; i <= maxRetries; i++) {
        attempts++;
        try {
          const result = await runOnce(a, req, repairHint);
          lastResponse = result.response;
          if (result.envelope) {
            envelope = result.envelope;
            validationErrors = [];
            return true;
          }
          validationErrors = result.errors;
          repairHint = result.errors;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          if (err instanceof ProviderNotConnectedError) return false;
        }
      }
      return false;
    };

    let ok = await tryAdapter(adapter);
    if (!ok && adapter.id !== "heuristic") {
      // Fall back to local heuristic so the pipeline always produces a
      // validated envelope. This is execution, not mocking — it is the
      // deterministic engine that ships today.
      fellBack = true;
      adapter = getAdapter("heuristic");
      ok = await tryAdapter(adapter);
    }

    const durationMs = Math.max(1, Math.round(performance.now() - t0));
    const payloadPreview = buildPayload(req, adapter);

    const status: AgentExecutionStatus = {
      agent: req.agent,
      status: ok && envelope ? "Completed" : "Failed",
      attempts,
      durationMs,
      provider: adapter.label,
      validationErrors,
      fellBackToHeuristic: fellBack,
      error: ok ? undefined : lastError ?? "Validation failed after retries",
    };

    return {
      status,
      envelope,
      raw: lastResponse?.raw ?? "",
      provider: adapter.id,
      model: adapter.defaultModel,
      promptTokens: lastResponse?.promptTokens ?? 0,
      responseTokens: lastResponse?.responseTokens ?? 0,
      attempts,
      validationErrors,
      payloadPreview,
    };
  }
}
