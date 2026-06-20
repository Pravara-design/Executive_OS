// Phase 9 · Execution Pipeline — drives the full Context → Prompts →
// Agents → Consensus → Decision flow, tracking timeline stages and
// per-agent execution status. This replaces the mock-llm preview that
// previously sat between the prompt builder and the boardroom UI.
import type { ExecutiveContext } from "./context-builder";
import type { OrchestratedDebate } from "./agent-orchestrator";
import type { ExecutivePromptBundle } from "./prompt-builder";
import { AgentExecutor, type AgentExecutionResult } from "./agent-executor";
import { listAgentContracts } from "./agent-contracts";
import type { AgentId } from "./agent-personas";
import {
  type ExecutionStage,
  newStage,
  startStage,
  completeStage,
  failStage,
} from "./execution-status";
import { BoardSynthesizer, type FinalBoardDecision } from "./board-synthesizer";
import { computeWeightedConsensus } from "./weighted-consensus";
import type { ProviderId } from "./provider-adapters";

export interface PipelineInput {
  context: ExecutiveContext;
  debate: OrchestratedDebate;
  promptBundle: ExecutivePromptBundle;
  preferredProvider?: ProviderId;
}

export interface PipelineResult {
  stages: ExecutionStage[];
  agentResults: AgentExecutionResult[];
  finalDecision: FinalBoardDecision;
  completedAt: string;
  totalDurationMs: number;
  providerUsage: Array<{ provider: string; count: number }>;
}

export async function runExecutionPipeline(input: PipelineInput): Promise<PipelineResult> {
  const { context, debate, promptBundle, preferredProvider } = input;
  const start = performance.now();

  let contextStage = newStage(
    "context-built",
    "Context Built",
    `Briefing object hydrated · ${context.memoryStats.total} memory records · ${context.initiatives.active.length} active initiatives.`,
  );
  let promptsStage = newStage(
    "prompts-generated",
    "Prompts Generated",
    `${promptBundle.agentPrompts.length} agent prompts + system + user prompt assembled.`,
  );
  let agentsStage = newStage("agents-executed", "Agents Executed", "");
  let consensusStage = newStage("consensus-generated", "Consensus Generated", "");
  let decisionStage = newStage("decision-produced", "Decision Produced", "");

  // Stage 1 — context built (already done synchronously by caller, but we
  // record it on the timeline so the UI can show it).
  contextStage = startStage(contextStage);
  contextStage = context.intel
    ? completeStage(contextStage)
    : failStage(contextStage, "No dataset connected — context is empty.");

  // Stage 2 — prompts generated
  promptsStage = startStage(promptsStage);
  promptsStage = promptBundle.agentPrompts.length
    ? completeStage(promptsStage)
    : failStage(promptsStage, "Prompt bundle is empty.");

  // Stage 3 — agents executed
  agentsStage = startStage(agentsStage, "Dispatching agents to executor…");
  const contracts = new Map(listAgentContracts().map((c) => [c.agent, c]));
  const debateByAgent = new Map(debate.responses.map((r) => [r.agent, r]));
  const executor = new AgentExecutor(preferredProvider);
  const agentResults: AgentExecutionResult[] = [];

  for (const prompt of promptBundle.agentPrompts) {
    const agent = prompt.role as AgentId;
    const fallback = debateByAgent.get(agent);
    const contract = contracts.get(agent);
    if (!fallback || !contract) continue;
    const result = await executor.execute({
      agent,
      systemPrompt: promptBundle.systemPrompt,
      userPrompt: promptBundle.userPrompt,
      contextPayload: promptBundle.contextPayload,
      agentPrompt: prompt,
      contract,
      fallbackResponse: fallback,
      preferredProvider,
      maxRetries: 1,
    });
    agentResults.push(result);
  }

  const completedAgents = agentResults.filter((r) => r.status.status === "Completed").length;
  agentsStage = completedAgents === agentResults.length
    ? completeStage(
        agentsStage,
        `${completedAgents}/${agentResults.length} agents completed · avg ${Math.round(
          agentResults.reduce((a, r) => a + r.status.durationMs, 0) / Math.max(1, agentResults.length),
        )}ms`,
      )
    : failStage(agentsStage, `${agentResults.length - completedAgents} agent execution(s) failed validation.`);

  // Stage 4 — consensus generated
  consensusStage = startStage(consensusStage);
  const envelopes = agentResults.map((r) => r.envelope).filter((e): e is NonNullable<typeof e> => !!e);
  const weighted = computeWeightedConsensus(
    envelopes.map((e) => ({
      agent: e.role,
      role: e.role,
      support: e.support,
      confidence: e.confidence,
      observation: e.observation,
      insight: e.insight,
      recommendation: e.recommendation,
      rationale: e.rationale,
    })),
  );
  consensusStage = envelopes.length
    ? completeStage(consensusStage, `Weighted consensus ${weighted.score}/100 across ${envelopes.length} agents.`)
    : failStage(consensusStage, "No validated agent envelopes to synthesize.");

  // Stage 5 — decision produced
  decisionStage = startStage(decisionStage);
  const synthesizer = new BoardSynthesizer();
  const finalDecision = synthesizer.synthesize({
    envelopes,
    baseDecision: debate.decision,
    weighted,
    conflicts: debate.conflicts,
    strategicAlignment: debate.strategicAlignment,
  });
  decisionStage = completeStage(
    decisionStage,
    `Decision synthesized · risk ${finalDecision.riskLevel} · ${finalDecision.conflicts.length} conflict(s).`,
  );

  const totalDurationMs = Math.max(1, Math.round(performance.now() - start));

  // Provider usage tallies
  const providerCounts = new Map<string, number>();
  agentResults.forEach((r) => providerCounts.set(r.status.provider, (providerCounts.get(r.status.provider) ?? 0) + 1));
  const providerUsage = Array.from(providerCounts.entries()).map(([provider, count]) => ({ provider, count }));

  return {
    stages: [contextStage, promptsStage, agentsStage, consensusStage, decisionStage],
    agentResults,
    finalDecision,
    completedAt: new Date().toISOString(),
    totalDurationMs,
    providerUsage,
  };
}
