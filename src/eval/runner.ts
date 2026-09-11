import { writeFileSync } from "node:fs";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { AGENT_QUEUE_NAME, createAgentQueue } from "@/agents/queue";
import { createAgentRunTask } from "@/agents/runs";
import type { AgentKey } from "@/agents/types";
import { DEFAULT_AGENT_USER_ID } from "@/agents/memory";
import { getDefaultRagService, type RagHit, type RagMetadata } from "@/rag/local-rag";
import { prisma } from "@/lib/prisma";
import { appendAgentMessage, getAgentRun, PrismaAgentRunRepository } from "@/lib/repositories";

export type EvalCase = {
  id: string;
  agentKey: AgentKey;
  name: string;
  prompt: string;
  tags: string[];
  expectedCitations?: string[];
};

export type EvalRunSnapshot = {
  caseId: string;
  outputMarkdown?: string | null;
  expectedCitations?: string[];
  evidence?: Array<{ title?: string }>;
  toolResults?: Array<{ toolKey: string; ok?: boolean; latencyMs?: number }>;
  ragHits?: Array<{ chunkId: string; documentId: string; score?: number }>;
  latencyMs?: number;
  costCents?: number;
};

export type EvalMetricResult = {
  completion: number;
  toolSuccessRate: number;
  citationPrecision: number;
  ragRecallAtK: number;
  hallucinationRate: number;
  latencyMs: number;
  costCents: number;
};

export type EvalResult = {
  caseId: string;
  passed: boolean;
  score: number;
  metrics: EvalMetricResult;
  notes: string[];
};

export type RealEvalMode = "smoke" | "real" | "stress";

export type RealEvalTurnExpected = {
  entityKeywords?: string[];
  forbiddenKeywords?: string[];
  expectedStatus?: "completed" | "failed" | "interrupted";
  expectedRagKeywords?: string[];
  requiresEvidence?: boolean;
  requiresMemoryRecall?: boolean;
  requiresMemoryWrite?: boolean;
  requiresHtmlArtifact?: boolean;
  allowedNoModelCall?: boolean;
};

export type RealEvalTurn = {
  prompt: string;
  agentKey?: AgentKey;
  abilityKey?: "auto" | string;
  inputPayload?: Record<string, unknown>;
  expected?: RealEvalTurnExpected;
};

export type RealEvalCase = {
  id: string;
  name: string;
  agentKey: AgentKey;
  tags: string[];
  turns: RealEvalTurn[];
};

export type RealEvalRunDetail = {
  id: string;
  sessionId?: string | null;
  status: string;
  outputMarkdown?: string | null;
  outputJson?: Record<string, unknown> | null;
  inputPayload?: Record<string, unknown> | null;
  toolCalls: Array<{
    id?: string;
    toolKey: string;
    status: string;
    outputSummary?: string | null;
    error?: string | null;
    latencyMs?: number | null;
    sourceEndpoint?: string | null;
    inputJson?: unknown;
  }>;
  evidenceRecords: Array<{
    id?: string;
    title?: string | null;
    source?: string | null;
    summary?: string | null;
    rawPayload?: unknown;
    sourceEndpoint?: string | null;
  }>;
  modelCalls: Array<{
    id?: string;
    model: string;
    status: string;
    tokenInput?: number | null;
    tokenOutput?: number | null;
    costCents?: number | null;
    latencyMs?: number | null;
    error?: string | null;
  }>;
  steps?: Array<{ nodeKey?: string | null; status?: string | null; title?: string | null; message?: string | null }>;
  skillRuns?: Array<{ id?: string; skillKey?: string; status?: string; outputHtml?: string | null }>;
};

export type RealEvalMetrics = {
  completion_rate: number;
  terminal_rate: number;
  tool_success_rate: number;
  evidence_coverage_rate: number;
  entity_match_rate: number;
  citation_precision: number;
  citation_recall: number;
  rag_recall_at_k: number | null;
  memory_write_rate: number | null;
  memory_recall_rate: number | null;
  context_inheritance_accuracy: number | null;
  cross_session_leak_rate: number;
  stale_date_rate: number;
  hallucination_rate: number;
  interruption_accuracy: number | null;
  latency_ms: number;
  model_call_count: number;
  token_input: number;
  token_output: number;
  cost_cents: number;
};

export type RealEvalCaseResult = {
  caseId: string;
  caseName: string;
  turnIndex: number;
  prompt: string;
  agentKey: AgentKey;
  sessionId: string;
  runId: string;
  finalStatus: string;
  outputMarkdown: string;
  toolCalls: RealEvalRunDetail["toolCalls"];
  evidenceRecords: RealEvalRunDetail["evidenceRecords"];
  modelCalls: RealEvalRunDetail["modelCalls"];
  memoryHits: unknown[];
  memoryWrites: unknown[];
  ragHits: RagHit[];
  evidenceGaps: unknown[];
  metrics: RealEvalMetrics;
  passed: boolean;
  failureReasons: string[];
  failureCategory: RealEvalFailureCategory;
  failureStage: RealEvalFailureStage;
};

export type RealEvalFailureCategory = "none" | "infra" | "model" | "tool" | "runtime" | "quality";
export type RealEvalFailureStage = "completed" | "environment" | "tooling" | "model_generation" | "runtime" | "quality";

export type RealEvalReport = {
  markdown: string;
  json: string;
  summary: ReturnType<typeof summarizeRealResults>;
};

export type RealEvalRunOptions = {
  mode?: RealEvalMode;
  timeoutMs?: number;
  pollMs?: number;
  concurrency?: number;
  outputMarkdownPath?: string;
  outputJsonPath?: string;
  onCaseStart?: (evalCase: RealEvalCase) => void;
  onCaseResult?: (result: RealEvalCaseResult) => void;
};

type EnvironmentChecks = {
  env?: Record<string, string | undefined>;
  checkDatabase?: (databaseUrl: string) => Promise<void>;
  checkRedis?: (redisUrl: string) => Promise<void>;
  checkWorker?: (redisUrl: string) => Promise<void>;
};

const TERMINAL_STATUSES = new Set(["completed", "failed", "interrupted"]);

