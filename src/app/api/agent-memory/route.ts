import { NextResponse } from "next/server";
import { agentApiErrorResponse } from "@/lib/agent-api-errors";
import { DEFAULT_AGENT_USER_ID } from "@/agents/memory";
import { withApiSecurity } from "@/lib/api-security";
import { listAgentMemory } from "@/lib/repositories";

export async function GET(request: Request) {
  const security = withApiSecurity(request);
  if (security) return security;
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "active";
    const query = url.searchParams.get("q") ?? undefined;
    return NextResponse.json(await listAgentMemory({ userId: DEFAULT_AGENT_USER_ID, status, query }));
  } catch (error) {
    return agentApiErrorResponse(error, "Agent memory loading failed", 500);
  }
}
