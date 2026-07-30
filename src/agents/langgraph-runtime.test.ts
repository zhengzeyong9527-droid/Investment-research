import { describe, expect, it, vi } from "vitest";
import { getAgentGraphNodeKeys, executeAgentGraphJob } from "@/agents/langgraph-runtime";
import { StaticModelProvider } from "@/agents/model-provider";
import type { AgentRuntimeRepository, ExecutableAgentRun } from "@/agents/executor";
import type { ToolRegistry } from "@/tools/types";

describe("langgraph runtime", () => {
  it("exposes a real research graph instead of a two-node shell", () => {
    expect(getAgentGraphNodeKeys("research-router-agent")).toEqual([
      "resolve_entity",
      "plan_intent",
      "retrieve_memory",
      "fetch_tools",
      "local_rag_retrieve",
      "grade_evidence",
      "generate",
      "verify",
      "persist",
    ]);
  });

  it("executes graph nodes and persists graph state metadata", async () => {
    const repository = createRepository();
    const run: ExecutableAgentRun = {
      id: "run-graph",
      agentKey: "research-router-agent",
      sessionId: "session-graph",
      question: "研究贵州茅台近30天风险",
      skillKey: "investoday-stock-research-interpretation",
      inputPayload: { stockCodeOrName: "600519" },
    };

    await executeAgentGraphJob({
      run,
      repository,
      toolRegistry: createToolRegistry(),
      modelProvider: new StaticModelProvider("graph answer"),
    });

    expect(vi.mocked(repository.appendAgentStep).mock.calls.map((call) => call[0].nodeKey)).toEqual(
      expect.arrayContaining(["resolve_entity", "plan_intent", "fetch_tools", "local_rag_retrieve", "generate", "persist"])
    );
    expect(finalRunUpdate(repository)).toMatchObject({
      status: "completed",
      outputJson: expect.objectContaining({
        graphState: expect.objectContaining({
          nodeKeys: expect.arrayContaining(["resolve_entity", "local_rag_retrieve", "persist"]),
        }),
      }),
    });
  });

  it("preserves prototype repository methods when graph state wrapping is enabled", async () => {
    const repository = new PrototypeRepository();
    const run: ExecutableAgentRun = {
      id: "run-graph-prototype",
      agentKey: "research-router-agent",
      sessionId: "session-graph",
      question: "研究贵州茅台近30天风险",
      skillKey: "investoday-stock-research-interpretation",
      inputPayload: { stockCodeOrName: "600519" },
      graphState: { nodeKeys: [], ragHits: [], evidenceGaps: [] },
    };

    await executeAgentGraphJob({
      run,
      repository,
      toolRegistry: createToolRegistry(),
      modelProvider: new StaticModelProvider("graph answer"),
    });

    expect(repository.steps.map((step) => step.nodeKey)).toContain("local_rag_retrieve");
    expect(repository.updates.at(-1)).toMatchObject({
      status: "completed",
      outputJson: expect.objectContaining({
        graphState: expect.objectContaining({
          nodeKeys: expect.arrayContaining(["resolve_entity", "persist"]),
        }),
      }),
    });
  });

  it("persists successful local RAG hits into graph state", async () => {
    const repository = createRepository();
    const run: ExecutableAgentRun = {
      id: "run-graph-rag",
      agentKey: "research-router-agent",
      sessionId: "session-graph-rag",
      question: "引用本地文档回答贵州茅台渠道风险",
      skillKey: "investoday-stock-research-interpretation",
      inputPayload: { stockCodeOrName: "600519" },
    };

    await executeAgentGraphJob({
      run,
      repository,
      toolRegistry: createToolRegistry(),
      modelProvider: new StaticModelProvider("graph answer"),
    });

    expect(finalRunUpdate(repository)).toMatchObject({
      outputJson: expect.objectContaining({
        graphState: expect.objectContaining({
          ragHits: expect.arrayContaining([
            expect.objectContaining({ title: "茅台风险", content: "批价风险" }),
          ]),
          toolResults: expect.arrayContaining([expect.objectContaining({ toolKey: "rag.search", ok: true })]),
        }),
      }),
    });
  });

  it("persists local RAG hits before generation so model failures remain diagnosable", async () => {
    const repository = createRepository();
    const run: ExecutableAgentRun = {
      id: "run-graph-rag-failed-model",
      agentKey: "research-router-agent",
      sessionId: "session-graph-rag-failed-model",
      question: "引用本地文档回答贵州茅台渠道风险",
      skillKey: "investoday-stock-research-interpretation",
      inputPayload: { stockCodeOrName: "600519" },
    };
    const failingModelProvider = {
      configured: true,
      model: "failing-model",
      chatMarkdown: vi.fn(async () => {
        throw new Error("model down");
      }),
      streamMarkdown: vi.fn(async () => {
        throw new Error("model down");
      }),
      chatJson: vi.fn(async () => {
        throw new Error("model down");
      }),
    };

    await expect(
      executeAgentGraphJob({
        run,
        repository,
        toolRegistry: createToolRegistry(),
        modelProvider: failingModelProvider,
      })
    ).rejects.toThrow("model down");

    expect(vi.mocked(repository.updateAgentRun)).toHaveBeenCalledWith(
      run.id,
      expect.objectContaining({
        outputJson: expect.objectContaining({
          ragHits: expect.arrayContaining([
            expect.objectContaining({ title: "茅台风险", content: "批价风险" }),
          ]),
          graphState: expect.objectContaining({
            ragHits: expect.arrayContaining([
              expect.objectContaining({ title: "茅台风险", content: "批价风险" }),
            ]),
          }),
        }),
      })
    );
    expect(finalRunUpdate(repository)).toMatchObject({ status: "failed" });
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

function createToolRegistry(): ToolRegistry {
  return {
    list: vi.fn(() => []),
    get: vi.fn((toolKey) => ({
      toolKey,
      description: toolKey,
      sourceEndpoint: toolKey,
      riskLevel: "read",
      timeoutMs: 1000,
      retry: 0,
    })),
    call: vi.fn(async (toolKey) => ({
      toolCallId: `tool-${toolKey}`,
      data:
        toolKey === "memory.search"
          ? []
          : toolKey === "rag.search"
            ? [{ chunkId: "chunk-1", documentId: "doc-1", title: "茅台风险", content: "批价风险", score: 0.9, source: "seed" }]
            : toolKey === "stock.resolve"
              ? { type: "stock", code: "600519", name: "贵州茅台" }
              : toolKey === "stock.briefItems"
                ? [{ kind: "news", title: "贵州茅台新闻", source: "Investoday", summary: "风险证据" }]
                : [],
    })),
  };
}

function finalRunUpdate(repository: AgentRuntimeRepository) {
  const calls = vi.mocked(repository.updateAgentRun).mock.calls;
  return calls.at(-1)?.[1];
}

class PrototypeRepository implements AgentRuntimeRepository {
  updates: Array<Record<string, unknown>> = [];
  steps: Array<{ nodeKey: string }> = [];

  async updateAgentRun(_id: string, data: Record<string, unknown>) {
    this.updates.push(data);
    return {};
  }

  async appendAgentStep(data: { nodeKey: string } & Record<string, unknown>) {
    this.steps.push({ nodeKey: data.nodeKey });
    return { id: `step-${this.steps.length}` };
  }

  async listRecentAgentMessages() {
    return [];
  }

  async listRecentAgentRunInputs() {
    return [];
  }

  async appendAgentMessage() {
    return { id: "message-1" };
  }

  async createSkillRun() {
    return { id: "skill-run-1" };
  }

  async updateSkillRun() {
    return {};
  }

  async recordToolCall() {
    return { id: "tool-call-1" };
  }

  async recordModelCall() {
    return { id: "model-call-1" };
  }

  async writeEvidence() {
    return {};
  }

  async writeMemoryItem() {
    return {};
  }
}
