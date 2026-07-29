import type { JsonRecord } from "@/lib/agent";
import type { ToolRegistry } from "@/tools/types";

export type ResolvedEntity = {
  code: string;
  name: string;
  type: "stock" | "industry" | "concept" | "fund";
  correlation?: number;
  level?: number;
};

export type ResolvedAgentEntities = {
  stock?: ResolvedEntity;
  industry?: ResolvedEntity;
  concept?: ResolvedEntity;
  fund?: ResolvedEntity;
  unwind: Partial<{ lossPercent: number; positionPercent: number }>;
  candidates: string[];
};

export type ResolveAgentEntitiesInput = {
  question: string;
  inputPayload: JsonRecord;
  toolRegistry: Pick<ToolRegistry, "call">;
  context: Parameters<ToolRegistry["call"]>[2];
};

export async function resolveAgentEntities(input: ResolveAgentEntitiesInput): Promise<ResolvedAgentEntities> {
  const candidates = buildEntityCandidates(candidateSourceText(input.question, input.inputPayload));
  const resolved: ResolvedAgentEntities = {
    unwind: parseUnwindFields(input.question),
    candidates,
  };

  for (const candidate of candidates) {
    const entities = await resolveCandidateEntities(candidate, input.toolRegistry, input.context);
    for (const entity of entities) {
      assignEntity(resolved, entity);
    }
  }

  return resolved;
}

export function buildEntityCandidates(text: string): string[] {
  const normalized = text.replace(/[，。！？?；;、]/g, " ").replace(/\s+/g, " ").trim();
  const candidates = new Set<string>();

  for (const match of normalized.matchAll(/[\u4e00-\u9fa5A-Za-z0-9]{2,24}/g)) {
    const raw = match[0];
    for (const candidate of cleanCandidate(raw)) {
      if (candidate.length >= 2 && !isGenericCandidate(candidate)) candidates.add(candidate);
    }
  }

  for (const keyword of ["永兴材料", "贵州茅台", "宁德时代", "有色金属", "碳酸锂", "锂概念", "锂"]) {
    if (text.includes(keyword)) candidates.add(keyword);
  }

  return [...candidates].slice(0, 10);
}

export function parseUnwindFields(text: string) {
  const lossText = text.match(/(?:被套|亏损|套了|浮亏|亏了|跌了)\s*(\d{1,3}(?:\.\d+)?)\s*%?/)?.[1];
  const positionText = text.match(/(?:仓位|持仓|仓)\s*(\d{1,3}(?:\.\d+)?)\s*%?/)?.[1];
  const chinesePosition = text.match(/(满仓|半仓|[一二三四五六七八九]成仓?|[一二三四五六七八九]层仓?)/)?.[1];
  return {
    ...(lossText ? { lossPercent: Number(lossText) } : {}),
    ...(positionText ? { positionPercent: Number(positionText) } : {}),
    ...(chinesePosition ? { positionPercent: positionPercentFromChinese(chinesePosition) } : {}),
  };
}

export function resolvedEntitiesToJson(entities: ResolvedAgentEntities) {
  return {
    stock: entities.stock,
    industry: entities.industry,
    concept: entities.concept,
    fund: entities.fund,
    candidates: entities.candidates,
    unwind: entities.unwind,
  };
}

function candidateSourceText(question: string, inputPayload: JsonRecord) {
  return [
    question,
    inputPayload.stockCodeOrName,
    inputPayload.stockName,
    inputPayload.stockCode,
    inputPayload.industryName,
    inputPayload.industry,
    inputPayload.conceptName,
    inputPayload.conceptCode,
  ]
    .map(stringValue)
    .filter(Boolean)
    .join(" ");
}

