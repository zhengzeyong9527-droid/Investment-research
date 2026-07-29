import { describe, expect, it } from "vitest";
import { planMultiIntent } from "@/agents/intent-planner";

describe("multi intent planner", () => {
  it("uses unwind advice as primary intent and lithium context as supporting intent", () => {
    const plan = planMultiIntent({
      question: "我的永兴材料被套40%，短期碳酸锂会涨吗",
      inputPayload: { stockCode: "002756", stockName: "永兴材料", industryName: "锂", conceptName: "锂概念" },
      resolvedEntities: {
        stock: { code: "002756", name: "永兴材料", type: "stock" },
        industry: { code: "240603", name: "锂", type: "industry" },
        concept: { code: "14050010", name: "锂概念", type: "concept" },
      },
    });

    expect(plan).toMatchObject({
      primaryIntent: "unwind_advice",
      primarySkillKey: "investoday-ai-unwind-advisor",
      executionMode: "primary_with_tools",
      secondaryIntents: expect.arrayContaining(["company_context", "industry_context", "concept_trend"]),
    });
  });

  it("keeps company research primary when a stock question also asks about reports and industry risk", () => {
    const plan = planMultiIntent({
      question: "研究贵州茅台近30天研报和白酒行业风险",
      inputPayload: { stockCode: "600519", stockName: "贵州茅台", industryName: "白酒" },
      resolvedEntities: {
        stock: { code: "600519", name: "贵州茅台", type: "stock" },
        industry: { code: "340500", name: "白酒", type: "industry" },
      },
    });

    expect(plan).toMatchObject({
      primaryIntent: "stock_research",
      primarySkillKey: "investoday-stock-research-interpretation",
      secondaryIntents: expect.arrayContaining(["report_evidence", "industry_context"]),
    });
  });

  it("honors manually selected ability while preserving supporting entities", () => {
    const plan = planMultiIntent({
      question: "研究贵州茅台和白酒行业",
      inputPayload: { stockName: "贵州茅台", industryName: "白酒" },
      forcedSkillKey: "investoday-industry-chief-analyst",
      resolvedEntities: {
        stock: { code: "600519", name: "贵州茅台", type: "stock" },
        industry: { code: "340500", name: "白酒", type: "industry" },
      },
    });

    expect(plan).toMatchObject({
      primaryIntent: "industry_research",
      primarySkillKey: "investoday-industry-chief-analyst",
      secondaryIntents: expect.arrayContaining(["company_context"]),
    });
  });
});
