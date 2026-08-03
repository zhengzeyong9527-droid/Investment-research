import { describe, expect, it } from "vitest";
import { requireAppAuth, withApiSecurity } from "@/lib/api-security";

describe("api security", () => {
  it("requires an app token outside test mode when one is configured", async () => {
    const request = new Request("http://localhost/api/agent-runs", { method: "POST" });
    const response = requireAppAuth(request, { APP_AUTH_TOKEN: "secret", NODE_ENV: "production" });

    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("accepts bearer and alternate app auth token headers", () => {
    const bearer = new Request("http://localhost/api/agent-runs", {
      headers: { authorization: "Bearer secret" },
    });
    const alternate = new Request("http://localhost/api/agent-runs", {
      headers: { "x-app-auth-token": "secret" },
    });
    const env = { APP_AUTH_TOKEN: "secret", NODE_ENV: "production" as const };

    expect(requireAppAuth(bearer, env)).toBeNull();
    expect(requireAppAuth(alternate, env)).toBeNull();
  });

  it("keeps test mode routes easy to exercise", () => {
    const request = new Request("http://localhost/api/agent-runs");

    expect(withApiSecurity(request, { env: { APP_AUTH_TOKEN: "secret", NODE_ENV: "test" } })).toBeNull();
  });
});