export function selectRealEvalCases(mode: RealEvalMode = "smoke") {
  const cases = buildRealEvalCases();
  if (mode === "smoke") return cases.filter((item) => item.tags.includes("smoke")).slice(0, 6);
  if (mode === "stress") return buildStressEvalCases();
  return cases;
}

export async function assertRealEvalEnvironment(options: EnvironmentChecks = {}) {
  const env = options.env ?? process.env;
  const failures: string[] = [];
  const databaseUrl = env.DATABASE_URL;
  const redisUrl = env.REDIS_URL;
  const llmApiKey = env.DEEPSEEK_API_KEY || env.OPENAI_API_KEY || env.LLM_API_KEY;

  if (!databaseUrl) failures.push("DATABASE_URL is required for real Agent eval.");
  if (databaseUrl && !databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
    failures.push("DATABASE_URL must point to a real Postgres database.");
  }
  if (!redisUrl) failures.push("REDIS_URL is required for BullMQ/Worker real Agent eval.");
  if (!llmApiKey) failures.push("LLM API key is required. Set DEEPSEEK_API_KEY, OPENAI_API_KEY, or LLM_API_KEY.");

  if (databaseUrl && (databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("postgres://"))) {
    await withTimeout((options.checkDatabase ?? defaultCheckDatabase)(databaseUrl), 10_000, "Postgres check timed out.").catch((error) => {
      failures.push(`Postgres check failed: ${errorMessage(error)}`);
    });
  }
  if (redisUrl) {
    await withTimeout((options.checkRedis ?? defaultCheckRedis)(redisUrl), 5_000, "Redis check timed out.").catch((error) => {
      failures.push(`Redis check failed: ${errorMessage(error)}`);
    });
    await withTimeout((options.checkWorker ?? defaultCheckWorker)(redisUrl), 8_000, "Agent Worker check timed out.").catch((error) => {
      failures.push(`Agent Worker check failed: ${errorMessage(error)}`);
    });
  }

  if (failures.length > 0) {
    throw new Error(`Real eval environment is not ready:\n- ${failures.join("\n- ")}\n\nStart services first: pnpm services:start, pnpm db:push, pnpm worker:agent`);
  }
}

export async function runRealEval(options: RealEvalRunOptions = {}) {
  const mode = options.mode ?? "smoke";
  const cases = selectRealEvalCases(mode);
  await assertRealEvalEnvironment();
  await seedEvalRagDocuments();

  const repository = new PrismaAgentRunRepository();
  const queue = createAgentQueue();
  try {
    const concurrency = mode === "stress" ? Math.max(options.concurrency ?? 3, 2) : 1;
    const results = await runCasePool(cases, concurrency, async (evalCase) => {
      options.onCaseStart?.(evalCase);
      const caseResults = await runRealEvalCase(evalCase, {
        repository,
        queue,
        timeoutMs: options.timeoutMs ?? Number(process.env.EVAL_CASE_TIMEOUT_MS ?? 900_000),
        pollMs: options.pollMs ?? Number(process.env.EVAL_POLL_MS ?? 2000),
      });
      for (const result of caseResults) options.onCaseResult?.(result);
      return caseResults;
    });
    const flatResults = results.flat();
    const report = buildRealEvalReport(flatResults);
    writeFileSync(options.outputMarkdownPath ?? "eval-report.md", report.markdown, "utf8");
    writeFileSync(options.outputJsonPath ?? "eval-report.json", report.json, "utf8");
    return report;
  } finally {
    await queue.close?.();
  }
}

export async function runRealEvalCase(
  evalCase: RealEvalCase,
  options: {
    repository: PrismaAgentRunRepository;
    queue: ReturnType<typeof createAgentQueue>;
    timeoutMs: number;
    pollMs: number;
  }
): Promise<RealEvalCaseResult[]> {
  const session = await options.repository.createAgentSession({
    userId: DEFAULT_AGENT_USER_ID,
    title: `Eval ${evalCase.id} ${evalCase.name}`,
    entry: evalCase.agentKey === "market-broadcast-agent" ? "market" : "research",
  });
  const results: RealEvalCaseResult[] = [];
  for (const [turnIndex, turn] of evalCase.turns.entries()) {
    const prompt = turn.prompt.trim();
    await appendAgentMessage({ sessionId: session.id, role: "user", content: prompt });
    const startedAt = Date.now();
    const run = await createAgentRunTask({
      agentKey: turn.agentKey ?? evalCase.agentKey,
      sessionId: session.id,
      abilityKey: turn.abilityKey ?? "auto",
      question: prompt,
      inputPayload: {
        ...(turn.inputPayload ?? {}),
        evalCaseId: evalCase.id,
        evalTurnIndex: turnIndex,
        evalMode: "real",
      },
      triggerType: "api",
      userId: DEFAULT_AGENT_USER_ID,
      repository: options.repository,
      queue: options.queue,
    });
    const detail = await waitForRunTerminal(run.id, options.timeoutMs, options.pollMs);
    const memoryWrites = await prisma.memoryItem.findMany({
      where: { sourceRunId: run.id },
      orderBy: { createdAt: "desc" },
    });
    results.push(
      scoreRealRunDetail({
        evalCase,
        turnIndex,
        runDetail: detail,
        latencyMs: Date.now() - startedAt,
        memoryWrites,
      })
    );
  }
  return results;
}

