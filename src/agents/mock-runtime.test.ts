import { describe, expect, it } from "vitest";
import { createMockAgentRuntime, createMockToolRegistry, isAgentMockMode } from "@/agents/mock-runtime";

describe("mock agent runtime", () => {
  it("detects mock mode from env", () => {
    expect(isAgentMockMode({ AGENT_MOCK_MODE: "1" } as NodeJS.ProcessEnv)).toBe(true);
    expect(isAgentMockMode({ AGENT_MOCK_MODE: "0" } as NodeJS.ProcessEnv)).toBe(false);
  });

  it("returns deterministic model output without external LLM", async () => {
    const runtime = createMockAgentRuntime({ AGENT_MOCK_MODE: "1", MOCK_MODEL_OUTPUT: "稳定 mock 输出" } as NodeJS.ProcessEnv);
    const output = await runtime.modelProvider.streamMarkdown("prompt", { agentRunId: "run-1" });

    expect(output).toBe("稳定 mock 输出");
    await expect(runtime.queue.enqueue({ runId: "run-1", agentKey: "research-router-agent", sessionId: "session-1" })).resolves.toEqual({
      id: "local-no-redis-run-1",
    });
  });

  it("records mock tool calls and supports empty evidence mode", async () => {
    const calls: unknown[] = [];
    const registry = createMockToolRegistry({ emptyEvidence: true });
    const result = await registry.call("stock.briefItems", { stockCode: "600519" }, {
      agentRunId: "run-1",
      sessionId: "session-1",
      agentKey: "research-router-agent",
      async recordToolCall(data) {
        calls.push(data);
        return { id: "tool-call-1" };
      },
    });

    expect(result.data).toEqual([]);
    expect(calls).toEqual([
      expect.objectContaining({
        agentRunId: "run-1",
        toolKey: "stock.briefItems",
        inputJson: { stockCode: "600519" },
        status: "completed",
      }),
    ]);
  });
});
