import { NextResponse } from "next/server";
import { agentApiErrorResponse } from "@/lib/agent-api-errors";
import { withApiSecurity } from "@/lib/api-security";
import { listEvidenceRecords } from "@/lib/repositories";

export async function GET(request: Request) {
  const security = withApiSecurity(request);
  if (security) return security;
  try {
    const url = new URL(request.url);
    const agentRunId = url.searchParams.get("agentRunId");
    if (!agentRunId) {
      return NextResponse.json({ error: "agentRunId 为必填项" }, { status: 400 });
    }
    return NextResponse.json(await listEvidenceRecords(agentRunId));
  } catch (error) {
    return agentApiErrorResponse(error, "Evidence records loading failed", 500);
  }
}
