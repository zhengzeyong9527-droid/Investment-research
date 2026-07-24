import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDefaultSkills } from "@/lib/skills";

export async function GET() {
  await ensureDefaultSkills();
  const skills = await prisma.skillEntry.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json(skills);
}