export function scoreRealRunDetail(input: {
  evalCase: RealEvalCase;
  turnIndex: number;
  runDetail: RealEvalRunDetail;
  latencyMs: number;
  memoryWrites?: unknown[];
}): RealEvalCaseResult {
  const turn = input.evalCase.turns[input.turnIndex] ?? input.evalCase.turns[0];
  const expected = turn.expected ?? {};
  const outputMarkdown = input.runDetail.outputMarkdown?.trim() ?? "";
  const outputJson = input.runDetail.outputJson ?? {};
  const graphState = objectValue(outputJson.graphState) ?? {};
  const verification = objectValue(graphState.verification) ?? objectValue(outputJson.verification) ?? {};
  const claimVerification = objectValue(verification.claimVerification);
  const memoryHits = arrayValue(outputJson.memoryHits);
  const ragHits = normalizeRagHits(arrayValue(outputJson.ragHits).length > 0 ? arrayValue(outputJson.ragHits) : arrayValue(graphState.ragHits));
  const evidenceGaps = arrayValue(outputJson.evidenceGaps);
  const terminal = TERMINAL_STATUSES.has(input.runDetail.status);
  const completed = input.runDetail.status === "completed";
  const toolCount = input.runDetail.toolCalls.length;
  const modelCount = input.runDetail.modelCalls.length;
  const toolSuccessRate = toolCount
    ? input.runDetail.toolCalls.filter((item) => ["completed", "success", "ok"].includes(item.status)).length / toolCount
    : 0;
  const failedModelCalls = input.runDetail.modelCalls.filter((item) => !["completed", "success", "ok"].includes(item.status));
  const modelUnavailable = modelCount > 0 && failedModelCalls.length === modelCount && outputMarkdown.length === 0;
  const hasEvidence = input.runDetail.evidenceRecords.length > 0;
  const evidenceText = compactForSearch(
    input.runDetail.evidenceRecords
      .map((item) => `${item.title ?? ""}\n${item.source ?? ""}\n${item.summary ?? ""}\n${JSON.stringify(item.rawPayload ?? {})}`)
      .join("\n")
  );
  const outputText = compactForSearch(outputMarkdown);
  const entityKeywords = expected.entityKeywords ?? [];
  const entityMatch =
    entityKeywords.length === 0 ? 1 : entityKeywords.filter((keyword) => includesLoose(evidenceText, keyword) || includesLoose(outputText, keyword)).length / entityKeywords.length;
  const factPrecision = estimateCitationPrecision(outputMarkdown, evidenceText, entityKeywords);
  const ragRecall =
    expected.expectedRagKeywords && expected.expectedRagKeywords.length > 0
      ? expected.expectedRagKeywords.some((keyword) => ragHits.some((hit) => includesLoose(`${hit.title}\n${hit.content}\n${hit.source}`, keyword)))
        ? 1
        : 0
      : null;
  const requiresMemoryRecall = Boolean(expected.requiresMemoryRecall);
  const memoryRecall = requiresMemoryRecall
    ? memoryHits.length > 0 || input.runDetail.toolCalls.some((item) => item.toolKey === "memory.search" && ["completed", "success", "ok"].includes(item.status))
      ? 1
      : 0
    : null;
  const memoryWrites = input.memoryWrites ?? [];
  const memoryWrite = expected.requiresMemoryWrite ? (memoryWrites.length > 0 ? 1 : 0) : null;
  const staleDateRate = detectStaleDateRate(outputMarkdown, new Date());
  const claimHallucinationRate = numberOrNull(claimVerification?.hallucinationRate);
  const hallucinationRate =
    claimHallucinationRate ??
    estimateHallucinationRate({
      outputMarkdown,
      hasEvidence,
      citationPrecision: factPrecision,
      evidenceGaps,
      expected,
    });
  const crossSessionLeakRate =
    expected.forbiddenKeywords?.some((keyword) => includesLoose(outputMarkdown, keyword) || includesLoose(evidenceText, keyword)) ?? false ? 1 : 0;
  const interruptionAccuracy =
    expected.expectedStatus === "interrupted" ? (input.runDetail.status === "interrupted" ? 1 : 0) : expected.expectedStatus ? (input.runDetail.status === expected.expectedStatus ? 1 : 0) : null;
  const tokenInput = sum(input.runDetail.modelCalls.map((item) => item.tokenInput ?? 0));
  const tokenOutput = sum(input.runDetail.modelCalls.map((item) => item.tokenOutput ?? 0));
  const costCents = sum(input.runDetail.modelCalls.map((item) => item.costCents ?? 0));
  const metrics: RealEvalMetrics = {
    completion_rate: completed ? 1 : 0,
    terminal_rate: terminal ? 1 : 0,
    tool_success_rate: round(toolSuccessRate),
    evidence_coverage_rate: hasEvidence || expected.requiresEvidence === false ? 1 : 0,
    entity_match_rate: round(entityMatch),
    citation_precision: round(factPrecision),
    citation_recall: hasEvidence && outputMarkdown ? round(Math.min(1, factPrecision + 0.15)) : 0,
    rag_recall_at_k: ragRecall,
    memory_write_rate: memoryWrite,
    memory_recall_rate: memoryRecall,
    context_inheritance_accuracy: entityKeywords.length > 0 ? round(entityMatch) : null,
    cross_session_leak_rate: crossSessionLeakRate,
    stale_date_rate: staleDateRate,
    hallucination_rate: hallucinationRate,
    interruption_accuracy: interruptionAccuracy,
    latency_ms: input.latencyMs,
    model_call_count: modelCount,
    token_input: tokenInput,
    token_output: tokenOutput,
    cost_cents: costCents,
  };

  const processFailureReasons = [
    ...(terminal ? [] : ["non_terminal_run"]),
    ...(completed || expected.expectedStatus === input.runDetail.status ? [] : [`unexpected_status:${input.runDetail.status}`]),
    ...(toolCount > 0 ? [] : ["missing_real_tool_calls"]),
    ...(modelCount > 0 || expected.allowedNoModelCall ? [] : ["missing_real_model_calls"]),
    ...(metrics.evidence_coverage_rate === 1 ? [] : ["missing_evidence_records"]),
  ];
  const qualityFailureReasons = modelUnavailable
    ? []
    : [
    ...(metrics.entity_match_rate >= 0.7 ? [] : ["entity_mismatch"]),
    ...(metrics.citation_precision >= 0.7 ? [] : ["citation_precision_low"]),
    ...(metrics.rag_recall_at_k === null || metrics.rag_recall_at_k >= 0.8 ? [] : ["rag_recall_miss"]),
    ...(metrics.memory_write_rate === null || metrics.memory_write_rate >= 1 ? [] : ["memory_write_miss"]),
    ...(metrics.memory_recall_rate === null || metrics.memory_recall_rate >= 1 ? [] : ["memory_recall_miss"]),
    ...(metrics.cross_session_leak_rate === 0 ? [] : ["cross_session_leak"]),
    ...(metrics.stale_date_rate === 0 ? [] : ["stale_date"]),
    ...(metrics.hallucination_rate <= 0.05 ? [] : ["possible_hallucination"]),
  ];
  const failureReasons = [
    ...processFailureReasons,
    ...(modelUnavailable ? ["model_unavailable"] : []),
    ...qualityFailureReasons,
  ];
  const { failureCategory, failureStage } = classifyRealEvalFailure({
    failureReasons,
    modelUnavailable,
    toolSuccessRate,
    terminal,
    completed,
  });

  return {
    caseId: `${input.evalCase.id}#${input.turnIndex + 1}`,
    caseName: input.evalCase.name,
    turnIndex: input.turnIndex,
    prompt: turn.prompt,
    agentKey: turn.agentKey ?? input.evalCase.agentKey,
    sessionId: input.runDetail.sessionId ?? "",
    runId: input.runDetail.id,
    finalStatus: input.runDetail.status,
    outputMarkdown,
    toolCalls: input.runDetail.toolCalls,
    evidenceRecords: input.runDetail.evidenceRecords,
    modelCalls: input.runDetail.modelCalls,
    memoryHits,
    memoryWrites,
    ragHits,
    evidenceGaps,
    metrics,
    passed: failureReasons.length === 0,
    failureReasons,
    failureCategory,
    failureStage,
  };
}

