import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/agent-health/route";
import { inspectInfrastructureReadiness } from "@/lib/infra-readiness";

vi.mock("@/lib/infra-readiness", () => ({
  inspectInfrastructureReadiness: vi.fn(),
}));

const readyReport = {
  ok: true,
  database: { ok: true, message: "Database ready." },
  migrations: { ok: true, message: "Migrations ready." },
  pgvector: { ok: true, message: "pgvector ready." },
  checkpointer: { ok: true, message: "Checkpointer ready." },
  redis: { ok: true, message: "Redis ready." },
  worker: { ok: true, message: "Worker ready." },
};

describe("GET /api/agent-health", () => {
  beforeEach(() => {
    vi.mocked(inspectInfrastructureReadiness).mockReset();
  });

  it("returns HTTP 200 only when every readiness check passes", async () => {
    vi.mocked(inspectInfrastructureReadiness).mockResolvedValue(readyReport);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({ ok: true, status: "ready", pgvector: { ok: true } });
    expect(body.checkedAt).toEqual(expect.any(String));
  });

  it("returns HTTP 503 when a dependency is reachable but not ready", async () => {
    vi.mocked(inspectInfrastructureReadiness).mockResolvedValue({
      ...readyReport,
      ok: false,
      migrations: { ok: false, message: "Missing applied migrations." },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      status: "not_ready",
      migrations: { ok: false },
    });
  });

  it("returns a sanitized HTTP 503 response if readiness inspection throws", async () => {
    vi.mocked(inspectInfrastructureReadiness).mockRejectedValue(
      new Error("postgresql://alice:super-secret@database:5432/research"),
    );

    const response = await GET();
    const serialized = JSON.stringify(await response.json());

    expect(response.status).toBe(503);
    expect(serialized).toContain("Infrastructure readiness inspection failed.");
    expect(serialized).not.toContain("super-secret");
  });
});
