import { NextResponse } from "next/server";
import { createAnalysisPlaceholder } from "@/lib/analysis";
import { agentApiErrorResponse } from "@/lib/agent-api-errors";
import { withApiSecurity } from "@/lib/api-security";
import { ensureDefaultSkills } from "@/lib/skills";
import { PrismaAnalysisRepository } from "@/lib/repositories";

export async function POST(request: Request) {
  const security = withApiSecurity(request);
  if (security) return security;
  try {
    await ensureDefaultSkills();
    const body = await request.json();
    const run = await createAnalysisPlaceholder({
      skillKey: body.skillKey,
      targetId: body.targetId,
      briefItemId: body.briefItemId,
      dailyBriefId: body.dailyBriefId,
      context: body.context ?? {},
      repository: new PrismaAnalysisRepository(),
    });
    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    return agentApiErrorResponse(error, "分析占位记录创建失败", 400);
  }
}
