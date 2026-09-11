import { NextResponse } from "next/server";
import { inspectInfrastructureReadiness } from "@/lib/infra-readiness";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const report = await inspectInfrastructureReadiness({
      databaseUrl: process.env.DATABASE_URL,
      redisUrl: process.env.REDIS_URL,
      workerHeartbeatKey: process.env.WORKER_HEARTBEAT_KEY,
    });

    return NextResponse.json(
      {
        ...report,
        status: report.ok ? "ready" : "not_ready",
        checkedAt: new Date().toISOString(),
      },
      {
        status: report.ok ? 200 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "not_ready",
        checkedAt: new Date().toISOString(),
        message: "Infrastructure readiness inspection failed.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
