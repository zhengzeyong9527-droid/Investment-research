import { NextResponse } from "next/server";
import { createAgentQueue } from "@/agents/queue";
import { createAgentRunTask } from "@/agents/runs";
import { agentApiErrorResponse } from "@/lib/agent-api-errors";
import { withApiSecurity } from "@/lib/api-security";
import { PrismaAgentRunRepository } from "@/lib/repositories";

export async function POST(request: Request) {
  const security = withApiSecurity(request);
  if (security) return security;
  try {
    const body = await request.json().catch(() => ({}));
    const run = await createAgentRunTask({
      agentKey: "market-broadcast-agent",
      question: String(body.question ?? "生成盘面行情播报"),
      inputPayload: body.inputPayload ?? body ?? {},
      abilityKey: "investoday-stock-market-broadcast",
      triggerType: body.triggerType ?? "manual",
      repository: new PrismaAgentRunRepository(),
      queue: createAgentQueue(),
    });
    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    return agentApiErrorResponse(error, "Market agent creation failed", 400);
  }
}
