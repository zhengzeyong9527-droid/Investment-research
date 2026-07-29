import { trace } from "@opentelemetry/api";
import { normalizeInputForSkill, type EvidenceRecordInput, type JsonRecord } from "@/lib/agent";
import { findStockAliasInText } from "@/lib/stock-aliases";
import { createToolRegistry } from "@/tools/registry";
import type { ToolRegistry } from "@/tools/types";
import { runSkillAdapter } from "@/skills/adapter";
import { normalizeSkillOutput, stripHtmlFromMarkdown } from "@/skills/output";
import { OpenAIModelProvider, type ModelProvider } from "@/agents/model-provider";
import type { AgentKey } from "@/agents/types";
import { buildMemoryCandidatesFromRun, DEFAULT_AGENT_USER_ID, type MemoryHit } from "@/agents/memory";
import { gradeEvidence, insufficientEvidenceMarkdown, type EvidenceGrade } from "@/agents/evidence-grading";
import { verifyAgentOutput, type OutputVerification } from "@/agents/output-verifier";
import { resolveAgentEntities, resolvedEntitiesToJson, type ResolvedAgentEntities } from "@/agents/entity-resolver";
import { planMultiIntent } from "@/agents/intent-planner";

export type ExecutableAgentRun = {
  id: string;
  agentKey?: string;
  sessionId?: string | null;
  userId?: string | null;
  question: string;
  skillKey: string;
  inputPayload: JsonRecord;
  graphState?: JsonRecord;
};

export type EvidenceGap = {
  toolKey: string;
  reason: string;
  sourceEndpoint?: string;
  retryable?: boolean;
};

export type AgentRuntimeRepository = {
  updateAgentRun(id: string, data: Record<string, unknown>): Promise<unknown>;
  appendAgentStep(data: {
    agentRunId: string;
    nodeKey: string;
    order: number;
    title: string;
    status: "pending" | "running" | "completed" | "failed";
    message: string;
  }): Promise<{ id: string }>;
  listRecentAgentMessages?(sessionId: string, limit?: number): Promise<Array<{ role: string; content: string }>>;
  listRecentAgentRunInputs?(
    sessionId: string,
    limit?: number
  ): Promise<Array<{ id: string; question: string; skillKey: string; inputPayload: JsonRecord; createdAt?: Date; updatedAt?: Date }>>;
  appendAgentMessage?(data: {
    sessionId: string;
    agentRunId?: string | null;
    role: string;
    content: string;
  }): Promise<{ id: string } & Record<string, unknown>>;
  createSkillRun(data: {
    agentRunId: string;
    skillKey: string;
    skillPath: string;
    status: "pending" | "running" | "completed" | "failed" | "skipped";
    inputPayload: JsonRecord;
    promptPackage: string;
  }): Promise<{ id: string }>;
  updateSkillRun(id: string, data: Record<string, unknown>): Promise<unknown>;
  recordToolCall: Parameters<ToolRegistry["call"]>[2]["recordToolCall"];
  recordModelCall?: Parameters<ModelProvider["chatMarkdown"]>[1]["recordModelCall"];
  writeEvidence(agentRunId: string, records: EvidenceRecordInput[], skillRunId?: string, toolCallId?: string): Promise<unknown>;
  writeMemoryItem(data: {
    sessionId?: string | null;
    userId?: string | null;
    scope: string;
    kind: string;
    content: string;
    sourceRunId?: string | null;
    confidence?: number;
    importance?: number;
    status?: string;
  }): Promise<unknown>;
};

