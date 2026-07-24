import type { Prisma } from "@prisma/client";
import type { AgentRunRepository, EvidenceRecordInput, JsonRecord } from "@/lib/agent";
import type { AnalysisRepository } from "@/lib/analysis";
import type { DailyBriefRepository } from "@/lib/briefs";
import { buildBriefItemDisplay, cleanDisplayText } from "@/lib/display";
import { prisma } from "@/lib/prisma";
import type { BriefDraft, NormalizedWatchTarget } from "@/lib/types";
import { deserializeTags, serializeTags } from "@/lib/watch-targets";

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

export function shapeWatchTarget<T extends { tags: string }>(target: T) {
  return {
    ...target,
    tags: deserializeTags(target.tags),
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
      tags: serializeTags(input.tags),
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
      ...(input.tags ? { tags: serializeTags(input.tags) } : {}),
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
    return prisma.analysisRun.create({
      data: {
        skillKey: data.skillKey,
        targetId: data.targetId,
        briefItemId: data.briefItemId,
        dailyBriefId: data.dailyBriefId,
        status: data.status,
        inputContext: data.inputContext,
        output: data.output,
      },
    });
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
    question: string;
    skillKey: string;
    status: "created" | "planning" | "fetching_data" | "running_skill" | "completed" | "failed";
    inputPayload: JsonRecord;
    promptPackage: string;
  }) {
    const run = await prisma.agentRun.create({
      data: {
        question: data.question,
        skillKey: data.skillKey,
        status: data.status,
        inputPayload: stringifyJson(data.inputPayload),
        promptPackage: data.promptPackage,
      },
    });
    return shapeAgentRun(run);
  }

  async updateAgentRun(
    id: string,
    data: Partial<{
      status: "created" | "planning" | "fetching_data" | "running_skill" | "completed" | "failed";
      outputMarkdown: string | null;
      error: string | null;
    }>
  ) {
    const run = await prisma.agentRun.update({ where: { id }, data });
    return shapeAgentRun(run);
  }

  async createAgentStep(data: {
    agentRunId: string;
    order: number;
    title: string;
    status: "pending" | "running" | "completed" | "failed";
    message: string;
  }) {
    return prisma.agentStep.create({ data });
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
        inputPayload: stringifyJson(data.inputPayload),
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
      rawPayload: parseJson(record.rawPayload),
    }));
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

export async function getAgentRun(id: string) {
  const run = await prisma.agentRun.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { order: "asc" } },
      skillRuns: { orderBy: { createdAt: "desc" } },
      evidence: { orderBy: { fetchedAt: "desc" } },
    },
  });
  if (!run) return null;
  return {
    ...shapeAgentRun(run),
    steps: run.steps,
    skillRuns: run.skillRuns.map((item) => ({ ...item, inputPayload: parseJson(item.inputPayload) })),
    evidence: run.evidence.map((item) => ({ ...item, rawPayload: parseJson(item.rawPayload) })),
  };
}

export async function getAgentRunForExecution(id: string) {
  const run = await prisma.agentRun.findUnique({ where: { id } });
  if (!run) return null;
  return shapeAgentRun(run);
}

export async function listEvidenceRecords(agentRunId: string) {
  const records = await prisma.evidenceRecord.findMany({
    where: { agentRunId },
    orderBy: { fetchedAt: "desc" },
  });
  return records.map((record) => ({ ...record, rawPayload: parseJson(record.rawPayload) }));
}

export async function createEvidenceRecords(agentRunId: string, records: EvidenceRecordInput[], skillRunId?: string) {
  if (records.length === 0) return [];
  await prisma.evidenceRecord.createMany({
    data: records.map((record) => ({
      agentRunId,
      skillRunId,
      kind: record.kind,
      title: record.title,
      source: record.source,
      publishedAt: record.publishedAt,
      summary: record.summary ?? "",
      sourceEndpoint: record.sourceEndpoint ?? "",
      rawPayload: stringifyJson(record.rawPayload) ?? "{}",
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
    inputPayload: parseJson(run.inputPayload),
    evidence: run.evidence.map((item) => ({ ...item, rawPayload: parseJson(item.rawPayload) })),
  };
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
      target?: { tags: string; name: string; code: string } | null;
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
    target?: ({ tags: string; name: string; code: string } & Record<string, unknown>) | null;
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

function shapeAgentRun<T extends { inputPayload: string }>(run: T) {
  return {
    ...run,
    inputPayload: (parseJson(run.inputPayload) ?? {}) as JsonRecord,
  };
}
