import { INTERRUPT, isInterrupted } from "@langchain/langgraph";
import { describe, expect, it, vi } from "vitest";
import { executeAgentGraphJob, getAgentGraphNodeKeys } from "@/agents/langgraph-runtime";
import { StaticModelProvider } from "@/agents/model-provider";
import type { AgentRuntimeRepository, ExecutableAgentRun } from "@/agents/executor";
import type { ToolRegistry } from "@/tools/types";

describe("langgraph runtime", () => {
  it("exposes true research graph nodes", () => {
    expect(getAgentGraphNodeKeys("research-router-agent")).toEqual([
      "router",
      "resolve_entity",
      "plan_intent",
      "normalize_input",
      "check_missing",
      "retrieve_memory",
      "fetch_evidence",
      "local_rag_retrieve",
      "grade_evidence",
      "generate",
      "verify_output",
      "commit_memory",
      "finalize",
    ]);
  });

  it("executes the research graph and persists final graph state", async () => {
    const repository = createRepository();
    await executeAgentGraphJob({
      run: researchRun(),
      repository,
      toolRegistry: createToolRegistry(),
      modelProvider: new StaticModelProvider("贵州茅台研究结论"),
    });

    const nodeKeys = completedNodeKeys(repository);
    expect(nodeKeys).toEqual(expect.arrayContaining(["resolve_entity", "fetch_evidence", "local_rag_retrieve", "generate", "finalize"]));
    expect(finalRunUpdate(repository)).toMatchObject({
      status: "completed",
      outputJson: expect.objectContaining({
        graphState: expect.objectContaining({
          nodeKeys: expect.arrayContaining(["router", "resolve_entity", "finalize"]),
          ragHits: expect.arrayContaining([expect.objectContaining({ title: "茅台风险" })]),
        }),
      }),
    });
  });

  it("persists local RAG hits before generation failures", async () => {
    const repository = createRepository();
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
        run: researchRun(),
        repository,
        toolRegistry: createToolRegistry(),
        modelProvider: failingModelProvider,
      })
    ).rejects.toThrow("model down");

    expect(vi.mocked(repository.updateAgentRun)).toHaveBeenCalledWith(
      "run-graph",
      expect.objectContaining({
        outputJson: expect.objectContaining({
          ragHits: expect.arrayContaining([expect.objectContaining({ title: "茅台风险" })]),
        }),
      })
    );
    expect(finalRunUpdate(repository)).toMatchObject({ status: "failed" });
  });

  it("degrades instead of generating when evidence is empty", async () => {
    const repository = createRepository();
    const toolRegistry = createToolRegistry({ emptyEvidence: true });
    const modelProvider = new StaticModelProvider("should not run");
    modelProvider.streamMarkdown = vi.fn(modelProvider.streamMarkdown);

    await executeAgentGraphJob({
      run: researchRun(),
      repository,
      toolRegistry,
      modelProvider,
    });

    expect(modelProvider.streamMarkdown).not.toHaveBeenCalled();
    expect(finalRunUpdate(repository)).toMatchObject({
      status: "completed",
      outputMarkdown: expect.stringContaining("证据不足"),
    });
  });

  it("executes the market broadcast subgraph", async () => {
    const repository = createRepository();
    await executeAgentGraphJob({
      run: {
        id: "run-market",
        agentKey: "market-broadcast-agent",
        sessionId: "session-market",
        question: "生成盘面播报",
        skillKey: "investoday-stock-market-broadcast",
        inputPayload: {},
      },
      repository,
      toolRegistry: createToolRegistry(),
      modelProvider: new StaticModelProvider("盘面播报"),
    });

    expect(completedNodeKeys(repository)).toEqual(expect.arrayContaining(["fetch_market", "build_market_evidence", "run_broadcast", "finalize"]));
    expect(finalRunUpdate(repository)).toMatchObject({ status: "completed", skillKey: "investoday-stock-market-broadcast" });
  });

  it("interrupts on missing input and resumes the same thread", async () => {
    const repository = createRepository();
    const run = {
      ...researchRun(),
      sessionId: "session-interrupt",
      inputPayload: { abilityKey: "investoday-stock-research-interpretation" },
      question: "帮我做一份股票研究",
    };

    const interrupted = await executeAgentGraphJob({
      run,
      repository,
      toolRegistry: createToolRegistry(),
      modelProvider: new StaticModelProvider("should resume later"),
    });

    if (!isInterrupted(interrupted)) throw new Error("Expected graph interrupt.");
    expect(interrupted[INTERRUPT][0]?.value).toMatchObject({ type: "missing_input", runId: "run-graph" });
    expect(finalRunUpdate(repository)).toMatchObject({ status: "interrupted" });

    await executeAgentGraphJob({
      run,
      repository,
      toolRegistry: createToolRegistry(),
      modelProvider: new StaticModelProvider("贵州茅台补充后研究结论"),
      resumePayload: { stockCodeOrName: "600519" },
    });

    expect(finalRunUpdate(repository)).toMatchObject({ status: "completed" });
    expect(completedNodeKeys(repository)).toEqual(expect.arrayContaining(["normalize_input", "fetch_evidence", "generate", "finalize"]));
  });

  it("retries failed verification at most twice before finalizing", async () => {
    const repository = createRepository();
    const modelProvider = new StaticModelProvider("```html\n<div>visible source</div>\n```");
    modelProvider.streamMarkdown = vi.fn(modelProvider.streamMarkdown);

    await executeAgentGraphJob({
      run: { ...researchRun(), inputPayload: { stockCodeOrName: "600519", timeWindowDays: 30 } },
      repository,
      toolRegistry: createToolRegistry(),
      modelProvider,
    });

    expect(modelProvider.streamMarkdown).toHaveBeenCalledTimes(2);
    expect(finalRunUpdate(repository)).toMatchObject({
      status: "completed",
      outputJson: expect.objectContaining({
        graphState: expect.objectContaining({
          attempts: 2,
          verification: expect.objectContaining({ passed: false }),
        }),
      }),
    });
  });

  it("degrades after repeated blocking unsupported claims", async () => {
    const repository = createRepository();
    const modelProvider = new StaticModelProvider("银河证券《贵州茅台业绩爆发深度报告》给出目标价 2200 元，一定可以买入。");
    modelProvider.streamMarkdown = vi.fn(modelProvider.streamMarkdown);

    await executeAgentGraphJob({
      run: researchRun(),
      repository,
      toolRegistry: createToolRegistry(),
      modelProvider,
    });

    expect(modelProvider.streamMarkdown).toHaveBeenCalledTimes(2);
    expect(completedNodeKeys(repository)).toEqual(expect.arrayContaining(["verify_output", "degrade", "finalize"]));
    expect(finalRunUpdate(repository)).toMatchObject({
      status: "completed",
      outputMarkdown: expect.stringContaining("证据不足，无法形成确定结论"),
    });
  });
});

