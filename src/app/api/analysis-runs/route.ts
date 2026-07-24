import { NextResponse } from "next/server";
import { createAnalysisPlaceholder } from "@/lib/analysis";
import { ensureDefaultSkills } from "@/lib/skills";
import { PrismaAnalysisRepository } from "@/lib/repositories";

export async function POST(request: Request) {
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "分析占位记录创建失败" },
      { status: 400 }
    );
  }
}
