import type { EvidenceRecordInput, JsonRecord } from "@/lib/agent";
import type { EvidenceCompletenessGrade } from "@/agents/evidence-grading";

export type ExtractedClaimType =
  | "report_title"
  | "date"
  | "number"
  | "institution"
  | "rating"
  | "strong_conclusion"
  | "risk_judgment"
  | "entity";

export type ExtractedClaim = {
  id: string;
  type: ExtractedClaimType;
  text: string;
  normalizedText: string;
  blocking: boolean;
};

export type ClaimSupportResult = ExtractedClaim & {
  supported: boolean;
  evidenceIds: string[];
  reason: string;
};

export type ClaimVerification = {
  claims: ClaimSupportResult[];
  supportedClaims: ClaimSupportResult[];
  unsupportedClaims: ClaimSupportResult[];
  blockingUnsupportedClaims: ClaimSupportResult[];
  hallucinationRate: number;
};

const KNOWN_INSTITUTIONS = [
  "中信证券",
  "华泰证券",
  "国泰君安",
  "招商证券",
  "广发证券",
  "海通证券",
  "申万宏源",
  "银河证券",
  "东方证券",
  "国信证券",
  "兴业证券",
  "天风证券",
  "民生证券",
  "中金公司",
  "东方财富",
  "同花顺",
  "Wind",
  "Investoday",
];

const RATING_WORDS = ["买入", "增持", "中性", "减持", "卖出", "强烈推荐", "推荐", "跑赢行业", "优于大市", "持有"];
const STRONG_CONCLUSION_WORDS = ["必然", "一定", "确定", "明确", "强烈看好", "强烈建议", "无风险", "稳赚", "重仓", "满仓"];
const RISK_WORDS = ["风险", "承压", "改善", "恶化", "高估", "低估", "修复", "下行", "上行", "反转"];

export function verifyClaimsAgainstEvidence(input: {
  markdown: string;
  inputPayload: JsonRecord;
  evidence: EvidenceRecordInput[];
  evidenceGrade: EvidenceCompletenessGrade;
}): ClaimVerification {
  const claims = extractClaims(input.markdown, input.inputPayload, input.evidenceGrade);
  const evidenceIndex = buildEvidenceIndex(input.evidence);
  const results = claims.map((claim) => supportClaim(claim, evidenceIndex, input.evidenceGrade));
  const unsupportedClaims = results.filter((claim) => !claim.supported);
  const blockingUnsupportedClaims = unsupportedClaims.filter((claim) => claim.blocking);
  return {
    claims: results,
    supportedClaims: results.filter((claim) => claim.supported),
    unsupportedClaims,
    blockingUnsupportedClaims,
    hallucinationRate: round(results.length === 0 ? 0 : unsupportedClaims.length / results.length),
  };
}

export function extractClaims(markdown: string, inputPayload: JsonRecord, evidenceGrade: EvidenceCompletenessGrade): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];
  const seen = new Set<string>();
  const add = (type: ExtractedClaimType, text: string, blocking = true) => {
    const normalizedText = normalizeClaimText(text);
    if (!normalizedText) return;
    const key = `${type}:${normalizedText}`;
    if (seen.has(key)) return;
    seen.add(key);
    claims.push({ id: `claim-${claims.length + 1}`, type, text: text.trim(), normalizedText, blocking });
  };

  for (const title of extractQuotedTexts(markdown)) {
    if (/研报|点评|报告|深度|跟踪|首次|覆盖/.test(title)) add("report_title", title);
  }
  for (const match of markdown.matchAll(/\b20\d{2}(?:[-/年]\d{1,2}(?:[-/月]\d{1,2}日?)?)?/g)) add("date", match[0]);
  for (const match of markdown.matchAll(/(?:目标价|股价|价格|市值|营收|收入|利润|净利|增速|增长|下滑|回撤|仓位|亏损|浮亏|PE|PB|ROE)[^。；，,\n]{0,16}?-?\d+(?:\.\d+)?\s*(?:%|元|亿元|万元|倍|万|亿)?/gi)) {
    add("number", match[0]);
  }
  for (const institution of KNOWN_INSTITUTIONS) {
    if (markdown.includes(institution)) add("institution", institution);
  }
  for (const rating of RATING_WORDS) {
    if (markdown.includes(rating)) add("rating", rating);
  }
  for (const word of STRONG_CONCLUSION_WORDS) {
    if (markdown.includes(word) && !hasNegatedContext(markdown, word)) add("strong_conclusion", word, !evidenceGrade.passed);
  }
  for (const word of RISK_WORDS) {
    if (markdown.includes(word)) add("risk_judgment", word, false);
  }

  for (const value of entityCandidates(inputPayload)) {
    if (markdown.includes(value)) add("entity", value, false);
  }
  return claims.slice(0, 80);
}

