import { describe, expect, it, vi } from "vitest";
import { executeAgentRunJob, type AgentRuntimeRepository, type ExecutableAgentRun } from "@/agents/executor";
import { StaticModelProvider } from "@/agents/model-provider";
import type { ToolRegistry } from "@/tools/types";

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
        toolKey === "stock.resolve"
          ? { type: "stock", code: "600519", name: "\u8d35\u5dde\u8305\u53f0", tags: ["SH"], enabled: true }
          : toolKey === "stock.briefItems"
            ? [{ kind: "news", title: "rating text", source: "Investoday", summary: "contains research rating words" }]
            : { source: toolKey, value: "ok" },
    })),
  };
}

function createResolvingToolRegistry(): ToolRegistry {
  const registry = createToolRegistry();
  registry.call = vi.fn(async (toolKey, input) => ({
    toolCallId: `tool-${toolKey}`,
    data:
      toolKey === "stock.resolve"
        ? { type: "stock", code: "600519", name: "\u8d35\u5dde\u8305\u53f0", tags: ["SH"], enabled: true }
        : toolKey === "stock.briefItems"
          ? [{ kind: "research", title: "\u8d35\u5dde\u8305\u53f0\u7814\u62a5", source: "Investoday", summary: `input=${JSON.stringify(input)}` }]
          : [],
  }));
  return registry;
}

function createLegacyToolRegistry(): ToolRegistry {
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
        toolKey === "stock.briefItems"
          ? [{ kind: "news", title: "rating text", source: "Investoday", summary: "contains research rating words" }]
          : { source: toolKey, value: "ok" },
    })),
  };
}

function finalRunUpdate(repository: AgentRuntimeRepository) {
  const calls = vi.mocked(repository.updateAgentRun).mock.calls;
  return calls.at(-1)?.[1];
}

