import { NextResponse } from "next/server";
import { checkRateLimit, requireAppAuth } from "@/lib/api-security";
import { getDefaultRagService } from "@/rag/local-rag";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = requireAppAuth(request);
  if (auth) return auth;
  const limited = checkRateLimit(request, "rag-search", { limit: 120, windowMs: 60_000 });
  if (limited) return limited;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    return NextResponse.json({ code: "BAD_REQUEST", message: "query is required." }, { status: 400 });
  }
  const hits = await getDefaultRagService().search({
    query,
    topK: Number.isFinite(Number(body.topK)) ? Number(body.topK) : 8,
    filters: body.filters && typeof body.filters === "object" && !Array.isArray(body.filters) ? body.filters as Record<string, string | number | boolean | null> : undefined,
  });
  return NextResponse.json({ hits });
}
