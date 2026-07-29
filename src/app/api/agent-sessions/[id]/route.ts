import { NextResponse } from "next/server";
import { agentApiErrorResponse } from "@/lib/agent-api-errors";
import { getAgentSessionDetail } from "@/lib/repositories";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getAgentSessionDetail(id);
    if (!session) {
      return NextResponse.json({ error: "Agent session not found" }, { status: 404 });
    }
    return NextResponse.json(session);
  } catch (error) {
    return agentApiErrorResponse(error, "Agent session loading failed", 500);
  }
}