export function buildRealEvalReport(results: RealEvalCaseResult[]): RealEvalReport {
  const summary = summarizeRealResults(results);
  const failed = results.filter((item) => !item.passed);
  const toolFailures = countBy(
    results.flatMap((result) => result.toolCalls.filter((tool) => !["completed", "success", "ok"].includes(tool.status)).map((tool) => tool.toolKey))
  );
  const failureCategories = countBy(failed.map((item) => `${item.failureCategory}/${item.failureStage}`));
  const modelFailures = countBy(
    results.flatMap((result) => result.modelCalls.filter((call) => !["completed", "success", "ok"].includes(call.status)).map(modelFailureLabel))
  );
  const markdown = [
    "# 真实 Agent Eval Report",
    "",
    "本报告只统计真实 AgentRun。任一 case 如果缺少 runId、ToolCall 或 ModelCall，会直接标记失败，不再计入伪成功。",
    "",
    "## 总览指标",
    "",
    `- total: ${summary.total}`,
    `- passed: ${summary.passed}`,
    `- terminal_rate: ${summary.terminal_rate}`,
    `- completion_rate: ${summary.completion_rate}`,
    `- tool_success_rate: ${summary.tool_success_rate}`,
    `- evidence_coverage_rate: ${summary.evidence_coverage_rate}`,
    `- citation_precision: ${summary.citation_precision}`,
    `- rag_recall_at_k: ${summary.rag_recall_at_k}`,
    `- memory_recall_rate: ${summary.memory_recall_rate}`,
    `- cross_session_leak_rate: ${summary.cross_session_leak_rate}`,
    `- stale_date_rate: ${summary.stale_date_rate}`,
    `- hallucination_rate: ${summary.hallucination_rate}`,
    `- latency_p50_ms: ${summary.latency_p50_ms}`,
    `- latency_p95_ms: ${summary.latency_p95_ms}`,
    `- total_cost_cents: ${summary.total_cost_cents}`,
    "",
    "## 失败分类",
    "",
    ...(Object.keys(failureCategories).length ? Object.entries(failureCategories).map(([category, count]) => `- ${category}: ${count}`) : ["- none"]),
    "",
    "## 失败 Case",
    "",
    "| case | runId | status | category | reasons |",
    "|---|---|---|---|---|",
    ...(failed.length
      ? failed.map((item) => `| ${item.caseId} | ${item.runId} | ${item.finalStatus} | ${item.failureCategory}/${item.failureStage} | ${item.failureReasons.join(", ")} |`)
      : ["| none | - | - | - | - |"]),
    "",
    "## 工具失败分布",
    "",
    ...(Object.keys(toolFailures).length ? Object.entries(toolFailures).map(([tool, count]) => `- ${tool}: ${count}`) : ["- none"]),
    "",
    "## 模型失败分布",
    "",
    ...(Object.keys(modelFailures).length ? Object.entries(modelFailures).map(([label, count]) => `- ${label}: ${count}`) : ["- none"]),
    "",
    "## 证据缺口与幻觉示例",
    "",
    ...exampleLines(
      results.filter((item) => item.evidenceGaps.length > 0 || item.metrics.hallucination_rate > 0),
      (item) => `- ${item.caseId} / ${item.runId}: gaps=${item.evidenceGaps.length}, hallucination=${item.metrics.hallucination_rate}`
    ),
    "",
    "## RAG 命中示例",
    "",
    ...exampleLines(
      results.filter((item) => item.ragHits.length > 0),
      (item) => `- ${item.caseId} / ${item.runId}: ${item.ragHits.slice(0, 3).map((hit) => `${hit.title}(${hit.score})`).join("; ")}`
    ),
    "",
    "## 记忆结果",
    "",
    ...exampleLines(
      results.filter((item) => item.memoryHits.length > 0 || item.memoryWrites.length > 0 || item.metrics.memory_recall_rate !== null),
      (item) =>
        `- ${item.caseId} / ${item.runId}: memoryHits=${item.memoryHits.length}, memoryWrites=${item.memoryWrites.length}, recall=${item.metrics.memory_recall_rate ?? "n/a"}`
    ),
    "",
    "## 成本与延迟",
    "",
    `- model_call_count: ${sum(results.map((item) => item.metrics.model_call_count))}`,
    `- token_input: ${sum(results.map((item) => item.metrics.token_input))}`,
    `- token_output: ${sum(results.map((item) => item.metrics.token_output))}`,
    `- cost_cents: ${summary.total_cost_cents}`,
    "",
  ].join("\n");
  return {
    markdown,
    json: JSON.stringify({ summary: { ...summary, failureCategories, modelFailures }, results }, null, 2),
    summary,
  };
}

export function smokeEvalCases(): EvalCase[] {
  return buildRealEvalCases().map((item) => ({
    id: item.id,
    agentKey: item.agentKey,
    name: item.name,
    prompt: item.turns[0]?.prompt ?? "",
    tags: item.tags,
    expectedCitations: item.tags.includes("interrupt") ? [] : ["[1]"],
  }));
}

