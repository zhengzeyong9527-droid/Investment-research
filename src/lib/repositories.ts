import type { Prisma } from "@prisma/client";
import type { AgentRunRepository, EvidenceRecordInput, JsonRecord } from "@/lib/agent";
import { DEFAULT_AGENT_USER_ID } from "@/agents/memory";
import type { AnalysisRepository } from "@/lib/analysis";
import type { DailyBriefRepository } from "@/lib/briefs";
import { buildBriefItemDisplay, cleanDisplayText } from "@/lib/display";
import { prisma } from "@/lib/prisma";
import type { BriefDraft, NormalizedWatchTarget } from "@/lib/types";

export const watchTargetSelect = {
  id: true,
  type: true,
  code: true,
  name: true,
  tags: true,
  reason: true,
  enabled: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WatchTargetSelect;

export function shapeWatchTarget<T extends { tags: unknown }>(target: T) {
  return {
    ...target,
    tags: jsonArray(target.tags).filter((item): item is string => typeof item === "string"),
  };
}

export async function listWatchTargets() {
  const targets = await prisma.watchTarget.findMany({
    select: watchTargetSelect,
    orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
  });
  return targets.map(shapeWatchTarget);
}

export async function createWatchTarget(input: NormalizedWatchTarget) {
  const target = await prisma.watchTarget.create({
    data: {
      ...input,
      tags: jsonArray(input.tags),
    },
    select: watchTargetSelect,
  });
  return shapeWatchTarget(target);
}

export async function updateWatchTarget(id: string, input: Partial<NormalizedWatchTarget>) {
  const target = await prisma.watchTarget.update({
    where: { id },
    data: {
      ...(input.type ? { type: input.type } : {}),
      ...(input.code ? { code: input.code } : {}),
      ...(input.name ? { name: input.name } : {}),
      ...(input.tags ? { tags: jsonArray(input.tags) } : {}),
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    },
    select: watchTargetSelect,
  });
  return shapeWatchTarget(target);
}

export async function deleteWatchTarget(id: string) {
  await prisma.watchTarget.delete({ where: { id } });
}

export class PrismaDailyBriefRepository implements DailyBriefRepository {
  async listEnabledTargets() {
    return prisma.watchTarget.findMany({
      where: { enabled: true, NOT: { code: { startsWith: "NAME:" } } },
      select: { id: true, type: true, code: true, name: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  async upsertBrief(brief: BriefDraft) {
    const saved = await prisma.dailyBrief.upsert({
      where: { briefDate: brief.briefDate },
      create: {
        briefDate: brief.briefDate,
        status: brief.status,
        windowStart: brief.windowStart,
        windowEnd: brief.windowEnd,
        summary: brief.summary,
        generatedAt: brief.generatedAt,
        items: {
          create: brief.items.map((item) => ({
            targetId: item.targetId,
            kind: item.kind,
            title: item.title,
            source: item.source,
            publishedAt: item.publishedAt,
            summary: item.summary,
            rawRef: item.rawRef,
            rawPayload: stringifyJson(item.rawPayload),
            normalizedPayload: stringifyJson(item.normalizedPayload),
            detailText: item.detailText ?? "",
            sourceEndpoint: item.sourceEndpoint ?? "",
            fetchedAt: item.fetchedAt ?? new Date(),
          })),
        },
      },
      update: {
        status: brief.status,
        windowStart: brief.windowStart,
        windowEnd: brief.windowEnd,
        summary: brief.summary,
        generatedAt: brief.generatedAt,
        items: {
          deleteMany: {},
          create: brief.items.map((item) => ({
            targetId: item.targetId,
            kind: item.kind,
            title: item.title,
            source: item.source,
            publishedAt: item.publishedAt,
            summary: item.summary,
            rawRef: item.rawRef,
            rawPayload: stringifyJson(item.rawPayload),
            normalizedPayload: stringifyJson(item.normalizedPayload),
            detailText: item.detailText ?? "",
            sourceEndpoint: item.sourceEndpoint ?? "",
            fetchedAt: item.fetchedAt ?? new Date(),
          })),
        },
      },
      include: {
        items: { include: { target: true }, orderBy: { publishedAt: "desc" } },
      },
    });
    return shapeDailyBrief(saved);
  }
}

export class PrismaAnalysisRepository implements AnalysisRepository {
  async getSkillEntry(key: string) {
    return prisma.skillEntry.findUnique({
      where: { key },
      select: { key: true, name: true, status: true, scope: true },
    });
  }

  async createRun(data: {
    skillKey: string;
    targetId?: string;
    briefItemId?: string;
    dailyBriefId?: string;
    status: "pending" | "completed" | "failed";
    inputContext: string;
    output: string | null;
  }) {
    const legacyContext = jsonObject(data.inputContext);
    const run = await prisma.agentRun.create({
      data: {
        agentKey: "research-router-agent",
        question: legacyQuestionFromContext(legacyContext),
        skillKey: data.skillKey,
        triggerType: "legacy-analysis-placeholder",
        status: analysisStatusToAgentStatus(data.status),
        inputPayload: {
          legacyAnalysis: true,
          targetId: data.targetId ?? null,
          briefItemId: data.briefItemId ?? null,
          dailyBriefId: data.dailyBriefId ?? null,
          context: legacyContext,
        },
        promptPackage: data.inputContext,
        outputMarkdown: data.output,
        outputJson: {
          legacyAnalysis: {
            status: data.status,
            targetId: data.targetId ?? null,
            briefItemId: data.briefItemId ?? null,
            dailyBriefId: data.dailyBriefId ?? null,
          },
        },
      },
    });
    return {
      id: run.id,
      status: data.status,
      inputContext: data.inputContext,
      output: data.output,
    };
  }
}

export async function getBriefByDate(briefDate: string) {
  const brief = await prisma.dailyBrief.findUnique({
    where: { briefDate },
    include: {
      items: { include: { target: true }, orderBy: { publishedAt: "desc" } },
      runs: { orderBy: { createdAt: "desc" } },
    },
  });
  return brief ? shapeDailyBrief(brief) : null;
}

export async function getBriefItemDetail(id: string) {
  const item = await prisma.briefItem.findUnique({
    where: { id },
    include: { target: true, brief: true },
  });
  if (!item) return null;
  return shapeBriefItemForClient(item);
}

export class PrismaAgentRunRepository implements AgentRunRepository {
  async createAgentRun(data: {
    agentKey?: string;
    sessionId?: string | null;
    question: string;
    skillKey: string;
    triggerType?: string;
    status: "created" | "queued" | "planning" | "fetching_data" | "running_skill" | "interrupted" | "completed" | "failed";
    inputPayload: JsonRecord;
    promptPackage: string;
  }) {
    const run = await prisma.agentRun.create({
      data: {
        agentKey: data.agentKey ?? "research-router-agent",
        sessionId: data.sessionId,
        question: data.question,
        skillKey: data.skillKey,
        triggerType: data.triggerType ?? "manual",
        status: data.status,
        inputPayload: jsonObject(data.inputPayload),
        promptPackage: data.promptPackage,
      },
    });
    return shapeAgentRun(run);
  }

  async updateAgentRun(
    id: string,
    data: Partial<{
      status: "created" | "queued" | "planning" | "fetching_data" | "running_skill" | "interrupted" | "completed" | "failed";
      skillKey: string;
      outputMarkdown: string | null;
      outputJson: JsonRecord | null;
      model: string;
      tokenInput: number;
      tokenOutput: number;
      latencyMs: number;
      costCents: number;
      startedAt: Date | null;
      completedAt: Date | null;
      inputPayload: JsonRecord;
      error: string | null;
    }>
  ) {
    const { outputJson, inputPayload, ...rest } = data;
    const run = await prisma.agentRun.update({
      where: { id },
      data: {
        ...rest,
        ...(outputJson !== undefined ? { outputJson: jsonObject(outputJson ?? {}) } : {}),
        ...(inputPayload !== undefined ? { inputPayload: jsonObject(inputPayload) } : {}),
      },
    });
    return shapeAgentRun(run);
  }

  async createAgentSession(data: { userId?: string; title: string; entry: "market" | "research" }) {
    return prisma.agentSession.create({
      data: {
        userId: data.userId ?? DEFAULT_AGENT_USER_ID,
        title: data.title,
        entry: data.entry,
      },
    });
  }

  async touchAgentSession(id: string) {
    return prisma.agentSession.update({
      where: { id },
      data: { lastActiveAt: new Date() },
    });
  }

  async renameAgentSession(id: string, title: string) {
    return prisma.agentSession.update({
      where: { id },
      data: { title, lastActiveAt: new Date() },
    });
  }

  async appendAgentMessage(data: { sessionId: string; agentRunId?: string | null; role: string; content: string }) {
    const message = await prisma.agentMessage.create({
      data: {
        sessionId: data.sessionId,
        agentRunId: data.agentRunId,
        role: data.role,
        content: data.content,
      },
    });
    await this.touchAgentSession(data.sessionId);
    return message;
  }

  async listRecentAgentMessages(sessionId: string, limit = 12) {
    const messages = await prisma.agentMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { role: true, content: true },
    });
    return messages.reverse();
  }

  async listRecentAgentRunInputs(sessionId: string, limit = 8) {
    const runs = await prisma.agentRun.findMany({
      where: { sessionId, status: { in: ["fetching_data", "running_skill", "completed"] } },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        question: true,
        skillKey: true,
        inputPayload: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return runs.map((run) => ({
      ...run,
      inputPayload: jsonObject(run.inputPayload),
    }));
  }

  async createAgentStep(data: {
    agentRunId: string;
    nodeKey?: string;
    order: number;
    title: string;
    status: "pending" | "running" | "completed" | "failed";
    message: string;
  }) {
    return prisma.agentStep.create({ data });
  }

  async appendAgentStep(data: {
    agentRunId: string;
    nodeKey: string;
    order: number;
    title: string;
    status: "pending" | "running" | "completed" | "failed";
    message: string;
  }) {
    return this.createAgentStep(data);
  }

  async createSkillRun(data: {
    agentRunId: string;
    skillKey: string;
    skillPath: string;
    status: "pending" | "running" | "completed" | "failed" | "skipped";
    inputPayload: JsonRecord;
    promptPackage: string;
  }) {
    return prisma.skillRun.create({
      data: {
        agentRunId: data.agentRunId,
        skillKey: data.skillKey,
        skillPath: data.skillPath,
        status: data.status,
        inputPayload: jsonObject(data.inputPayload),
        promptPackage: data.promptPackage,
      },
    });
  }

  async updateSkillRun(
    id: string,
    data: Partial<{
      status: "pending" | "running" | "completed" | "failed" | "skipped";
      outputMarkdown: string | null;
      outputHtml: string | null;
      error: string | null;
    }>
  ) {
    return prisma.skillRun.update({ where: { id }, data });
  }

  async listEvidenceForRun(agentRunId: string): Promise<EvidenceRecordInput[]> {
    const records = await prisma.evidenceRecord.findMany({
      where: { agentRunId },
      orderBy: { fetchedAt: "desc" },
    });
    return records.map((record) => ({
      kind: record.kind,
      title: record.title,
      source: record.source,
      publishedAt: record.publishedAt,
      summary: record.summary,
      sourceEndpoint: record.sourceEndpoint,
      rawPayload: jsonValue(record.rawPayload),
    }));
  }

  async recordToolCall(data: {
    agentRunId: string;
    toolKey: string;
    inputJson: JsonRecord;
    outputSummary: string;
    rawPayloadRef?: string | null;
    status: string;
    latencyMs: number;
    error?: string | null;
    sourceEndpoint: string;
  }) {
    return prisma.toolCall.create({
      data: {
        agentRunId: data.agentRunId,
        toolKey: data.toolKey,
        inputJson: jsonObject(data.inputJson),
        outputSummary: data.outputSummary,
        rawPayloadRef: data.rawPayloadRef,
        status: data.status,
        latencyMs: data.latencyMs,
        error: data.error,
        sourceEndpoint: data.sourceEndpoint,
      },
    });
  }

  async recordModelCall(data: {
    agentRunId: string;
    model: string;
    mode: string;
    promptHash: string;
    tokenInput: number;
    tokenOutput: number;
    costCents: number;
    latencyMs: number;
    status: string;
    error?: string | null;
  }) {
    return prisma.modelCall.create({ data });
  }

  async writeEvidence(agentRunId: string, records: EvidenceRecordInput[], skillRunId?: string, toolCallId?: string) {
    return createEvidenceRecords(agentRunId, records, skillRunId, toolCallId);
  }

  async writeMemoryItem(data: {
    sessionId?: string | null;
    userId?: string | null;
    scope: string;
    kind: string;
    content: string;
    sourceRunId?: string | null;
    confidence?: number;
    importance?: number;
    status?: string;
  }) {
    return prisma.memoryItem.create({
      data: {
        sessionId: data.sessionId,
        userId: data.userId ?? DEFAULT_AGENT_USER_ID,
        scope: data.scope,
        kind: data.kind,
        content: data.content,
        sourceRunId: data.sourceRunId,
        confidence: data.confidence ?? 0,
        importance: data.importance ?? 0.5,
        status: data.status ?? "active",
      },
    });
  }

  async createFeedback(data: { runId: string; rating: number; comment?: string; tags?: string[] }) {
    return prisma.userFeedback.create({
      data: {
        runId: data.runId,
        rating: data.rating,
        comment: data.comment ?? "",
        tags: jsonArray(data.tags ?? []),
      },
    });
  }
}

export async function listAgentRuns() {
  const runs = await prisma.agentRun.findMany({
    orderBy: { updatedAt: "desc" },
    take: 60,
    include: { skillRuns: true, evidence: true },
  });
  return runs.map(shapeAgentRun);
}

export async function listAgentSessions(search?: string) {
  const query = search?.trim();
  const sessions = await prisma.agentSession.findMany({
    where: query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { messages: { some: { content: { contains: query, mode: "insensitive" } } } },
          ],
        }
      : undefined,
    orderBy: { lastActiveAt: "desc" },
    take: 80,
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      runs: { orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });
  return sessions.map((session) => ({
    ...shapeAgentSession(session),
    latestMessage: session.messages[0] ?? null,
    latestRun: session.runs[0] ? shapeAgentRun(session.runs[0]) : null,
  }));
}

export async function createAgentSession(data: { userId?: string; title?: string; entry?: "market" | "research" }) {
  const repository = new PrismaAgentRunRepository();
  return shapeAgentSession(
    await repository.createAgentSession({
      userId: data.userId,
      title: data.title?.trim() || "新对话",
      entry: data.entry ?? "research",
    })
  );
}

export async function getAgentSessionDetail(id: string) {
  const session = await prisma.agentSession.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      runs: { orderBy: { updatedAt: "desc" } },
    },
  });
  if (!session) return null;
  const runs = session.runs.map(shapeAgentRun);
  return {
    ...shapeAgentSession(session),
    messages: session.messages,
    runs,
    activeRun: runs.find((run) => !isTerminalRunStatus(String(run.status))) ?? null,
  };
}

export async function appendAgentMessage(data: { sessionId: string; agentRunId?: string | null; role: string; content: string }) {
  return new PrismaAgentRunRepository().appendAgentMessage(data);
}

export async function renameAgentSession(id: string, title: string) {
  return shapeAgentSession(await new PrismaAgentRunRepository().renameAgentSession(id, title));
}

export async function getAgentRun(id: string) {
  const run = await prisma.agentRun.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { order: "asc" } },
      skillRuns: { orderBy: { createdAt: "desc" } },
      evidence: { orderBy: { fetchedAt: "desc" } },
      toolCalls: { orderBy: { createdAt: "desc" } },
      modelCalls: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!run) return null;
  return {
    ...shapeAgentRun(run),
    steps: run.steps,
    skillRuns: run.skillRuns.map((item) => ({ ...item, inputPayload: jsonObject(item.inputPayload) })),
    evidence: run.evidence.map((item) => ({ ...item, rawPayload: jsonValue(item.rawPayload) })),
    toolCalls: run.toolCalls.map((item) => ({ ...item, inputJson: jsonObject(item.inputJson) })),
    modelCalls: run.modelCalls,
  };
}

