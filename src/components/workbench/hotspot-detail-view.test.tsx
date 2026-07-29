import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HotspotDetailView } from "@/components/workbench/hotspot-detail-view";
import type { HotspotDetail } from "@/components/workbench/types";

const sampleDetail: HotspotDetail = {
  sourceEndpoint: "industry-quote/stock-realtime",
  hotspot: {
    type: "industry",
    code: "270000",
    name: "电子",
    changeRatio: -0.0702,
    changeRatio1W: -0.077,
    ratioRank: 31,
    stockUp: 79,
    stockDown: 426,
    stockFlat: 9,
    stockTotal: 3,
    limitUp: 8,
    leadStockCode: "301421",
    leadStockName: "C长鑫",
    totalValue: 3772545686120,
    dataTime: "2026-07-28 15:09:09",
  },
  stocks: [
    {
      code: "002860",
      name: "星帅尔",
      marketType: "SZ",
      currentPrice: 19.56,
      changeRatio: 0.059,
      openPrice: 18.5,
      previousClose: 18.47,
      highPrice: 19.88,
      lowPrice: 17.6,
      dataTime: "2026-07-28 15:09:09",
    },
    {
      code: "688496",
      name: "*ST清越",
      marketType: "SH",
      currentPrice: 1.07,
      changeRatio: 0.2022,
      openPrice: 1.02,
      previousClose: 0.89,
      highPrice: 1.07,
      lowPrice: 1,
      dataTime: "2026-07-28 15:09:09",
    },
    {
      code: "000045",
      name: "深纺织A",
      marketType: "SZ",
      currentPrice: 9.96,
      changeRatio: -0.041,
      openPrice: 9.3,
      previousClose: 10.39,
      highPrice: 9.96,
      lowPrice: 9.29,
      dataTime: "2026-07-28 15:09:09",
    },
  ],
};

function okJson(payload: unknown, status = 201) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as Response;
}

function rowNames() {
  const list = screen.getByRole("list", { name: "电子 成分股涨跌幅" });
  return within(list)
    .getAllByRole("listitem")
    .map((row) => within(row).getByRole("heading", { level: 3 }).textContent);
}

describe("HotspotDetailView", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => okJson({ id: "target-1" })));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders full component stocks with default gain sorting and A-share colors", () => {
    render(<HotspotDetailView detail={sampleDetail} />);

    expect(screen.getByRole("heading", { name: "电子" })).not.toBeNull();
    expect(screen.getByText("行业热点")).not.toBeNull();
    expect(screen.getByText("-7.02%").className).toContain("market-down");
    expect(screen.getByText("上涨家数")).not.toBeNull();
    expect(screen.getByText("成分股涨跌幅")).not.toBeNull();
    expect(screen.getByText("3 只")).not.toBeNull();
    expect(rowNames()).toEqual(["*ST清越", "星帅尔", "深纺织A"]);

    const list = screen.getByRole("list", { name: "电子 成分股涨跌幅" });
    const rows = within(list).getAllByRole("listitem");
    expect(within(rows[0]).getByText("+20.22%").className).toContain("market-up");
    expect(within(rows[2]).getByText("-4.10%").className).toContain("market-down");
  });

  it("switches stock sorting between losses first and gains first", () => {
    render(<HotspotDetailView detail={sampleDetail} />);

    fireEvent.click(screen.getByRole("button", { name: "跌幅升序" }));

    expect(rowNames()).toEqual(["深纺织A", "星帅尔", "*ST清越"]);
    expect(screen.getByRole("button", { name: "跌幅升序" }).className).toContain("hotspot-sort-button-active-down");

    fireEvent.click(screen.getByRole("button", { name: "涨幅降序" }));

    expect(rowNames()).toEqual(["*ST清越", "星帅尔", "深纺织A"]);
    expect(screen.getByRole("button", { name: "涨幅降序" }).className).toContain("hotspot-sort-button-active-up");
  });

  it("falls back to leader wording when returned stocks are only a sample", () => {
    render(
      <HotspotDetailView
        detail={{
          ...sampleDetail,
          hotspot: { ...sampleDetail.hotspot, stockTotal: 514 },
        }}
      />
    );

    expect(screen.getByText("领涨股")).not.toBeNull();
    expect(screen.getByText("已返回 3 / 共 514")).not.toBeNull();
    expect(screen.getByRole("list", { name: "电子 领涨股" })).not.toBeNull();
  });

  it("uses the down hero tone when the hotspot is falling", () => {
    render(<HotspotDetailView detail={sampleDetail} />);

    expect(screen.getByRole("region", { name: "电子热点详情" }).className).toContain("hotspot-detail-down");
  });

  it("adds an individual component stock to the watchlist", async () => {
    render(<HotspotDetailView detail={sampleDetail} />);

    fireEvent.click(screen.getByRole("button", { name: "加入自选 星帅尔" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/watch-targets",
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = JSON.parse((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).toMatchObject({
      type: "stock",
      code: "002860",
      name: "星帅尔",
    });
    expect(body.tags).toContain("热点滚动");
    expect(body.reason).toContain("电子");
    const addedButton = await screen.findByRole("button", { name: "已加入 星帅尔" });
    expect((addedButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("marks duplicate stocks as already selected", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okJson({ error: "该自选对象已在自选池中" }, 409)));

    render(<HotspotDetailView detail={sampleDetail} />);

    fireEvent.click(screen.getByRole("button", { name: "加入自选 星帅尔" }));

    const duplicateButton = await screen.findByRole("button", { name: "已在自选 星帅尔" });
    expect((duplicateButton as HTMLButtonElement).disabled).toBe(true);
  });
});
