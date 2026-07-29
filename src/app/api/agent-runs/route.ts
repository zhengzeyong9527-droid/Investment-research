import { NextResponse } from "next/server";
import { createAgentQueue } from "@/agents/queue";
import { createAgentRunTask } from "@/agents/runs";
import { agentApiErrorResponse } from "@/lib/agent-api-errors";
import { listAgentRuns, PrismaAgentRunRepository } from "@/lib/repositories";

export async function GET() {
  try {
    return NextResponse.json(await listAgentRuns());
  } catch (error) {
    return agentApiErrorResponse(error, "Agent runs loading failed", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const run = await createAgentRunTask({
      agentKey: "research-router-agent",
      question: String(body.question ?? ""),
      inputPayload: body.inputPayload ?? {},
      abilityKey: body.abilityKey ?? body.skillKey,
      triggerType: "compat",
      repository: new PrismaAgentRunRepository(),
      queue: createAgentQueue(),
    });
    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    return agentApiErrorResponse(error, "Agent task creation failed", 400);
  }
}
