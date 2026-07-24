import { NextResponse } from "next/server";
import { getSkillCatalog } from "@/lib/skill-catalog";

export async function GET() {
  return NextResponse.json(getSkillCatalog());
}
