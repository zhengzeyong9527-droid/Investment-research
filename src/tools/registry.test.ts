import { describe, expect, it, vi } from "vitest";
import { createToolRegistry } from "@/tools/registry";
import type { ToolRuntimeContext } from "@/tools/types";

function ok(stdout: unknown) {
  return { ok: true, stdout: JSON.stringify(stdout), stderr: "" };
}

describe("tool registry", () => {
  it("wraps Investoday market atom tools and records audited tool calls", async () => {
    const recordToolCall = vi.fn(async (data) => ({ id: `tool-${data.toolKey}`, ...data }));
    const run = vi.fn(async (_command: string, args: string[]) => {
      if (args[0] === "market/change-ratio-status") {
        return ok({ upAmount: 10, downAmount: 5, bxAmount: 1 });
      }
      if (args[0] === "index-quote/realtime") {
        return ok([{ indexCode: "000001", currentPrice: 3000 }]);
      }
      return { ok: false, stdout: "", stderr: `unexpected ${args[0]}` };
    });
    const registry = createToolRegistry({ run });
    const context: ToolRuntimeContext = {
      agentRunId: "run-1",
      sessionId: "session-1",
      agentKey: "market-broadcast-agent",
      recordToolCall,
    };

    await expect(registry.call("market.changeRatioStatus", {}, context)).resolves.toMatchObject({
      toolCallId: "tool-market.changeRatioStatus",
      data: { upAmount: 10, downAmount: 5, bxAmount: 1 },
    });
    await expect(registry.call("market.indexRealtime", { indexCodes: ["000001"] }, context)).resolves.toMatchObject({
      toolCallId: "tool-market.indexRealtime",
      data: [{ indexCode: "000001", currentPrice: 3000 }],
    });

    expect(run).toHaveBeenCalledWith("investoday-api", ["market/change-ratio-status"]);
    expect(run).toHaveBeenCalledWith("investoday-api", [
      "index-quote/realtime",
      "--method",
      "POST",
      "--body-json",
      JSON.stringify({ indexCodes: ["000001"] }),
    ]);
    expect(recordToolCall).toHaveBeenCalledWith(
      expect.objectContaining({
        toolKey: "market.changeRatioStatus",
        status: "completed",
        sourceEndpoint: "market/change-ratio-status",
      })
    );
  });

  it("wraps Investoday entity recognition and unwind signal tools", async () => {
    const recordToolCall = vi.fn(async (data) => ({ id: `tool-${data.toolKey}`, ...data }));
    const run = vi.fn(async (_command: string, args: string[]) => {
      if (args[0] === "entity-recognition") {
        return ok({ code: "002756", name: "永兴材料", type: "stock", correlation: 1 });
      }
      if (args[0] === "stock/unwind-signal-stat") {
        return ok({ data: [{ stockCode: "002756", winRate3m: 0.6 }] });
      }
      if (args[0] === "stock/unwind-signal-details") {
        return ok({ data: [{ stockCode: "002756", stockPosition: 0.2 }] });
      }
      return { ok: false, stdout: "", stderr: `unexpected ${args[0]}` };
    });
    const registry = createToolRegistry({ run });
    const context: ToolRuntimeContext = {
      agentRunId: "run-1",
      sessionId: "session-1",
      agentKey: "research-router-agent",
      recordToolCall,
    };

    await expect(registry.call("entity.recognition", { query: "永兴材料" }, context)).resolves.toMatchObject({
      data: { code: "002756", name: "永兴材料", type: "stock" },
    });
    await expect(registry.call("stock.unwindSignalStat", { stockCode: "002756" }, context)).resolves.toMatchObject({
      data: [{ stockCode: "002756", winRate3m: 0.6 }],
    });
    await expect(registry.call("stock.unwindSignalDetails", { stockCode: "002756", timeWindowDays: 30 }, context)).resolves.toMatchObject({
      data: [{ stockCode: "002756", stockPosition: 0.2 }],
    });

    expect(run).toHaveBeenCalledWith("investoday-api", ["entity-recognition", "--method", "POST", "input=永兴材料"]);
    expect(run).toHaveBeenCalledWith("investoday-api", [
      "stock/unwind-signal-stat",
      "--method",
      "POST",
      "--body-json",
      JSON.stringify({ stockCode: "002756", pageNum: 1, pageSize: 10 }),
    ]);
  });

  it("uses documented endpoints for forecast ratings, vector search, entity news, and concept tools", async () => {
    const recordToolCall = vi.fn(async (data) => ({ id: `tool-${data.toolKey}`, ...data }));
    const run = vi.fn(async (_command: string, args: string[]) => {
      if (args[0] === "report/stock-forecast-ratings") return ok([{ stockCode: "002756", reportTitle: "forecast" }]);
      if (args[0] === "report/vector-search") return ok([{ chunk: "lithium evidence" }]);
      if (args[0] === "news/entity-related") return ok([{ title: "entity news" }]);
      if (args[0] === "concepts") return ok([{ conceptCode: "14050010", conceptName: "锂概念" }]);
      if (args[0] === "concept-quote/realtime-v2") return ok([{ conceptCode: "14050010", changeRatio: 0.02 }]);
      if (args[0] === "concept-quote/stock-realtime") return ok({ conceptCode: "14050010", stockRealQuotes: [] });
      return { ok: false, stdout: "", stderr: `unexpected ${args[0]}` };
    });
    const registry = createToolRegistry({ run });
    const context: ToolRuntimeContext = {
      agentRunId: "run-1",
      sessionId: "session-1",
      agentKey: "research-router-agent",
      recordToolCall,
    };

    await registry.call("report.forecastRatings", { stockCode: "002756" }, context);
    await registry.call("report.vectorSearch", { stockCode: "002756", query: "碳酸锂" }, context);
    await registry.call("news.entityRelated", { stockCode: "002756" }, context);
    await registry.call("concept.resolve", { conceptName: "锂概念" }, context);
    await registry.call("concept.quote", { conceptCode: "14050010" }, context);
    await registry.call("concept.stockRealtime", { conceptCode: "14050010" }, context);

    expect(run).toHaveBeenCalledWith("investoday-api", expect.arrayContaining(["report/stock-forecast-ratings", "stockCode=002756"]));
    expect(run).toHaveBeenCalledWith(
      "investoday-api",
      expect.arrayContaining(["report/vector-search", "--method", "POST", "stockCode=002756", "--body-json", JSON.stringify({ query: "碳酸锂" })])
    );
    expect(run).toHaveBeenCalledWith("investoday-api", expect.arrayContaining(["news/entity-related", "stockCode=002756"]));
    expect(run).toHaveBeenCalledWith("investoday-api", ["concepts", "conceptName=锂概念", "pageNum=1", "pageSize=10"]);
  });
});
