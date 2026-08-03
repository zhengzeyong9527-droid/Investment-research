import type { AgentKey } from "@/agents/types";
import type { EvidenceGap, ExecutableAgentRun } from "@/agents/executor";
import type { EvidenceGrade } from "@/agents/evidence-grading";
import type { OutputVerification } from "@/agents/output-verifier";
import type { ResolvedAgentEntities } from "@/agents/entity-resolver";
import type { EvidenceRecordInput, JsonRecord } from "@/lib/agent";
import type { MemoryHit } from "@/agents/memory";
import type { ModelProvider } from "@/agents/model-provider";
import type { ToolRegistry } from "@/tools/types";
import type { AgentRuntimeRepository } from "@/agents/executor";

export type SkillResult = {
  outputMarkdown: string;
  outputJson: Record<string, unknown>;
} | null;

export type AgentGraphState = {
  runId: string;
  sessionId: string | null;
  userId: string | null;
  agentKey: AgentKey;
  question: string;
  skillKey: string;
  inputPayload: JsonRecord;
  resolvedEntities?: ResolvedAgentEntities;
  intentPlan?: Record<string, unknown>;
  memoryHits: MemoryHit[];
  evidence: EvidenceRecordInput[];
  evidenceGaps: EvidenceGap[];
  ragHits: unknown[];
  evidenceGrade: EvidenceGrade | null;
  skillResult: SkillResult;
  verification: OutputVerification | null;
  interrupt?: Record<string, unknown> | null;
  attempts: number;
  outputMarkdown: string;
  outputJson: Record<string, unknown>;
  status: string;
  nodeKeys: string[];
  resumedFromInterrupt?: boolean;
  marketData?: Record<string, unknown>;
};

export type AgentGraphDeps = {
  repository: AgentRuntimeRepository;
  toolRegistry: ToolRegistry;
  modelProvider: ModelProvider;
};

export function initialGraphState(run: ExecutableAgentRun): AgentGraphState {
  return {
    runId: run.id,
    sessionId: run.sessionId ?? null,
    userId: run.userId ?? null,
    agentKey: (run.agentKey ?? "research-router-agent") as AgentKey,
    question: run.question,
    skillKey: run.skillKey,
    inputPayload: run.inputPayload,
    memoryHits: [],
    evidence: [],
    evidenceGaps: [],
    ragHits: [],
    evidenceGrade: null,
    skillResult: null,
    verification: null,
    interrupt: null,
    attempts: 0,
    outputMarkdown: "",
    outputJson: {},
    status: "created",
    nodeKeys: [],
  };
}

export function runFromState(state: AgentGraphState): ExecutableAgentRun {
  return {
    id: state.runId,
    agentKey: state.agentKey,
    sessionId: state.sessionId,
    userId: state.userId,
    question: state.question,
    skillKey: state.skillKey,
    inputPayload: state.inputPayload,
    graphState: graphDiagnostics(state),
  };
}

export function graphDiagnostics(state: AgentGraphState): JsonRecord {
  return {
    nodeKeys: state.nodeKeys,
    resolvedEntities: state.resolvedEntities,
    intentPlan: state.intentPlan,
    memoryHits: state.memoryHits,
    ragHits: state.ragHits,
    evidenceGaps: state.evidenceGaps,
    evidenceGrade: state.evidenceGrade,
    verification: state.verification,
    interrupt: state.interrupt,
    attempts: state.attempts,
  };
}
