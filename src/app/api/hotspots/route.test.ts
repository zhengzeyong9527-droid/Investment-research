import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getHotspotList } from "@/app/api/hotspots/[type]/route";
import { GET as getHotspots } from "@/app/api/hotspots/route";
import { GET as getHotspotDetail } from "@/app/api/hotspots/[type]/[code]/route";
import { fetchHotspotDetail, fetchHotspotList, fetchHotspots } from "@/lib/hotspots";

vi.mock("@/lib/hotspots", () => ({
  fetchHotspots: vi.fn(),
  fetchHotspotList: vi.fn(),
  fetchHotspotDetail: vi.fn(),
}));

describe("hotspot API routes", () => {
  beforeEach(() => {
    vi.mocked(fetchHotspots).mockReset();
    vi.mocked(fetchHotspotList).mockReset();
    vi.mocked(fetchHotspotDetail).mockReset();
  });

  it("returns rolling hotspots with an optional page size", async () => {
    vi.mocked(fetchHotspots).mockResolvedValue({
      industries: [],
      industryDeclines: [],
      concepts: [],
      conceptDeclines: [],
      updatedAt: "2026-07-28 11:14:32",
      sourceErrors: [],
    });

    const response = await getHotspots(new Request("http://localhost/api/hotspots"));

    expect(fetchHotspots).toHaveBeenCalledWith();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ updatedAt: "2026-07-28 11:14:32" });
  });

  it("returns a full hotspot list for a type with order and page size", async () => {
    vi.mocked(fetchHotspotList).mockResolvedValue({
      items: [
        {
          type: "industry",
          code: "730000",
          name: "通信",
          changeRatio: -0.1088,
          changeRatio1W: null,
          ratioRank: 31,
          stockUp: 5,
          stockDown: 98,
          stockFlat: 0,
          stockTotal: 103,
          limitUp: 0,
          leadStockCode: "",
          leadStockName: "",
          totalValue: null,
          dataTime: "2026-07-28 15:15:34",
        },
      ],
      updatedAt: "2026-07-28 15:15:34",
    });

    const response = await getHotspotList(new Request("http://localhost/api/hotspots/industry?order=asc&pageSize=40"), {
      params: Promise.resolve({ type: "industry" }),
    });

    expect(fetchHotspotList).toHaveBeenCalledWith({ type: "industry", order: "asc", pageSize: 40 });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ items: [{ name: "通信" }] });
  });

  it("returns a detail payload for an industry or concept hotspot", async () => {
    vi.mocked(fetchHotspotDetail).mockResolvedValue({
      hotspot: {
        type: "industry",
        code: "330000",
        name: "家用电器",
        changeRatio: 0.0045,
        changeRatio1W: null,
        ratioRank: 6,
        stockUp: 61,
        stockDown: 41,
        stockFlat: 1,
        stockTotal: 103,
        limitUp: 1,
        leadStockCode: "600619",
        leadStockName: "海立股份",
        totalValue: null,
        dataTime: "2026-07-28 11:11:14",
      },
      stocks: [],
      sourceEndpoint: "industry-quote/stock-realtime",
    });

    const response = await getHotspotDetail(new Request("http://localhost/api/hotspots/industry/330000"), {
      params: Promise.resolve({ type: "industry", code: "330000" }),
    });

    expect(fetchHotspotDetail).toHaveBeenCalledWith({ type: "industry", code: "330000" });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ hotspot: { name: "家用电器" } });
  });

  it("rejects unknown hotspot detail types", async () => {
    const response = await getHotspotDetail(new Request("http://localhost/api/hotspots/unknown/330000"), {
      params: Promise.resolve({ type: "unknown", code: "330000" }),
    });

    expect(fetchHotspotDetail).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
  });
});
