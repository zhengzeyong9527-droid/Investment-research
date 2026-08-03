import { NextResponse } from "next/server";
import { agentApiErrorResponse } from "@/lib/agent-api-errors";
import { withApiSecurity } from "@/lib/api-security";
import { PrismaAgentRunRepository } from "@/lib/repositories";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const security = withApiSecurity(request);
  if (security) return security;
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const feedback = await new PrismaAgentRunRepository().createFeedback({
      runId: id,
      rating: Number(body.rating ?? 0),
      comment: String(body.comment ?? ""),
      tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    });
    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    return agentApiErrorResponse(error, "Feedback creation failed", 400);
  }
}
