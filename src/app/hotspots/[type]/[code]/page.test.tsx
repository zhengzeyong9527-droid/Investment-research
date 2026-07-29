import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HotspotPage from "./page";
import { fetchHotspotDetail } from "@/lib/hotspots";
import type { HotspotDetail } from "@/lib/hotspots";

vi.mock("@/lib/hotspots", () => ({
  fetchHotspotDetail: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

const sampleDetail: HotspotDetail = {
  sourceEndpoint: "concept-quote/stock-realtime",
  hotspot: {
    type: "concept",
    code: "14020004",
    name: "鸡尾酒",
    changeRatio: 0.04915,
    changeRatio1W: 0.0299,
    ratioRank: 1,
    stockUp: 1,
    stockDown: 1,
    stockFlat: 0,
    stockTotal: 2,
    limitUp: 1,
    leadStockCode: "002387",
    leadStockName: "维信诺",
    totalValue: 27998837529,
    dataTime: "2026-07-28 11:14:32",
  },
  stocks: [
    {
      code: "002387",
      name: "维信诺",
      marketType: "SZ",
      currentPrice: 11.3,
      changeRatio: 0.1,
      openPrice: 10.28,
      previousClose: 10.27,
      highPrice: 11.3,
      lowPrice: 10.28,
      dataTime: "2026-07-28 11:14:32",
    },
  ],
};

describe("HotspotPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("fetches the hotspot detail from route params and renders it", async () => {
    vi.mocked(fetchHotspotDetail).mockResolvedValue(sampleDetail);

    render(await HotspotPage({ params: Promise.resolve({ type: "concept", code: "14020004" }) }));

    expect(fetchHotspotDetail).toHaveBeenCalledWith({ type: "concept", code: "14020004" });
    expect(screen.getByRole("heading", { name: "鸡尾酒" })).not.toBeNull();
    expect(screen.getByText("概念热点")).not.toBeNull();
    expect(screen.getByText("维信诺")).not.toBeNull();
  });
});
