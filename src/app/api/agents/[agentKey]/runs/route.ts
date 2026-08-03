import { NextResponse } from "next/server";
import { createAgentQueue } from "@/agents/queue";
import { createAgentRunTask } from "@/agents/runs";
import { isAgentKey } from "@/agents/registry";
import { agentApiErrorResponse } from "@/lib/agent-api-errors";
import { withApiSecurity } from "@/lib/api-security";
import { PrismaAgentRunRepository } from "@/lib/repositories";

export async function POST(request: Request, { params }: { params: Promise<{ agentKey: string }> }) {
  const security = withApiSecurity(request);
  if (security) return security;
  try {
    const { agentKey } = await params;
    if (!isAgentKey(agentKey)) {
      return NextResponse.json({ error: `Unknown agent: ${agentKey}` }, { status: 404 });
    }
    const body = await request.json().catch(() => ({}));
    const run = await createAgentRunTask({
      agentKey,
      sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined,
      question: String(body.question ?? ""),
      inputPayload: body.inputPayload ?? {},
      abilityKey: body.abilityKey ?? body.skillKey,
      triggerType: body.triggerType ?? "manual",
      repository: new PrismaAgentRunRepository(),
      queue: createAgentQueue(),
    });
    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    return agentApiErrorResponse(error, "Agent run creation failed", 400);
  }
}
