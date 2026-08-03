import { NextResponse } from "next/server";
import { createAgentQueue } from "@/agents/queue";
import { buildResumePayloadFromMessage, isSupplementForInterruptedRun } from "@/agents/interrupted-resume";
import { createAgentRunTask } from "@/agents/runs";
import type { AgentKey } from "@/agents/types";
import { agentApiErrorResponse } from "@/lib/agent-api-errors";
import { withApiSecurity } from "@/lib/api-security";
import {
  appendAgentMessage,
  getActiveInterruptedRun,
  getAgentSessionDetail,
  PrismaAgentRunRepository,
  renameAgentSession,
} from "@/lib/repositories";

const MARKET_BROADCAST_SKILL = "investoday-stock-market-broadcast";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const security = withApiSecurity(request);
  if (security) return security;
  try {
    const { id: sessionId } = await params;
    const body = await request.json().catch(() => ({}));
    const content = String(body.content ?? body.question ?? "").trim();
    if (!content) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    const before = await getAgentSessionDetail(sessionId);
    if (!before) {
      return NextResponse.json({ error: "Agent session not found" }, { status: 404 });
    }
    if (before.activeRun) {
      return NextResponse.json({ error: "当前对话已有 Agent 正在执行，请等待上一轮完成。" }, { status: 409 });
    }

    const abilityKey = typeof body.abilityKey === "string" ? body.abilityKey : "auto";
    const queue = createAgentQueue();
    const repository = new PrismaAgentRunRepository();
    await appendAgentMessage({ sessionId, role: "user", content });
    if (before.messages.length === 0 || before.title === "新对话") {
      await renameAgentSession(sessionId, titleFromMessage(content));
    }

    const interruptedRun = await getActiveInterruptedRun(sessionId);
    if (interruptedRun && isSupplementForInterruptedRun(content, interruptedRun)) {
      const currentRawPayload: unknown = interruptedRun.inputPayload;
      const currentPayload: Record<string, unknown> = isRecord(currentRawPayload) ? Object.assign({}, currentRawPayload) : {};
      const inputPayload = { ...currentPayload, ...buildResumePayloadFromMessage(content) };
      const run = await repository.updateAgentRun(interruptedRun.id, {
        status: "queued",
        inputPayload,
        outputMarkdown: null,
        outputJson: {},
        error: null,
        completedAt: null,
      });
      await repository.appendAgentStep({
        agentRunId: interruptedRun.id,
        nodeKey: "resume",
        order: 99,
        title: "Resume interrupted run",
        status: "completed",
        message: "User supplement merged into interrupted run and queued.",
      });
      await queue.enqueue({
        runId: interruptedRun.id,
        agentKey: agentKeyForQueue(interruptedRun.agentKey),
        sessionId,
        resumePayload: inputPayload,
      });
      const session = await getAgentSessionDetail(sessionId);
      return NextResponse.json({ session, run }, { status: 202 });
    }

    const agentKey = abilityKey === MARKET_BROADCAST_SKILL ? "market-broadcast-agent" : "research-router-agent";
    const run = await createAgentRunTask({
      agentKey,
      sessionId,
      abilityKey,
      question: content,
      inputPayload: { ...(isRecord(body.inputPayload) ? body.inputPayload : {}), abilityKey },
      triggerType: "chat",
      repository,
      queue,
    });
    const session = await getAgentSessionDetail(sessionId);
    return NextResponse.json({ session, run }, { status: 201 });
  } catch (error) {
    return agentApiErrorResponse(error, "Agent message creation failed", 400);
  }
}

function titleFromMessage(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > 24 ? `${normalized.slice(0, 24)}...` : normalized || "新对话";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function agentKeyForQueue(value: unknown): AgentKey {
  return value === "market-broadcast-agent" || value === "unwind-advisor-subgraph" ? value : "research-router-agent";
}