export function evaluateRunSnapshot(snapshot: EvalRunSnapshot): EvalResult {
  const output = snapshot.outputMarkdown?.trim() ?? "";
  const expectedCitations = snapshot.expectedCitations ?? [];
  const toolResults = snapshot.toolResults ?? [];
  const ragHits = snapshot.ragHits ?? [];
  const completion = output.length > 0 ? 1 : 0;
  const toolSuccessRate =
    toolResults.length === 0 ? 1 : toolResults.filter((item) => item.ok !== false).length / toolResults.length;
  const citationPrecision =
    expectedCitations.length === 0
      ? 1
      : expectedCitations.filter((citation) => output.includes(citation)).length / expectedCitations.length;
  const ragRecallAtK = ragHits.length > 0 ? 1 : 0;
  const hallucinationRate = completion && snapshot.evidence?.length === 0 && expectedCitations.length > 0 ? 1 : 0;
  const metrics: EvalMetricResult = {
    completion,
    toolSuccessRate: round(toolSuccessRate),
    citationPrecision: round(citationPrecision),
    ragRecallAtK,
    hallucinationRate,
    latencyMs: snapshot.latencyMs ?? 0,
    costCents: snapshot.costCents ?? 0,
  };
  const score = round(
    0.3 * metrics.completion +
      0.2 * metrics.toolSuccessRate +
      0.2 * metrics.citationPrecision +
      0.2 * metrics.ragRecallAtK +
      0.1 * (1 - metrics.hallucinationRate)
  );
  const notes = [
    ...(metrics.completion ? [] : ["empty_output"]),
    ...(metrics.toolSuccessRate === 1 ? [] : ["tool_failure"]),
    ...(metrics.citationPrecision === 1 ? [] : ["citation_gap"]),
    ...(metrics.hallucinationRate === 0 ? [] : ["possible_hallucination"]),
  ];
  return { caseId: snapshot.caseId, passed: score >= 0.7, score, metrics, notes };
}

export function buildEvalReport(results: EvalResult[]) {
  const summary = summarizeSyntheticResults(results);
  const markdown = [
    "# Synthetic Agent Eval Report",
    "",
    "This report is synthetic and must not be used as real Agent reliability evidence.",
    "",
    `- total: ${summary.total}`,
    `- passed: ${summary.passed}`,
    `- average_score: ${summary.averageScore}`,
    `- completion: ${summary.averageMetrics.completion}`,
    `- tool_success: ${summary.averageMetrics.toolSuccessRate}`,
    `- citation_precision: ${summary.averageMetrics.citationPrecision}`,
    `- rag_recall_at_k: ${summary.averageMetrics.ragRecallAtK}`,
    `- hallucination_rate: ${summary.averageMetrics.hallucinationRate}`,
    "",
    "| case | pass | score | notes |",
    "|---|---:|---:|---|",
    ...results.map((item) => `| ${item.caseId} | ${item.passed ? "yes" : "no"} | ${item.score} | ${item.notes.join(", ")} |`),
    "",
  ].join("\n");
  return { markdown, json: JSON.stringify({ summary, results }, null, 2) };
}

async function runCasePool<T>(items: T[], concurrency: number, handler: (item: T) => Promise<RealEvalCaseResult[]>) {
  const output: RealEvalCaseResult[][] = [];
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await handler(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return output;
}

async function waitForRunTerminal(runId: string, timeoutMs: number, pollMs: number): Promise<RealEvalRunDetail> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const run = await getAgentRun(runId);
    if (!run) throw new Error(`AgentRun not found: ${runId}`);
    if (TERMINAL_STATUSES.has(String(run.status))) {
      return shapeRealRunDetail(run);
    }
    await sleep(pollMs);
  }
  const run = await getAgentRun(runId);
  if (!run) throw new Error(`AgentRun not found after timeout: ${runId}`);
  return shapeRealRunDetail(run);
}

function shapeRealRunDetail(run: Record<string, unknown>): RealEvalRunDetail {
  return {
    id: String(run.id),
    sessionId: typeof run.sessionId === "string" ? run.sessionId : null,
    status: String(run.status),
    outputMarkdown: typeof run.outputMarkdown === "string" ? run.outputMarkdown : "",
    outputJson: objectValue(run.outputJson) ?? {},
    inputPayload: objectValue(run.inputPayload) ?? {},
    toolCalls: arrayValue(run.toolCalls).map((item) => {
      const call = objectValue(item) ?? {};
      return {
        id: stringOrUndefined(call.id),
        toolKey: String(call.toolKey ?? ""),
        status: String(call.status ?? ""),
        outputSummary: stringOrUndefined(call.outputSummary),
        error: stringOrUndefined(call.error),
        latencyMs: numberOrUndefined(call.latencyMs),
        sourceEndpoint: stringOrUndefined(call.sourceEndpoint),
        inputJson: call.inputJson,
      };
    }),
    evidenceRecords: arrayValue(run.evidence).map((item) => {
      const evidence = objectValue(item) ?? {};
      return {
        id: stringOrUndefined(evidence.id),
        title: stringOrUndefined(evidence.title),
        source: stringOrUndefined(evidence.source),
        summary: stringOrUndefined(evidence.summary),
        sourceEndpoint: stringOrUndefined(evidence.sourceEndpoint),
        rawPayload: evidence.rawPayload,
      };
    }),
    modelCalls: arrayValue(run.modelCalls).map((item) => {
      const modelCall = objectValue(item) ?? {};
      return {
        id: stringOrUndefined(modelCall.id),
        model: String(modelCall.model ?? ""),
        status: String(modelCall.status ?? ""),
        tokenInput: numberOrUndefined(modelCall.tokenInput),
        tokenOutput: numberOrUndefined(modelCall.tokenOutput),
        costCents: numberOrUndefined(modelCall.costCents),
        latencyMs: numberOrUndefined(modelCall.latencyMs),
        error: stringOrUndefined(modelCall.error),
      };
    }),
    steps: arrayValue(run.steps).map((item) => {
      const step = objectValue(item) ?? {};
      return {
        nodeKey: stringOrUndefined(step.nodeKey),
        status: stringOrUndefined(step.status),
        title: stringOrUndefined(step.title),
        message: stringOrUndefined(step.message),
      };
    }),
    skillRuns: arrayValue(run.skillRuns).map((item) => {
      const skillRun = objectValue(item) ?? {};
      return {
        id: stringOrUndefined(skillRun.id),
        skillKey: stringOrUndefined(skillRun.skillKey),
        status: stringOrUndefined(skillRun.status),
        outputHtml: stringOrUndefined(skillRun.outputHtml),
      };
    }),
  };
}

