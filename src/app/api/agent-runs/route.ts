import { NextResponse } from "next/server";
import { createAgentRunDraft } from "@/lib/agent";
import { InvestodayDataAdapter } from "@/lib/investoday";
import { createEvidenceRecords, listAgentRuns, PrismaAgentRunRepository } from "@/lib/repositories";

export async function GET() {
  return NextResponse.json(await listAgentRuns());
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const run = await createAgentRunDraft({
      question: String(body.question ?? ""),
      inputPayload: body.inputPayload ?? {},
      skillKey: body.skillKey,
      repository: new PrismaAgentRunRepository(),
    });
    const evidence = await collectEvidence(String(body.question ?? ""), body.inputPayload ?? {});
    if (evidence.length > 0) {
      await createEvidenceRecords(run.id, evidence);
    }
    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Agent 任务创建失败" },
      { status: 400 }
    );
  }
}

async function collectEvidence(question: string, inputPayload: Record<string, unknown>) {
  const stockCode = String(
    inputPayload.stockCode ?? inputPayload.stockCodeOrName ?? inputPayload.subject ?? question.match(/\b\d{6}\b/)?.[0] ?? ""
  ).match(/\b\d{6}\b/)?.[0];
  if (!stockCode) return [];

  const adapter = new InvestodayDataAdapter();
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
  const items = await adapter.fetchBriefItems({
    target: { id: "agent-target", type: "stock", code: stockCode, name: stockCode },
    windowStart,
    windowEnd,
  });
  return items.map((item) => ({
    kind: item.kind,
    title: item.title,
    source: item.source,
    publishedAt: item.publishedAt,
    summary: item.summary,
    sourceEndpoint: item.sourceEndpoint,
    rawPayload: item.rawPayload,
  }));
}
