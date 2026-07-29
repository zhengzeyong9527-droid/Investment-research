import { describe, expect, it, vi } from "vitest";
import { createAgentRunTask } from "@/agents/runs";

describe("agent run task creation", () => {
  it("creates a session and run before enqueueing worker execution", async () => {
    const repository = {
      createAgentSession: vi.fn(async (data) => ({ id: "session-1", ...data })),
      createAgentRun: vi.fn(async (data) => ({ id: "run-1", ...data })),
      appendAgentStep: vi.fn(async (data) => ({ id: "step-1", ...data })),
    };
    const queue = {
      enqueue: vi.fn(async (job) => ({ id: "job-1", ...job })),
    };

    const result = await createAgentRunTask({
      agentKey: "market-broadcast-agent",
      question: "生成盘面播报",
      inputPayload: { indexCode: "000001" },
      triggerType: "manual",
      repository,
      queue,
    });

    expect(result).toMatchObject({
      id: "run-1",
      agentKey: "market-broadcast-agent",
      sessionId: "session-1",
      status: "created",
    });
    expect(repository.createAgentSession).toHaveBeenCalledWith(
      expect.objectContaining({ entry: "market", title: "生成盘面播报" })
    );
    expect(queue.enqueue).toHaveBeenCalledWith({
      runId: "run-1",
      agentKey: "market-broadcast-agent",
      sessionId: "session-1",
    });
    expect(repository.appendAgentStep).toHaveBeenCalledWith(
      expect.objectContaining({ agentRunId: "run-1", nodeKey: "enqueue", status: "completed" })
    );
  });

  it("reuses an existing session when a chat turn passes sessionId", async () => {
    const repository = {
      createAgentSession: vi.fn(async (data) => ({ id: "new-session", ...data })),
      touchAgentSession: vi.fn(async () => ({ id: "session-existing" })),
      createAgentRun: vi.fn(async (data) => ({ id: "run-2", ...data })),
      appendAgentStep: vi.fn(async (data) => ({ id: "step-2", ...data })),
    };
    const queue = {
      enqueue: vi.fn(async (job) => ({ id: "job-2", ...job })),
    };

    const result = await createAgentRunTask({
      agentKey: "research-router-agent",
      sessionId: "session-existing",
      question: "continue the prior research",
      inputPayload: {},
      triggerType: "manual",
      repository,
      queue,
    });

    expect(result).toMatchObject({
      id: "run-2",
      sessionId: "session-existing",
      triggerType: "manual",
    });
    expect(repository.createAgentSession).not.toHaveBeenCalled();
    expect(repository.touchAgentSession).toHaveBeenCalledWith("session-existing");
    expect(queue.enqueue).toHaveBeenCalledWith({
      runId: "run-2",
      agentKey: "research-router-agent",
      sessionId: "session-existing",
    });
  });

  it("stores the selected ability as the initial skill when chat overrides auto routing", async () => {
    const repository = {
      createAgentSession: vi.fn(async (data) => ({ id: "session-3", ...data })),
      createAgentRun: vi.fn(async (data) => ({ id: "run-3", ...data })),
      appendAgentStep: vi.fn(async (data) => ({ id: "step-3", ...data })),
    };
    const queue = {
      enqueue: vi.fn(async (job) => ({ id: "job-3", ...job })),
    };

    await createAgentRunTask({
      agentKey: "research-router-agent",
      question: "600519 report",
      inputPayload: {},
      triggerType: "manual",
      abilityKey: "investoday-research-report-analysis",
      repository,
      queue,
    });

    expect(repository.createAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        skillKey: "investoday-research-report-analysis",
        inputPayload: expect.objectContaining({ abilityKey: "investoday-research-report-analysis" }),
      })
    );
  });
});