export async function getAgentRunForExecution(id: string) {
  const run = await prisma.agentRun.findUnique({ where: { id } });
  if (!run) return null;
  return shapeAgentRun(run);
}

export async function getActiveInterruptedRun(sessionId: string) {
  const run = await prisma.agentRun.findFirst({
    where: { sessionId, status: "interrupted" },
    orderBy: { updatedAt: "desc" },
  });
  return run ? shapeAgentRun(run) : null;
}

export async function listEvidenceRecords(agentRunId: string) {
  const records = await prisma.evidenceRecord.findMany({
    where: { agentRunId },
    orderBy: { fetchedAt: "desc" },
  });
  return records.map((record) => ({ ...record, rawPayload: jsonValue(record.rawPayload) }));
}

export async function createEvidenceRecords(agentRunId: string, records: EvidenceRecordInput[], skillRunId?: string, toolCallId?: string) {
  if (records.length === 0) return [];
  await prisma.evidenceRecord.createMany({
    data: records.map((record) => ({
      agentRunId,
      skillRunId,
      toolCallId,
      kind: record.kind,
      title: record.title,
      source: record.source,
      publishedAt: record.publishedAt,
      summary: record.summary ?? "",
      sourceEndpoint: record.sourceEndpoint ?? "",
      rawPayload: jsonValue(record.rawPayload) ?? {},
    })),
  });
  return listEvidenceRecords(agentRunId);
}

