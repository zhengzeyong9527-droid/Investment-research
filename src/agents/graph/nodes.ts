import { interrupt, isGraphInterrupt, isInterrupted } from "@langchain/langgraph";
import { planMultiIntent } from "@/agents/intent-planner";
import { gradeEvidence, insufficientEvidenceMarkdown } from "@/agents/evidence-grading";
import { verifyAgentOutput } from "@/agents/output-verifier";
import { resolvedEntitiesToJson } from "@/agents/entity-resolver";
import type { AgentKey } from "@/agents/types";
import type { AgentGraphDeps, AgentGraphState } from "@/agents/graph/state";
import { graphDiagnostics, runFromState } from "@/agents/graph/state";
import {
  appendAssistantMessage,
  appendRiskBoundaryNotice,
  augmentOutputJson,
  buildEvidenceGroups,
  buildResolvedResearchInput,
  commitMemory,
  defaultNewsWindow,
  fetchEvidenceForSkill,
  marketEvidence,
  missingInputPrompt,
  missingRequiredInputs,
  normalizeResearchInput,
  retrieveMemory,
  runAndPersistSkill,
  toolContext,
  unwindRiskBoundaryOutput,
} from "@/agents/executor";

export function createGraphNodes(deps: AgentGraphDeps) {
  return {
    router: tracedNode(deps, "router", async () => ({})),
    resolve_entity: tracedNode(deps, "resolve_entity", (state) => resolveEntityNode(state, deps)),
    plan_intent: tracedNode(deps, "plan_intent", (state) => planIntentNode(state)),
    normalize_input: tracedNode(deps, "normalize_input", (state) => normalizeInputNode(state, deps)),
    check_missing: tracedNode(deps, "check_missing", (state) => checkMissingNode(state, deps)),
    retrieve_memory: tracedNode(deps, "retrieve_memory", (state) => retrieveMemoryNode(state, deps)),
    fetch_evidence: tracedNode(deps, "fetch_evidence", (state) => fetchEvidenceNode(state, deps)),
    local_rag_retrieve: tracedNode(deps, "local_rag_retrieve", (state) => localRagRetrieveNode(state, deps)),
    grade_evidence: tracedNode(deps, "grade_evidence", (state) => gradeEvidenceNode(state)),
    generate: tracedNode(deps, "generate", (state) => runSkillNode(state, deps, "generate")),
    run_broadcast: tracedNode(deps, "run_broadcast", (state) => runSkillNode(state, deps, "run_broadcast")),
    verify_output: tracedNode(deps, "verify_output", (state) => verifyOutputNode(state)),
    commit_memory: tracedNode(deps, "commit_memory", (state) => commitMemoryNode(state, deps)),
    degrade: tracedNode(deps, "degrade", (state) => degradeNode(state)),
    finalize: tracedNode(deps, "finalize", (state) => finalizeNode(state, deps)),
    fetch_market: tracedNode(deps, "fetch_market", (state) => fetchMarketNode(state, deps)),
    build_market_evidence: tracedNode(deps, "build_market_evidence", (state) => buildMarketEvidenceNode(state, deps)),
  };
}

