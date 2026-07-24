import { NextResponse } from "next/server";
import { generateDailyBrief } from "@/lib/briefs";
import { shanghaiDateString } from "@/lib/date";
import { InvestodayDataAdapter } from "@/lib/investoday";
import { PrismaDailyBriefRepository } from "@/lib/repositories";

export async function POST(request: Request) {
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "自选速览生成失败" },
      { status: 500 }
    );
  }
}
