// Agent "brain" contract. Each agent ships one self-contained brain file that
// declares its ROLE, SCOPE, INPUT, OUTPUT, TONE, GUARDRAILS and HANDOFF rules.
// `composeSystemPrompt` turns that structured definition into a single system
// instruction string ready to pass to the model (see gemini.server.ts via
// callBrain). Edit a brain's fields and its system prompt updates — no
// duplicated prose to keep in sync.

export interface AgentBrain {
  /** kebab-case id, e.g. "data-agent" — also the folder/file stem. */
  id: string;
  /** Display name, e.g. "Data Agent". */
  name: string;
  /** One-line mandate. */
  role: string;
  /** What this agent is responsible for. */
  scope: string[];
  /** What the agent expects to receive. */
  input: string;
  /** Required output format / shape. */
  output: string;
  /** Voice and register. */
  tone: string;
  /** Hard rules — what it must refuse or redirect. */
  guardrails: string[];
  /** When to hand off to another agent: { "Agent Name": "trigger" }. */
  handoff: Record<string, string>;
}

/** Compose a deterministic system-instruction string from a brain definition. */
export function composeSystemPrompt(b: AgentBrain): string {
  const lines: string[] = [];
  lines.push(
    `You are the ${b.name} inside ExecutiveOS, a multi-agent executive intelligence system.`,
  );
  lines.push(`ROLE: ${b.role}`);
  lines.push("");
  lines.push("SCOPE — you are responsible for:");
  for (const s of b.scope) lines.push(`  • ${s}`);
  lines.push("");
  lines.push(`INPUT — you will receive: ${b.input}`);
  lines.push("");
  lines.push(`OUTPUT — you must return: ${b.output}`);
  lines.push("");
  lines.push(`TONE: ${b.tone}`);
  lines.push("");
  lines.push("GUARDRAILS — you must:");
  for (const g of b.guardrails) lines.push(`  • ${g}`);
  lines.push("");
  lines.push("HANDOFF — defer to another agent when:");
  for (const [agent, when] of Object.entries(b.handoff)) lines.push(`  • ${agent}: ${when}`);
  lines.push("");
  lines.push(
    "Never invent figures that are not supported by the supplied data. If data is missing, say so explicitly and state what you need.",
  );
  return lines.join("\n");
}
