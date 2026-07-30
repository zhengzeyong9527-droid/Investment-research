import type { JsonRecord } from "@/lib/agent";
import type { ToolRegistry } from "@/tools/types";

export type ResolvedEntity = {
  code: string;
  name: string;
  type: "stock" | "industry" | "concept" | "fund" | "commodity";
  correlation?: number;
  level?: number;
};

export type ResolvedAgentEntities = {
  stock?: ResolvedEntity;
  industry?: ResolvedEntity;
  concept?: ResolvedEntity;
  fund?: ResolvedEntity;
  commodities: ResolvedEntity[];
  unwind: Partial<{ lossPercent: number; positionPercent: number }>;
  candidates: string[];
  rawEntityRecognition: unknown[];
  rejectedCandidates: Array<{ text: string; reason: string }>;
};

export type ResolveAgentEntitiesInput = {
  question: string;
  inputPayload: JsonRecord;
  toolRegistry: Pick<ToolRegistry, "call">;
  context: Parameters<ToolRegistry["call"]>[2];
};

export async function resolveAgentEntities(input: ResolveAgentEntitiesInput): Promise<ResolvedAgentEntities> {
  const candidateText = candidateSourceText(input.question, input.inputPayload);
  const candidateResult = buildEntityCandidateResult(candidateText);
  const candidates = candidateResult.candidates;
  const resolved: ResolvedAgentEntities = {
    commodities: [],
    unwind: parseUnwindFields(input.question),
    candidates,
    rawEntityRecognition: [],
    rejectedCandidates: candidateResult.rejectedCandidates,
  };

  await resolveAndAssign(input.question, resolved, input.toolRegistry, input.context, { allowStockFallback: false });

  for (const candidate of candidates) {
    await resolveAndAssign(candidate, resolved, input.toolRegistry, input.context, { allowStockFallback: shouldUseStockFallback(candidate) });
  }

  return resolved;
}

export function buildEntityCandidates(text: string): string[] {
  return buildEntityCandidateResult(text).candidates;
}

function buildEntityCandidateResult(text: string) {
  const normalized = text.replace(/[，。！？?；;、]/g, " ").replace(/\s+/g, " ").trim();
  const candidates = new Set<string>();
  const rejectedCandidates: Array<{ text: string; reason: string }> = [];

  for (const match of normalized.matchAll(/[\u4e00-\u9fa5A-Za-z0-9]{2,24}/g)) {
    const raw = match[0];
    for (const candidate of cleanCandidate(raw)) {
      if (candidate.length < 2) continue;
      const rejectReason = candidateRejectReason(candidate);
      if (rejectReason) {
        rejectedCandidates.push({ text: candidate, reason: rejectReason });
      } else {
        candidates.add(candidate);
      }
    }
  }

  for (const keyword of ["永兴材料", "贵州茅台", "宁德时代", "有色金属", "碳酸锂", "锂概念", "锂"]) {
    if (text.includes(keyword)) candidates.add(keyword);
  }

  return { candidates: [...candidates].slice(0, 10), rejectedCandidates: uniqueRejectedCandidates(rejectedCandidates) };
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
    commodities: entities.commodities,
    candidates: entities.candidates,
    unwind: entities.unwind,
    rawEntityRecognition: entities.rawEntityRecognition,
    rejectedCandidates: entities.rejectedCandidates,
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
    .replace(/吗+$/, "")
    .replace(/怎么看.*$/, "")
    .replace(/怎么样.*$/, "")
    .replace(/最近.*$/, "")
    .trim();
  const values = [stripped];
  if (raw.includes("碳酸锂")) values.push("碳酸锂");
  return values.filter(Boolean);
}

function candidateRejectReason(candidate: string) {
  if (isTaskPhrase(candidate)) return "task_phrase";
  if (isGenericCandidate(candidate)) return "generic_phrase";
  return "";
}

function isTaskPhrase(candidate: string) {
  return /^(引用证据|请引用证据|输出结论|结论|证据|核心依据|主要风险|后续关注|需求和风险|为研究对象|催化因素和风险|政策|需求|风险)$/.test(candidate);
}

