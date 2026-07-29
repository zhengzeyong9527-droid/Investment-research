import type { EvidenceRecordInput, JsonRecord } from "@/lib/agent";

export type EvidenceGrade = {
  score: number;
  passed: boolean;
  evidenceCount: number;
  missing: string[];
  stale: string[];
  sourceCounts: Record<string, number>;
  entityMatched: boolean;
  notes: string[];
};

export function gradeEvidence(input: {
  skillKey: string;
  normalizedInput: JsonRecord;
  evidence: EvidenceRecordInput[];
  now?: Date;
}): EvidenceGrade {
  const evidence = input.evidence;
  const sourceCounts = evidence.reduce<Record<string, number>>((map, item) => {
    map[item.kind] = (map[item.kind] ?? 0) + 1;
    return map;
  }, {});
  const missing: string[] = [];
  const stale: string[] = [];
  const notes: string[] = [];
  const industry = isIndustrySkill(input.skillKey, input.normalizedInput);
  const stock = isStockSkill(input.skillKey, input.normalizedInput);
  const entityMatched = evidence.some((item) => evidenceMatchesEntity(item, input.normalizedInput));

  if (evidence.length === 0) {
    missing.push("evidence");
  }
  if (stock && !hasAnyKind(sourceCounts, ["company", "research", "news", "announcement"])) {
    missing.push("stock_research_or_company_evidence");
  }
  if (industry && !hasAnyKind(sourceCounts, ["industry", "research", "news", "market"])) {
    missing.push("industry_data_or_report_evidence");
  }
  if ((stock || industry) && evidence.length > 0 && !entityMatched) {
    missing.push("entity_matched_evidence");
  }

  const now = input.now ?? new Date();
  const maxAgeDays = Number(input.normalizedInput.timeWindowDays ?? (industry ? 90 : 180)) + 14;
  for (const item of evidence) {
    if (!item.publishedAt) continue;
    const ageDays = Math.floor((now.getTime() - item.publishedAt.getTime()) / 86_400_000);
    if (ageDays > maxAgeDays) stale.push(item.title);
  }
  if (stale.length > 0) notes.push("Some evidence is outside the requested/recent time window.");

  const diversity = Object.keys(sourceCounts).length;
  const base = Math.min(0.65, evidence.length * 0.08);
  const diversityBoost = Math.min(0.2, diversity * 0.05);
  const entityBoost = entityMatched || (!stock && !industry) ? 0.15 : 0;
  const penalty = missing.length * 0.2 + stale.length * 0.03;
  const score = clamp(base + diversityBoost + entityBoost - penalty, 0, 1);
  const passed = missing.length === 0 && score >= 0.25;

  return {
    score: Number(score.toFixed(3)),
    passed,
    evidenceCount: evidence.length,
    missing,
    stale: stale.slice(0, 10),
    sourceCounts,
    entityMatched,
    notes,
  };
}

export function insufficientEvidenceMarkdown(grade: EvidenceGrade, input: JsonRecord) {
  const target = stringValue(input.stockName) || stringValue(input.stockCode) || stringValue(input.industryName) || stringValue(input.industryCode) || "当前问题";
  const missing = grade.missing.length > 0 ? grade.missing.join(", ") : "有效证据不足";
  return [
    `## 证据不足，暂不生成确定性报告`,
    "",
    `对象：${target}`,
    "",
    `本轮没有取得足够可追溯的数据来源，因此我不能直接生成确定性研究结论。`,
    "",
    `缺口：${missing}`,
    "",
    `建议补充股票代码、公司名称、行业名称，或稍后在数据源恢复后重试。`,
  ].join("\n");
}

function evidenceMatchesEntity(item: EvidenceRecordInput, input: JsonRecord) {
  const haystack = `${item.title}\n${item.summary}\n${JSON.stringify(item.rawPayload ?? {})}`.toLowerCase();
  for (const value of [input.stockCode, input.stockName, input.stockCodeOrName, input.industryName, input.industryCode]) {
    const text = stringValue(value).toLowerCase();
    if (text && haystack.includes(text)) return true;
  }
  return false;
}

function isStockSkill(skillKey: string, input: JsonRecord) {
  return Boolean(input.stockCode || input.stockName || input.stockCodeOrName || skillKey.includes("stock") || skillKey.includes("research-report"));
}

function isIndustrySkill(skillKey: string, input: JsonRecord) {
  return Boolean(input.industryName || input.industryCode || skillKey.includes("industry"));
}

function hasAnyKind(sourceCounts: Record<string, number>, kinds: string[]) {
  return kinds.some((kind) => (sourceCounts[kind] ?? 0) > 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function stringValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}
