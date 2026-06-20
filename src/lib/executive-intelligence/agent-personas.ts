// Agent Persona Engine — configurable persona registry for the boardroom.
// Today this drives the "Agent Reasoning Inputs" cards and informs the
// heuristic debate. Tomorrow each persona becomes the system prompt + tool
// description for an LLM call (OpenAI/Gemini) routed by the orchestrator.
import type { BoardroomAgentResponse } from "@/lib/api/mission";

export type AgentId = BoardroomAgentResponse["agent"];
export type DecisionStyle =
  | "Aggressive but measured"
  | "Conservative"
  | "Execution-focused"
  | "Opportunity-focused"
  | "Protective"
  | "Analytical"
  | "Synthesis";

export interface AgentPersona {
  id: AgentId;
  title: string;
  role: string;
  goals: string[];
  decisionStyle: DecisionStyle;
  metrics: string[];
  // Vocabulary used by retrieval to score which historical decisions and
  // initiatives this persona naturally references. Kept here so personas
  // are a single source of truth across UI + orchestrator.
  domain: string[];
}

export const AGENT_PERSONAS: Record<AgentId, AgentPersona> = {
  CEO: {
    id: "CEO",
    title: "CEO Agent",
    role: "Growth · Expansion · Market Leadership",
    goals: ["Growth", "Market Leadership", "Long-Term Positioning"],
    decisionStyle: "Aggressive but measured",
    metrics: ["Revenue Growth", "Market Share", "Strategic Alignment"],
    domain: ["growth", "market", "vision", "priority", "expansion", "company", "strategic"],
  },
  CFO: {
    id: "CFO",
    title: "CFO Agent",
    role: "Profitability · Capital Allocation · Cash Flow",
    goals: ["Profitability", "Cash Flow", "Capital Efficiency"],
    decisionStyle: "Conservative",
    metrics: ["Profit Margin", "ROI", "Capital Allocation"],
    domain: ["margin", "profit", "cost", "capital", "cash", "budget", "investment", "finance"],
  },
  COO: {
    id: "COO",
    title: "COO Agent",
    role: "Operations · Capacity · Sequencing",
    goals: ["Execution", "Capacity", "Operational Readiness"],
    decisionStyle: "Execution-focused",
    metrics: ["Execution Readiness", "Capacity Utilization", "Delivery Confidence"],
    domain: ["operations", "capacity", "execution", "process", "supply", "delivery", "headcount"],
  },
  CMO: {
    id: "CMO",
    title: "CMO Agent",
    role: "Demand · Brand · Channel Mix",
    goals: ["Demand", "Brand", "Growth Efficiency"],
    decisionStyle: "Opportunity-focused",
    metrics: ["Growth", "Demand Signals", "Customer Metrics"],
    domain: ["marketing", "brand", "demand", "channel", "campaign", "customer", "acquisition"],
  },
  Risk: {
    id: "Risk",
    title: "Risk Agent",
    role: "Operational · Strategic · Concentration Risk",
    goals: ["Risk Reduction", "Downside Protection"],
    decisionStyle: "Protective",
    metrics: ["Risk Exposure", "Concentration", "Forecast Uncertainty"],
    domain: ["risk", "concentration", "exposure", "compliance", "hedge", "diversification"],
  },
  Forecast: {
    id: "Forecast",
    title: "Forecast Agent",
    role: "Projections · Scenarios · Trajectory",
    goals: ["Probability Accuracy", "Scenario Planning"],
    decisionStyle: "Analytical",
    metrics: ["Forecast Score", "Trend Consistency", "Variance"],
    domain: ["forecast", "trend", "projection", "scenario", "consistency", "trajectory"],
  },
  Consultant: {
    id: "Consultant",
    title: "Consultant Agent",
    role: "Strategy · Prioritization · Transformation",
    goals: ["Strategic Clarity", "Prioritization", "Transformation"],
    decisionStyle: "Synthesis",
    metrics: ["Strategic Alignment", "Execution Feasibility", "Long-Term Value"],
    domain: ["strategy", "transformation", "sequence", "prioritize", "gate"],
  },
};

export const AGENT_ORDER: AgentId[] = ["CEO", "CFO", "CMO", "COO", "Risk", "Forecast", "Consultant"];

export function listPersonas(): AgentPersona[] {
  return AGENT_ORDER.map((id) => AGENT_PERSONAS[id]);
}
