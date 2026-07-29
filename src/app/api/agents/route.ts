import { NextResponse } from "next/server";
import { listAgentManifests } from "@/agents/registry";

export async function GET() {
  return NextResponse.json(listAgentManifests());
}
