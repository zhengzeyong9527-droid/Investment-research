import { describe, expect, it, vi } from "vitest";
import { buildEntityCandidates, parseUnwindFields, resolveAgentEntities } from "@/agents/entity-resolver";
import type { ToolRegistry } from "@/tools/types";

function mockContext() {
  return {
    agentRunId: "run-1",
    sessionId: "session-1",
    agentKey: "research-router-agent" as const,
    userId: "local-user",
    recordToolCall: vi.fn(async () => ({ id: "tool-call-1" })),
  };
}

function mockRegistry(responses: Record<string, unknown>): Pick<ToolRegistry, "call"> {
  return {
    call: vi.fn(async (toolKey: string, input: Record<string, unknown>) => {
      const key = `${toolKey}:${String(input.query ?? input.stockCodeOrName ?? input.conceptName ?? "")}`;
      if (key in responses) return { toolCallId: `tool-${toolKey}`, data: responses[key] };
      if (toolKey in responses) return { toolCallId: `tool-${toolKey}`, data: responses[toolKey] };
      throw new Error(`unexpected ${key}`);
    }),
  };
}

function createRegistryMock(handler: (toolKey: string, input: Record<string, unknown>) => unknown): Pick<ToolRegistry, "call"> {
  return {
    call: vi.fn(async (toolKey: string, input: Record<string, unknown>) => ({
      toolCallId: `tool-${toolKey}`,
      data: handler(toolKey, input),
    })),
  };
}

function createContext() {
  return mockContext();
}

