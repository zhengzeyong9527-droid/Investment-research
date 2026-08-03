import { NextResponse } from "next/server";
import { InvestodayDataAdapter } from "@/lib/investoday";
import { agentApiErrorResponse } from "@/lib/agent-api-errors";
import { withApiSecurity } from "@/lib/api-security";
import { createWatchTarget, listWatchTargets } from "@/lib/repositories";
import { normalizeWatchTargetForSave } from "@/lib/watch-targets";

export async function GET(request: Request) {
  const security = withApiSecurity(request);
  if (security) return security;
  return NextResponse.json(await listWatchTargets());
}

export async function POST(request: Request) {
  const security = withApiSecurity(request);
  if (security) return security;
  try {
    const body = await request.json();
    const input = await normalizeWatchTargetForSave(body, new InvestodayDataAdapter());
    const target = await createWatchTarget(input);
    return NextResponse.json(target, { status: 201 });
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return NextResponse.json({ error: "该自选对象已在自选池中" }, { status: 409 });
    }
    return agentApiErrorResponse(error, "自选对象保存失败", 400);
  }
}

function isPrismaUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
