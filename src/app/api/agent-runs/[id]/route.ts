import { NextResponse } from "next/server";
import { getAgentRun } from "@/lib/repositories";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getAgentRun(id);
  if (!run) {
    return NextResponse.json({ error: "Agent 任务不存在" }, { status: 404 });
  }
  return NextResponse.json(run);
}