export async function getSkillRun(id: string) {
  const run = await prisma.skillRun.findUnique({
    where: { id },
    include: { evidence: true },
  });
  if (!run) return null;
  return {
    ...run,
    inputPayload: jsonObject(run.inputPayload),
    evidence: run.evidence.map((item) => ({ ...item, rawPayload: jsonValue(item.rawPayload) })),
  };
}

export async function listAgentMemory(input: { userId?: string; status?: string; query?: string } = {}) {
  const query = input.query?.trim();
  const memories = await prisma.memoryItem.findMany({
    where: {
      userId: input.userId ?? DEFAULT_AGENT_USER_ID,
      status: input.status ?? "active",
      ...(query
        ? {
            OR: [
              { content: { contains: query, mode: "insensitive" } },
              { kind: { contains: query, mode: "insensitive" } },
              { scope: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ importance: "desc" }, { lastUsedAt: "desc" }, { updatedAt: "desc" }],
    take: 120,
  });
  return memories;
}

export async function updateAgentMemory(
  id: string,
  data: Partial<{
    status: string;
    importance: number;
    content: string;
  }>
) {
  return prisma.memoryItem.update({
    where: { id },
    data: {
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.importance !== undefined ? { importance: data.importance } : {}),
      ...(data.content !== undefined ? { content: data.content } : {}),
    },
  });
}

export async function deleteAgentMemory(id: string) {
  return prisma.memoryItem.update({
    where: { id },
    data: { status: "archived" },
  });
}

export async function listBriefHistory() {
  const briefs = await prisma.dailyBrief.findMany({
    orderBy: { briefDate: "desc" },
    take: 45,
    include: { items: true },
  });
  return briefs.map((brief) => ({ ...brief, items: brief.items.map(shapeBriefItemForClient) }));
}

export async function getSettings() {
  const settings = await prisma.appSetting.findMany();
  const map = new Map(settings.map((setting) => [setting.key, setting.value]));
  return {
    briefTime: map.get("briefTime") ?? "08:30",
    dataWindowHours: Number(map.get("dataWindowHours") ?? 24),
    backfillDays: Number(map.get("backfillDays") ?? 7),
    defaultItemLimit: Number(map.get("defaultItemLimit") ?? 20),
  };
}

export async function updateSettings(input: Record<string, string | number>) {
  await Promise.all(
    Object.entries(input).map(([key, value]) =>
      prisma.appSetting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      })
    )
  );
  return getSettings();
}

