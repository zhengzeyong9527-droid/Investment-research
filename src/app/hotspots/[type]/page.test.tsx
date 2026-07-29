import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HotspotListPage from "./page";
import { fetchHotspotList } from "@/lib/hotspots";
import type { RollingHotspot } from "@/lib/hotspots";

vi.mock("@/lib/hotspots", () => ({
  fetchHotspotList: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

describe("HotspotListPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("fetches industry gain and decline lists for the all-industries page", async () => {
    vi.mocked(fetchHotspotList)
      .mockResolvedValueOnce({ items: [hotspot({ name: "食品饮料", code: "340000", changeRatio: 0.0214 })], updatedAt: "2026-07-28 15:15:34" })
      .mockResolvedValueOnce({ items: [hotspot({ name: "通信", code: "730000", changeRatio: -0.1088 })], updatedAt: "2026-07-28 15:15:34" });

    render(await HotspotListPage({ params: Promise.resolve({ type: "industry" }) }));

    expect(fetchHotspotList).toHaveBeenNthCalledWith(1, { type: "industry", order: "desc", pageSize: 40 });
    expect(fetchHotspotList).toHaveBeenNthCalledWith(2, { type: "industry", order: "asc", pageSize: 40 });
    expect(screen.getByRole("heading", { name: "全部行业" })).not.toBeNull();
  });

  it("uses a larger page size for the all-concepts page", async () => {
    vi.mocked(fetchHotspotList)
      .mockResolvedValueOnce({ items: [hotspot({ type: "concept", name: "鸡尾酒", code: "14020004", changeRatio: 0.0528 })], updatedAt: "2026-07-28 15:15:34" })
      .mockResolvedValueOnce({ items: [hotspot({ type: "concept", name: "博通概念", code: "15032397", changeRatio: -0.0965 })], updatedAt: "2026-07-28 15:15:34" });

    render(await HotspotListPage({ params: Promise.resolve({ type: "concept" }) }));

    expect(fetchHotspotList).toHaveBeenNthCalledWith(1, { type: "concept", order: "desc", pageSize: 1000 });
    expect(fetchHotspotList).toHaveBeenNthCalledWith(2, { type: "concept", order: "asc", pageSize: 1000 });
    expect(screen.getByRole("heading", { name: "全部概念" })).not.toBeNull();
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
    stockTotal: 1,
    limitUp: 0,
    leadStockCode: "",
    leadStockName: "",
    totalValue: null,
    dataTime: "2026-07-28 15:15:34",
    ...input,
  };
}