function supportClaim(
  claim: ExtractedClaim,
  evidenceIndex: Array<{ id: string; text: string; normalizedText: string }>,
  evidenceGrade: EvidenceCompletenessGrade
): ClaimSupportResult {
  if (claim.type === "strong_conclusion" && !evidenceGrade.passed) {
    return { ...claim, supported: false, evidenceIds: [], reason: "Strong conclusion is not allowed when evidence completeness failed." };
  }
  const evidenceIds = evidenceIndex.filter((item) => item.normalizedText.includes(claim.normalizedText)).map((item) => item.id);
  if (evidenceIds.length > 0) return { ...claim, supported: true, evidenceIds, reason: "Exact normalized claim text found in evidence." };

  if (claim.type === "entity") {
    const matched = evidenceIndex.filter((item) => entityMatchesClaim(item.normalizedText, claim.normalizedText)).map((item) => item.id);
    if (matched.length > 0) return { ...claim, supported: true, evidenceIds: matched, reason: "Normalized entity matched evidence." };
  }
  if (claim.type === "risk_judgment") {
    return { ...claim, supported: evidenceIndex.length > 0, evidenceIds: evidenceIndex.slice(0, 3).map((item) => item.id), reason: "Risk keyword is diagnostic, not blocking." };
  }
  return { ...claim, supported: false, evidenceIds: [], reason: "Claim text was not found in evidence records." };
}

function buildEvidenceIndex(evidence: EvidenceRecordInput[]) {
  return evidence.map((item, index) => {
    const rawPayload = typeof item.rawPayload === "string" ? item.rawPayload : JSON.stringify(item.rawPayload ?? {});
    const text = [item.title, item.source, item.summary, item.sourceEndpoint, item.publishedAt?.toISOString?.(), rawPayload].filter(Boolean).join("\n");
    return { id: `evidence-${index + 1}`, text, normalizedText: normalizeClaimText(text) };
  });
}

function entityCandidates(inputPayload: JsonRecord) {
  return [inputPayload.stockCode, inputPayload.stockName, inputPayload.stockCodeOrName, inputPayload.industryName, inputPayload.industryCode]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

function entityMatchesClaim(evidenceText: string, claimText: string) {
  if (evidenceText.includes(claimText)) return true;
  const compact = claimText.replace(/^(sh|sz)/i, "");
  return compact.length >= 4 && evidenceText.includes(compact);
}

function hasNegatedContext(markdown: string, word: string) {
  const index = markdown.indexOf(word);
  if (index < 0) return false;
  const context = markdown.slice(Math.max(0, index - 8), index + word.length + 8);
  return /无法|不能|不可|不应|禁止|暂不|没有/.test(context);
}

function extractQuotedTexts(markdown: string) {
  const pairs: Array<[string, string]> = [
    ["《", "》"],
    ["「", "」"],
    ["“", "”"],
    ['"', '"'],
  ];
  const texts: string[] = [];
  for (const [open, close] of pairs) {
    let start = markdown.indexOf(open);
    while (start >= 0) {
      const end = markdown.indexOf(close, start + open.length);
      if (end < 0) break;
      const text = markdown.slice(start + open.length, end).trim();
      if (text.length >= 6 && text.length <= 80) texts.push(text);
      start = markdown.indexOf(open, end + close.length);
    }
  }
  return texts;
}

function normalizeClaimText(value: string) {
  return value
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[^\u4e00-\u9fa5a-z0-9.%/-]/g, "")
    .trim();
}

function round(value: number) {
  return Number(value.toFixed(4));
}