function shapeDailyBrief<
  T extends {
    items: Array<{
      id: string;
      kind: "news" | "research" | "announcement" | "event";
      title: string;
      source: string;
      publishedAt: Date;
      summary: string;
      rawPayload: string | null;
      normalizedPayload: string | null;
      detailText?: string;
      fetchedAt?: Date;
      target?: { tags: unknown; name: string; code: string } | null;
    }>;
  },
>(brief: T) {
  return {
    ...brief,
    items: brief.items.map(shapeBriefItemForClient),
  };
}

function shapeBriefItemForClient<
  T extends {
    kind: "news" | "research" | "announcement" | "event";
    title: string;
    source: string;
    publishedAt: Date;
    summary: string;
    rawPayload: string | null;
    normalizedPayload: string | null;
    detailText?: string;
    fetchedAt?: Date;
    target?: ({ tags: unknown; name: string; code: string } & Record<string, unknown>) | null;
  } & Record<string, unknown>,
>(item: T) {
  const rawPayload = parseJson(item.rawPayload);
  const normalizedPayload = parseJson(item.normalizedPayload);
  const target = item.target ? shapeWatchTarget(item.target) : null;
  const display = buildBriefItemDisplay({
    kind: item.kind,
    title: item.title,
    source: item.source,
    publishedAt: item.publishedAt,
    summary: item.summary,
    rawRef: "",
    rawPayload,
    normalizedPayload: normalizedPayload && typeof normalizedPayload === "object" ? (normalizedPayload as Record<string, unknown>) : {},
    detailText: item.detailText ?? "",
    fetchedAt: item.fetchedAt,
    target,
  });

  return {
    id: item.id,
    kind: item.kind,
    title: cleanDisplayText(item.title),
    source: cleanDisplayText(item.source),
    publishedAt: item.publishedAt,
    summary: cleanDisplayText(item.summary),
    target,
    detailText: cleanDisplayText(item.detailText ?? ""),
    fetchedAt: item.fetchedAt,
    ...display,
  };
}

