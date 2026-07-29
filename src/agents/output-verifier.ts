import type { EvidenceRecordInput, JsonRecord } from "@/lib/agent";
import type { EvidenceGrade } from "@/agents/evidence-grading";

export type OutputVerification = {
  passed: boolean;
  issues: Array<{ code: string; message: string }>;
  checkedAt: string;
  runtimeDate: string;
  timeWindow?: { beginDate: string; endDate: string; days: number };
};

export function verifyAgentOutput(input: {
  markdown: string;
  inputPayload: JsonRecord;
  evidence: EvidenceRecordInput[];
  evidenceGrade: EvidenceGrade;
  now?: Date;
}): OutputVerification {
  const now = input.now ?? new Date();
  const runtimeDate = now.toISOString().slice(0, 10);
  const issues: OutputVerification["issues"] = [];
  const markdown = input.markdown ?? "";

  if (/<html[\s>]|<!doctype html/i.test(markdown) || /```html/i.test(markdown)) {
    issues.push({ code: "html_source_visible", message: "HTML source should be stored as an artifact link, not displayed in the chat body." });
  }

  const currentYear = now.getFullYear();
  const yearMatches = [...markdown.matchAll(/\b(20\d{2})年|\b(20\d{2})[-/]\d{1,2}[-/]\d{1,2}/g)];
  for (const match of yearMatches) {
    const year = Number(match[1] ?? match[2]);
    if (Number.isFinite(year) && year < currentYear && asksForRecent(input.inputPayload)) {
      issues.push({ code: "stale_date", message: `Output mentions ${year}, but this run is dated ${runtimeDate}.` });
      break;
    }
  }

  if (!input.evidenceGrade.passed) {
    issues.push({ code: "weak_evidence", message: `Evidence grade did not pass: ${input.evidenceGrade.missing.join(", ") || "unknown"}.` });
  }

  const explicitTitles = extractQuotedReportTitles(markdown);
  for (const title of explicitTitles) {
    if (!input.evidence.some((item) => item.title.includes(title) || title.includes(item.title))) {
      issues.push({ code: "untraced_report_title", message: `Report title is not found in evidence: ${title}` });
    }
  }

  const timeWindow = buildTimeWindow(input.inputPayload, now);
  return {
    passed: issues.length === 0,
    issues,
    checkedAt: new Date().toISOString(),
    runtimeDate,
    ...(timeWindow ? { timeWindow } : {}),
  };
}

function buildTimeWindow(inputPayload: JsonRecord, now: Date) {
  const days = Number(inputPayload.timeWindowDays);
  if (!Number.isFinite(days) || days <= 0) return undefined;
  const start = new Date(now.getTime() - days * 86_400_000);
  return {
    beginDate: start.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
    days,
  };
}

function asksForRecent(inputPayload: JsonRecord) {
  const text = JSON.stringify(inputPayload);
  return /今天|今日|最近|近|过去|timeWindowDays|recent/i.test(text);
}

function extractQuotedReportTitles(markdown: string) {
  const titles = new Set<string>();
  for (const match of markdown.matchAll(/[《「“"]([^》」”"]{6,80})(?:》|」|”|")/g)) {
    const text = (match[1] ?? "").trim();
    if (/研报|点评|报告|深度|跟踪|首次|覆盖/.test(text)) titles.add(text);
  }
  return [...titles].slice(0, 20);
}
