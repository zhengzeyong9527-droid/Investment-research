import { describe, expect, it } from "vitest";
import { AGENT_DB_UNAVAILABLE_CODE, createAgentApiError } from "@/lib/agent-api-errors";

describe("agent API errors", () => {
  it("maps Prisma connection failures to an unavailable agent database response", () => {
    const { payload, status } = createAgentApiError(
      new Error("Invalid `prisma.agentSession.create()` invocation: Can't reach database server at `localhost:5432`")
    );

    expect(status).toBe(503);
    expect(payload.code).toBe(AGENT_DB_UNAVAILABLE_CODE);
    expect(payload.retryable).toBe(true);
    expect(payload.message).toContain("Agent 数据库未连接");
  });
});