function tracedNode(
  deps: AgentGraphDeps,
  nodeKey: string,
  handler: (state: AgentGraphState) => Promise<Partial<AgentGraphState>> | Partial<AgentGraphState>
) {
  return async (state: AgentGraphState) => {
    const nodeKeys = [...(state.nodeKeys ?? []), nodeKey];
    await deps.repository.appendAgentStep({
      agentRunId: state.runId,
      nodeKey,
      order: nodeKeys.length,
      title: nodeKey,
      status: "running",
      message: `${nodeKey} started.`,
    });
    try {
      const update = await handler({ ...state, nodeKeys });
      await deps.repository.appendAgentStep({
        agentRunId: state.runId,
        nodeKey,
        order: nodeKeys.length,
        title: nodeKey,
        status: "completed",
        message: `${nodeKey} completed.`,
      });
      return { ...update, nodeKeys };
    } catch (error) {
      if (isInterrupted(error) || isGraphInterrupt(error)) {
        throw error;
      }
      await deps.repository.appendAgentStep({
        agentRunId: state.runId,
        nodeKey,
        order: nodeKeys.length,
        title: nodeKey,
        status: "failed",
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };
}

async function resolveEntityNode(state: AgentGraphState, deps: AgentGraphDeps): Promise<Partial<AgentGraphState>> {
  await deps.repository.updateAgentRun(state.runId, { status: "planning", startedAt: new Date(), error: null });
  const resolved = await buildResolvedResearchInput(runFromState(state), deps.repository, deps.toolRegistry, contextFor(state, deps));
  return {
    inputPayload: resolved.inputPayload,
    resolvedEntities: resolved.entities,
    outputJson: {
      ...state.outputJson,
      resolvedEntities: resolvedEntitiesToJson(resolved.entities),
    },
    status: "planning",
  };
}

function planIntentNode(state: AgentGraphState): Partial<AgentGraphState> {
  const intentPlan = planMultiIntent({
    question: state.question,
    inputPayload: state.inputPayload,
    resolvedEntities: state.resolvedEntities ?? {},
    forcedSkillKey: forcedSkillKey(state),
  });
  return {
    skillKey: intentPlan.primarySkillKey,
    intentPlan: intentPlan as unknown as Record<string, unknown>,
    outputJson: { ...state.outputJson, intentPlan },
  };
}

async function normalizeInputNode(state: AgentGraphState, deps: AgentGraphDeps): Promise<Partial<AgentGraphState>> {
  const normalizedInput = await normalizeResearchInput(
    state.skillKey,
    runFromState(state),
    deps.repository,
    deps.toolRegistry,
    contextFor(state, deps)
  );
  return { inputPayload: normalizedInput, resumedFromInterrupt: false };
}

async function checkMissingNode(state: AgentGraphState, _deps: AgentGraphDeps): Promise<Partial<AgentGraphState>> {
  const missingInputs = missingRequiredInputs(state.skillKey, state.inputPayload);
  if (missingInputs.length === 0) return { interrupt: null, resumedFromInterrupt: false };

  const message = missingInputPrompt(missingInputs);
  const interruptPayload = { type: "missing_input", missingInputs, message, runId: state.runId, skillKey: state.skillKey };
  const supplement = interrupt<Record<string, unknown>, Record<string, unknown>>(interruptPayload);
  return {
    inputPayload: { ...state.inputPayload, ...(isRecord(supplement) ? supplement : {}) },
    interrupt: null,
    outputMarkdown: "",
    status: "planning",
    resumedFromInterrupt: true,
  };
}

async function retrieveMemoryNode(state: AgentGraphState, deps: AgentGraphDeps): Promise<Partial<AgentGraphState>> {
  const memoryHits = await retrieveMemory(runFromState(state), deps.toolRegistry, contextFor(state, deps));
  return { memoryHits };
}

async function fetchEvidenceNode(state: AgentGraphState, deps: AgentGraphDeps): Promise<Partial<AgentGraphState>> {
  await deps.repository.updateAgentRun(state.runId, { status: "fetching_data", skillKey: state.skillKey, inputPayload: state.inputPayload });
  const evidenceGaps = [...state.evidenceGaps];
  const evidence = await fetchEvidenceForSkill(state.skillKey, state.inputPayload, deps.toolRegistry, contextFor(state, deps), evidenceGaps);
  await deps.repository.writeEvidence(state.runId, evidence);
  return { evidence, evidenceGaps, status: "fetching_data" };
}

async function localRagRetrieveNode(state: AgentGraphState, deps: AgentGraphDeps): Promise<Partial<AgentGraphState>> {
  try {
    const result = await deps.toolRegistry.call("rag.search", { query: state.question, topK: 6 }, contextFor(state, deps));
    const ragHits = Array.isArray(result.data) ? result.data : [];
    await persistGraphDiagnostics(state, deps, { ragHits });
    return { ragHits };
  } catch (error) {
    const evidenceGaps = [
      ...state.evidenceGaps,
      { toolKey: "rag.search", reason: error instanceof Error ? error.message : String(error), retryable: true },
    ];
    await persistGraphDiagnostics(state, deps, { evidenceGaps });
    return { evidenceGaps };
  }
}

function gradeEvidenceNode(state: AgentGraphState): Partial<AgentGraphState> {
  const evidenceGrade = gradeEvidence({
    skillKey: state.skillKey,
    normalizedInput: state.inputPayload,
    evidence: state.evidence,
    evidenceGaps: state.evidenceGaps,
  });
  return { evidenceGrade };
}

async function runSkillNode(state: AgentGraphState, deps: AgentGraphDeps, nodeKey: "generate" | "run_broadcast"): Promise<Partial<AgentGraphState>> {
  await deps.repository.updateAgentRun(state.runId, { status: "running_skill" });
  const skillKey = nodeKey === "run_broadcast" ? "investoday-stock-market-broadcast" : state.skillKey;
  const skillResult = await runAndPersistSkill({
    run: { ...runFromState(state), skillKey, inputPayload: state.inputPayload },
    repository: deps.repository,
    modelProvider: deps.modelProvider,
    skillKey,
    evidence: state.evidence,
    memory: state.memoryHits,
    stepNodeKey: nodeKey,
  });
  const outputMarkdown =
    skillKey === "investoday-ai-unwind-advisor" ? appendRiskBoundaryNotice(skillResult.outputMarkdown) : skillResult.outputMarkdown;
  return {
    attempts: state.attempts + 1,
    skillKey,
    skillResult: { ...skillResult, outputMarkdown },
    outputMarkdown,
    outputJson: skillResult.outputJson,
    status: "running_skill",
  };
}

function verifyOutputNode(state: AgentGraphState): Partial<AgentGraphState> {
  const evidenceGrade = state.evidenceGrade ?? gradeEvidence({
    skillKey: state.skillKey,
    normalizedInput: state.inputPayload,
    evidence: state.evidence,
    evidenceGaps: state.evidenceGaps,
  });
  const verification = verifyAgentOutput({
    markdown: state.outputMarkdown,
    inputPayload: state.inputPayload,
    evidence: state.evidence,
    evidenceGrade,
  });
  return { evidenceGrade, verification };
}

async function commitMemoryNode(state: AgentGraphState, deps: AgentGraphDeps): Promise<Partial<AgentGraphState>> {
  await commitMemory(deps.repository, runFromState(state), state.skillKey, state.inputPayload, state.outputMarkdown);
  return {};
}

function degradeNode(state: AgentGraphState): Partial<AgentGraphState> {
  const evidenceGrade = state.evidenceGrade ?? gradeEvidence({
    skillKey: state.skillKey,
    normalizedInput: state.inputPayload,
    evidence: state.evidence,
    evidenceGaps: state.evidenceGaps,
  });
  const outputMarkdown =
    state.skillKey === "investoday-ai-unwind-advisor"
      ? appendRiskBoundaryNotice(insufficientEvidenceMarkdown(evidenceGrade, state.inputPayload))
      : insufficientEvidenceMarkdown(evidenceGrade, state.inputPayload);
  const verification = verifyAgentOutput({ markdown: outputMarkdown, inputPayload: state.inputPayload, evidence: state.evidence, evidenceGrade });
  return { evidenceGrade, outputMarkdown, verification, outputJson: {}, status: "completed" };
}

async function finalizeNode(state: AgentGraphState, deps: AgentGraphDeps): Promise<Partial<AgentGraphState>> {
  const extra = {
    intentPlan: state.intentPlan,
    resolvedEntities: state.resolvedEntities ? resolvedEntitiesToJson(state.resolvedEntities) : undefined,
    evidenceGroups: buildEvidenceGroups(state.evidence),
    evidenceGaps: state.evidenceGaps,
    ragHits: state.ragHits,
    supportingSkillRuns: [],
    ...(state.skillKey === "investoday-ai-unwind-advisor" ? unwindRiskBoundaryOutput(state.evidence.length > 0) : {}),
  };
  const evidenceGrade = state.evidenceGrade ?? gradeEvidence({
    skillKey: state.skillKey,
    normalizedInput: state.inputPayload,
    evidence: state.evidence,
    evidenceGaps: state.evidenceGaps,
  });
  const verification =
    state.verification ?? verifyAgentOutput({ markdown: state.outputMarkdown, inputPayload: state.inputPayload, evidence: state.evidence, evidenceGrade });
  const outputJson = augmentOutputJson(state.outputJson, state.memoryHits, evidenceGrade, verification, extra);
  const finalOutputJson = { ...outputJson, graphState: graphDiagnostics({ ...state, evidenceGrade, verification, outputJson }) };
  await appendAssistantMessage(deps.repository, runFromState(state), state.outputMarkdown);
  await deps.repository.updateAgentRun(state.runId, {
    status: "completed",
    skillKey: state.skillKey,
    outputMarkdown: state.outputMarkdown,
    outputJson: finalOutputJson,
    error: null,
    model: deps.modelProvider.model,
    completedAt: new Date(),
  });
  return { status: "completed", outputJson: finalOutputJson };
}

async function fetchMarketNode(state: AgentGraphState, deps: AgentGraphDeps): Promise<Partial<AgentGraphState>> {
  await deps.repository.updateAgentRun(state.runId, { status: "fetching_data", startedAt: new Date(), error: null });
  const context = contextFor(state, deps, "market-broadcast-agent");
  const [overview, breadth, indexQuotes, news] = await Promise.all([
    deps.toolRegistry.call("market.overview", state.inputPayload, context),
    deps.toolRegistry.call("market.changeRatioStatus", {}, context),
    deps.toolRegistry.call("market.indexRealtime", { indexCodes: ["000001", "399001", "399006", "000300"] }, context),
    deps.toolRegistry.call("news.market", defaultNewsWindow(), context),
  ]);
  return {
    skillKey: "investoday-stock-market-broadcast",
    marketData: {
      overview: overview.data,
      breadth: breadth.data,
      indexQuotes: indexQuotes.data,
      news: news.data,
    },
    status: "fetching_data",
  };
}

async function buildMarketEvidenceNode(state: AgentGraphState, deps: AgentGraphDeps): Promise<Partial<AgentGraphState>> {
  const data = state.marketData ?? {};
  const evidence = marketEvidence(data.overview, data.breadth, data.indexQuotes, data.news);
  await deps.repository.writeEvidence(state.runId, evidence);
  return { evidence };
}

function contextFor(state: AgentGraphState, deps: AgentGraphDeps, agentKey: AgentKey = state.agentKey) {
  return toolContext(runFromState({ ...state, agentKey }), deps.repository, agentKey);
}

function forcedSkillKey(state: AgentGraphState) {
  const abilityKey = state.inputPayload.abilityKey;
  return typeof abilityKey === "string" && abilityKey && abilityKey !== "auto" ? abilityKey : undefined;
}

async function persistGraphDiagnostics(state: AgentGraphState, deps: AgentGraphDeps, update: Partial<AgentGraphState>) {
  const next = { ...state, ...update };
  await deps.repository.updateAgentRun(state.runId, {
    outputJson: {
      graphState: graphDiagnostics(next),
      ragHits: next.ragHits,
      evidenceGaps: next.evidenceGaps,
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
