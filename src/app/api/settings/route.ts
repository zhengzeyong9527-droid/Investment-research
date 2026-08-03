import { NextResponse } from "next/server";
import { agentApiErrorResponse } from "@/lib/agent-api-errors";
import { withApiSecurity } from "@/lib/api-security";
import { getSettings, updateSettings } from "@/lib/repositories";

export async function GET(request: Request) {
  const security = withApiSecurity(request);
  if (security) return security;
  try {
    return NextResponse.json(await getSettings());
  } catch (error) {
    return agentApiErrorResponse(error, "Settings loading failed", 500);
  }
}

export async function PATCH(request: Request) {
  const security = withApiSecurity(request);
  if (security) return security;
  try {
    return NextResponse.json(await updateSettings(await request.json()));
  } catch (error) {
    return agentApiErrorResponse(error, "Settings update failed", 400);
  }
}
