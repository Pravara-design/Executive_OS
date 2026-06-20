// Phase 9 · Provider Adapters. Each adapter normalizes a provider's API
// into the shape AgentExecutor expects. Real adapters (OpenAI / Claude /
// Gemini) throw `ProviderNotConnectedError` until an API key is wired in.
// `HeuristicAdapter` is the production fallback — it runs the deterministic
// executive debate engine and returns a schema-conformant envelope, so the
// execution pipeline is always live (never "mocked") even before an LLM
// provider is connected.
import type { AgentId } from "./agent-personas";
import type { BoardroomAgentResponse } from "@/lib/api/mission";
import type { AgentPromptObject } from "./prompt-builder";
import { classify } from "./consensus-engine";
import type { AgentResponseEnvelope } from "./schema-validator";

export type ProviderId = "openai" | "claude" | "gemini" | "heuristic";

export interface ProviderRequest {
  agent: AgentId;
  systemPrompt: string;
  userPrompt: string;
  contextPayload: Record<string, unknown>;
  agentPrompt: AgentPromptObject;
  contractSummary: string;
  // Carries the deterministic debate output so the heuristic adapter
  // can render an envelope. Real adapters ignore this — they call the
  // model with system + user prompts.
  fallbackResponse?: BoardroomAgentResponse;
  // On retry, the executor passes the prior validation errors so the
  // adapter (real LLM) can produce a corrected response. Heuristic
  // adapter always returns a valid envelope so this is unused locally.
  repairHint?: string[];
}

export interface ProviderResponse {
  raw: string;             // raw text the provider returned (JSON)
  parsed: unknown;         // parsed JSON, or null if parse failed
  envelope: AgentResponseEnvelope | null; // pre-validated when adapter is sure
  provider: ProviderId;
  model: string;
  promptTokens: number;
  responseTokens: number;
  latencyMs: number;
}

export class ProviderNotConnectedError extends Error {
  readonly provider: ProviderId;
  constructor(provider: ProviderId) {
    super(`Provider "${provider}" is not connected. Configure credentials to enable real execution.`);
    this.provider = provider;
  }
}

export interface ProviderAdapter {
  id: ProviderId;
  label: string;
  vendor: string;
  defaultModel: string;
  connected: boolean;
  execute(request: ProviderRequest): Promise<ProviderResponse>;
}

function estimateTokens(s: string): number {
  return Math.max(1, Math.round(s.length / 4));
}

// -----------------------------------------------------------------------
// Heuristic adapter — local production executor. Always connected.
// -----------------------------------------------------------------------
export class HeuristicAdapter implements ProviderAdapter {
  readonly id = "heuristic" as const;
  readonly label = "Local Heuristic Engine";
  readonly vendor = "ExecutiveOS";
  readonly defaultModel = "executive-os-heuristic-v1";
  readonly connected = true;

  async execute(request: ProviderRequest): Promise<ProviderResponse> {
    const t0 = performance.now();
    const fb = request.fallbackResponse;
    if (!fb) {
      throw new Error("HeuristicAdapter requires a deterministic fallback response");
    }
    const envelope: AgentResponseEnvelope = {
      role: request.agent,
      observation: fb.observation,
      insight: fb.insight,
      recommendation: fb.recommendation,
      rationale: fb.rationale,
      stance: classify(fb.support).stance,
      support: Math.round(fb.support),
      confidence: Math.round(fb.confidence),
    };
    const raw = JSON.stringify(envelope);
    const latencyMs = Math.max(1, performance.now() - t0);
    return {
      raw,
      parsed: envelope,
      envelope,
      provider: this.id,
      model: this.defaultModel,
      promptTokens: estimateTokens(request.systemPrompt + request.userPrompt + JSON.stringify(request.agentPrompt)),
      responseTokens: estimateTokens(raw),
      latencyMs,
    };
  }
}

// -----------------------------------------------------------------------
// Real provider adapters — architecture only. Throw until connected.
// -----------------------------------------------------------------------
abstract class RemoteAdapter implements ProviderAdapter {
  abstract id: ProviderId;
  abstract label: string;
  abstract vendor: string;
  abstract defaultModel: string;
  connected = false;
  async execute(_request: ProviderRequest): Promise<ProviderResponse> {
    throw new ProviderNotConnectedError(this.id);
  }
}

export class OpenAIAdapter extends RemoteAdapter {
  readonly id = "openai" as const;
  readonly label = "OpenAI";
  readonly vendor = "OpenAI";
  readonly defaultModel = "gpt-4o";
}
export class ClaudeAdapter extends RemoteAdapter {
  readonly id = "claude" as const;
  readonly label = "Claude";
  readonly vendor = "Anthropic";
  readonly defaultModel = "claude-sonnet-4";
}
export class GeminiAdapter extends RemoteAdapter {
  readonly id = "gemini" as const;
  readonly label = "Gemini";
  readonly vendor = "Google";
  readonly defaultModel = "gemini-2.0-flash";
}

// Registry consumed by AgentExecutor and the boardroom UI.
export const PROVIDER_ADAPTERS: ProviderAdapter[] = [
  new OpenAIAdapter(),
  new ClaudeAdapter(),
  new GeminiAdapter(),
  new HeuristicAdapter(),
];

export function getAdapter(id: ProviderId): ProviderAdapter {
  const a = PROVIDER_ADAPTERS.find((p) => p.id === id);
  if (!a) throw new Error(`Unknown provider: ${id}`);
  return a;
}

export function pickPrimaryAdapter(preferred?: ProviderId): ProviderAdapter {
  if (preferred) {
    const a = getAdapter(preferred);
    if (a.connected) return a;
  }
  // First connected remote adapter wins; otherwise heuristic.
  const remote = PROVIDER_ADAPTERS.find((p) => p.id !== "heuristic" && p.connected);
  return remote ?? getAdapter("heuristic");
}
