import { NextResponse } from "next/server";
import { agentApiErrorResponse } from "@/lib/agent-api-errors";
import { withApiSecurity } from "@/lib/api-security";
import { getAgentRun } from "@/lib/repositories";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const security = withApiSecurity(request);
  if (security) return security;
  try {
    const { id } = await params;
    const run = await getAgentRun(id);
    if (!run) {
      return NextResponse.json({ error: "Agent 任务不存在" }, { status: 404 });
    }
    return NextResponse.json(run);
  } catch (error) {
    return agentApiErrorResponse(error, "Agent run loading failed", 500);
  }
}
