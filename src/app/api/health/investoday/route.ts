import { NextResponse } from "next/server";
import { checkInvestodayHealth } from "@/lib/investoday";

export async function GET() {
  return NextResponse.json(await checkInvestodayHealth());
}