function cleanCandidate(raw: string) {
  const stripped = raw
    .replace(/^我的/, "")
    .replace(/^请问/, "")
    .replace(/^研究/, "")
    .replace(/^分析/, "")
    .replace(/还有.*$/, "")
    .replace(/请问.*$/, "")
    .replace(/被套.*$/, "")
    .replace(/亏损.*$/, "")
    .replace(/套了.*$/, "")
    .replace(/仓位.*$/, "")
    .replace(/会涨.*$/, "")
    .replace(/怎么看.*$/, "")
    .replace(/怎么样.*$/, "")
    .replace(/最近.*$/, "")
    .trim();
  const values = [stripped];
  if (raw.includes("碳酸锂")) values.push("碳酸锂");
  return values.filter(Boolean);
}

function isGenericCandidate(candidate: string) {
  return /^(我的|请问|还有|解套空间|短期|最近|风险|研究|分析|继续|上面|这个|行业|股票)$/.test(candidate);
}

function positionPercentFromChinese(text: string) {
  if (text.includes("满")) return 100;
  if (text.includes("半")) return 50;
  const digits: Record<string, number> = { 一: 10, 二: 20, 三: 30, 四: 40, 五: 50, 六: 60, 七: 70, 八: 80, 九: 90 };
  return Object.entries(digits).find(([key]) => text.includes(key))?.[1];
}

async function resolveCandidateEntities(
  query: string,
  toolRegistry: ResolveAgentEntitiesInput["toolRegistry"],
  context: ResolveAgentEntitiesInput["context"]
) {
  const entities: ResolvedEntity[] = [];
  try {
    const result = await toolRegistry.call<unknown>("entity.recognition", { query }, context);
    entities.push(...normalizeEntities(result.data));
  } catch {
    // Fall back below.
  }

  if (!entities.some((entity) => entity.type === "stock")) {
    const stock = await resolveStockFallback(query, toolRegistry, context);
    if (stock) entities.push(stock);
  }

  return entities;
}

async function resolveStockFallback(
  query: string,
  toolRegistry: ResolveAgentEntitiesInput["toolRegistry"],
  context: ResolveAgentEntitiesInput["context"]
) {
  if (!/\b\d{6}\b/.test(query) && !/[\u4e00-\u9fa5]/.test(query)) return null;
  try {
    const result = await toolRegistry.call<unknown>("stock.resolve", { query, stockCodeOrName: query }, context);
    const record = asRecord(result.data);
    const code = stringValue(record?.code ?? record?.stockCode);
    const name = stringValue(record?.name ?? record?.stockName);
    if (code && name) return { code, name, type: "stock" as const };
  } catch {
    return null;
  }
  return null;
}

function normalizeEntities(data: unknown): ResolvedEntity[] {
  const root = asRecord(data);
  const candidates = Array.isArray(root?.entities) ? root.entities : root ? [root] : [];
  return candidates
    .map(asRecord)
    .filter((record): record is Record<string, unknown> => Boolean(record))
    .flatMap((record) => {
      const type = stringValue(record.type);
      const code = stringValue(record.code);
      const name = stringValue(record.name);
      if (!code || !name || !["stock", "industry", "concept", "fund"].includes(type)) return [];
      const entity: ResolvedEntity = {
        code,
        name,
        type: type as ResolvedEntity["type"],
      };
      const correlation = numberValue(record.correlation);
      const level = numberValue(record.level);
      if (correlation !== undefined) entity.correlation = correlation;
      if (level !== undefined) entity.level = level;
      return [entity];
    });
}

function assignEntity(target: ResolvedAgentEntities, entity: ResolvedEntity) {
  if (entity.type === "stock" && isBetterEntity(entity, target.stock)) target.stock = entity;
  if (entity.type === "industry" && isBetterEntity(entity, target.industry)) target.industry = entity;
  if (entity.type === "concept" && isBetterEntity(entity, target.concept)) target.concept = entity;
  if (entity.type === "fund" && isBetterEntity(entity, target.fund)) target.fund = entity;
}

function isBetterEntity(candidate: ResolvedEntity, current?: ResolvedEntity) {
  if (!current) return true;
  return (candidate.correlation ?? 0) > (current.correlation ?? 0);
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function stringValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
