import net from "node:net";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const redisUrl = process.env.REDIS_URL ?? "";
  const [database, redis] = await Promise.all([
    checkTcpUrl(databaseUrl, 5432, "DATABASE_URL"),
    checkTcpUrl(redisUrl, 6379, "REDIS_URL"),
  ]);

  return NextResponse.json({
    ok: database.ok && redis.ok,
    database,
    redis,
    commands: ["pnpm services:start", "pnpm db:push", "pnpm worker:agent", "pnpm dev"],
  });
}

async function checkTcpUrl(value: string, fallbackPort: number, label: string) {
  if (!value) {
    return { ok: false, label, target: "", message: `${label} is not configured` };
  }

  try {
    const url = new URL(value);
    const host = url.hostname || "localhost";
    const port = Number(url.port || fallbackPort);
    const ok = await checkPort(host, port, 700);
    return {
      ok,
      label,
      target: `${host}:${port}`,
      message: ok ? `${label} can connect to ${host}:${port}` : `${label} cannot connect to ${host}:${port}`,
    };
  } catch {
    return { ok: false, label, target: maskUrl(value), message: `${label} is not a valid URL` };
  }
}

function checkPort(host: string, port: number, timeoutMs: number) {
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;

    function finish(ok: boolean) {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    }

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function maskUrl(value: string) {
  return value.replace(/\/\/([^:@/]+):([^@/]+)@/, "//$1:***@");
}
