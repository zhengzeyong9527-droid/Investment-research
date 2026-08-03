import { NextResponse } from "next/server";
import { agentApiErrorResponse } from "@/lib/agent-api-errors";
import { withApiSecurity } from "@/lib/api-security";
import { generateDailyBrief } from "@/lib/briefs";
import { shanghaiDateString } from "@/lib/date";
import { InvestodayDataAdapter } from "@/lib/investoday";
import { PrismaDailyBriefRepository } from "@/lib/repositories";

export async function POST(request: Request) {
  const security = withApiSecurity(request);
  if (security) return security;
  try {
    const body = await request.json().catch(() => ({}));
    const now = new Date();
    const brief = await generateDailyBrief({
      briefDate: body.briefDate ?? shanghaiDateString(now),
      now,
      windowHours: Number(body.windowHours ?? 24),
      repository: new PrismaDailyBriefRepository(),
      adapter: new InvestodayDataAdapter(),
    });
    return NextResponse.json(brief);
  } catch (error) {
    return agentApiErrorResponse(error, "自选速览生成失败", 500);
  }
}
