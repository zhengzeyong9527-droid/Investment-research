import { NextResponse } from "next/server";
import { createAgentQueue } from "@/agents/queue";
import { buildResumePayloadFromMessage } from "@/agents/interrupted-resume";
import type { AgentKey } from "@/agents/types";
import { agentApiErrorResponse } from "@/lib/agent-api-errors";
import { getAgentRunForExecution, PrismaAgentRunRepository } from "@/lib/repositories";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const run = await getAgentRunForExecution(id);
    if (!run) {
      return NextResponse.json({ error: "Agent run not found" }, { status: 404 });
    }
    const currentPayload = isRecord(run.inputPayload) ? run.inputPayload : {};
    const bodyPayload = isRecord(body.inputPayload) ? body.inputPayload : {};
    const messagePayload =
      typeof body.message === "string" || typeof body.content === "string"
        ? buildResumePayloadFromMessage(String(body.message ?? body.content))
        : {};
    const inputPayload = {
      ...currentPayload,
      ...bodyPayload,
      ...messagePayload,
      riskConfirmed: body.riskConfirmed ?? messagePayload.riskConfirmed ?? bodyPayload.riskConfirmed ?? true,
    };
    const updated = await prisma.agentRun.update({
      where: { id },
      data: {
        status: "queued",
        inputPayload: JSON.stringify(inputPayload),
        outputMarkdown: null,
        outputJson: "{}",
        error: null,
        completedAt: null,
      },
    });
    await createAgentQueue().enqueue({
      runId: id,
      agentKey: agentKeyForQueue(updated.agentKey),
      sessionId: updated.sessionId ?? id,
    });
    await new PrismaAgentRunRepository().appendAgentStep({
      agentRunId: id,
      nodeKey: "resume",
      order: 99,
      title: "Resume interrupted run",
      status: "completed",
      message: "Run resumed and queued.",
    });
    return NextResponse.json({ ...updated, inputPayload });
  } catch (error) {
    return agentApiErrorResponse(error, "Agent resume failed", 400);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function agentKeyForQueue(value: unknown): AgentKey {
  return value === "market-broadcast-agent" || value === "unwind-advisor-subgraph" ? value : "research-router-agent";
}
