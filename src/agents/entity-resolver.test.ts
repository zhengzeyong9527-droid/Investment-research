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

describe("agent entity resolver", () => {
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
    });
  });
});
