// Agent Contract System — production-grade reasoning contract for every
// executive persona. Sits between the Prompt Builder and any future LLM
// provider so each agent has deterministic decision rules, must-consider
// fields, allowed stances, output instructions, and a strict response
// schema. No external calls are made from this module — it is the
// authoritative contract that a real model will later be required to obey.

import { AGENT_PERSONAS, AGENT_ORDER, type AgentId, type AgentPersona } from "./agent-personas";

export type AllowedStance = "Support" | "Conditional" | "Neutral" | "Oppose";

export interface OutputInstructions {
  maxObservationWords: number;
  maxInsightWords: number;
  maxRecommendationWords: number;
  maxRationaleWords: number;
  mustReferenceData: boolean;
  mustReferenceHistory: boolean;
}

export interface ExpectedSchema {
  type: "object";
  required: string[];
  properties: Record<string, { type: string; enum?: string[]; description: string }>;
}

export interface AgentContract {
  agent: AgentId;
  persona: AgentPersona;
  role: string;
  decisionStyle: string;
  goals: string[];
  metrics: string[];
  decisionRules: string[];
  mustConsider: string[];
  allowedStances: AllowedStance[];
  stanceRules: Record<AllowedStance, string>;
  outputInstructions: OutputInstructions;
  expectedSchema: ExpectedSchema;
}

const ALLOWED_STANCES: AllowedStance[] = ["Support", "Conditional", "Neutral", "Oppose"];

const STANCE_RULES: Record<AllowedStance, string> = {
  Support: "High conviction and recommendation to proceed.",
  Conditional: "Proceed only if specified guardrails exist.",
  Neutral: "Insufficient evidence or balanced tradeoffs.",
  Oppose: "Material concerns outweigh expected upside.",
};

const OUTPUT_INSTRUCTIONS: OutputInstructions = {
  maxObservationWords: 50,
  maxInsightWords: 30,
  maxRecommendationWords: 25,
  maxRationaleWords: 30,
  mustReferenceData: true,
  mustReferenceHistory: true,
};

const EXPECTED_SCHEMA: ExpectedSchema = {
  type: "object",
  required: [
    "agent",
    "observation",
    "insight",
    "recommendation",
    "rationale",
    "stance",
    "confidence",
    "referencedData",
    "referencedDecisions",
  ],
  properties: {
    agent: { type: "string", description: "Agent identifier (CEO, CFO, CMO, COO, Risk, Forecast, Consultant)." },
    observation: { type: "string", description: "What the data shows. Must cite a metric." },
    insight: { type: "string", description: "Why it matters strategically." },
    recommendation: { type: "string", description: "Concrete next move." },
    rationale: { type: "string", description: "Reasoning bridging data and recommendation." },
    stance: { type: "string", enum: ALLOWED_STANCES, description: "One of Support / Conditional / Neutral / Oppose." },
    confidence: { type: "number", description: "0-100 confidence in the recommendation." },
    referencedData: { type: "array", description: "Metrics / KPIs the agent relied on." },
    referencedDecisions: { type: "array", description: "Prior executive decisions referenced." },
  },
};

const DECISION_RULES: Record<AgentId, string[]> = {
  CEO: [
    "Prefer growth over short-term efficiency",
    "Prioritize market leadership",
    "Accept moderate risk for strategic advantage",
    "Break ties in favor of expansion",
  ],
  CFO: [
    "Protect profitability",
    "Require measurable ROI",
    "Optimize capital allocation",
    "Reject unclear investments",
  ],
  CMO: [
    "Maximize demand creation",
    "Strengthen brand position",
    "Focus on growth efficiency",
    "Prioritize customer acquisition leverage",
  ],
  COO: [
    "Prioritize execution feasibility",
    "Avoid operational overload",
    "Improve delivery confidence",
    "Prefer scalable initiatives",
  ],
  Risk: [
    "Reduce downside exposure",
    "Favor reversible decisions",
    "Require mitigation plans",
    "Monitor concentration risk",
  ],
  Forecast: [
    "Evaluate probability-weighted outcomes",
    "Compare scenario ranges",
    "Minimize forecast variance",
    "Prioritize predictability",
  ],
  Consultant: [
    "Prioritize strategic clarity",
    "Sequence initiatives logically",
    "Avoid fragmented execution",
    "Optimize long-term value creation",
  ],
};

const MUST_CONSIDER: Record<AgentId, string[]> = {
  CEO: ["Revenue Growth", "Market Leadership", "Strategic Alignment"],
  CFO: ["Profit Margin", "Cash Flow", "ROI"],
  CMO: ["Demand Signals", "Brand Impact", "Customer Metrics"],
  COO: ["Capacity Utilization", "Execution Readiness", "Delivery Confidence"],
  Risk: ["Concentration Risk", "Forecast Variance", "Execution Risk"],
  Forecast: ["Trend Consistency", "Forecast Score", "Scenario Spread"],
  Consultant: ["Strategic Alignment", "Execution Feasibility", "Long-Term Value"],
};

export function buildAgentContract(agent: AgentId): AgentContract {
  const persona = AGENT_PERSONAS[agent];
  return {
    agent,
    persona,
    role: persona.role,
    decisionStyle: persona.decisionStyle,
    goals: persona.goals,
    metrics: persona.metrics,
    decisionRules: DECISION_RULES[agent],
    mustConsider: MUST_CONSIDER[agent],
    allowedStances: ALLOWED_STANCES,
    stanceRules: STANCE_RULES,
    outputInstructions: OUTPUT_INSTRUCTIONS,
    expectedSchema: EXPECTED_SCHEMA,
  };
}

export function listAgentContracts(): AgentContract[] {
  return AGENT_ORDER.map(buildAgentContract);
}

export interface ContractValidationResult {
  agent: AgentId;
  complete: boolean;
  checks: Record<string, boolean>;
}

const REQUIRED_FIELDS = [
  "role",
  "goals",
  "metrics",
  "decisionRules",
  "mustConsider",
  "allowedStances",
  "outputInstructions",
  "expectedSchema",
] as const;

export function validateContract(contract: AgentContract): ContractValidationResult {
  const checks: Record<string, boolean> = {
    role: typeof contract.role === "string" && contract.role.length > 0,
    goals: Array.isArray(contract.goals) && contract.goals.length > 0,
    metrics: Array.isArray(contract.metrics) && contract.metrics.length > 0,
    decisionRules: Array.isArray(contract.decisionRules) && contract.decisionRules.length > 0,
    mustConsider: Array.isArray(contract.mustConsider) && contract.mustConsider.length > 0,
    allowedStances: Array.isArray(contract.allowedStances) && contract.allowedStances.length === 4,
    outputInstructions: !!contract.outputInstructions && contract.outputInstructions.mustReferenceData,
    expectedSchema: !!contract.expectedSchema && contract.expectedSchema.required.length > 0,
  };
  const complete = REQUIRED_FIELDS.every((f) => checks[f]);
  return { agent: contract.agent, complete, checks };
}

export function validateAllContracts(): ContractValidationResult[] {
  return listAgentContracts().map(validateContract);
}
