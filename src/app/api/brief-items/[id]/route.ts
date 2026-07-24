import { NextResponse } from "next/server";
import { getBriefItemDetail } from "@/lib/repositories";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getBriefItemDetail(id);
  if (!item) {
    return NextResponse.json({ error: "内容不存在" }, { status: 404 });
  }
  return NextResponse.json(item);
}
