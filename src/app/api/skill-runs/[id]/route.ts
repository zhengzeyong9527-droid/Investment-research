import { NextResponse } from "next/server";
import { getSkillRun } from "@/lib/repositories";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getSkillRun(id);
  if (!run) {
    return NextResponse.json({ error: "SkillRun 不存在" }, { status: 404 });
  }
  return NextResponse.json(run);
}