function buildRealEvalCases(): RealEvalCase[] {
  const cases: RealEvalCase[] = [
    {
      id: "real-001",
      name: "贵州茅台中文名公司研究",
      agentKey: "research-router-agent",
      tags: ["smoke", "stock", "citation"],
      turns: [
        {
          prompt: "研究贵州茅台（600519）近30天研报怎么看？请引用证据，输出结论、核心依据、主要风险、后续关注。",
          expected: { entityKeywords: ["贵州茅台", "600519"], requiresEvidence: true, requiresMemoryWrite: true },
        },
      ],
    },
    {
      id: "real-002",
      name: "行业研究有色金属",
      agentKey: "research-router-agent",
      tags: ["smoke", "industry", "tool"],
      turns: [
        {
          prompt: "研究有色金属行业近30天有什么变化？输出结论、证据、风险。",
          expected: { entityKeywords: ["有色金属"], requiresEvidence: true },
        },
      ],
    },
    {
      id: "real-003",
      name: "当日盘面播报",
      agentKey: "market-broadcast-agent",
      tags: ["smoke", "market"],
      turns: [
        {
          prompt: "生成今日盘面播报，引用指数脉冲、赚钱效应和行业轮动证据。",
          expected: { entityKeywords: ["上证", "指数"], requiresEvidence: true },
        },
      ],
    },
    {
      id: "real-004",
      name: "本地 RAG 茅台渠道风险",
      agentKey: "research-router-agent",
      tags: ["smoke", "rag", "citation"],
      turns: [
        {
          prompt: "引用本地文档回答贵州茅台渠道风险，必须说明来源。",
          expected: {
            entityKeywords: ["贵州茅台", "渠道"],
            expectedRagKeywords: ["茅台渠道风险"],
            requiresEvidence: true,
          },
        },
      ],
    },
    {
      id: "real-005",
      name: "同会话记忆继承",
      agentKey: "research-router-agent",
      tags: ["smoke", "memory", "multiturn"],
      turns: [
        {
          prompt: "接下来都以贵州茅台（600519）为研究对象，近90天，按巴菲特风格分析。",
          expected: { entityKeywords: ["贵州茅台", "600519"], requiresMemoryWrite: true },
        },
        {
          prompt: "它最近有什么风险？沿用上面的时间范围。",
          expected: { entityKeywords: ["贵州茅台", "600519"], requiresEvidence: true },
        },
      ],
    },
    {
      id: "real-006",
      name: "解套多意图路径",
      agentKey: "research-router-agent",
      tags: ["smoke", "interrupt", "multi-intent"],
      turns: [
        {
          prompt: "我的永兴材料被套40%，仓位三成，请问还有解套空间吗？短期碳酸锂会涨吗？",
          expected: { entityKeywords: ["永兴材料"], requiresEvidence: true },
        },
      ],
    },
  ];

  const themes = [
    { name: "宁德时代", entity: ["宁德时代", "300750"], prompt: "研究宁德时代（300750）近30天研报怎么看？请引用证据。" },
    { name: "比亚迪", entity: ["比亚迪", "002594"], prompt: "研究比亚迪（002594）近30天销量、利润弹性和风险。" },
    { name: "中国平安", entity: ["中国平安", "601318"], prompt: "研究中国平安（601318）近90天核心变化，引用研报或新闻证据。" },
    { name: "白酒行业", entity: ["白酒"], prompt: "研究白酒行业近30天景气度和风险，引用今日投资证据。" },
    { name: "半导体行业", entity: ["半导体"], prompt: "研究半导体行业近30天催化因素和风险，引用证据。" },
    { name: "银行行业", entity: ["银行"], prompt: "研究银行行业近30天估值和风险，引用证据。" },
    { name: "新能源行业", entity: ["新能源"], prompt: "研究新能源行业近30天政策、需求和风险，引用证据。" },
    { name: "人工智能主题", entity: ["人工智能"], prompt: "研究人工智能主题近30天产业催化和风险，引用证据。" },
  ];
  for (let index = 0; cases.length < 50; index += 1) {
    const theme = themes[index % themes.length];
    const isMarket = index % 12 === 0;
    const isRag = index % 5 === 0;
    cases.push({
      id: `real-${String(cases.length + 1).padStart(3, "0")}`,
      name: isMarket ? `盘面播报回归 ${index + 1}` : `${theme.name} 投研回归 ${index + 1}`,
      agentKey: isMarket ? "market-broadcast-agent" : "research-router-agent",
      tags: [isMarket ? "market" : "tool", isRag ? "rag" : "citation"],
      turns: [
        {
          prompt: isMarket ? "生成今日盘面播报，关注指数脉冲、赚钱效应、行业轮动。" : theme.prompt,
          expected: {
            entityKeywords: isMarket ? ["指数"] : theme.entity,
            expectedRagKeywords: isRag ? [theme.name] : undefined,
            requiresEvidence: true,
          },
        },
      ],
    });
  }
  return cases;
}