export async function executeAgentRunJob(input: {
  run: ExecutableAgentRun;
  repository: AgentRuntimeRepository;
  toolRegistry?: ToolRegistry;
  modelProvider?: ModelProvider;
}) {
  const repository = input.run.graphState ? withGraphStateRepository(input.repository, input.run.graphState) : input.repository;
  const toolRegistry = input.toolRegistry ?? createToolRegistry();
  const modelProvider = input.modelProvider ?? new OpenAIModelProvider();
  const agentKey = (input.run.agentKey ?? "research-router-agent") as AgentKey;
  const tracer = trace.getTracer("investoday-agent-runtime");

  return tracer.startActiveSpan(`agent.${agentKey}`, async (span) => {
    try {
      await repository.updateAgentRun(input.run.id, { status: "planning", startedAt: new Date(), error: null });
      const result =
        agentKey === "market-broadcast-agent"
          ? await runMarketBroadcast(input.run, repository, toolRegistry, modelProvider)
          : await runResearchRouter(input.run, repository, toolRegistry, modelProvider);
      span.setAttribute("agent.status", "completed");
      return result;
    } catch (error) {
      span.recordException(error as Error);
      await repository.updateAgentRun(input.run.id, {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

function withGraphStateRepository(repository: AgentRuntimeRepository, graphState: JsonRecord): AgentRuntimeRepository {
  return {
    ...repository,
    updateAgentRun(id, data) {
      if (!data.outputJson || typeof data.outputJson !== "object" || Array.isArray(data.outputJson)) {
        return repository.updateAgentRun(id, data);
      }
      return repository.updateAgentRun(id, {
        ...data,
        outputJson: {
          ...(data.outputJson as Record<string, unknown>),
          graphState,
        },
      });
    },
  };
}

async function runMarketBroadcast(
  run: ExecutableAgentRun,
  repository: AgentRuntimeRepository,
  toolRegistry: ToolRegistry,
  modelProvider: ModelProvider
) {
  const context = toolContext(run, repository, "market-broadcast-agent");
  const memoryHits = await retrieveMemory(run, toolRegistry, context);
  await step(repository, run.id, 2, "load_market_overview", "running", "Fetching market overview.");
  await repository.updateAgentRun(run.id, { status: "fetching_data" });
  const overview = await toolRegistry.call("market.overview", run.inputPayload, context);
  const breadth = await toolRegistry.call("market.changeRatioStatus", {}, context);
  const indexQuotes = await toolRegistry.call("market.indexRealtime", { indexCodes: ["000001", "399001", "399006", "000300"] }, context);
  const news = await toolRegistry.call("news.market", defaultNewsWindow(), context);
  await step(repository, run.id, 2, "load_market_overview", "completed", "Market data fetched.");

  const evidence = marketEvidence(overview.data, breadth.data, indexQuotes.data, news.data);
  await repository.writeEvidence(run.id, evidence);
  const evidenceGrade = gradeEvidence({ skillKey: "investoday-stock-market-broadcast", normalizedInput: run.inputPayload, evidence });

  await repository.updateAgentRun(run.id, { status: "running_skill" });
  const skillResult = await runAndPersistSkill({
    run,
    repository,
    modelProvider,
    skillKey: "investoday-stock-market-broadcast",
    evidence,
    memory: memoryHits,
  });

  const verification = verifyAgentOutput({ markdown: skillResult.outputMarkdown, inputPayload: run.inputPayload, evidence, evidenceGrade });
  await commitMemory(repository, run, "investoday-stock-market-broadcast", run.inputPayload, skillResult.outputMarkdown);
  await appendAssistantMessage(repository, run, skillResult.outputMarkdown);
  await repository.updateAgentRun(run.id, {
    status: "completed",
    outputMarkdown: skillResult.outputMarkdown,
    outputJson: augmentOutputJson(skillResult.outputJson, memoryHits, evidenceGrade, verification),
    error: null,
    model: modelProvider.model,
    completedAt: new Date(),
  });
  return skillResult;
}

async function runResearchRouter(
  run: ExecutableAgentRun,
  repository: AgentRuntimeRepository,
  toolRegistry: ToolRegistry,
  modelProvider: ModelProvider
) {
  const context = toolContext(run, repository, "research-router-agent");
  const resolved = await buildResolvedResearchInput(run, repository, toolRegistry, context);
  const intentPlan = planMultiIntent({
    question: run.question,
    inputPayload: resolved.inputPayload,
    resolvedEntities: resolved.entities,
    forcedSkillKey: forcedSkillKey(run),
  });
  const skillKey = intentPlan.primarySkillKey;
  const normalizedInput = await normalizeResearchInput(
    skillKey,
    { ...run, skillKey, inputPayload: resolved.inputPayload },
    repository,
    toolRegistry,
    context
  );
  const missingInputs = missingRequiredInputs(skillKey, normalizedInput);
  if (missingInputs.length > 0) {
    const interruptMarkdown = missingInputPrompt(missingInputs);
    await repository.updateAgentRun(run.id, {
      status: "interrupted",
      skillKey,
      outputMarkdown: interruptMarkdown,
      outputJson: {
        interrupt: { type: "missing_input", missingInputs, message: interruptMarkdown },
        intentPlan: { ...intentPlan, requiredInputs: missingInputs },
        resolvedEntities: resolvedEntitiesToJson(resolved.entities),
      },
      error: null,
      completedAt: new Date(),
    });
    await appendAssistantMessage(repository, run, interruptMarkdown);
    await step(repository, run.id, 2, "missing_input", "completed", `Missing input: ${missingInputs.join(", ")}`);
    return null;
  }
  if (skillKey === "investoday-ai-unwind-advisor" && normalizedInput.riskConfirmed !== true) {
    const interruptMarkdown = "这个路径需要你先确认：本次仅做研究复盘和风险梳理，不直接给出交易指令。确认后我再继续。";
    await repository.updateAgentRun(run.id, {
      status: "interrupted",
      skillKey,
      outputMarkdown: interruptMarkdown,
      outputJson: {
        interrupt: { type: "risk_confirm", reason: "Research-only high-risk path requires confirmation.", message: interruptMarkdown },
        intentPlan,
        resolvedEntities: resolvedEntitiesToJson(resolved.entities),
      },
      error: null,
      completedAt: new Date(),
    });
    await appendAssistantMessage(repository, run, interruptMarkdown);
    await step(repository, run.id, 2, "risk_confirm", "completed", "Waiting for high-risk research confirmation.");
    return null;
  }

  await repository.updateAgentRun(run.id, { status: "fetching_data", skillKey, inputPayload: normalizedInput });
  const memoryHits = await retrieveMemory({ ...run, inputPayload: normalizedInput }, toolRegistry, context);
  const evidenceGaps: EvidenceGap[] = [];
  const evidence = await fetchEvidenceForSkill(skillKey, normalizedInput, toolRegistry, context, evidenceGaps);
  await repository.writeEvidence(run.id, evidence);
  const evidenceGrade = gradeEvidence({ skillKey, normalizedInput, evidence, evidenceGaps });
  if (!evidenceGrade.passed && evidence.length === 0) {
    const outputMarkdown = insufficientEvidenceMarkdown(evidenceGrade, normalizedInput);
    const verification = verifyAgentOutput({ markdown: outputMarkdown, inputPayload: normalizedInput, evidence, evidenceGrade });
    await commitMemory(repository, run, skillKey, normalizedInput, outputMarkdown);
    await appendAssistantMessage(repository, run, outputMarkdown);
    await repository.updateAgentRun(run.id, {
      status: "completed",
      skillKey,
      outputMarkdown,
      outputJson: augmentOutputJson({}, memoryHits, evidenceGrade, verification, {
        intentPlan,
        resolvedEntities: resolvedEntitiesToJson(resolved.entities),
        evidenceGroups: buildEvidenceGroups(evidence),
        evidenceGaps,
        supportingSkillRuns: [],
      }),
      error: null,
      model: modelProvider.model,
      completedAt: new Date(),
    });
    return {
      outputMarkdown,
      outputJson: augmentOutputJson({}, memoryHits, evidenceGrade, verification, {
        intentPlan,
        resolvedEntities: resolvedEntitiesToJson(resolved.entities),
        evidenceGroups: buildEvidenceGroups(evidence),
        evidenceGaps,
        supportingSkillRuns: [],
      }),
    };
  }

  await repository.updateAgentRun(run.id, { status: "running_skill" });
  const skillResult = await runAndPersistSkill({
    run: { ...run, inputPayload: normalizedInput },
    repository,
    modelProvider,
    skillKey,
    evidence,
    memory: memoryHits,
  });
  const verification = verifyAgentOutput({ markdown: skillResult.outputMarkdown, inputPayload: normalizedInput, evidence, evidenceGrade });
  await commitMemory(repository, run, skillKey, normalizedInput, skillResult.outputMarkdown);
  await appendAssistantMessage(repository, run, skillResult.outputMarkdown);
  await repository.updateAgentRun(run.id, {
    status: "completed",
    skillKey,
    outputMarkdown: skillResult.outputMarkdown,
    outputJson: augmentOutputJson(skillResult.outputJson, memoryHits, evidenceGrade, verification, {
      intentPlan,
      resolvedEntities: resolvedEntitiesToJson(resolved.entities),
      evidenceGroups: buildEvidenceGroups(evidence),
      evidenceGaps,
      supportingSkillRuns: [],
    }),
    error: null,
    model: modelProvider.model,
    completedAt: new Date(),
  });
  return skillResult;
}

async function runAndPersistSkill(input: {
  run: ExecutableAgentRun;
  repository: AgentRuntimeRepository;
  modelProvider: ModelProvider;
  skillKey: string;
  evidence: EvidenceRecordInput[];
  memory: unknown[];
}) {
  const conversationHistory = input.run.sessionId
    ? await input.repository.listRecentAgentMessages?.(input.run.sessionId, 12)
    : [];
  let partialMarkdown = "";
  let lastPartialFlushAt = 0;
  const flushPartial = async (markdown: string, force = false) => {
    const now = Date.now();
    if (!force && now - lastPartialFlushAt < 350 && markdown.length < 120) return;
    lastPartialFlushAt = now;
    await input.repository.updateAgentRun(input.run.id, { outputMarkdown: stripHtmlFromMarkdown(markdown) });
  };
  const result = await runSkillAdapter(
    {
      skillKey: input.skillKey,
      question: input.run.question,
      inputPayload: input.run.inputPayload,
      evidence: input.evidence,
      memory: input.memory,
      conversationHistory: conversationHistory ?? [],
    },
    {
      agentRunId: input.run.id,
      modelProvider: input.modelProvider,
      recordModelCall: input.repository.recordModelCall,
      onToken: async (token) => {
        partialMarkdown += token;
        await flushPartial(partialMarkdown);
      },
    }
  );
  const normalized = normalizeSkillOutput(result.outputMarkdown);
  const skillRun = await input.repository.createSkillRun({
    agentRunId: input.run.id,
    skillKey: input.skillKey,
    skillPath: result.skillPath,
    status: "completed",
    inputPayload: input.run.inputPayload,
    promptPackage: result.promptPackage,
  });
  const artifacts = normalized.outputHtml
    ? [{ kind: "html", title: "HTML 报告", url: `/api/skill-runs/${skillRun.id}/html` }]
    : [];
  const outputMarkdown = artifacts.length > 0 ? `[打开 HTML 报告](${artifacts[0].url})` : normalized.finalMarkdown;
  await input.repository.updateSkillRun(skillRun.id, {
    status: "completed",
    outputMarkdown: normalized.finalMarkdown,
    outputHtml: normalized.outputHtml,
    error: null,
  });
  await flushPartial(outputMarkdown, true);
  await step(input.repository, input.run.id, 3, "run_skill", "completed", `Skill ${input.skillKey} completed.`);
  return {
    ...result,
    outputMarkdown,
    outputJson: {
      ...result.outputJson,
      artifacts,
    },
  };
}

function forcedSkillKey(run: ExecutableAgentRun) {
  const abilityKey = run.inputPayload.abilityKey;
  return typeof abilityKey === "string" && abilityKey && abilityKey !== "auto" ? abilityKey : undefined;
}

async function buildResolvedResearchInput(
  run: ExecutableAgentRun,
  repository: AgentRuntimeRepository,
  toolRegistry: ToolRegistry,
  context: ReturnType<typeof toolContext>
): Promise<{ inputPayload: JsonRecord; entities: ResolvedAgentEntities }> {
  let inputPayload: JsonRecord = { ...run.inputPayload };
  const timeWindowDays = inputPayload.timeWindowDays ?? extractTimeWindowDays(run.question) ?? (await inheritTimeWindowDays(run, repository));
  if (timeWindowDays) inputPayload = { ...inputPayload, timeWindowDays };

  const entities = await resolveAgentEntities({ question: run.question, inputPayload, toolRegistry, context });
  inputPayload = applyResolvedEntitiesToInput(inputPayload, entities);

  if (!stockQueryFromInput(inputPayload)) {
    const inheritedStock = await inheritStockQuery(run, repository);
    if (inheritedStock) {
      const resolvedStock = await resolveStockQuery(inheritedStock, toolRegistry, context);
      if (resolvedStock) {
        entities.stock = { code: resolvedStock.code, name: resolvedStock.name, type: "stock" };
        inputPayload = applyResolvedEntitiesToInput(inputPayload, entities);
      }
    }
  }

  if (!industryQueryFromInput(inputPayload)) {
    const inheritedIndustry = await inheritIndustryQuery(run, repository);
    if (inheritedIndustry) inputPayload = { ...inputPayload, industryName: inheritedIndustry, targetType: "sector" };
  }

  return { inputPayload, entities };
}

function applyResolvedEntitiesToInput(input: JsonRecord, entities: ResolvedAgentEntities): JsonRecord {
  return {
    ...input,
    ...(entities.stock
      ? {
          stockCodeOrName: entities.stock.code,
          stockCode: entities.stock.code,
          stockName: entities.stock.name,
          targetType: "stock",
        }
      : {}),
    ...(entities.industry ? { industryCode: entities.industry.code, industryName: entities.industry.name } : {}),
    ...(entities.concept ? { conceptCode: entities.concept.code, conceptName: entities.concept.name } : {}),
    ...Object.fromEntries(Object.entries(entities.unwind).filter(([, value]) => value !== undefined)),
  };
}

async function normalizeResearchInput(
  skillKey: string,
  run: ExecutableAgentRun,
  repository: AgentRuntimeRepository,
  toolRegistry: ToolRegistry,
  context: ReturnType<typeof toolContext>
) {
  let input = normalizeInputForSkill(skillKey, run.inputPayload, run.question);
  const timeWindowDays = input.timeWindowDays ?? extractTimeWindowDays(run.question) ?? (await inheritTimeWindowDays(run, repository));
  if (timeWindowDays) {
    input = { ...input, timeWindowDays };
  }

  if (isIndustryResearchSkill(skillKey)) {
    const industryQuery = industryQueryFromInput(input) || industryQueryFromText(run.question) || (await inheritIndustryQuery(run, repository));
    return industryQuery
      ? {
          ...input,
          industryName: industryQuery,
          targetType: "sector",
        }
      : input;
  }

  if (!isStockResearchSkill(skillKey) && skillKey !== "investoday-ai-unwind-advisor") return input;

  const query = stockQueryFromInput(input) || stockQueryFromText(run.question) || (await inheritStockQuery(run, repository));
  if (!query) return input;

  const resolved = await resolveStockQuery(query, toolRegistry, context);
  if (!resolved) {
    return {
      ...input,
      stockCodeOrName: extractStockCode(query) ?? query,
    };
  }

  return {
    ...input,
    stockCodeOrName: resolved.code,
    stockCode: resolved.code,
    stockName: resolved.name,
    targetType: "stock",
  };
}

async function fetchEvidenceForSkill(
  skillKey: string,
  input: JsonRecord,
  toolRegistry: ToolRegistry,
  context: ReturnType<typeof toolContext>,
  evidenceGaps: EvidenceGap[] = []
) {
  if (skillKey === "investoday-ai-unwind-advisor") {
    const evidence: EvidenceRecordInput[] = [];
    for (const toolKey of [
      "stock.basicInfo",
      "stock.industries",
      "stock.briefItems",
      "report.query",
      "report.sentiment",
      "report.vectorSearch",
      "stock.unwindSignalStat",
      "stock.unwindSignalDetails",
      "news.entityRelated",
    ]) {
      const result = await callOptionalTool(toolKey, input, toolRegistry, context, evidenceGaps);
      evidence.push(...toolDataToEvidence(toolKey, result.data));
    }
    if (input.industryCode || input.industryName) {
      const result = await callOptionalTool("industry.data", input, toolRegistry, context, evidenceGaps);
      evidence.push(...toolDataToEvidence("industry.data", result.data));
    }
    if (input.conceptCode || input.conceptName) {
      for (const toolKey of ["concept.resolve", "concept.quote", "concept.stockRealtime", "report.sentiment", "news.entityRelated"]) {
        const result = await callOptionalTool(toolKey, input, toolRegistry, context, evidenceGaps);
        evidence.push(...toolDataToEvidence(toolKey, result.data));
      }
    }
    return evidence.slice(0, 80);
  }

  if (isIndustryResearchSkill(skillKey)) {
    const evidence: EvidenceRecordInput[] = [];
    for (const toolKey of ["industry.data", "report.query", "report.sentiment", "report.vectorSearch"]) {
      const result = await callOptionalTool(toolKey, input, toolRegistry, context, evidenceGaps);
      evidence.push(...toolDataToEvidence(toolKey, result.data));
    }
    return evidence.slice(0, 60);
  }

  if (!isStockResearchSkill(skillKey)) {
    const result = await callOptionalTool("stock.briefItems", input, toolRegistry, context, evidenceGaps);
    return toolDataToEvidence("stock.briefItems", result.data);
  }

  const evidence: EvidenceRecordInput[] = [];
  for (const toolKey of ["stock.basicInfo", "stock.briefItems", "report.query", "report.sentiment", "report.vectorSearch", "report.forecastRatings"]) {
    const result = await callOptionalTool(toolKey, input, toolRegistry, context, evidenceGaps);
    evidence.push(...toolDataToEvidence(toolKey, result.data));
  }
  if (input.industryCode || input.industryName) {
    const result = await callOptionalTool("industry.data", input, toolRegistry, context, evidenceGaps);
    evidence.push(...toolDataToEvidence("industry.data", result.data));
  }
  if (input.conceptCode || input.conceptName) {
    for (const toolKey of ["concept.resolve", "concept.quote", "news.entityRelated"]) {
      const result = await callOptionalTool(toolKey, input, toolRegistry, context, evidenceGaps);
      evidence.push(...toolDataToEvidence(toolKey, result.data));
    }
  }
  return evidence.slice(0, 50);
}

async function callOptionalTool(
  toolKey: string,
  input: JsonRecord,
  toolRegistry: ToolRegistry,
  context: ReturnType<typeof toolContext>,
  evidenceGaps: EvidenceGap[]
) {
  try {
    return await toolRegistry.call(toolKey, input, context);
  } catch (error) {
    evidenceGaps.push({
      toolKey,
      reason: error instanceof Error ? error.message : String(error),
      sourceEndpoint: safeSourceEndpoint(toolRegistry, toolKey),
      retryable: true,
    });
    return { toolCallId: null, data: [] };
  }
}

function safeSourceEndpoint(toolRegistry: ToolRegistry, toolKey: string) {
  try {
    return toolRegistry.get(toolKey).sourceEndpoint;
  } catch {
    return toolKey;
  }
}

async function resolveStockQuery(query: string, toolRegistry: ToolRegistry, context: ReturnType<typeof toolContext>) {
  const alias = findStockAliasInText(query);
  const code = extractStockCode(query) ?? alias?.code;
  const name = alias?.name ?? (code ? undefined : query.trim());
  try {
    const result = await toolRegistry.call("stock.resolve", { query, stockCode: code, stockName: name }, context);
    return stockTargetFromToolData(result.data) ?? (code ? { code, name: name ?? code } : null);
  } catch {
    return code ? { code, name: name ?? code } : null;
  }
}

function stockTargetFromToolData(data: unknown) {
  const record = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  const code = stringValue(record?.code) || stringValue(record?.stockCode);
  const name = stringValue(record?.name) || stringValue(record?.stockName) || code;
  if (!code) return null;
  return { code, name };
}

async function inheritStockQuery(run: ExecutableAgentRun, repository: AgentRuntimeRepository) {
  if (!run.sessionId) return undefined;
  const priorInputs = await repository.listRecentAgentRunInputs?.(run.sessionId, 8);
  for (const prior of priorInputs ?? []) {
    const query = stockQueryFromInput(prior.inputPayload);
    if (query) return query;
  }
  if (!repository.listRecentAgentMessages) return undefined;
  const messages = await repository.listRecentAgentMessages(run.sessionId, 12);
  for (const message of [...messages].reverse()) {
    if (message.role !== "user") continue;
    const query = stockQueryFromText(message.content);
    if (query) return query;
  }
  return undefined;
}

async function inheritTimeWindowDays(run: ExecutableAgentRun, repository: AgentRuntimeRepository) {
  if (!run.sessionId) return undefined;
  const priorInputs = await repository.listRecentAgentRunInputs?.(run.sessionId, 8);
  for (const prior of priorInputs ?? []) {
    const days = Number(prior.inputPayload.timeWindowDays);
    if (Number.isFinite(days) && days > 0) return days;
  }
  if (!repository.listRecentAgentMessages) return undefined;
  const messages = await repository.listRecentAgentMessages(run.sessionId, 12);
  for (const message of [...messages].reverse()) {
    if (message.role !== "user") continue;
    const days = extractTimeWindowDays(message.content);
    if (days) return days;
  }
  return undefined;
}

async function inheritIndustryQuery(run: ExecutableAgentRun, repository: AgentRuntimeRepository) {
  if (!run.sessionId) return undefined;
  const priorInputs = await repository.listRecentAgentRunInputs?.(run.sessionId, 8);
  for (const prior of priorInputs ?? []) {
    const query = industryQueryFromInput(prior.inputPayload);
    if (query) return query;
  }
  if (!repository.listRecentAgentMessages) return undefined;
  const messages = await repository.listRecentAgentMessages(run.sessionId, 12);
  for (const message of [...messages].reverse()) {
    if (message.role !== "user") continue;
    const query = industryQueryFromText(message.content);
    if (query) return query;
  }
  return undefined;
}

function stockQueryFromInput(input: JsonRecord) {
  return (
    stringValue(input.stockCodeOrName) ||
    stringValue(input.stockCode) ||
    stringValue(input.stockName) ||
    stringValue(input.name)
  );
}

function industryQueryFromInput(input: JsonRecord) {
  return (
    stringValue(input.industryName) ||
    stringValue(input.industryCode) ||
    stringValue(input.industry) ||
    (stringValue(input.targetType) === "sector" ? stringValue(input.name) : "")
  );
}

function stockQueryFromText(text: string) {
  return extractStockCode(text) ?? findStockAliasInText(text)?.name;
}

function industryQueryFromText(text: string) {
  const direct = text.match(/(?:研究|分析|看看|看一下)?\s*([\u4e00-\u9fa5A-Za-z0-9]{2,20})(?:行业|板块|赛道|主题)/)?.[1];
  if (direct) return direct.endsWith("行业") ? direct.slice(0, -2) : direct;
  for (const keyword of ["有色金属", "白酒", "半导体", "医药", "新能源", "银行", "券商", "计算机", "传媒", "军工", "煤炭", "钢铁", "化工"]) {
    if (text.includes(keyword)) return keyword;
  }
  return undefined;
}

function extractTimeWindowDays(text: string) {
  const slashValue = text.match(/\/\s*(\d{1,3})\b/)?.[1];
  const dayValue = text.match(/(?:近|最近|过去)?\s*(\d{1,3})\s*(?:天|日|days?)/i)?.[1];
  const value = Number(slashValue ?? dayValue);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function isStockResearchSkill(skillKey: string) {
  return [
    "investoday-research-report-analysis",
    "investoday-stock-research-interpretation",
  ].includes(skillKey);
}

function isIndustryResearchSkill(skillKey: string) {
  return skillKey.includes("industry");
}

async function retrieveMemory(run: ExecutableAgentRun, toolRegistry: ToolRegistry, context: ReturnType<typeof toolContext>): Promise<MemoryHit[]> {
  try {
    const result = await toolRegistry.call<MemoryHit[]>(
      "memory.search",
      {
        query: run.question,
        ...run.inputPayload,
        userId: run.userId ?? DEFAULT_AGENT_USER_ID,
        limit: 8,
      },
      context
    );
    return Array.isArray(result.data) ? result.data : [];
  } catch {
    return [];
  }
}

async function commitMemory(
  repository: AgentRuntimeRepository,
  run: ExecutableAgentRun,
  skillKey: string,
  inputPayload: JsonRecord,
  answerMarkdown: string
) {
  const candidates = buildMemoryCandidatesFromRun({
    sessionId: run.sessionId,
    userId: run.userId ?? DEFAULT_AGENT_USER_ID,
    question: run.question,
    inputPayload,
    answerMarkdown,
    sourceRunId: run.id,
    skillKey,
  });
  for (const item of candidates) {
    try {
      await repository.writeMemoryItem(item);
    } catch {
      // Memory write failure should be visible in infrastructure logs, but it should not erase a completed answer.
    }
  }
}

function augmentOutputJson(
  outputJson: Record<string, unknown> | null | undefined,
  memoryHits: MemoryHit[],
  evidenceGrade: EvidenceGrade,
  verification: OutputVerification,
  extra: Record<string, unknown> = {}
) {
  return {
    ...(outputJson ?? {}),
    ...extra,
    memoryHits: memoryHits.map((item) => ({
      id: item.id,
      scope: item.scope,
      kind: item.kind,
      content: item.content,
      score: item.score,
      confidence: item.confidence,
      importance: item.importance,
    })),
    evidenceGrade,
    verification,
  };
}

function buildEvidenceGroups(evidence: EvidenceRecordInput[]) {
  const groups = new Map<string, { groupKey: string; count: number; titles: string[] }>();
  for (const item of evidence) {
    const groupKey = evidenceGroupKey(item);
    const group = groups.get(groupKey) ?? { groupKey, count: 0, titles: [] };
    group.count += 1;
    if (group.titles.length < 5) group.titles.push(item.title);
    groups.set(groupKey, group);
  }
  return [...groups.values()];
}

function evidenceGroupKey(item: EvidenceRecordInput) {
  const endpoint = item.sourceEndpoint ?? "";
  if (endpoint.includes("unwind")) return "unwind_signal";
  if (endpoint.includes("concept")) return "concept";
  if (endpoint.includes("industry")) return "industry";
  if (endpoint.includes("report") || endpoint.includes("research")) return "report";
  if (endpoint.includes("news")) return "news";
  if (item.kind === "company") return "stock";
  return item.kind;
}

async function appendAssistantMessage(repository: AgentRuntimeRepository, run: ExecutableAgentRun, content: string) {
  if (!run.sessionId || !repository.appendAgentMessage) return;
  await repository.appendAgentMessage({
    sessionId: run.sessionId,
    agentRunId: run.id,
    role: "assistant",
    content,
  });
}

function toolContext(run: ExecutableAgentRun, repository: AgentRuntimeRepository, agentKey: AgentKey) {
  return {
    agentRunId: run.id,
    sessionId: run.sessionId ?? run.id,
    agentKey,
    userId: run.userId ?? DEFAULT_AGENT_USER_ID,
    recordToolCall: repository.recordToolCall,
  };
}

async function step(
  repository: AgentRuntimeRepository,
  agentRunId: string,
  order: number,
  nodeKey: string,
  status: "pending" | "running" | "completed" | "failed",
  message: string
) {
  return repository.appendAgentStep({ agentRunId, nodeKey, order, title: nodeKey, status, message });
}

function marketEvidence(overview: unknown, breadth: unknown, indexQuotes: unknown, news: unknown): EvidenceRecordInput[] {
  return [
    evidence("market", "Market overview", "Investoday", "market.overview", overview),
    evidence("market", "Market breadth", "Investoday", "market/change-ratio-status", breadth),
    evidence("market", "Realtime index quotes", "Investoday", "index-quote/realtime", indexQuotes),
    evidence("news", "Recent market news", "Investoday", "news", news),
  ];
}

function briefItemsToEvidence(data: unknown): EvidenceRecordInput[] {
  if (!Array.isArray(data)) return [];
  return data.slice(0, 20).map((item) => {
    const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      kind: String(record.kind ?? "raw") as EvidenceRecordInput["kind"],
      title: String(record.title ?? "Evidence"),
      source: String(record.source ?? "Investoday"),
      publishedAt: record.publishedAt instanceof Date ? record.publishedAt : null,
      summary: String(record.summary ?? ""),
      sourceEndpoint: String(record.sourceEndpoint ?? "stock.briefItems"),
      rawPayload: record.rawPayload ?? record,
    };
  });
}

function toolDataToEvidence(toolKey: string, data: unknown): EvidenceRecordInput[] {
  if (toolKey === "stock.briefItems") return briefItemsToEvidence(data);
  if (toolKey === "industry.data") return industryDataToEvidence(data);
  if (Array.isArray(data)) {
    return data.slice(0, 20).map((item, index) => recordToEvidence(toolKey, item, index));
  }
  if (data && typeof data === "object") {
    return [recordToEvidence(toolKey, data, 0)];
  }
  return [];
}

function industryDataToEvidence(data: unknown): EvidenceRecordInput[] {
  const record = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  if (!record) return [];
  const evidenceItems: EvidenceRecordInput[] = [];
  const target = record.target && typeof record.target === "object" ? (record.target as Record<string, unknown>) : null;
  if (target) {
    evidenceItems.push({
      kind: "industry",
      title: `${stringValue(target.name) || stringValue(target.code) || "Industry"} basic profile`,
      source: "Investoday",
      publishedAt: null,
      summary: summarizeRawPayload(target),
      sourceEndpoint: "industry.data",
      rawPayload: target,
    });
  }
  for (const key of ["marketStats", "quoteSummaries"]) {
    const value = record[key];
    if (Array.isArray(value)) {
      evidenceItems.push(...value.slice(0, 10).map((item, index) => recordToEvidence(`industry.${key}`, item, index)));
    } else if (value && typeof value === "object") {
      evidenceItems.push(recordToEvidence(`industry.${key}`, value, 0));
    }
  }
  evidenceItems.push(...briefItemsToEvidence(record.briefItems).map((item) => ({ ...item, kind: item.kind === "raw" ? "industry" : item.kind, sourceEndpoint: "industry.data" })));
  for (const key of ["reports", "sentiment"]) {
    const value = record[key];
    if (Array.isArray(value)) {
      evidenceItems.push(...value.slice(0, 20).map((item, index) => recordToEvidence(key === "reports" ? "report.query" : "report.sentiment", item, index)));
    }
  }
  return evidenceItems.slice(0, 60);
}

function recordToEvidence(toolKey: string, item: unknown, index: number): EvidenceRecordInput {
  const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
  return {
    kind: evidenceKindForTool(toolKey),
    title:
      stringValue(record.title) ||
      stringValue(record.reportTitle) ||
      stringValue(record.stockName) ||
      stringValue(record.name) ||
      `${toolKey} #${index + 1}`,
    source:
      stringValue(record.source) ||
      stringValue(record.orgName) ||
      stringValue(record.institutionName) ||
      "Investoday",
    publishedAt: parseEvidenceDate(record.publishDate ?? record.date ?? record.publishedAt),
    summary:
      stringValue(record.summary) ||
      stringValue(record.coreViewpoint) ||
      stringValue(record.coreContent) ||
      stringValue(record.analysisViewpoint) ||
      summarizeRawPayload(record),
    sourceEndpoint: toolKey,
    rawPayload: record,
  };
}

function evidenceKindForTool(toolKey: string): EvidenceRecordInput["kind"] {
  if (toolKey.startsWith("report.")) return "research";
  if (toolKey.startsWith("stock.")) return "company";
  if (toolKey.startsWith("industry.")) return "industry";
  if (toolKey.startsWith("concept.")) return "industry";
  if (toolKey.startsWith("news.")) return "news";
  return "raw";
}

function parseEvidenceDate(value: unknown) {
  const text = stringValue(value);
  if (!text) return null;
  const parsed = new Date(text.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function evidence(kind: EvidenceRecordInput["kind"], title: string, source: string, sourceEndpoint: string, rawPayload: unknown): EvidenceRecordInput {
  return { kind, title, source, sourceEndpoint, summary: summarizeRawPayload(rawPayload), rawPayload };
}

function summarizeRawPayload(value: unknown) {
  if (Array.isArray(value)) return `${value.length} records`;
  if (value && typeof value === "object") return `${Object.keys(value).length} fields`;
  return "";
}

function stringValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function extractStockCode(text: string) {
  return text.match(/\b\d{6}\b/)?.[0];
}

function defaultNewsWindow() {
  const end = new Date();
  const begin = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return {
    beginTime: begin.toISOString().slice(0, 19).replace("T", " "),
    endTime: end.toISOString().slice(0, 19).replace("T", " "),
    pageNum: 1,
    pageSize: 10,
  };
}

function missingRequiredInputs(skillKey: string, input: JsonRecord) {
  if (isStockResearchSkill(skillKey) && !stringValue(input.stockCodeOrName)) {
    return ["stockCodeOrName"];
  }
  if (isIndustryResearchSkill(skillKey) && !stringValue(input.industryName) && !stringValue(input.industryCode)) {
    return ["industryName"];
  }
  if (skillKey !== "investoday-ai-unwind-advisor") return [];
  return ["stockCode", "lossPercent", "positionPercent"].filter((key) => input[key] === undefined || input[key] === null || String(input[key]).trim() === "");
}

function missingInputPrompt(missingInputs: string[]) {
  const labels: Record<string, string> = {
    stockCodeOrName: "股票代码或公司名称",
    stockCode: "股票代码或公司名称",
    lossPercent: "被套/亏损幅度，例如 40%",
    positionPercent: "仓位比例，例如 三成、半仓、30%",
    industryName: "行业名称",
  };
  return `我还需要你补充：${missingInputs.map((item) => labels[item] ?? item).join("、")}。补充后我会继续上一轮分析。`;
}
