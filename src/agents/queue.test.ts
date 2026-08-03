import { describe, expect, it } from "vitest";
import { AgentQueueUnavailableError, createAgentQueue } from "@/agents/queue";

describe("agent queue", () => {
  it("fails fast without Redis outside mock mode", () => {
    expect(() => createAgentQueue("", { AGENT_MOCK_MODE: "0" })).toThrow(AgentQueueUnavailableError);
  });

  it("allows a local no-redis queue only in mock mode", async () => {
    const queue = createAgentQueue("", { AGENT_MOCK_MODE: "1" });

    await expect(
      queue.enqueue({ runId: "run-1", agentKey: "research-router-agent", sessionId: "session-1" })
    ).resolves.toEqual({ id: "local-no-redis-run-1" });
  });
});
