import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarketOverviewView } from "@/components/workbench/market-overview-view";
import type { MarketOverview } from "@/lib/market-overview";

function overviewFor(indexCode: string): MarketOverview {
  const candles = [
    { date: "2026-06-30", open: 3810, close: 3820, low: 3790, high: 3830, previousClose: 3800, volume: 51100000000, amount: 920000000000 },
    { date: "2026-07-16", open: 3890, close: 3880, low: 3865, high: 3915, previousClose: 3900, volume: 53300000000, amount: 960000000000 },
    { date: "2026-07-22", open: 3839.66, close: 3867.03, low: 3839.66, high: 3884.43, previousClose: 3864.36, volume: 61425521500, amount: 1258148128160 },
    { date: "2026-07-23", open: 3868.08, close: 3876.78, low: 3851.7, high: 3878.83, previousClose: 3867.03, volume: 56212260100, amount: 1025875517700 },
    { date: "2026-07-24", open: 3853.63, close: 3829.11, low: 3816.48, high: 3861.04, previousClose: 3876.78, volume: 434786455, amount: 789106691786 },
  ];
  return {
    selectedIndexCode: indexCode,
    updatedAt: "2026-07-24 14:24:27",
    sourceErrors: [],
    indexQuotes: [
      {
        code: "000001",
        name: "上证指数",
        current: 3829.11,
        previousClose: 3876.78,
        open: 3853.63,
        high: 3861.04,
        low: 3816.48,
        changeRatio: -0.0123,
        volume: 434786455,
        amount: 789106691786,
        dataTime: "2026-07-24 14:24:27",
      },
      {
        code: "399001",
        name: "深证成指",
        current: 13874.17,
        previousClose: 14123.31,
        open: 13915.04,
        high: 14061.03,
        low: 13800.13,
        changeRatio: -0.0176,
        volume: 488133483,
        amount: 878013408915,
        dataTime: "2026-07-24 14:24:18",
      },
    ],
    candles,
    chartSeries: {
      intraday: [
        { date: "2026-07-24 09:31", open: 3853.63, close: 3845.13, low: 3845.13, high: 3854.94, previousClose: null, volume: 19774082, amount: 31193776896 },
        { date: "2026-07-24 09:32", open: 3845.13, close: 3849.77, low: 3843.62, high: 3850.25, previousClose: null, volume: 16222512, amount: 26601935210 },
      ],
      daily: candles,
      weekly: [
        { date: "2026-06-29", open: 3810, close: 3820, low: 3790, high: 3830, previousClose: 3800, volume: 51100000000, amount: 920000000000 },
        { date: "2026-07-13", open: 3890, close: 3880, low: 3865, high: 3915, previousClose: 3900, volume: 53300000000, amount: 960000000000 },
        { date: "2026-07-20", open: 3839.66, close: 3829.11, low: 3816.48, high: 3884.43, previousClose: 3864.36, volume: 118000000000, amount: 3070000000000 },
      ],
      monthly: [
        { date: "2026-06-01", open: 3810, close: 3820, low: 3790, high: 3830, previousClose: 3800, volume: 51100000000, amount: 920000000000 },
        { date: "2026-07-01", open: 3890, close: 3829.11, low: 3816.48, high: 3915, previousClose: 3900, volume: 225000000000, amount: 4930000000000 },
      ],
    },
    indexMetrics: {
      rangeGains: {
        code: "000001",
        name: "上证指数",
        return1d: -0.0123,
        return1w: -0.028,
        return1m: 0.045,
        return3m: 0.051,
        return6m: -0.012,
        return1y: 0.082,
        returnYtd: 0.123,
        source: "investoday",
        sourceLabel: "今日投资 index/range-gains",
      },
    },
    breadth: {
      dataTime: "2026-07-24 14:22:43",
      up: 721,
      down: 4768,
      flat: 37,
      total: 5526,
      upLimit: 43,
      downLimit: 16,
      upOver8: 27,
      downOver8: 55,
      upRatio: 0.1304,
      extremeRatio: 0.0255,
      buckets: [
        { label: "涨停", value: 43, tone: "up" },
        { label: "0-2%", value: 419, tone: "up" },
        { label: "平盘", value: 37, tone: "flat" },
        { label: "-2--6%", value: 2921, tone: "down" },
        { label: "跌停", value: 16, tone: "down" },
      ],
    },
    industries: [
      {
        code: "340000",
        name: "食品饮料",
        price: 11822.5,
        changeRatio: 0.0112,
        changeRatio1W: 0.024,
        volume: 100,
        totalValue: 6850000000000,
        ratioRank: 1,
        stockUp: 82,
        stockDown: 41,
        stockFlat: 1,
        stockTotal: 124,
        leadStockCode: "600519",
        leadStockName: "贵州茅台",
        signal: {
          return1d: 0.0112,
          return1w: 0.024,
          return1m: 0.052,
          netMainInflow1dMn: 12000,
          netMainInflow5dMn: 42000,
          netMainInflow20dMn: 88000,
          pePct5y: 0.61,
          pbPct5y: 0.42,
          psPct5y: 0.77,
        },
      },
      {
        code: "710000",
        name: "计算机",
        price: 4223.44,
        changeRatio: -0.0289,
        changeRatio1W: -0.0042,
        volume: 48058218,
        totalValue: 3983044355096,
        ratioRank: 26,
        stockUp: 38,
        stockDown: 318,
        stockFlat: 2,
        stockTotal: 358,
        leadStockCode: "002298",
        leadStockName: "中电鑫龙",
        signal: {
          return1d: -0.0289,
          return1w: -0.0042,
          return1m: -0.031,
          netMainInflow1dMn: -9000,
          netMainInflow5dMn: -38000,
          netMainInflow20dMn: -76000,
          pePct5y: 0.35,
          pbPct5y: 0.31,
          psPct5y: 0.29,
        },
      },
    ],
  };
}

