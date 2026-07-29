import type { z } from "zod";

export type AgentKey = "market-broadcast-agent" | "research-router-agent" | "unwind-advisor-subgraph";
export type AgentEntry = "market" | "research";
export type AgentRiskLevel = "normal" | "high";
export type TriggerType = "manual" | "scheduled" | "api" | "compat" | "chat";

export type AgentManifest = {
  agentKey: AgentKey;
  name: string;
  description: string;
  entry: AgentEntry;
  graphKey: string;
  allowedTools: string[];
  allowedSkills: string[];
  riskLevel: AgentRiskLevel;
  supportsHitl: boolean;
  inputSchema?: z.ZodTypeAny;
  outputSchema?: z.ZodTypeAny;
};

export type BaseAgentState = {
  runId: string;
  sessionId: string;
  agentKey: AgentKey;
  userId?: string;
  question: string;
  inputPayload: Record<string, unknown>;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  route?: {
    skillKey: string;
    confidence: number;
    reason: string;
    requiredInputs: string[];
    missingInputs: string[];
  };
  evidenceIds: string[];
  toolCallIds: string[];
  modelCallIds: string[];
  memoryItemIds: string[];
  skillRunIds: string[];
  outputJson?: Record<string, unknown>;
  outputMarkdown?: string;
  compliance: ComplianceResult;
  interrupt?: {
    type: "approval" | "missing_input" | "risk_confirm";
    reason: string;
    payload?: Record<string, unknown>;
  };
};

export type ComplianceResult = {
  passed: boolean;
  issues: string[];
  blockedTerms: string[];
  revised: boolean;
};
