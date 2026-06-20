// Phase 9 · Lightweight JSON-schema validator for agent execution outputs.
// Not a full JSON Schema implementation — only what the AgentExecutor
// needs to verify a provider's structured response and request a repair
// retry when the model returns malformed JSON.
import type { AgentId } from "./agent-personas";
import type { Stance } from "./consensus-engine";

export interface AgentResponseEnvelope {
  role: AgentId;
  observation: string;
  insight: string;
  recommendation: string;
  rationale: string;
  stance: Stance;
  support: number;     // 0-100
  confidence: number;  // 0-100
}

export const AGENT_RESPONSE_SCHEMA = {
  type: "object",
  required: ["role", "observation", "insight", "recommendation", "rationale", "stance", "support", "confidence"],
  properties: {
    role: { type: "string", enum: ["CEO", "CFO", "CMO", "COO", "Risk", "Forecast", "Consultant"] },
    observation: { type: "string", minLength: 1 },
    insight: { type: "string", minLength: 1 },
    recommendation: { type: "string", minLength: 1 },
    rationale: { type: "string", minLength: 1 },
    stance: { type: "string", enum: ["Support", "Conditional", "Neutral", "Oppose"] },
    support: { type: "number", minimum: 0, maximum: 100 },
    confidence: { type: "number", minimum: 0, maximum: 100 },
  },
} as const;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  value: AgentResponseEnvelope | null;
}

const ROLES: AgentId[] = ["CEO", "CFO", "CMO", "COO", "Risk", "Forecast", "Consultant"];
const STANCES: Stance[] = ["Support", "Conditional", "Neutral", "Oppose"];

export function validateAgentResponse(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["Response is not a JSON object"], value: null };
  }
  const o = raw as Record<string, unknown>;
  const strField = (k: string) => {
    const v = o[k];
    if (typeof v !== "string" || !v.trim()) errors.push(`Field "${k}" must be a non-empty string`);
  };
  ["observation", "insight", "recommendation", "rationale"].forEach(strField);

  if (typeof o.role !== "string" || !ROLES.includes(o.role as AgentId)) {
    errors.push(`Field "role" must be one of ${ROLES.join(", ")}`);
  }
  if (typeof o.stance !== "string" || !STANCES.includes(o.stance as Stance)) {
    errors.push(`Field "stance" must be one of ${STANCES.join(", ")}`);
  }
  const numIn = (k: string) => {
    const v = o[k];
    if (typeof v !== "number" || Number.isNaN(v) || v < 0 || v > 100) {
      errors.push(`Field "${k}" must be a number between 0 and 100`);
    }
  };
  numIn("support");
  numIn("confidence");

  if (errors.length) return { valid: false, errors, value: null };
  return {
    valid: true,
    errors: [],
    value: {
      role: o.role as AgentId,
      observation: (o.observation as string).trim(),
      insight: (o.insight as string).trim(),
      recommendation: (o.recommendation as string).trim(),
      rationale: (o.rationale as string).trim(),
      stance: o.stance as Stance,
      support: Math.round(o.support as number),
      confidence: Math.round(o.confidence as number),
    },
  };
}

// Best-effort JSON extraction — real LLMs sometimes wrap JSON in prose
// or in a ```json fence. The executor calls this before validating.
export function parseJsonLoose(raw: string): unknown {
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try { return JSON.parse(candidate.slice(first, last + 1)); } catch { /* fallthrough */ }
    }
    return null;
  }
}