describe("agent executor compliance behavior", () => {
  it("completes research-router-agent even when skill output contains trading words", async () => {
    const repository = createRepository();
    const toolRegistry = createToolRegistry();
    const run: ExecutableAgentRun = {
      id: "run-research",
      agentKey: "research-router-agent",
      sessionId: "session-1",
      question: "report analysis 600519 30",
      skillKey: "investoday-research-report-analysis",
      inputPayload: { stockCodeOrName: "600519", timeWindowDays: 30 },
    };

    await executeAgentRunJob({
      run,
      repository,
      toolRegistry,
      modelProvider: new StaticModelProvider("Research output: 买入 / 加仓 / 减仓 / 目标价"),
    });

    expect(finalRunUpdate(repository)).toMatchObject({
      status: "completed",
      outputMarkdown: expect.stringContaining("买入"),
      error: null,
    });
    expect(finalRunUpdate(repository)).not.toMatchObject({
      outputJson: expect.objectContaining({ compliance: expect.anything() }),
    });
  });

  it("completes market-broadcast-agent even when skill output contains trading words", async () => {
    const repository = createRepository();
    const toolRegistry = createToolRegistry();
    const run: ExecutableAgentRun = {
      id: "run-market",
      agentKey: "market-broadcast-agent",
      sessionId: "session-1",
      question: "generate market broadcast",
      skillKey: "investoday-stock-market-broadcast",
      inputPayload: {},
    };

    await executeAgentRunJob({
      run,
      repository,
      toolRegistry,
      modelProvider: new StaticModelProvider("Market output: 买入 / 加仓 / 减仓 / 目标价"),
    });

    expect(finalRunUpdate(repository)).toMatchObject({
      status: "completed",
      outputMarkdown: expect.stringContaining("加仓"),
      error: null,
    });
    expect(finalRunUpdate(repository)).not.toMatchObject({
      outputJson: expect.objectContaining({ compliance: expect.anything() }),
    });
  });

  it("passes recent session messages to the skill prompt and stores the assistant reply", async () => {
    const repository = createRepository();
    vi.mocked(repository.listRecentAgentMessages).mockResolvedValue([
      { role: "user", content: "first question" },
      { role: "assistant", content: "first answer" },
    ]);
    const prompts: string[] = [];
    const modelProvider = new StaticModelProvider("second answer with context");
    modelProvider.streamMarkdown = vi.fn(async (prompt, context) => {
      prompts.push(prompt);
      return StaticModelProvider.prototype.streamMarkdown.call(modelProvider, prompt, context);
    });

    await executeAgentRunJob({
      run: {
        id: "run-context",
        agentKey: "research-router-agent",
        sessionId: "session-context",
        question: "continue",
        skillKey: "investoday-stock-research-interpretation",
        inputPayload: { stockCodeOrName: "600519" },
      },
      repository,
      toolRegistry: createToolRegistry(),
      modelProvider,
    });

    expect(prompts.join("\n")).toContain("first question");
    expect(prompts.join("\n")).toContain("first answer");
    expect(repository.appendAgentMessage).toHaveBeenCalledWith({
      sessionId: "session-context",
      agentRunId: "run-context",
      role: "assistant",
      content: "second answer with context",
    });
  });

  it("resolves Chinese stock names before fetching research evidence", async () => {
    const repository = createRepository();
    const toolRegistry = createResolvingToolRegistry();

    await executeAgentRunJob({
      run: {
        id: "run-chinese-name",
        agentKey: "research-router-agent",
        sessionId: "session-zh",
        question: "\u7814\u7a76\u8d35\u5dde\u8305\u53f0\uff0c\u6709\u4e0a\u6da8\u7a7a\u95f4\u5417",
        skillKey: "investoday-stock-research-interpretation",
        inputPayload: { abilityKey: "investoday-stock-research-interpretation" },
      },
      repository,
      toolRegistry,
      modelProvider: new StaticModelProvider("\u8d35\u5dde\u8305\u53f0\u7814\u7a76\u7ed3\u8bba"),
    });

    expect(toolRegistry.call).toHaveBeenCalledWith(
      "stock.resolve",
      expect.objectContaining({ query: expect.stringContaining("\u8d35\u5dde\u8305\u53f0") }),
      expect.anything()
    );
    expect(toolRegistry.call).toHaveBeenCalledWith(
      "stock.briefItems",
      expect.objectContaining({ stockCodeOrName: "600519", stockName: "\u8d35\u5dde\u8305\u53f0" }),
      expect.anything()
    );
  });

  it("writes a visible assistant prompt when required research inputs are missing", async () => {
    const repository = createRepository();

    await executeAgentRunJob({
      run: {
        id: "run-missing-input",
        agentKey: "research-router-agent",
        sessionId: "session-missing",
        question: "continue with risks",
        skillKey: "investoday-stock-research-interpretation",
        inputPayload: { abilityKey: "investoday-stock-research-interpretation" },
      },
      repository,
      toolRegistry: createResolvingToolRegistry(),
      modelProvider: new StaticModelProvider("should not run"),
    });

    expect(finalRunUpdate(repository)).toMatchObject({
      status: "interrupted",
      outputMarkdown: expect.stringContaining("\u80a1\u7968\u4ee3\u7801"),
    });
    expect(repository.appendAgentMessage).toHaveBeenCalledWith({
      sessionId: "session-missing",
      agentRunId: "run-missing-input",
      role: "assistant",
      content: expect.stringContaining("\u80a1\u7968\u4ee3\u7801"),
    });
  });

  it("stores generated HTML separately and returns an artifact link instead of raw source", async () => {
    const repository = createRepository();
    const html = "<!DOCTYPE html><html><body><h1>\u8d35\u5dde\u8305\u53f0\u7814\u7a76\u770b\u677f</h1></body></html>";
    const htmlLink = "[\u6253\u5f00 HTML \u62a5\u544a](/api/skill-runs/skill-run-1/html)";

    await executeAgentRunJob({
      run: {
        id: "run-html",
        agentKey: "research-router-agent",
        sessionId: "session-html",
        question: "\u751f\u6210HTML",
        skillKey: "investoday-stock-research-interpretation",
        inputPayload: { stockCodeOrName: "600519", abilityKey: "investoday-stock-research-interpretation" },
      },
      repository,
      toolRegistry: createResolvingToolRegistry(),
      modelProvider: new StaticModelProvider(`\u6211\u6765\u751f\u6210\u9875\u9762\u3002\n\n\`\`\`html\n${html}\n\`\`\``),
    });

    expect(repository.updateSkillRun).toHaveBeenCalledWith(
      "skill-run-1",
      expect.objectContaining({
        outputMarkdown: expect.not.stringContaining("<!DOCTYPE html>"),
        outputHtml: expect.stringContaining("<!DOCTYPE html>"),
      })
    );
    expect(finalRunUpdate(repository)).toMatchObject({
      status: "completed",
      outputMarkdown: htmlLink,
      outputJson: expect.objectContaining({
        artifacts: [{ kind: "html", title: "\u0048\u0054\u004d\u004c \u62a5\u544a", url: "/api/skill-runs/skill-run-1/html" }],
      }),
    });
    expect(repository.appendAgentMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: htmlLink,
      })
    );
  });

  it("calls memory.search before a research answer and stores memory hits in outputJson", async () => {
    const repository = createRepository();
    const toolRegistry = createResolvingToolRegistry();
    vi.mocked(toolRegistry.call).mockImplementation(async (toolKey, input) => ({
      toolCallId: `tool-${toolKey}`,
      data:
        toolKey === "memory.search"
          ? [{ id: "memory-1", scope: "user", kind: "research_style", content: "prefers Buffett style", score: 1.2, confidence: 0.9, importance: 0.8 }]
          : toolKey === "stock.resolve"
            ? { type: "stock", code: "600519", name: "\u8d35\u5dde\u8305\u53f0", tags: ["SH"], enabled: true }
            : toolKey === "stock.briefItems"
              ? [{ kind: "research", title: "\u8d35\u5dde\u8305\u53f0\u7814\u62a5", source: "Investoday", summary: `input=${JSON.stringify(input)}` }]
              : [],
    }));

    await executeAgentRunJob({
      run: {
        id: "run-memory",
        agentKey: "research-router-agent",
        sessionId: "session-memory",
        question: "\u6309\u6211\u7684\u7814\u7a76\u504f\u597d\u770b\u8d35\u5dde\u8305\u53f0",
        skillKey: "investoday-stock-research-interpretation",
        inputPayload: { stockCodeOrName: "600519" },
      },
      repository,
      toolRegistry,
      modelProvider: new StaticModelProvider("answer"),
    });

    expect(toolRegistry.call).toHaveBeenCalledWith("memory.search", expect.objectContaining({ query: expect.any(String) }), expect.anything());
    expect(finalRunUpdate(repository)).toMatchObject({
      status: "completed",
      outputJson: expect.objectContaining({
        memoryHits: [expect.objectContaining({ id: "memory-1", kind: "research_style" })],
      }),
    });
  });

  it("inherits time window from structured prior runs instead of assistant text", async () => {
    const repository = createRepository();
    vi.mocked(repository.listRecentAgentRunInputs!).mockResolvedValue([
      {
        id: "prior-run",
        question: "\u8d35\u5dde\u8305\u53f0\u8fd190\u5929",
        skillKey: "investoday-stock-research-interpretation",
        inputPayload: { stockCodeOrName: "600519", stockCode: "600519", stockName: "\u8d35\u5dde\u8305\u53f0", timeWindowDays: 90 },
      },
    ]);
    vi.mocked(repository.listRecentAgentMessages).mockResolvedValue([
      { role: "assistant", content: "\u4e0a\u8f6e\u56de\u7b54\u5305\u542b 19 \u4e2a\u6570\u5b57\uff0c\u4e0d\u5e94\u88ab\u5f53\u6210\u65f6\u95f4\u7a97\u53e3" },
      { role: "user", content: "\u6cbf\u7528\u4e0a\u9762\u65f6\u95f4\u8303\u56f4" },
    ]);
    const toolRegistry = createResolvingToolRegistry();

    await executeAgentRunJob({
      run: {
        id: "run-inherit-time",
        agentKey: "research-router-agent",
        sessionId: "session-time",
        question: "\u6cbf\u7528\u4e0a\u9762\u65f6\u95f4\u8303\u56f4\uff0c\u770b\u98ce\u9669",
        skillKey: "investoday-stock-research-interpretation",
        inputPayload: { abilityKey: "investoday-stock-research-interpretation" },
      },
      repository,
      toolRegistry,
      modelProvider: new StaticModelProvider("answer"),
    });

    expect(toolRegistry.call).toHaveBeenCalledWith(
      "stock.briefItems",
      expect.objectContaining({ timeWindowDays: 90, stockCodeOrName: "600519" }),
      expect.anything()
    );
  });

  it("routes industry research through industry tools instead of stock brief items", async () => {
    const repository = createRepository();
    const toolRegistry = createToolRegistry();
    vi.mocked(toolRegistry.call).mockImplementation(async (toolKey) => ({
      toolCallId: `tool-${toolKey}`,
      data:
        toolKey === "memory.search"
          ? []
          : toolKey === "industry.data"
            ? { target: { code: "IND001", name: "\u6709\u8272\u91d1\u5c5e" }, reports: [{ title: "\u6709\u8272\u7814\u62a5", source: "Investoday", summary: "industry report" }] }
            : [],
    }));

    await executeAgentRunJob({
      run: {
        id: "run-industry",
        agentKey: "research-router-agent",
        sessionId: "session-industry",
        question: "\u7814\u7a76\u6709\u8272\u91d1\u5c5e\u884c\u4e1a\u8fd130\u5929\u53d8\u5316",
        skillKey: "investoday-industry-analysis",
        inputPayload: { abilityKey: "investoday-industry-analysis" },
      },
      repository,
      toolRegistry,
      modelProvider: new StaticModelProvider("industry answer"),
    });

    expect(toolRegistry.call).toHaveBeenCalledWith("industry.data", expect.objectContaining({ industryName: "\u6709\u8272\u91d1\u5c5e" }), expect.anything());
    expect(toolRegistry.call).not.toHaveBeenCalledWith("stock.briefItems", expect.anything(), expect.anything());
    expect(finalRunUpdate(repository)).toMatchObject({ status: "completed" });
  });

  it("returns an evidence-insufficient answer instead of a deterministic report when industry evidence is empty", async () => {
    const repository = createRepository();
    const toolRegistry = createToolRegistry();
    vi.mocked(toolRegistry.call).mockResolvedValue({ toolCallId: "tool-empty", data: [] });
    const modelProvider = new StaticModelProvider("should not be used");
    modelProvider.streamMarkdown = vi.fn(modelProvider.streamMarkdown);

    await executeAgentRunJob({
      run: {
        id: "run-empty-industry",
        agentKey: "research-router-agent",
        sessionId: "session-empty-industry",
        question: "\u7814\u7a76\u4e0d\u5b58\u5728\u7684XYZ\u884c\u4e1a\u6700\u8fd1\u98ce\u9669",
        skillKey: "investoday-industry-analysis",
        inputPayload: { abilityKey: "investoday-industry-analysis", industryName: "\u4e0d\u5b58\u5728XYZ" },
      },
      repository,
      toolRegistry,
      modelProvider,
    });

    expect(modelProvider.streamMarkdown).not.toHaveBeenCalled();
    expect(finalRunUpdate(repository)).toMatchObject({
      status: "completed",
      outputMarkdown: expect.stringContaining("\u8bc1\u636e\u4e0d\u8db3"),
      outputJson: expect.objectContaining({
        evidenceGrade: expect.objectContaining({ passed: false, evidenceCount: 0 }),
      }),
    });
  });

  it("normalizes Chinese unwind questions before missing-input checks", async () => {
    const repository = createRepository();
    const toolRegistry = createToolRegistry();
    vi.mocked(toolRegistry.call).mockImplementation(async (toolKey, input) => ({
      toolCallId: `tool-${toolKey}`,
      data:
        toolKey === "entity.recognition" && String(input.query) === "永兴材料"
          ? { code: "002756", name: "永兴材料", type: "stock", correlation: 1 }
          : toolKey === "memory.search"
            ? []
            : [],
    }));

    await executeAgentRunJob({
      run: {
        id: "run-unwind-missing-position",
        agentKey: "research-router-agent",
        sessionId: "session-unwind",
        question: "我的永兴材料被套40%，请问还有解套空间吗？",
        skillKey: "investoday-stock-research-interpretation",
        inputPayload: { abilityKey: "auto" },
      },
      repository,
      toolRegistry,
      modelProvider: new StaticModelProvider("should not run"),
    });

    expect(finalRunUpdate(repository)).toMatchObject({
      status: "interrupted",
      skillKey: "investoday-ai-unwind-advisor",
      outputJson: expect.objectContaining({
        interrupt: expect.objectContaining({ missingInputs: ["positionPercent"] }),
        resolvedEntities: expect.objectContaining({ stock: expect.objectContaining({ code: "002756", name: "永兴材料" }) }),
      }),
    });
    expect(finalRunUpdate(repository)?.outputMarkdown).toContain("仓位");
    expect(finalRunUpdate(repository)?.outputMarkdown).not.toContain("股票代码");
  });

  it("plans multi-intent unwind questions and fetches supporting lithium evidence", async () => {
    const repository = createRepository();
    const toolRegistry = createToolRegistry();
    vi.mocked(toolRegistry.call).mockImplementation(async (toolKey, input) => ({
      toolCallId: `tool-${toolKey}`,
      data:
        toolKey === "entity.recognition" && String(input.query) === "永兴材料"
          ? { code: "002756", name: "永兴材料", type: "stock", correlation: 1 }
          : toolKey === "entity.recognition" && String(input.query).includes("碳酸锂")
            ? {
                entities: [
                  { code: "240603", name: "锂", type: "industry", correlation: 1, level: 3 },
                  { code: "14050010", name: "锂概念", type: "concept", correlation: 0, level: 0 },
                ],
              }
            : toolKey === "memory.search"
              ? []
              : toolKey === "stock.basicInfo"
                ? { code: "002756", name: "永兴材料" }
                : toolKey === "stock.unwindSignalStat"
                  ? [{ stockCode: "002756", winRate3m: 0.6 }]
                  : toolKey === "stock.unwindSignalDetails"
                    ? [{ stockCode: "002756", stockPosition: 0.2 }]
                    : toolKey === "concept.quote"
                      ? [{ conceptCode: "14050010", conceptName: "锂概念", changeRatio: 0.02 }]
                      : toolKey === "industry.data"
                        ? { target: { code: "240603", name: "锂" }, reports: [{ title: "锂行业研报", source: "Investoday", summary: "锂产业链证据" }] }
                        : [],
    }));

    await executeAgentRunJob({
      run: {
        id: "run-multi-intent-unwind",
        agentKey: "research-router-agent",
        sessionId: "session-multi",
        question: "我的永兴材料被套40%，请问还有解套空间吗？短期碳酸锂会涨吗？",
        skillKey: "investoday-stock-research-interpretation",
        inputPayload: { abilityKey: "auto", positionPercent: 30, riskConfirmed: true },
      },
      repository,
      toolRegistry,
      modelProvider: new StaticModelProvider("综合解套分析"),
    });

    expect(toolRegistry.call).toHaveBeenCalledWith("stock.unwindSignalStat", expect.objectContaining({ stockCode: "002756" }), expect.anything());
    expect(toolRegistry.call).toHaveBeenCalledWith("concept.quote", expect.objectContaining({ conceptCode: "14050010" }), expect.anything());
    expect(finalRunUpdate(repository)).toMatchObject({
      status: "completed",
      skillKey: "investoday-ai-unwind-advisor",
      outputJson: expect.objectContaining({
        intentPlan: expect.objectContaining({
          primaryIntent: "unwind_advice",
          secondaryIntents: expect.arrayContaining(["concept_trend", "industry_context"]),
        }),
        evidenceGroups: expect.any(Array),
      }),
    });
  });
});
