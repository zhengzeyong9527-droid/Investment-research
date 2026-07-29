import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HotspotListView } from "@/components/workbench/hotspot-list-view";
import type { RollingHotspot } from "@/lib/hotspots";

const gains: RollingHotspot[] = [
  hotspot({ code: "340000", name: "食品饮料", changeRatio: 0.0214, stockUp: 110, stockDown: 16 }),
  hotspot({ code: "450000", name: "商贸零售", changeRatio: 0.0153, stockUp: 74, stockDown: 13 }),
];

const declines: RollingHotspot[] = [
  hotspot({ code: "730000", name: "通信", changeRatio: -0.1088, stockUp: 5, stockDown: 98 }),
  hotspot({ code: "270000", name: "电子", changeRatio: -0.0702, stockUp: 19, stockDown: 493 }),
];

describe("HotspotListView", () => {
  afterEach(() => cleanup());

  it("renders all hotspots and links each row to component-stock detail", () => {
    render(<HotspotListView type="industry" gains={gains} declines={declines} updatedAt="2026-07-28 15:15:34" />);

    expect(screen.getByRole("heading", { name: "全部行业" })).not.toBeNull();
    expect(screen.getByText("2 个")).not.toBeNull();
    expect(screen.getByRole("link", { name: /食品饮料/ }).getAttribute("href")).toBe("/hotspots/industry/340000");
    expect(screen.getByRole("link", { name: /商贸零售/ }).getAttribute("href")).toBe("/hotspots/industry/450000");
  });

  it("switches to decline ranking and filters by name or code", () => {
    render(<HotspotListView type="industry" gains={gains} declines={declines} updatedAt="2026-07-28 15:15:34" />);

    fireEvent.click(screen.getByRole("button", { name: "跌幅" }));

    expect(screen.getByRole("link", { name: /通信/ }).getAttribute("href")).toBe("/hotspots/industry/730000");
    expect(screen.queryByText("食品饮料")).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("搜索名称或代码"), { target: { value: "270000" } });

    expect(screen.getByRole("link", { name: /电子/ }).getAttribute("href")).toBe("/hotspots/industry/270000");
    expect(screen.queryByText("通信")).toBeNull();
  });
});

function hotspot(input: Partial<RollingHotspot> & Pick<RollingHotspot, "code" | "name" | "changeRatio">): RollingHotspot {
  return {
    type: "industry",
    changeRatio1W: null,
    ratioRank: null,
    stockUp: 0,
    stockDown: 0,
    stockFlat: 0,
    stockTotal: 126,
    limitUp: 0,
    leadStockCode: "",
    leadStockName: "",
    totalValue: null,
    dataTime: "2026-07-28 15:15:34",
    ...input,
  };
}