describe("MarketOverviewView", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const indexCode = url.includes("399001") ? "399001" : "000001";
        return {
          ok: true,
          json: async () => overviewFor(indexCode),
          text: async () => JSON.stringify(overviewFor(indexCode)),
        } as Response;
      })
    );
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe() {}
        disconnect() {}
        unobserve() {}
      }
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the visual market dashboard after loading data", async () => {
    render(<MarketOverviewView setLoading={vi.fn()} setNotice={vi.fn()} />);

    expect(screen.getByText("正在加载大盘数据")).not.toBeNull();
    await screen.findByText("上证指数");

    expect(screen.getByText("K线与量能")).not.toBeNull();
    expect(screen.getByRole("button", { name: "分时K" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "日K" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "周K" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "月K" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "MA" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "BOLL" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "MACD" })).not.toBeNull();
    expect(screen.getByText("区间表现")).not.toBeNull();
    expect(screen.getByText("今日")).not.toBeNull();
    expect(screen.getByText("过去一周")).not.toBeNull();
    expect(screen.getByText("过去一月")).not.toBeNull();
    expect(screen.getByText("今年以来")).not.toBeNull();
    expect(screen.getAllByText(/单位：%/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/PE/)).toBeNull();
    expect(screen.queryByText(/PB/)).toBeNull();
    expect(screen.queryByText(/PE百分位/)).toBeNull();
    expect(screen.queryByText(/股息率/)).toBeNull();
    expect(screen.getByText("赚钱效应")).not.toBeNull();
    expect(screen.queryByText("盘面温度")).toBeNull();
    expect(screen.queryByText("极端波动")).toBeNull();
    expect(screen.queryByText(/市场温度/)).toBeNull();
    expect(screen.getByText("行业资金流向")).not.toBeNull();
    expect(screen.getByText("今日行业气泡")).not.toBeNull();
    expect(screen.getByText("近一周行业气泡")).not.toBeNull();
    expect(screen.queryByText("板块强弱")).toBeNull();
    expect(screen.getAllByText("食品饮料").length).toBeGreaterThan(0);
    expect(screen.getAllByText("计算机").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("今日行业气泡图")).not.toBeNull();
    expect(screen.getByLabelText("近一周行业气泡图")).not.toBeNull();
    expect(screen.getByText(/分时K：东方财富公开行情/)).not.toBeNull();
    expect(screen.getByText(/区间涨跌：今日投资 index\/range-gains/)).not.toBeNull();
  });

  it("switches market chart timeframe without refetching structural market data", async () => {
    render(<MarketOverviewView setLoading={vi.fn()} setNotice={vi.fn()} />);

    await screen.findByText("上证指数");
    expect(screen.getByLabelText("指数分时K图")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "周K" }));
    expect(screen.getByLabelText("指数周K图")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "月K" }));
    expect(screen.getByLabelText("指数月K图")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "分时K" }));
    expect(screen.getByLabelText("指数分时K图")).not.toBeNull();
  });

  it("refetches data when a different index pill is selected", async () => {
    render(<MarketOverviewView setLoading={vi.fn()} setNotice={vi.fn()} />);

    await screen.findByText("深证成指");
    fireEvent.click(screen.getByRole("button", { name: /深证成指/ }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/market-overview?indexCode=399001", { cache: "no-store" });
    });
  });

  it("shows a recoverable error state when the market request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: "network down" }),
        text: async () => "network down",
      }))
    );

    render(<MarketOverviewView setLoading={vi.fn()} setNotice={vi.fn()} />);

    await screen.findByText("大盘数据获取失败");
    expect(screen.getByRole("button", { name: "重试" })).not.toBeNull();
  });
});
