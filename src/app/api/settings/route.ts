import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/repositories";

export async function GET() {
  return NextResponse.json(await getSettings());
}

export async function PATCH(request: Request) {
  return NextResponse.json(await updateSettings(await request.json()));
}
