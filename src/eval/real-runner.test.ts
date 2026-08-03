import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertRealEvalEnvironment,
  buildRealEvalReport,
  scoreRealRunDetail,
  selectRealEvalCases,
  type RealEvalCase,
  type RealEvalRunDetail,
} from "@/eval/runner";

const baseCase: RealEvalCase = {
  id: "real-001",
  name: "贵州茅台真实链路",
  agentKey: "research-router-agent",
  tags: ["stock", "citation"],
  turns: [
    {
      prompt: "研究贵州茅台（600519）近30天研报怎么看？请引用证据。",
      expected: {
        entityKeywords: ["贵州茅台", "600519"],
      },
    },
  ],
};

const completedRun: RealEvalRunDetail = {
  id: "run-real-1",
  sessionId: "session-real-1",
  status: "completed",
  outputMarkdown: "贵州茅台（600519）近30天核心风险来自渠道批价波动，依据见今日投资证据。",
  outputJson: {
    ragHits: [{ title: "茅台渠道风险 seed 文档", documentId: "doc-1", chunkId: "chunk-1", score: 0.82 }],
    memoryHits: [{ id: "memory-1", content: "偏好巴菲特风格分析" }],
    evidenceGaps: [],
  },
  toolCalls: [
    {
      id: "tool-1",
      toolKey: "report.query",
      status: "completed",
      outputSummary: "贵州茅台 600519 近30天研报",
      latencyMs: 120,
    },
  ],
  evidenceRecords: [
    {
      id: "evidence-1",
      title: "贵州茅台近30天研报摘要",
      source: "今日投资",
      summary: "贵州茅台 600519 渠道批价波动。",
      rawPayload: { stockCode: "600519", stockName: "贵州茅台" },
    },
  ],
  modelCalls: [
    {
      id: "model-1",
      model: "deepseek-v4-flash",
      status: "completed",
      tokenInput: 900,
      tokenOutput: 500,
      costCents: 2,
      latencyMs: 3800,
    },
  ],
  steps: [{ nodeKey: "generate", status: "completed", title: "生成回答" }],
};

describe("real agent eval runner", () => {
  it("selects bounded smoke cases and full real cases without using synthetic snapshots", () => {
    const smokeCases = selectRealEvalCases("smoke");
    const realCases = selectRealEvalCases("real");

    expect(smokeCases.length).toBeGreaterThanOrEqual(5);
    expect(smokeCases.length).toBeLessThanOrEqual(8);
    expect(realCases.length).toBeGreaterThanOrEqual(50);
    expect(realCases.some((item) => item.agentKey === "market-broadcast-agent")).toBe(true);
    expect(realCases.some((item) => item.tags.includes("rag"))).toBe(true);
  });

  it("fails fast when the real eval environment is missing dependencies", async () => {
    await expect(
      assertRealEvalEnvironment({
        env: {},
        checkDatabase: async () => undefined,
        checkRedis: async () => undefined,
        checkWorker: async () => undefined,
      })
    ).rejects.toThrow(/DATABASE_URL|REDIS_URL|LLM API key/);
  });

  it("scores only real run details that include process records", () => {
    const result = scoreRealRunDetail({
      evalCase: baseCase,
      turnIndex: 0,
      runDetail: completedRun,
      latencyMs: 4200,
    });

    expect(result.runId).toBe("run-real-1");
    expect(result.metrics.completion_rate).toBe(1);
    expect(result.metrics.tool_success_rate).toBe(1);
    expect(result.metrics.evidence_coverage_rate).toBe(1);
    expect(result.metrics.entity_match_rate).toBe(1);
    expect(result.metrics.memory_recall_rate).toBeNull();
    expect(result.passed).toBe(true);
  });

  it("marks a run without ToolCall or ModelCall as not countable real eval", () => {
    const result = scoreRealRunDetail({
      evalCase: baseCase,
      turnIndex: 0,
      runDetail: { ...completedRun, toolCalls: [], modelCalls: [] },
      latencyMs: 4200,
    });

    expect(result.passed).toBe(false);
    expect(result.failureReasons).toContain("missing_real_tool_calls");
    expect(result.failureReasons).toContain("missing_real_model_calls");
    expect(result.failureCategory).toBe("infra");
  });

  it("classifies empty output from failed model calls as a model failure instead of citation quality", () => {
    const result = scoreRealRunDetail({
      evalCase: baseCase,
      turnIndex: 0,
      runDetail: {
        ...completedRun,
        status: "failed",
        outputMarkdown: "",
        modelCalls: [
          {
            id: "model-failed",
            model: "deepseek-v4-flash",
            status: "failed",
            tokenInput: 1200,
            tokenOutput: 0,
            costCents: 0,
            latencyMs: 500,
            error: "Insufficient Balance",
          },
        ],
      },
      latencyMs: 4200,
    });

    expect(result.failureCategory).toBe("model");
    expect(result.failureStage).toBe("model_generation");
    expect(result.failureReasons).toContain("model_unavailable");
    expect(result.failureReasons).not.toContain("citation_precision_low");
    expect(result.failureReasons).not.toContain("memory_write_miss");
  });

  it("builds reports from real run ids and process data", () => {
    const result = scoreRealRunDetail({
      evalCase: baseCase,
      turnIndex: 0,
      runDetail: completedRun,
      latencyMs: 4200,
    });
    const report = buildRealEvalReport([result]);
    const parsed = JSON.parse(report.json) as { summary: { total: number; terminal_rate: number }; results: unknown[] };

    expect(report.markdown).toContain("真实 Agent Eval Report");
    expect(report.markdown).toContain("run-real-1");
    expect(report.markdown).toContain("工具失败分布");
    expect(report.markdown).toContain("模型失败分布");
    expect(parsed.summary.total).toBe(1);
    expect(parsed.summary.terminal_rate).toBe(1);
    expect(parsed.results).toHaveLength(1);
  });

  it("keeps pnpm eval free of fabricated answer/evidence construction", () => {
    const script = readFileSync("scripts/run-eval.ts", "utf8");

    expect(script).not.toContain("evaluateRunSnapshot");
    expect(script).not.toContain("outputMarkdown:");
    expect(script).not.toContain("toolResults:");
    expect(script).not.toContain("ragHits:");
  });
});
