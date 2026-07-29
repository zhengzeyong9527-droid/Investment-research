import { NextResponse } from "next/server";
import { fetchHotspotList, type HotspotOrder, type HotspotType } from "@/lib/hotspots";

export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  try {
    const { type } = await params;
    if (!isHotspotType(type)) {
      return NextResponse.json({ error: "热点类型不支持" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const order = searchParams.get("order") ?? "desc";
    if (!isHotspotOrder(order)) {
      return NextResponse.json({ error: "排序参数不支持" }, { status: 400 });
    }

    const pageSize = positiveNumber(searchParams.get("pageSize")) ?? (type === "industry" ? 40 : 1000);
    return NextResponse.json(await fetchHotspotList({ type, order, pageSize }));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "热点列表获取失败" },
      { status: 500 }
    );
  }
}

function isHotspotType(type: string): type is HotspotType {
  return type === "industry" || type === "concept";
}

function isHotspotOrder(order: string): order is HotspotOrder {
  return order === "asc" || order === "desc";
}

function positiveNumber(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
