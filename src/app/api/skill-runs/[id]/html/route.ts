import { NextResponse } from "next/server";
import { checkRateLimit, requireAppAuth } from "@/lib/api-security";
import { getSkillRun } from "@/lib/repositories";
import { normalizeSkillOutput } from "@/skills/output";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAppAuth(request);
  if (auth) return auth;
  const limited = checkRateLimit(request, "skill-html", { limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const { id } = await params;
  const run = await getSkillRun(id);
  if (!run) {
    return NextResponse.json({ error: "SkillRun not found" }, { status: 404 });
  }

  const outputHtml = stringOrNull(run.outputHtml) ?? normalizeSkillOutput(stringOrNull(run.outputMarkdown) ?? "").outputHtml;
  if (!outputHtml) {
    return NextResponse.json({ error: "HTML output not found" }, { status: 404 });
  }

  return new Response(outputHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": [
        "default-src 'none'",
        "style-src 'unsafe-inline'",
        "img-src data:",
        "script-src 'none'",
        "connect-src 'none'",
        "form-action 'none'",
        "base-uri 'none'",
        "frame-ancestors 'self'",
        "sandbox allow-same-origin",
      ].join("; "),
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}
