import { NextResponse } from "next/server";
import { listBriefHistory } from "@/lib/repositories";

export async function GET() {
  return NextResponse.json(await listBriefHistory());
}
