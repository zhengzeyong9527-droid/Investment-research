import { NextResponse } from "next/server";
import { fetchHotspots } from "@/lib/hotspots";

export async function GET() {
  try {
    return NextResponse.json(await fetchHotspots());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "热点数据获取失败" },
      { status: 500 }
    );
  }
}
