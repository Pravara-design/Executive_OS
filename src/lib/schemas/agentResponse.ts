// Phase 10 · Real agent response schema (Zod). Used to validate LLM
// outputs before they enter the boardroom UI. Invalid responses are
// rejected and surfaced as schema errors.
import { z } from "zod";

export const AgentStanceSchema = z.enum(["Support", "Conditional", "Neutral", "Oppose"]);

export const AgentResponseSchema = z.object({
  agent: z.string().min(1),
  observation: z.string().min(1),
  insight: z.string().min(1),
  recommendation: z.string().min(1),
  rationale: z.string().min(1),
  stance: AgentStanceSchema,
  confidence: z.number().min(0).max(100),
  referencedData: z.array(z.string()).default([]),
  referencedDecisions: z.array(z.string()).default([]),
});

export type AgentResponse = z.infer<typeof AgentResponseSchema>;
export type AgentStance = z.infer<typeof AgentStanceSchema>;
