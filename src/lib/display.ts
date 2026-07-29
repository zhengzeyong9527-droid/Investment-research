import type { AdapterBriefItem, BriefItemKind } from "@/lib/types";

export type DisplayFieldKind = "paragraph" | "bullets" | "ordered" | "tags" | "metric";

export type DisplayField = {
  label: string;
  kind: DisplayFieldKind;
  value?: string;
  items?: string[];
  tone?: "default" | "positive" | "neutral" | "negative" | "warning";
};

export type DisplaySection = {
  title: string;
  fields: DisplayField[];
};

export type BriefItemDisplay = {
  sentimentValue?: number;
  sentimentLabel?: string;
  sentimentTone?: "positive" | "neutral" | "negative";
  sentimentScore?: number;
  newsLevelValue?: number;
  newsLevelLabel?: string;
  newsTypeValue?: number;
  newsTypeLabel?: string;
  relevance?: number;
  displaySections: DisplaySection[];
};

type DisplayInput = AdapterBriefItem & {
  target?: { name: string; code: string } | null;
};

type SplitResult = {
  kind: "paragraph" | "bullets" | "ordered";
  value?: string;
  items?: string[];
};

const LIST_LABELS = new Set(["关键要点", "影响分析", "情绪分析", "机会线索", "风险提示", "分析观点", "核心内容", "正文内容"]);

export function buildBriefItemDisplay(item: DisplayInput): BriefItemDisplay {
  const payload = objectValue(item.rawPayload);
  const normalized = objectValue(item.normalizedPayload);
  const merged = { ...payload, ...normalized };
  const sentiment = numberValue(merged.sentiment);
  const sentimentScore = numberValue(merged.sentimentScore ?? merged.comScore);
  const newsLevel = numberValue(merged.newsLevel);
  const newsType = numberValue(merged.newsType);
  const relevance = numberValue(merged.relevance ?? merged.minRelevance);
  const sentimentInfo = sentimentMeta(sentiment);

  return {
    sentimentValue: sentiment,
    sentimentLabel: sentimentInfo?.label,
    sentimentTone: sentimentInfo?.tone,
    sentimentScore,
    newsLevelValue: newsLevel,
    newsLevelLabel: newsLevelLabel(newsLevel),
    newsTypeValue: newsType,
    newsTypeLabel: newsTypeLabel(newsType),
    relevance,
    displaySections: buildSections(item, merged, {
      sentimentLabel: sentimentInfo?.label,
      sentimentScore,
      newsLevelLabel: newsLevelLabel(newsLevel),
      newsTypeLabel: newsTypeLabel(newsType),
      relevance,
    }),
  };
}

export function contentKindLabel(kind: BriefItemKind) {
  return {
    news: "新闻",
    research: "研报",
    announcement: "公告",
    event: "事件",
  }[kind];
}

export function dataSourceLabel(kind: BriefItemKind) {
  return {
    news: "新闻数据",
    research: "研报数据",
    announcement: "公告数据",
    event: "事件数据",
  }[kind];
}