function stringifyJson(value: unknown) {
  if (value === undefined) return undefined;
  return JSON.stringify(value);
}

function parseJson(value: string | null | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function jsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value ?? null;
  const parsed = parseJson(value);
  return parsed ?? null;
}

export function jsonObject(value: unknown): JsonRecord {
  const parsed = jsonValue(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as JsonRecord) : {};
}

export function jsonArray(value: unknown): unknown[] {
  const parsed = jsonValue(value);
  return Array.isArray(parsed) ? parsed : [];
}

function legacyQuestionFromContext(context: JsonRecord) {
  const skillName = typeof context.skillName === "string" ? context.skillName : undefined;
  const targetName = typeof context.targetName === "string" ? context.targetName : undefined;
  const title = typeof context.title === "string" ? context.title : undefined;
  return [skillName, targetName, title].filter(Boolean).join(" / ") || "Legacy analysis placeholder";
}

function analysisStatusToAgentStatus(status: "pending" | "completed" | "failed") {
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  return "created";
}

function shapeAgentRun<T extends { inputPayload: unknown }>(run: T) {
  return {
    ...run,
    inputPayload: jsonObject(run.inputPayload),
    outputJson: jsonObject((run as { outputJson?: unknown }).outputJson),
  };
}

function shapeAgentSession<
  T extends {
    lastActiveAt: Date;
    createdAt: Date;
    updatedAt: Date;
  } & Record<string, unknown>,
>(session: T) {
  return session;
}

function isTerminalRunStatus(status: string) {
  return status === "completed" || status === "failed" || status === "interrupted";
}
