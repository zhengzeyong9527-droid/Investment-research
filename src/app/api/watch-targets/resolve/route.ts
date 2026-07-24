import { NextResponse } from "next/server";
import { InvestodayDataAdapter } from "@/lib/investoday";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const adapter = new InvestodayDataAdapter();
    const type = body.type === "sector" ? "sector" : "stock";
    const resolved =
      type === "sector"
        ? await adapter.resolveSector({ code: body.code, name: body.name })
        : await adapter.resolveStock({ code: body.code, name: body.name });
    return NextResponse.json(resolved);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "股票代码解析失败" },
      { status: 400 }
    );
  }
}