function buildStressEvalCases(): RealEvalCase[] {
  return [
    {
      id: "stress-001",
      name: "多会话隔离 A 茅台",
      agentKey: "research-router-agent",
      tags: ["stress", "isolation"],
      turns: [
        {
          prompt: "研究贵州茅台（600519）近30天研报怎么看？输出结论、依据、风险。",
          expected: { entityKeywords: ["贵州茅台", "600519"], requiresEvidence: true },
        },
        {
          prompt: "它最近最大的风险是什么？",
          expected: { entityKeywords: ["贵州茅台", "600519"], forbiddenKeywords: ["有色金属"], requiresEvidence: true },
        },
      ],
    },
    {
      id: "stress-002",
      name: "多会话隔离 B 有色金属",
      agentKey: "research-router-agent",
      tags: ["stress", "isolation"],
      turns: [
        {
          prompt: "研究有色金属行业近30天有什么变化？输出结论、证据、风险。",
          expected: { entityKeywords: ["有色金属"], forbiddenKeywords: ["贵州茅台", "600519"], requiresEvidence: true },
        },
        {
          prompt: "这个行业最近的催化因素和风险分别是什么？",
          expected: { entityKeywords: ["有色金属"], forbiddenKeywords: ["贵州茅台", "600519"], requiresEvidence: true },
        },
      ],
    },
    ...[1, 2, 3].map<RealEvalCase>((index) => ({
      id: `stress-repeat-${index}`,
      name: `重复稳定性 ${index}`,
      agentKey: "research-router-agent",
      tags: ["stress", "stability"],
      turns: [
        {
          prompt: "研究贵州茅台（600519）近30天研报怎么看？请引用证据，输出结论、核心依据、主要风险、后续关注。",
          expected: { entityKeywords: ["贵州茅台", "600519"], requiresEvidence: true },
        },
      ],
    })),
  ];
}

async function seedEvalRagDocuments() {
  const rag = getDefaultRagService();
  const existing = await rag.listDocuments().catch(() => []);
  if (existing.some((item) => item.source === "eval-seed")) return;
  await Promise.all([
    rag.ingestDocument({
      title: "茅台渠道风险 seed 文档",
      source: "eval-seed",
      content:
        "贵州茅台渠道风险主要来自批价波动、经销商库存、直营平台投放节奏和高端白酒消费需求变化。评测时可用于检验本地 RAG 是否能召回茅台渠道风险证据。",
      metadata: { entity: "贵州茅台", topic: "渠道风险" },
    }),
    rag.ingestDocument({
      title: "有色金属催化 seed 文档",
      source: "eval-seed",
      content:
        "有色金属行业催化因素包括美元周期、全球制造业需求、铜铝供给约束、锂价变化和新能源需求。评测用于检验行业问题的本地 RAG 召回。",
      metadata: { entity: "有色金属", topic: "行业催化" },
    }),
    rag.ingestDocument({
      title: "盘面播报口径 seed 文档",
      source: "eval-seed",
      content:
        "盘面播报应覆盖指数脉冲、赚钱效应、涨跌家数、行业轮动、资金偏好和风险提醒，避免给出交易指令。",
      metadata: { entity: "市场", topic: "盘面播报" },
    }),
  ]);
}

async function defaultCheckDatabase(databaseUrl: string) {
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  await prisma.$queryRaw`SELECT 1`;
}

