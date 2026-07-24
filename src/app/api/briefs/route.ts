import { NextResponse } from "next/server";
import { shanghaiDateString } from "@/lib/date";
import { getBriefByDate } from "@/lib/repositories";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const briefDate = url.searchParams.get("date") ?? shanghaiDateString();
  return NextResponse.json(await getBriefByDate(briefDate));
}