describe("agent entity resolver", () => {
  it("does not send output-format phrases to entity tools", async () => {
    const registry = mockRegistry({
      "entity.recognition:研究贵州茅台（600519）近30天研报怎么看？请引用证据，输出结论、核心依据、主要风险、后续关注。": {
        entities: [{ code: "600519", name: "贵州茅台", type: "stock", correlation: 1 }],
      },
    });

    const result = await resolveAgentEntities({
      question: "研究贵州茅台（600519）近30天研报怎么看？请引用证据，输出结论、核心依据、主要风险、后续关注。",
      inputPayload: {},
      toolRegistry: registry,
      context: mockContext(),
    });

    expect(result.stock).toMatchObject({ code: "600519", name: "贵州茅台" });
    expect(result.rejectedCandidates).toEqual(
      expect.arrayContaining([
        { text: "请引用证据", reason: "task_phrase" },
        { text: "输出结论", reason: "task_phrase" },
        { text: "核心依据", reason: "task_phrase" },
        { text: "主要风险", reason: "task_phrase" },
        { text: "后续关注", reason: "task_phrase" },
      ])
    );
    expect(registry.call).not.toHaveBeenCalledWith("stock.resolve", expect.objectContaining({ query: "请引用证据" }), expect.anything());
    expect(registry.call).not.toHaveBeenCalledWith("stock.resolve", expect.objectContaining({ query: "主要风险" }), expect.anything());
  });

  it("ignores noisy non-stock entities from full-question recognition when the user did not ask for them", async () => {
    const registry = mockRegistry({
      "entity.recognition:研究贵州茅台（600519）近30天研报怎么看？": {
        entities: [
          { code: "600519", name: "贵州茅台", type: "stock", correlation: 1 },
          { code: "350106", name: "其他纺织", type: "industry", correlation: 0.9 },
          { code: "18051252", name: "贵州", type: "concept", correlation: 0.8 },
        ],
      },
    });

    const result = await resolveAgentEntities({
      question: "研究贵州茅台（600519）近30天研报怎么看？",
      inputPayload: {},
      toolRegistry: registry,
      context: mockContext(),
    });

    expect(result.stock).toMatchObject({ code: "600519", name: "贵州茅台" });
    expect(result.industry).toBeUndefined();
    expect(result.concept).toBeUndefined();
  });

  it("does not use stock fallback for broad industry or category phrases", async () => {
    const registry = createRegistryMock((toolKey, input) => {
      if (toolKey === "entity.recognition" && input.query === "研究文娱用品行业风险") {
        return {};
      }
      throw new Error(`${toolKey} should not be called for ${String(input.query)}`);
    });

    await resolveAgentEntities({
      question: "研究文娱用品行业风险",
      inputPayload: {},
      toolRegistry: registry,
      context: createContext(),
    });

    expect(registry.call).not.toHaveBeenCalledWith("stock.resolve", expect.objectContaining({ query: "文娱用品" }), expect.anything());
  });

  it("does not use stock fallback when a standalone candidate is a broad category", async () => {
    const registry = createRegistryMock((toolKey) => {
      if (toolKey === "entity.recognition") return {};
      return {};
    });

    await resolveAgentEntities({
      question: "文娱用品",
      inputPayload: {},
      toolRegistry: registry,
      context: createContext(),
    });

    expect(registry.call).not.toHaveBeenCalledWith("stock.resolve", expect.objectContaining({ query: "文娱用品" }), expect.anything());
  });

  it("still allows stock fallback for company-like Chinese names", async () => {
    const registry = createRegistryMock((toolKey, input) => {
      if (toolKey === "entity.recognition") return {};
      if (toolKey === "stock.resolve" && input.query === "永兴材料") {
        return { type: "stock", code: "002756", name: "永兴材料" };
      }
      return {};
    });

    const result = await resolveAgentEntities({
      question: "永兴材料被套40%",
      inputPayload: {},
      toolRegistry: registry,
      context: createContext(),
    });

    expect(result.stock).toMatchObject({ code: "002756", name: "永兴材料" });
  });

  it("allows stock fallback for explicit stock codes", async () => {
    const registry = createRegistryMock((toolKey, input) => {
      if (toolKey === "entity.recognition") return {};
      if (toolKey === "stock.resolve" && input.query === "600519") {
        return { type: "stock", code: "600519", name: "贵州茅台" };
      }
      return {};
    });

    const result = await resolveAgentEntities({
      question: "600519 近30天风险",
      inputPayload: {},
      toolRegistry: registry,
      context: createContext(),
    });

    expect(result.stock).toMatchObject({ code: "600519", name: "贵州茅台" });
  });

  it("extracts clean entity candidates from a mixed unwind and lithium question", () => {
    expect(buildEntityCandidates("我的永兴材料被套40%，请问还有解套空间吗？短期碳酸锂会涨吗吗")).toEqual(
      expect.arrayContaining(["永兴材料", "碳酸锂"])
    );
  });

  it("extracts unwind loss and position fields from natural language", () => {
    expect(parseUnwindFields("我的永兴材料被套40%，仓位三成")).toMatchObject({
      lossPercent: 40,
      positionPercent: 30,
    });
    expect(parseUnwindFields("亏损18%，半仓")).toMatchObject({ lossPercent: 18, positionPercent: 50 });
  });

  it("resolves Chinese stock names through entity recognition before missing input checks", async () => {
    const registry = mockRegistry({
      "entity.recognition:永兴材料": { code: "002756", name: "永兴材料", type: "stock", correlation: 1 },
    });

    await expect(
      resolveAgentEntities({
        question: "我的永兴材料被套40%，请问还有解套空间吗？",
        inputPayload: {},
        toolRegistry: registry,
        context: mockContext(),
      })
    ).resolves.toMatchObject({
      stock: { code: "002756", name: "永兴材料", type: "stock" },
      unwind: { lossPercent: 40 },
    });
  });

  it("keeps lithium industry or concept as supporting entities", async () => {
    const registry = mockRegistry({
      "entity.recognition:短期碳酸锂会涨吗": {
        entities: [
          { code: "240603", name: "锂", type: "industry", correlation: 1, level: 3 },
          { code: "14050010", name: "锂概念", type: "concept", correlation: 0, level: 0 },
        ],
      },
      "entity.recognition:短期碳酸锂": {
        entities: [
          { code: "240603", name: "锂", type: "industry", correlation: 1, level: 3 },
          { code: "14050010", name: "锂概念", type: "concept", correlation: 0, level: 0 },
        ],
      },
      "entity.recognition:碳酸锂": {
        entities: [
          { code: "240603", name: "锂", type: "industry", correlation: 1, level: 3 },
          { code: "14050010", name: "锂概念", type: "concept", correlation: 0, level: 0 },
        ],
      },
    });

    await expect(
      resolveAgentEntities({
        question: "短期碳酸锂会涨吗",
        inputPayload: {},
        toolRegistry: registry,
        context: mockContext(),
      })
    ).resolves.toMatchObject({
      industry: { code: "240603", name: "锂" },
      concept: { code: "14050010", name: "锂概念" },
      commodities: expect.arrayContaining([expect.objectContaining({ name: expect.stringMatching(/锂|碳酸锂/) })]),
    });
    expect(registry.call).not.toHaveBeenCalledWith("stock.resolve", expect.objectContaining({ query: expect.stringContaining("碳酸锂") }), expect.anything());
  });
});
