import { NextResponse } from "next/server";
import { listEvidenceRecords } from "@/lib/repositories";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const agentRunId = url.searchParams.get("agentRunId");
  if (!agentRunId) {
    return NextResponse.json({ error: "agentRunId 为必填项" }, { status: 400 });
  }
  return NextResponse.json(await listEvidenceRecords(agentRunId));
}
