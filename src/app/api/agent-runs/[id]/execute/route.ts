import { NextResponse } from "next/server";
import { executeInlineWhenMockQueue } from "@/agents/mock-inline";
import { createAgentQueue } from "@/agents/queue";
import { agentApiErrorResponse } from "@/lib/agent-api-errors";
import { withApiSecurity } from "@/lib/api-security";
import { getAgentRunForExecution, PrismaAgentRunRepository } from "@/lib/repositories";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const security = withApiSecurity(request);
  if (security) return security;
  try {
    const { id } = await params;
    const run = await getAgentRunForExecution(id);
    if (!run) {
      return NextResponse.json({ error: "Agent run not found" }, { status: 404 });
    }
    const queue = createAgentQueue();
    const repository = new PrismaAgentRunRepository();
    await repository.updateAgentRun(id, { status: "queued", error: null });
    const job = await queue.enqueue({
      runId: id,
      agentKey: (run.agentKey || "research-router-agent") as "research-router-agent",
      sessionId: run.sessionId ?? id,
    });
    await executeInlineWhenMockQueue({ runId: id, repository });
    return NextResponse.json({ ...run, status: "queued", jobId: job.id });
  } catch (error) {
    return agentApiErrorResponse(error, "Agent execution enqueue failed", 500);
  }
}
