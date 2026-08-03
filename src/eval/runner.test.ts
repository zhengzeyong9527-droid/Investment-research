import { describe, expect, it } from "vitest";
import { buildEvalReport, evaluateRunSnapshot, scoreRealRunDetail, smokeEvalCases } from "@/eval/runner";

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

  it("uses claim verification as the real hallucination metric source", () => {
    const result = scoreRealRunDetail({
      evalCase: {
        id: "real-claim",
        name: "claim hallucination",
        agentKey: "research-router-agent",
        tags: [],
        turns: [{ prompt: "研究贵州茅台", expected: {} }],
      },
      turnIndex: 0,
      latencyMs: 100,
      runDetail: {
        id: "run-1",
        status: "completed",
        outputMarkdown: "有输出且有证据。",
        outputJson: {
          graphState: {
            verification: {
              claimVerification: { hallucinationRate: 0.42 },
            },
          },
        },
        toolCalls: [{ toolKey: "stock.briefItems", status: "completed" }],
        evidenceRecords: [{ title: "证据", source: "source", summary: "summary" }],
        modelCalls: [{ model: "test", status: "completed" }],
      },
    });

    expect(result.metrics.hallucination_rate).toBe(0.42);
  });
});
