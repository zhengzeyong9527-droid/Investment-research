import type { BriefItem, SkillCatalogItem, SkillField, WatchTarget } from "@/components/workbench/types";

export function itemSearchText(item: BriefItem) {
  return [
    item.title,
    item.summary,
    item.target?.name,
    ...(item.displaySections ?? []).flatMap((section) =>
      section.fields.flatMap((field) => [field.value, ...(field.items ?? [])])
    ),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

export function sortBriefItems(a: BriefItem, b: BriefItem, mode: string) {
  if (mode === "important") {
    return importanceScore(b) - importanceScore(a) || latestTime(b) - latestTime(a);
  }
  if (mode === "sentiment") {
    return Math.abs(b.sentimentScore ?? 0) - Math.abs(a.sentimentScore ?? 0) || latestTime(b) - latestTime(a);
  }
  if (mode === "relevance") {
    return (b.relevance ?? 0) - (a.relevance ?? 0) || latestTime(b) - latestTime(a);
  }
  return latestTime(b) - latestTime(a);
}

export function buildSentimentStats(items: BriefItem[]) {
  return items.reduce(
    (stats, item) => {
      if (item.sentimentTone === "positive") stats.positive += 1;
      else if (item.sentimentTone === "negative") stats.negative += 1;
      else stats.neutral += 1;
      return stats;
    },
    { positive: 0, neutral: 0, negative: 0 }
  );
}

export function collectSectionValues(items: BriefItem[], sectionTitle: string, limit: number) {
  return items
    .flatMap((item) =>
      (item.displaySections ?? [])
        .filter((section) => section.title === sectionTitle)
        .flatMap((section) => section.fields.flatMap((field) => [field.value, ...(field.items ?? [])]))
    )
    .filter((value): value is string => Boolean(value))
    .slice(0, limit);
}

export function watchTargetStatusLabel(target: WatchTarget) {
  if (!target.enabled) return "已禁用";
  if (target.code.startsWith("NAME:")) return "待确认";
  return "可参与速览";
}

export function watchTargetStatusClass(target: WatchTarget) {
  if (!target.enabled) return "rounded bg-ink/8 px-2 py-1 text-xs font-semibold text-ink/45";
  if (target.code.startsWith("NAME:")) return "rounded bg-persimmon/10 px-2 py-1 text-xs font-semibold text-persimmon";
  return "rounded bg-jade/10 px-2 py-1 text-xs font-semibold text-jade";
}

export function normalizeFieldValue(field: SkillField, value: FormDataEntryValue | null) {
  if (field.type === "number") return value === null || value === "" ? "" : Number(value);
  if (field.type === "boolean") return value === "on";
  return String(value ?? "").trim();
}

export function buildDefaultQuestion(skill: SkillCatalogItem, inputPayload: Record<string, unknown>) {
  return `请使用 ${skill.shortName} 分析：${Object.values(inputPayload).filter(Boolean).join(" / ")}`;
}

export function shanghaiDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function latestTime(item: BriefItem) {
  return new Date(item.publishedAt).getTime();
}

function importanceScore(item: BriefItem) {
  return (item.newsLevelLabel === "重要" ? 10 : 0) + (item.relevance ?? 0) + (item.kind === "research" ? 2 : 0);
}