function researchRun(): ExecutableAgentRun {
  return {
    id: "run-graph",
    agentKey: "research-router-agent",
    sessionId: "session-graph",
    question: "研究贵州茅台近30天风险",
    skillKey: "investoday-stock-research-interpretation",
    inputPayload: { stockCodeOrName: "600519" },
  };
}

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

function createToolRegistry(options: { emptyEvidence?: boolean } = {}): ToolRegistry {
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
    call: vi.fn(async (toolKey, input) => ({
      toolCallId: `tool-${toolKey}`,
      data:
        toolKey === "memory.search"
          ? []
          : toolKey === "rag.search"
            ? [{ chunkId: "chunk-1", documentId: "doc-1", title: "茅台风险", content: "批价风险", score: 0.9, source: "seed" }]
            : toolKey === "stock.resolve"
              ? { type: "stock", code: "600519", name: "贵州茅台" }
              : toolKey === "stock.briefItems" && !options.emptyEvidence
                ? [{ kind: "research", title: "贵州茅台研报", source: "Investoday", summary: `input=${JSON.stringify(input)}` }]
                : toolKey.startsWith("market.") || toolKey === "news.market"
                  ? { source: toolKey, value: "ok" }
                  : [],
    })),
  };
}

function completedNodeKeys(repository: AgentRuntimeRepository) {
  return vi
    .mocked(repository.appendAgentStep)
    .mock.calls.map((call) => call[0])
    .filter((step) => step.status === "completed")
    .map((step) => step.nodeKey);
}

function finalRunUpdate(repository: AgentRuntimeRepository) {
  const calls = vi.mocked(repository.updateAgentRun).mock.calls;
  return calls.at(-1)?.[1];
}