function isGenericCandidate(candidate: string) {
  return /^(我的|请问|还有|解套空间|短期|最近|研究|分析|继续|上面|这个|行业|股票|近30天|近90天)$/.test(candidate);
}

function isBroadCategoryCandidate(candidate: string) {
  return /(用品|行业|板块|主题|赛道|概念|商品|材料|制品|服务|消费|地产|金融|制造|设备)$/.test(candidate) && !isKnownCompanyLikeCandidate(candidate);
}

function isKnownCompanyLikeCandidate(candidate: string) {
  return /^(永兴材料|贵州茅台|宁德时代|比亚迪|中国平安)$/.test(candidate);
}

function uniqueRejectedCandidates(candidates: Array<{ text: string; reason: string }>) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.text}:${candidate.reason}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function positionPercentFromChinese(text: string) {
  if (text.includes("满")) return 100;
  if (text.includes("半")) return 50;
  const digits: Record<string, number> = { 一: 10, 二: 20, 三: 30, 四: 40, 五: 50, 六: 60, 七: 70, 八: 80, 九: 90 };
  return Object.entries(digits).find(([key]) => text.includes(key))?.[1];
}

async function resolveAndAssign(
  query: string,
  resolved: ResolvedAgentEntities,
  toolRegistry: ResolveAgentEntitiesInput["toolRegistry"],
  context: ResolveAgentEntitiesInput["context"],
  options: { allowStockFallback?: boolean } = {}
) {
  const entities: ResolvedEntity[] = [];
  try {
    const result = await toolRegistry.call<unknown>("entity.recognition", { query }, context);
    resolved.rawEntityRecognition.push(result.data);
    entities.push(...normalizeEntities(result.data));
  } catch {
    // Fall back below.
  }

  if (options.allowStockFallback && !entities.some((entity) => entity.type === "stock")) {
    const stock = await resolveStockFallback(query, toolRegistry, context);
    if (stock) entities.push(stock);
  }
  if (/碳酸锂/.test(query) && !entities.some((entity) => entity.type === "commodity" && entity.name === "碳酸锂")) {
    entities.push({ code: "碳酸锂", name: "碳酸锂", type: "commodity", correlation: 0.7 });
  }
  for (const entity of entities) {
    if (isEntityRelevantToQuery(query, entity)) assignEntity(resolved, entity);
  }
}

function shouldUseStockFallback(query: string) {
  if (isTaskPhrase(query) || isGenericCandidate(query)) return false;
  if (isBroadCategoryCandidate(query)) return false;
  if (/\b\d{6}\b/.test(query)) return true;
  if (/行业|板块|主题|赛道|概念|碳酸锂|锂|铜|铝|煤炭|钢铁|白酒|银行|半导体|新能源|人工智能/.test(query)) return false;
  return /^[\u4e00-\u9fa5]{2,8}(?:股份|科技|材料|时代|集团|银行|证券|保险|药业|能源|汽车|电力|电子|通信)?$/.test(query);
}

function isEntityRelevantToQuery(query: string, entity: ResolvedEntity) {
  if (entity.type === "stock") return true;
  if (entity.type === "commodity") return query.includes(entity.name) || query.includes(entity.code);
  const mentionsEntity = query.includes(entity.name) || entity.name.includes(query) || query.includes(entity.code) || sharesShortChineseTerm(query, entity.name);
  if (!mentionsEntity) return false;
  if (query === entity.name || query === entity.code) return true;
  if (entity.type === "industry") return /行业|板块|赛道|产业链|主题|景气|催化|风险|价格|商品|碳酸锂|会涨|涨跌|供需/.test(query);
  if (entity.type === "concept") return /概念|主题|赛道|产业链|商品|价格|碳酸锂|催化/.test(query);
  return mentionsEntity;
}

function sharesShortChineseTerm(query: string, entityName: string) {
  return [...entityName].some((char) => /[\u4e00-\u9fa5]/.test(char) && query.includes(char));
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
      if (!code || !name || !["stock", "industry", "concept", "fund", "commodity"].includes(type)) return [];
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
  if (entity.type === "commodity" && !target.commodities.some((item) => item.code === entity.code || item.name === entity.name)) {
    target.commodities.push(entity);
  }
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
