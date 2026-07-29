import { NextResponse } from "next/server";
import { createAgentQueue } from "@/agents/queue";
import { createAgentRunTask } from "@/agents/runs";
import { agentApiErrorResponse } from "@/lib/agent-api-errors";
import { PrismaAgentRunRepository } from "@/lib/repositories";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const run = await createAgentRunTask({
      agentKey: "research-router-agent",
      question: String(body.question ?? ""),
      inputPayload: body.inputPayload ?? {},
      abilityKey: body.abilityKey ?? body.skillKey,
      triggerType: body.triggerType ?? "manual",
      repository: new PrismaAgentRunRepository(),
      queue: createAgentQueue(),
    });
    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    return agentApiErrorResponse(error, "Research agent creation failed", 400);
  }
}
