import { describe, expect, it } from "vitest";
import { buildResumePayloadFromMessage, isSupplementForInterruptedRun } from "@/agents/interrupted-resume";

describe("interrupted run resume helpers", () => {
  const missingStockAndPosition = {
    id: "run-1",
    status: "interrupted",
    outputJson: {
      interrupt: {
        type: "missing_input",
        missingInputs: ["stockCode", "positionPercent"],
      },
    },
  };

  it("treats short stock names and codes as supplements for interrupted runs", () => {
    expect(isSupplementForInterruptedRun("永兴材料", missingStockAndPosition)).toBe(true);
    expect(isSupplementForInterruptedRun("002756", missingStockAndPosition)).toBe(true);
    expect(isSupplementForInterruptedRun("重新研究有色金属行业", missingStockAndPosition)).toBe(false);
  });

  it("builds structured resume payload from short supplement messages", () => {
    expect(buildResumePayloadFromMessage("永兴材料")).toMatchObject({ stockCodeOrName: "永兴材料" });
    expect(buildResumePayloadFromMessage("002756")).toMatchObject({ stockCode: "002756", stockCodeOrName: "002756" });
    expect(buildResumePayloadFromMessage("仓位三成")).toMatchObject({ positionPercent: 30 });
    expect(buildResumePayloadFromMessage("确认")).toMatchObject({ riskConfirmed: true });
  });

  it("treats confirmation messages as supplements for risk-confirm interrupts", () => {
    expect(
      isSupplementForInterruptedRun("yes", {
        id: "run-risk",
        status: "interrupted",
        outputJson: { interrupt: { type: "risk_confirm" } },
      })
    ).toBe(true);
  });
});
