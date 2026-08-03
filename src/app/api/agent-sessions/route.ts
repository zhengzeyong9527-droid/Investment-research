import { NextResponse } from "next/server";
import { agentApiErrorResponse } from "@/lib/agent-api-errors";
import { withApiSecurity } from "@/lib/api-security";
import { createAgentSession, listAgentSessions } from "@/lib/repositories";

export async function GET(request: Request) {
  const security = withApiSecurity(request);
  if (security) return security;
  try {
    const url = new URL(request.url);
    return NextResponse.json(await listAgentSessions(url.searchParams.get("q") ?? undefined));
  } catch (error) {
    return agentApiErrorResponse(error, "Agent sessions loading failed", 500);
  }
}

export async function POST(request: Request) {
  const security = withApiSecurity(request);
  if (security) return security;
  try {
    const body = await request.json().catch(() => ({}));
    const session = await createAgentSession({
      userId: body.userId,
      title: typeof body.title === "string" ? body.title : undefined,
      entry: body.entry === "market" ? "market" : "research",
    });
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return agentApiErrorResponse(error, "Agent session creation failed", 400);
  }
}