export function cleanDisplayText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatDateTime(value);

  let text = String(value);
  text = decodeHtmlEntities(text);
  text = text
    .replace(/\\r\\n|\\n|\\r/g, "\n")
    .replace(/\\br|\/br|<\s*\/?\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*|__|`+/g, "")
    .replace(/\r\n|\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s+/, "").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function splitDisplayBlocks(value: unknown): SplitResult {
  const prepared = prepareListText(value);
  if (!prepared) return { kind: "paragraph", value: "" };

  const lines = prepared
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const ordered = lines
    .map((line) => line.match(/^(\d+)[.、)]\s*(.+)$/)?.[2])
    .filter((line): line is string => Boolean(line))
    .map(cleanDisplayText)
    .filter(Boolean);
  if (ordered.length >= 2 && ordered.length === lines.length) return { kind: "ordered", items: ordered };

  const bullets = lines
    .map((line) => line.match(/^[-*•]\s*(.+)$/)?.[1])
    .filter((line): line is string => Boolean(line))
    .map(cleanDisplayText)
    .filter(Boolean);
  if (bullets.length >= 2 && bullets.length === lines.length) return { kind: "bullets", items: bullets };

  const inlineOrdered = prepared
    .replace(/\s+(\d+[.、)]\s*)/g, "\n$1")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.match(/^(\d+)[.、)]\s*(.+)$/)?.[2])
    .filter((line): line is string => Boolean(line))
    .map(cleanDisplayText)
    .filter(Boolean);
  if (inlineOrdered.length >= 2) return { kind: "ordered", items: inlineOrdered };

  const inlineBullets = prepared
    .replace(/\s+[-•]\s+/g, "\n- ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.match(/^[-•]\s*(.+)$/)?.[1])
    .filter((line): line is string => Boolean(line))
    .map(cleanDisplayText)
    .filter(Boolean);
  if (inlineBullets.length >= 2) return { kind: "bullets", items: inlineBullets };

  const plainLines = lines.map(cleanDisplayText).filter(Boolean);
  if (plainLines.length >= 2) return { kind: "bullets", items: plainLines };

  const text = cleanDisplayText(prepared);
  return { kind: "paragraph", value: text };
}

export function buildReadableField(label: string, value: unknown, preferredKind?: DisplayFieldKind): DisplayField | null {
  const raw = valueToText(value);
  if (!raw) return null;

  if (preferredKind === "tags") {
    const items = splitTags(raw);
    return items.length > 0 ? { label, kind: "tags", items } : null;
  }

  if (preferredKind === "metric") {
    const text = cleanDisplayText(raw);
    return text ? { label, kind: "metric", value: text } : null;
  }

  const split = splitDisplayBlocks(raw);
  const shouldList = LIST_LABELS.has(label) || preferredKind === "bullets" || preferredKind === "ordered";
  if (split.kind !== "paragraph" && split.items?.length) {
    return { label, kind: preferredKind === "ordered" ? "ordered" : split.kind, items: split.items };
  }

  const text = cleanDisplayText(split.value ?? raw);
  if (!text) return null;
  if (shouldList) {
    const sentenceItems = splitLongSentence(text);
    if (sentenceItems.length >= 2) return { label, kind: "bullets", items: sentenceItems };
  }
  return { label, kind: preferredKind ?? "paragraph", value: text };
}

function buildSections(
  item: DisplayInput,
  payload: Record<string, unknown>,
  labels: {
    sentimentLabel?: string;
    sentimentScore?: number;
    newsLevelLabel?: string;
    newsTypeLabel?: string;
    relevance?: number;
  }
) {
  return [
    section("基本信息", [
      field("内容类型", contentKindLabel(item.kind), "metric"),
      field("发布时间", formatDateTime(item.publishedAt), "metric"),
      field("关联对象", item.target ? `${item.target.name} ${item.target.code}` : "", "metric"),
    ]),
    section("核心摘要", [
      field("摘要", item.summary),
      field("正文内容", item.detailText, "bullets"),
      field("核心内容", payload.coreContent, "bullets"),
    ]),
    section("关键要点", [
      field("关键要点", payload.keyPoints, "bullets"),
      field("关键事由", payload.keyReason, "bullets"),
    ]),
    section("情绪指标", [
      field("情绪倾向", labels.sentimentLabel, "metric"),
      field("情绪得分", numberText(labels.sentimentScore), "metric"),
      field("新闻类型", labels.newsTypeLabel, "metric"),
      field("综合得分", numberText(payload.comScore), "metric"),
    ]),
    section("影响分析", [
      field("影响分析", payload.impactAnalysis, "bullets"),
      field("情绪分析", payload.sentimentAnalysis, "bullets"),
      field("分析框架", payload.analysisFramework, "bullets"),
    ]),
    section("机会线索", [field("机会线索", payload.investmentOpportunity, "bullets")]),
    section("风险提示", [field("风险提示", payload.investmentRisk, "bullets")]),
    section("研报观点", [
      field("机构", payload.institutionName ?? payload.orgName, "metric"),
      field("作者", payload.author ?? payload.analystName, "metric"),
      field("评级", payload.rating, "metric"),
      field("目标价", payload.targetPrice, "metric"),
      field("分析观点", payload.analysisViewpoint ?? payload.coreViewpoint, "ordered"),
    ]),
  ].filter((item) => item.fields.length > 0);
}

function section(title: string, fields: Array<DisplayField | null>): DisplaySection {
  return {
    title,
    fields: fields.filter((item): item is DisplayField => Boolean(item)),
  };
}

function field(label: string, value: unknown, preferredKind?: DisplayFieldKind): DisplayField | null {
  return buildReadableField(label, value, preferredKind);
}

function sentimentMeta(value?: number) {
  if (value === 5) return { label: "利好", tone: "positive" as const };
  if (value === 4) return { label: "中性偏多", tone: "positive" as const };
  if (value === 3) return { label: "中性", tone: "neutral" as const };
  if (value === 2) return { label: "中性偏空", tone: "negative" as const };
  if (value === 1) return { label: "利空", tone: "negative" as const };
  return undefined;
}

function newsLevelLabel(value?: number) {
  if (value === 1) return "重要";
  if (value === 2) return "普通";
  return undefined;
}

function newsTypeLabel(value?: number) {
  if (value === 1) return "宏观";
  if (value === 2) return "行业";
  if (value === 3) return "公司";
  if (value === 4) return "行情";
  return undefined;
}

function objectValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function valueToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatDateTime(value);
  if (Array.isArray(value)) return value.map(valueToText).filter(Boolean).join("\n");
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).map(valueToText).filter(Boolean).join("\n");
  }
  return String(value).trim();
}

function numberValue(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function numberText(value: unknown) {
  const parsed = numberValue(value);
  return parsed === undefined ? "" : String(parsed);
}

function formatDateTime(value: unknown) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function prepareListText(value: unknown) {
  return decodeHtmlEntities(valueToText(value))
    .replace(/\\r\\n|\\n|\\r/g, "\n")
    .replace(/\\br|\/br|<\s*\/?\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*|__|`+/g, "")
    .replace(/\r\n|\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitTags(value: string) {
  return cleanDisplayText(value)
    .split(/[,，、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLongSentence(value: string) {
  return value
    .split(/(?:。|；|;)\s*/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (/[。！？]$/.test(item) ? item : `${item}。`));
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}
