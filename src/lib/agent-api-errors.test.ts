import { describe, expect, it } from "vitest";
import { AGENT_DB_UNAVAILABLE_CODE, AGENT_QUEUE_UNAVAILABLE_CODE, createAgentApiError } from "@/lib/agent-api-errors";

describe("agent API errors", () => {
  it("maps Prisma connection failures to an unavailable agent database response", () => {
    const { payload, status } = createAgentApiError(
      new Error("Invalid `prisma.agentSession.create()` invocation: Can't reach database server at `localhost:5432`")
    );

    expect(status).toBe(503);
    expect(payload.code).toBe(AGENT_DB_UNAVAILABLE_CODE);
    expect(payload.retryable).toBe(true);
    expect(payload.category).toBe("infra");
    expect(payload.message).toContain("Agent 数据库未连接");
  });

  it("maps Redis queue failures to an unavailable queue response", () => {
    const { payload, status } = createAgentApiError(new Error("AGENT_QUEUE_UNAVAILABLE: REDIS_URL is required"));

    expect(status).toBe(503);
    expect(payload.code).toBe(AGENT_QUEUE_UNAVAILABLE_CODE);
    expect(payload.category).toBe("infra");
    expect(payload.retryable).toBe(true);
  });

  it("maps model balance, auth, and rate-limit errors to model categories", () => {
    expect(createAgentApiError(new Error("Insufficient Balance")).payload).toMatchObject({
      code: "MODEL_INSUFFICIENT_BALANCE",
      category: "model",
      retryable: false,
    });
    expect(createAgentApiError(new Error("Invalid API key")).payload).toMatchObject({
      code: "MODEL_AUTH_FAILED",
      category: "model",
      retryable: false,
    });
    expect(createAgentApiError(new Error("rate limit exceeded 429")).payload).toMatchObject({
      code: "MODEL_RATE_LIMITED",
      category: "model",
      retryable: true,
    });
  });
});
