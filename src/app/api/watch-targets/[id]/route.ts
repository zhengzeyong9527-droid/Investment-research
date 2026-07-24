import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateWatchTarget } from "@/lib/repositories";
import { parseWatchTargetInput } from "@/lib/watch-targets";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.watchTarget.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "自选对象不存在" }, { status: 404 });
    }
    const parsed = parseWatchTargetInput({
      type: body.type ?? existing.type,
      code: body.code ?? existing.code,
      name: body.name ?? existing.name,
      tags: body.tags ?? existing.tags,
      reason: body.reason ?? existing.reason,
      enabled: body.enabled ?? existing.enabled,
    });
    return NextResponse.json(await updateWatchTarget(id, parsed));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "自选对象更新失败" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.watchTarget.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
