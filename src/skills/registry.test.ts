import { describe, expect, it } from "vitest";
import { getSkillManifest, loadSkillDefinition } from "@/skills/registry";

describe("skill registry", () => {
  it("loads the completed market broadcast skill package from the project skills directory", async () => {
    const manifest = getSkillManifest("investoday-stock-market-broadcast");

    expect(manifest).toMatchObject({
      skillKey: "investoday-stock-market-broadcast",
      skillPath: "skills/investoday-stock-market-broadcast/SKILL.md",
      version: "1.4.1",
      requires: ["investoday-finance-data"],
      outputType: "json_markdown",
      riskLevel: "normal",
    });

    const definition = await loadSkillDefinition("investoday-stock-market-broadcast");

    expect(definition.markdown).toContain("investoday-finance-data");
    expect(definition.manifest.complianceRules).toEqual(
      expect.arrayContaining([
        "no_buy_sell_points",
        "no_position_advice",
        "no_target_price",
        "no_stop_loss_take_profit",
        "no_trading_timing",
      ])
    );
  });
});
