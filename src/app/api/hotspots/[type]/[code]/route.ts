import { NextResponse } from "next/server";
import { fetchHotspotDetail, type HotspotType } from "@/lib/hotspots";

export async function GET(_request: Request, { params }: { params: Promise<{ type: string; code: string }> }) {
  try {
    const { type, code } = await params;
    if (!isHotspotType(type)) {
      return NextResponse.json({ error: "热点类型不支持" }, { status: 400 });
    }
    return NextResponse.json(await fetchHotspotDetail({ type, code }));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "热点详情获取失败" },
      { status: 500 }
    );
  }
}

function isHotspotType(type: string): type is HotspotType {
  return type === "industry" || type === "concept";
}
