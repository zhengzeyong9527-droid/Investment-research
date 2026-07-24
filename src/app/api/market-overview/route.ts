import { NextResponse } from "next/server";
import { fetchMarketOverview } from "@/lib/market-overview";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const overview = await fetchMarketOverview({ indexCode: searchParams.get("indexCode") ?? undefined });
    return NextResponse.json(overview);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "大盘数据获取失败" },
      { status: 500 }
    );
  }
}
