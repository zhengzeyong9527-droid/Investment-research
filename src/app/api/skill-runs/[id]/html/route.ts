import { NextResponse } from "next/server";
import { getSkillRun } from "@/lib/repositories";
import { normalizeSkillOutput } from "@/skills/output";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    },
  });
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}
