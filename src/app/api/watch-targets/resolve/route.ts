import { NextResponse } from "next/server";
import { InvestodayDataAdapter } from "@/lib/investoday";
import { agentApiErrorResponse } from "@/lib/agent-api-errors";
import { withApiSecurity } from "@/lib/api-security";

export async function POST(request: Request) {
  const security = withApiSecurity(request);
  if (security) return security;
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
    return agentApiErrorResponse(error, "股票代码解析失败", 400);
  }
}