async function defaultCheckRedis(redisUrl: string) {
  const redis = new IORedis(redisUrl, {
    connectTimeout: 3000,
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  redis.on("error", () => undefined);
  try {
    await redis.connect();
    await redis.ping();
  } finally {
    redis.disconnect();
  }
}

async function defaultCheckWorker(redisUrl: string) {
  const connection = new IORedis(redisUrl, {
    connectTimeout: 3000,
    maxRetriesPerRequest: null,
    retryStrategy: () => null,
  });
  connection.on("error", () => undefined);
  const queue = new Queue(AGENT_QUEUE_NAME, { connection });
  try {
    const workerCount = await queue.getWorkersCount();
    if (workerCount < 1) {
      throw new Error("No BullMQ worker is registered for agent-runs. Start pnpm worker:agent.");
    }
  } finally {
    await queue.close();
    connection.disconnect();
  }
}

function summarizeRealResults(results: RealEvalCaseResult[]) {
  const total = results.length;
  const latencies = results.map((item) => item.metrics.latency_ms).sort((a, b) => a - b);
  return {
    total,
    passed: results.filter((item) => item.passed).length,
    terminal_rate: averageRealMetric(results, "terminal_rate"),
    completion_rate: averageRealMetric(results, "completion_rate"),
    tool_success_rate: averageRealMetric(results, "tool_success_rate"),
    evidence_coverage_rate: averageRealMetric(results, "evidence_coverage_rate"),
    entity_match_rate: averageRealMetric(results, "entity_match_rate"),
    citation_precision: averageRealMetric(results, "citation_precision"),
    citation_recall: averageRealMetric(results, "citation_recall"),
    rag_recall_at_k: averageNullableMetric(results, "rag_recall_at_k"),
    memory_write_rate: averageNullableMetric(results, "memory_write_rate"),
    memory_recall_rate: averageNullableMetric(results, "memory_recall_rate"),
    cross_session_leak_rate: averageRealMetric(results, "cross_session_leak_rate"),
    stale_date_rate: averageRealMetric(results, "stale_date_rate"),
    hallucination_rate: averageRealMetric(results, "hallucination_rate"),
    latency_p50_ms: percentile(latencies, 0.5),
    latency_p95_ms: percentile(latencies, 0.95),
    total_cost_cents: sum(results.map((item) => item.metrics.cost_cents)),
  };
}

function summarizeSyntheticResults(results: EvalResult[]) {
  const total = results.length;
  const averageMetrics = averageSyntheticMetricsFor(results);
  return {
    total,
    passed: results.filter((item) => item.passed).length,
    averageScore: round(total ? results.reduce((sum, item) => sum + item.score, 0) / total : 0),
    averageMetrics,
  };
}

function averageSyntheticMetricsFor(results: EvalResult[]): EvalMetricResult {
  const total = results.length || 1;
  return {
    completion: averageSynthetic(results, "completion", total),
    toolSuccessRate: averageSynthetic(results, "toolSuccessRate", total),
    citationPrecision: averageSynthetic(results, "citationPrecision", total),
    ragRecallAtK: averageSynthetic(results, "ragRecallAtK", total),
    hallucinationRate: averageSynthetic(results, "hallucinationRate", total),
    latencyMs: averageSynthetic(results, "latencyMs", total),
    costCents: averageSynthetic(results, "costCents", total),
  };
}

function averageSynthetic(results: EvalResult[], key: keyof EvalMetricResult, total: number) {
  return round(results.reduce((sumValue, item) => sumValue + Number(item.metrics[key] ?? 0), 0) / total);
}

function averageRealMetric(results: RealEvalCaseResult[], key: keyof RealEvalMetrics) {
  return round(results.length ? sum(results.map((item) => Number(item.metrics[key] ?? 0))) / results.length : 0);
}

function averageNullableMetric(results: RealEvalCaseResult[], key: keyof RealEvalMetrics) {
  const values = results.map((item) => item.metrics[key]).filter((value): value is number => typeof value === "number");
  return values.length ? round(sum(values) / values.length) : null;
}

function classifyRealEvalFailure(input: {
  failureReasons: string[];
  modelUnavailable: boolean;
  toolSuccessRate: number;
  terminal: boolean;
  completed: boolean;
}): { failureCategory: RealEvalFailureCategory; failureStage: RealEvalFailureStage } {
  if (input.failureReasons.length === 0) return { failureCategory: "none", failureStage: "completed" };
  if (input.modelUnavailable) return { failureCategory: "model", failureStage: "model_generation" };
  if (input.failureReasons.some((reason) => reason === "missing_real_tool_calls" || reason === "missing_real_model_calls")) {
    return { failureCategory: "infra", failureStage: "environment" };
  }
  if (input.toolSuccessRate < 1) return { failureCategory: "tool", failureStage: "tooling" };
  if (!input.terminal || !input.completed) return { failureCategory: "runtime", failureStage: "runtime" };
  return { failureCategory: "quality", failureStage: "quality" };
}

function modelFailureLabel(call: RealEvalRunDetail["modelCalls"][number]) {
  const message = call.error?.trim() || call.status || "unknown";
  if (/insufficient balance|insufficient_quota|quota|billing/i.test(message)) return `${call.model}: insufficient_balance`;
  if (/unauthorized|forbidden|invalid api key|api key|401|403/i.test(message)) return `${call.model}: auth_failed`;
  if (/rate limit|too many requests|429/i.test(message)) return `${call.model}: rate_limited`;
  return `${call.model}: ${message.slice(0, 80)}`;
}

function estimateCitationPrecision(outputMarkdown: string, evidenceText: string, entityKeywords: string[]) {
  if (!outputMarkdown.trim()) return 0;
  if (!evidenceText.trim()) return 0;
  const facts = [
    ...entityKeywords,
    ...Array.from(outputMarkdown.matchAll(/\d+(?:\.\d+)?%?/g)).map((match) => match[0]).filter((item) => item.length >= 2),
    ...Array.from(outputMarkdown.matchAll(/20\d{2}年\d{1,2}月(?:\d{1,2}日)?/g)).map((match) => match[0]),
  ].slice(0, 16);
  if (facts.length === 0) return 1;
  return facts.filter((fact) => includesLoose(evidenceText, fact) || entityKeywords.includes(fact)).length / facts.length;
}

function estimateHallucinationRate(input: {
  outputMarkdown: string;
  hasEvidence: boolean;
  citationPrecision: number;
  evidenceGaps: unknown[];
  expected: RealEvalTurnExpected;
}) {
  if (!input.outputMarkdown.trim()) return 0;
  if (input.expected.requiresEvidence === false) return 0;
  if (!input.hasEvidence && input.outputMarkdown.length > 80) return 1;
  if (input.evidenceGaps.length > 0 && !/证据不足|数据不足|无法确认|缺少/.test(input.outputMarkdown)) return 0.5;
  return input.citationPrecision < 0.5 ? 0.3 : 0;
}

function detectStaleDateRate(outputMarkdown: string, now: Date) {
  const currentYear = now.getFullYear();
  const staleYears = Array.from(outputMarkdown.matchAll(/20\d{2}/g))
    .map((match) => Number(match[0]))
    .filter((year) => year > 2000 && year < currentYear - 1);
  return staleYears.length > 0 ? 1 : 0;
}

function normalizeRagHits(values: unknown[]): RagHit[] {
  return values.map((item) => {
    const hit = objectValue(item) ?? {};
    return {
      chunkId: String(hit.chunkId ?? ""),
      documentId: String(hit.documentId ?? ""),
      title: String(hit.title ?? ""),
      content: String(hit.content ?? ""),
      source: String(hit.source ?? ""),
      sourceUrl: stringOrUndefined(hit.sourceUrl),
      licenseStatus: hit.licenseStatus === "authorized" || hit.licenseStatus === "public" ? hit.licenseStatus : "internal",
      publishedAt: dateOrUndefined(hit.publishedAt),
      validUntil: dateOrUndefined(hit.validUntil),
      removedAt: dateOrUndefined(hit.removedAt),
      score: Number(hit.score ?? 0),
      lexicalScore: Number(hit.lexicalScore ?? 0),
      vectorScore: Number(hit.vectorScore ?? 0),
      metadata: normalizeRagMetadata(hit.metadata),
    };
  });
}

function normalizeRagMetadata(value: unknown): RagMetadata {
  const metadata = objectValue(value) ?? {};
  return Object.fromEntries(
    Object.entries(metadata).filter((entry): entry is [string, string | number | boolean | null | undefined] => {
      const item = entry[1];
      return item === null || item === undefined || ["string", "number", "boolean"].includes(typeof item);
    })
  );
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function exampleLines(results: RealEvalCaseResult[], render: (item: RealEvalCaseResult) => string) {
  return results.slice(0, 5).map(render).concat(results.length === 0 ? ["- none"] : []);
}

function percentile(values: number[], percent: number) {
  if (values.length === 0) return 0;
  const index = Math.min(values.length - 1, Math.ceil(values.length * percent) - 1);
  return values[index];
}

function includesLoose(text: string, keyword: string) {
  const cleanText = text.replace(/\s+/g, "").toLowerCase();
  const cleanKeyword = keyword.replace(/\s+/g, "").toLowerCase();
  return cleanText.includes(cleanKeyword);
}

function compactForSearch(text: string) {
  return text.replace(/\s+/g, " ").slice(0, 80_000);
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function stringOrUndefined(value: unknown) {
  return typeof value === "string" ? value : value === null || value === undefined ? undefined : String(value);
}

function dateOrUndefined(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value !== "string" || !value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function numberOrUndefined(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function numberOrNull(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function round(value: number) {
  return Number(value.toFixed(3));
}
