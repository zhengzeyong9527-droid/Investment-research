import { describe, expect, it } from "vitest";
import { buildEvalReport, evaluateRunSnapshot, smokeEvalCases } from "@/eval/runner";

describe("agent eval runner", () => {
  it("ships at least 50 benchmark cases with smoke cases marked", () => {
    const cases = smokeEvalCases();

    expect(cases.length).toBeGreaterThanOrEqual(50);
    expect(cases.filter((item) => item.tags.includes("smoke")).length).toBeGreaterThanOrEqual(5);
    expect(cases.map((item) => item.agentKey)).toContain("research-router-agent");
    expect(cases.map((item) => item.agentKey)).toContain("market-broadcast-agent");
  });

  it("scores completion, tool success, citation precision, rag recall, latency, and cost", () => {
    const result = evaluateRunSnapshot({
      caseId: "case-1",
      outputMarkdown: "结论引用 [1]，风险来自本地文档。",
      expectedCitations: ["[1]"],
      evidence: [{ title: "证据1" }],
      toolResults: [{ toolKey: "rag.search", ok: true, latencyMs: 10 }],
      ragHits: [{ chunkId: "chunk-1", documentId: "doc-1", score: 0.8 }],
      latencyMs: 1200,
      costCents: 3,
    });

    expect(result.metrics).toMatchObject({
      completion: 1,
      toolSuccessRate: 1,
      citationPrecision: 1,
      ragRecallAtK: 1,
      latencyMs: 1200,
      costCents: 3,
    });
    expect(result.passed).toBe(true);
  });

  it("renders markdown and json reports", () => {
    const report = buildEvalReport([
      {
        caseId: "case-1",
        passed: true,
        score: 0.9,
        metrics: {
          completion: 1,
          toolSuccessRate: 1,
          citationPrecision: 1,
          ragRecallAtK: 1,
          hallucinationRate: 0,
          latencyMs: 100,
          costCents: 1,
        },
        notes: [],
      },
    ]);

    expect(report.markdown).toContain("Agent Eval Report");
    expect(report.markdown).toContain("tool_success");
    expect(JSON.parse(report.json).summary.total).toBe(1);
  });
});
