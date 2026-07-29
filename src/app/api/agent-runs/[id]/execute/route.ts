import { NextResponse } from "next/server";
import { createAgentQueue } from "@/agents/queue";
import { agentApiErrorResponse } from "@/lib/agent-api-errors";
import { getAgentRunForExecution, PrismaAgentRunRepository } from "@/lib/repositories";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const run = await getAgentRunForExecution(id);
    if (!run) {
      return NextResponse.json({ error: "Agent run not found" }, { status: 404 });
    }
    await new PrismaAgentRunRepository().updateAgentRun(id, { status: "queued", error: null });
    const job = await createAgentQueue().enqueue({
      runId: id,
      agentKey: (run.agentKey || "research-router-agent") as "research-router-agent",
      sessionId: run.sessionId ?? id,
    });
    return NextResponse.json({ ...run, status: "queued", jobId: job.id });
  } catch (error) {
    return agentApiErrorResponse(error, "Agent execution enqueue failed", 500);
  }
}
