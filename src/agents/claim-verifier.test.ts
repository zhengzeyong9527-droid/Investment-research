import { describe, expect, it } from "vitest";
import { gradeEvidence } from "@/agents/evidence-grading";
import { verifyAgentOutput } from "@/agents/output-verifier";
import type { EvidenceRecordInput } from "@/lib/agent";

const evidence: EvidenceRecordInput[] = [
  {
    kind: "research",
    title: "中信证券《贵州茅台渠道风险跟踪报告》",
    source: "中信证券",
    publishedAt: new Date("2026-07-20"),
    summary: "贵州茅台 600519 渠道批价承压，库存压力仍需观察。目标价 1680 元，预计收入增长 8%。",
    sourceEndpoint: "research/report",
    rawPayload: { stockCode: "600519", stockName: "贵州茅台", rating: "增持" },
  },
];

describe("claim verifier", () => {
  it("flags fabricated report titles", () => {
    const verification = verify("引用银河证券《贵州茅台业绩爆发深度报告》认为目标价 1680 元。");

    expect(verification.claimVerification.blockingUnsupportedClaims).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "report_title", text: "贵州茅台业绩爆发深度报告" })])
    );
    expect(verification.passed).toBe(false);
  });

  it("flags unsupported numbers, dates, and institutions", () => {
    const verification = verify("华泰证券在 2026-08-01 给出目标价 2200 元，并判断收入增长 25%。");

    expect(verification.claimVerification.blockingUnsupportedClaims).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "institution", text: "华泰证券" }),
        expect.objectContaining({ type: "number", text: expect.stringContaining("2200") }),
        expect.objectContaining({ type: "number", text: expect.stringContaining("25%") }),
      ])
    );
  });

  it("supports normalized stock entity matches across code and name", () => {
    const verification = verify("贵州茅台 600519 的渠道风险仍需要观察，目标价 1680 元。");

    expect(verification.claimVerification.blockingUnsupportedClaims).toHaveLength(0);
    expect(verification.claimVerification.supportedClaims).toEqual(expect.arrayContaining([expect.objectContaining({ type: "entity" })]));
  });

  it("blocks strong conclusions when evidence completeness fails", () => {
    const evidenceGrade = gradeEvidence({
      skillKey: "investoday-stock-research-interpretation",
      normalizedInput: { stockCodeOrName: "600519" },
      evidence: [],
    });
    const verification = verifyAgentOutput({
      markdown: "确定可以买入，建议重仓。",
      inputPayload: { stockCodeOrName: "600519" },
      evidence: [],
      evidenceGrade,
    });

    expect(verification.claimVerification.blockingUnsupportedClaims).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "strong_conclusion" })])
    );
    expect(verification.passed).toBe(false);
  });
});

function verify(markdown: string) {
  const evidenceGrade = gradeEvidence({
    skillKey: "investoday-stock-research-interpretation",
    normalizedInput: { stockCodeOrName: "600519", stockName: "贵州茅台" },
    evidence,
  });
  return verifyAgentOutput({
    markdown,
    inputPayload: { stockCodeOrName: "600519", stockName: "贵州茅台" },
    evidence,
    evidenceGrade,
  });
}
