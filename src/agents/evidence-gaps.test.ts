import { describe, expect, it, vi } from "vitest";
import { executeAgentRunJob, type AgentRuntimeRepository, type ExecutableAgentRun } from "@/agents/executor";
import { StaticModelProvider } from "@/agents/model-provider";
import { mockToolCall } from "@/test/agent-fixtures";
import type { ToolRegistry } from "@/tools/types";

describe("agent evidence gaps", () => {
  it("records failed tool calls as evidence gaps instead of silently treating them as empty data", async () => {
    const repository = createRepository();
    const toolRegistry = createFailingToolRegistry();
    const modelProvider = new StaticModelProvider("should not produce a confident report");
    modelProvider.streamMarkdown = vi.fn(modelProvider.streamMarkdown);
    const run: ExecutableAgentRun = {
      id: "run-gap",
      agentKey: "research-router-agent",
      sessionId: "session-gap",
      question: "研究贵州茅台近30天风险",
      skillKey: "investoday-stock-research-interpretation",
      inputPayload: { stockCodeOrName: "600519" },
    };

    await executeAgentRunJob({ run, repository, toolRegistry, modelProvider });

    expect(finalRunUpdate(repository)).toMatchObject({
      status: "completed",
      outputJson: expect.objectContaining({
        evidenceGaps: [expect.objectContaining({ toolKey: "stock.briefItems", reason: expect.stringContaining("upstream timeout") })],
        evidenceGrade: expect.objectContaining({ passed: false }),
      }),
    });
    expect(modelProvider.streamMarkdown).not.toHaveBeenCalled();
  });
});

function createRepository(): AgentRuntimeRepository {
  return {
    updateAgentRun: vi.fn(async () => ({})),
    appendAgentStep: vi.fn(async () => ({ id: "step-1" })),
    listRecentAgentMessages: vi.fn(async () => []),
    listRecentAgentRunInputs: vi.fn(async () => []),
    appendAgentMessage: vi.fn(async () => ({ id: "message-1" })),
    createSkillRun: vi.fn(async () => ({ id: "skill-run-1" })),
    updateSkillRun: vi.fn(async () => ({})),
    recordToolCall: vi.fn(async () => ({ id: "tool-call-1" })),
    recordModelCall: vi.fn(async () => ({ id: "model-call-1" })),
    writeEvidence: vi.fn(async () => ({})),
    writeMemoryItem: vi.fn(async () => ({})),
  };
}

function createFailingToolRegistry(): ToolRegistry {
  return {
    list: vi.fn(() => []),
    get: vi.fn((toolKey) => ({
      toolKey,
      description: toolKey,
      sourceEndpoint: toolKey,
      riskLevel: "read" as const,
      timeoutMs: 1000,
      retry: 0,
    })),
    call: mockToolCall(async (toolKey) => {
      if (toolKey === "memory.search") return { toolCallId: "tool-memory", data: [] };
      if (toolKey === "stock.resolve") return { toolCallId: "tool-resolve", data: { code: "600519", name: "贵州茅台", type: "stock" } };
      if (toolKey === "entity.recognition") return { toolCallId: "tool-entity", data: { code: "600519", name: "贵州茅台", type: "stock" } };
      if (toolKey === "stock.briefItems") throw new Error("upstream timeout");
      return { toolCallId: `tool-${toolKey}`, data: [] };
    }),
  };
}

function finalRunUpdate(repository: AgentRuntimeRepository) {
  const calls = vi.mocked(repository.updateAgentRun).mock.calls;
  return calls.at(-1)?.[1];
}
