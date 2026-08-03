import { NextResponse } from "next/server";

type RateBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateBucket>();

export type ApiSecurityOptions = {
  auth?: boolean;
  rateLimit?: { key: string; limit: number; windowMs: number };
  env?: Partial<Pick<NodeJS.ProcessEnv, "APP_AUTH_TOKEN" | "NODE_ENV">>;
};

export function withApiSecurity(request: Request, options: ApiSecurityOptions = {}) {
  if (options.auth !== false) {
    const auth = requireAppAuth(request, options.env);
    if (auth) return auth;
  }
  if (options.rateLimit) {
    return checkRateLimit(request, options.rateLimit.key, options.rateLimit);
  }
  return null;
}

export function requireAppAuth(request: Request, env: Partial<Pick<NodeJS.ProcessEnv, "APP_AUTH_TOKEN" | "NODE_ENV">> = process.env) {
  const token = env.APP_AUTH_TOKEN?.trim();
  if (!token || env.NODE_ENV === "test") return null;
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const altHeader = request.headers.get("x-app-auth-token")?.trim();
  if (header === token || altHeader === token) return null;
  return NextResponse.json({ code: "UNAUTHORIZED", message: "Missing or invalid app auth token." }, { status: 401 });
}

export function checkRateLimit(request: Request, key: string, options: { limit: number; windowMs: number }) {
  const identity = `${key}:${clientIp(request)}`;
  const now = Date.now();
  const bucket = buckets.get(identity);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(identity, { count: 1, resetAt: now + options.windowMs });
    return null;
  }
  bucket.count += 1;
  if (bucket.count <= options.limit) return null;
  return NextResponse.json(
    { code: "RATE_LIMITED", message: "Too many requests. Please retry later.", retryAfterMs: bucket.resetAt - now },
    { status: 429 }
  );
}

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "local"
  );
}
