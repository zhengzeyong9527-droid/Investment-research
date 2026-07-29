import { prisma } from "@/lib/prisma";
import type { JsonRecord } from "@/lib/agent";

export const DEFAULT_AGENT_USER_ID = "local-user";

export type MemoryHit = {
  id: string;
  scope: string;
  kind: string;
  content: string;
  confidence: number;
  importance: number;
  score: number;
  sourceRunId?: string | null;
  lastUsedAt?: Date | null;
  hitCount?: number;
};

export type MemoryWriteCandidate = {
  sessionId?: string | null;
  userId?: string | null;
  scope: string;
  kind: string;
  content: string;
  sourceRunId?: string | null;
  confidence?: number;
  importance?: number;
};

export class MemoryService {
  async search(input: {
    userId?: string | null;
    sessionId?: string | null;
    query?: string;
    inputPayload?: JsonRecord;
    limit?: number;
  }): Promise<MemoryHit[]> {
    const userId = input.userId || DEFAULT_AGENT_USER_ID;
    const tokens = buildSearchTokens(input.query ?? "", input.inputPayload ?? {});
    const textFilters =
      tokens.length > 0
        ? tokens.flatMap((token) => [
            { content: { contains: token, mode: "insensitive" as const } },
            { kind: { contains: token, mode: "insensitive" as const } },
          ])
        : [];

    const items = await prisma.memoryItem.findMany({
      where: {
        status: "active",
        OR: [
          { userId },
          ...(input.sessionId ? [{ sessionId: input.sessionId }] : []),
          ...(textFilters.length > 0 ? textFilters : []),
        ],
      },
      orderBy: [{ importance: "desc" }, { confidence: "desc" }, { updatedAt: "desc" }],
      take: Math.max(input.limit ?? 8, 16),
    });

    const scored = items
      .map((item) => {
        const tokenScore = tokens.reduce((sum, token) => {
          const haystack = `${item.kind}\n${item.content}`.toLowerCase();
          return haystack.includes(token.toLowerCase()) ? sum + 1 : sum;
        }, 0);
        const scopeBoost = item.userId === userId ? 0.35 : 0.2;
        const score = tokenScore + item.importance + item.confidence + scopeBoost + Math.min(item.hitCount, 5) * 0.03;
        return {
          id: item.id,
          scope: item.scope,
          kind: item.kind,
          content: item.content,
          confidence: item.confidence,
          importance: item.importance,
          score,
          sourceRunId: item.sourceRunId,
          lastUsedAt: item.lastUsedAt,
          hitCount: item.hitCount,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, input.limit ?? 8);

    if (scored.length > 0) {
      await prisma.memoryItem.updateMany({
        where: { id: { in: scored.map((item) => item.id) } },
        data: { lastUsedAt: new Date(), hitCount: { increment: 1 } },
      });
    }

    return scored;
  }

  async write(input: MemoryWriteCandidate) {
    const userId = input.userId ?? DEFAULT_AGENT_USER_ID;
    return prisma.memoryItem.create({
      data: {
        sessionId: input.sessionId,
        userId,
        scope: input.scope,
        kind: input.kind,
        content: input.content,
        sourceRunId: input.sourceRunId,
        confidence: input.confidence ?? 0.65,
        importance: input.importance ?? 0.5,
      },
    });
  }
}

export function buildMemoryCandidatesFromRun(input: {
  sessionId?: string | null;
  userId?: string | null;
  question: string;
  inputPayload: JsonRecord;
  answerMarkdown: string;
  sourceRunId: string;
  skillKey: string;
}): MemoryWriteCandidate[] {
  const userId = input.userId || DEFAULT_AGENT_USER_ID;
  const candidates: MemoryWriteCandidate[] = [];
  const question = input.question;
  const answerSummary = compact(`${question}\n\n${stripMarkdown(input.answerMarkdown)}`, 1200);

  if (looksLikePreference(question)) {
    candidates.push({
      sessionId: input.sessionId,
      userId,
      scope: "user",
      kind: detectPreferenceKind(question),
      content: compact(question, 500),
      sourceRunId: input.sourceRunId,
      confidence: 0.86,
      importance: 0.8,
    });
  }

  const stockCode = stringValue(input.inputPayload.stockCode);
  const stockName = stringValue(input.inputPayload.stockName);
  if (stockCode || stockName) {
    candidates.push({
      sessionId: input.sessionId,
      userId,
      scope: "session",
      kind: "entity_focus",
      content: `stock:${stockCode || stockName} ${stockName || ""}`.trim(),
      sourceRunId: input.sourceRunId,
      confidence: 0.82,
      importance: 0.62,
    });
  }

  const industryName = stringValue(input.inputPayload.industryName);
  const industryCode = stringValue(input.inputPayload.industryCode);
  if (industryName || industryCode) {
    candidates.push({
      sessionId: input.sessionId,
      userId,
      scope: "session",
      kind: "entity_focus",
      content: `industry:${industryCode || industryName} ${industryName || ""}`.trim(),
      sourceRunId: input.sourceRunId,
      confidence: 0.82,
      importance: 0.62,
    });
  }

  if (mentionsOutputFormat(question)) {
    candidates.push({
      sessionId: input.sessionId,
      userId,
      scope: "user",
      kind: "output_format",
      content: compact(question, 500),
      sourceRunId: input.sourceRunId,
      confidence: 0.76,
      importance: 0.68,
    });
  }

  if (answerSummary) {
    candidates.push({
      sessionId: input.sessionId,
      userId,
      scope: "session",
      kind: "research_finding",
      content: answerSummary,
      sourceRunId: input.sourceRunId,
      confidence: 0.72,
      importance: 0.55,
    });
  }

  return dedupeCandidates(candidates);
}

function buildSearchTokens(query: string, inputPayload: JsonRecord) {
  const tokens = new Set<string>();
  for (const value of [
    query,
    inputPayload.stockCode,
    inputPayload.stockName,
    inputPayload.stockCodeOrName,
    inputPayload.industryName,
    inputPayload.industryCode,
    inputPayload.abilityKey,
  ]) {
    const text = stringValue(value);
    if (!text) continue;
    tokens.add(text);
    for (const piece of text.split(/[，,。.\s/]+/).map((item) => item.trim()).filter(Boolean)) {
      if (piece.length >= 2) tokens.add(piece);
    }
  }
  for (const keyword of ["巴菲特", "价值", "护城河", "长期", "现金流", "表格", "HTML", "看板", "风险"]) {
    if (query.includes(keyword)) tokens.add(keyword);
  }
  return [...tokens].slice(0, 12);
}

function looksLikePreference(text: string) {
  return /偏好|风格|接下来|以后|固定|输出结构|都以|沿用|按.*分析/.test(text);
}

function detectPreferenceKind(text: string) {
  if (/巴菲特|价值|护城河|长期|现金流/.test(text)) return "research_style";
  if (/输出|结构|表格|HTML|看板|格式/.test(text)) return "output_format";
  return "user_preference";
}

function mentionsOutputFormat(text: string) {
  return /输出|结构|表格|HTML|H5|页面|看板|格式/.test(text);
}

function dedupeCandidates(candidates: MemoryWriteCandidate[]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.scope}:${candidate.kind}:${candidate.content}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stripMarkdown(markdown: string) {
  return markdown.replace(/```[\s\S]*?```/g, " ").replace(/[#>*_`-]/g, " ").replace(/\s+/g, " ").trim();
}

function compact(text: string, maxLength: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}...` : clean;
}

function stringValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}
