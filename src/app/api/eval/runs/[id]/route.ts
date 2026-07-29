import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAppAuth } from "@/lib/api-security";
import { smokeEvalCases } from "@/eval/runner";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAppAuth(request);
  if (auth) return auth;
  const { id } = await params;
  const reportPath = path.join(process.cwd(), "eval-report.json");
  if (id === "latest" && existsSync(reportPath)) {
    return NextResponse.json(JSON.parse(readFileSync(reportPath, "utf8")));
  }
  return NextResponse.json({
    id,
    cases: smokeEvalCases().map((item) => ({
      id: item.id,
      agentKey: item.agentKey,
      name: item.name,
      tags: item.tags,
    })),
  });
}
