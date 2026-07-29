import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkbenchApp } from "./workbench-app";
import type { DailyBrief } from "./workbench/types";
import type { HotspotOverview } from "@/lib/hotspots";
import type { MarketOverview } from "@/lib/market-overview";

const sampleBrief: DailyBrief = {
  id: "brief-1",
  briefDate: "2026-07-24",
  status: "success",
  summary: "覆盖 1 个启用自选对象，获取 3 条内容：新闻 1 条、研报 1 条、公告 1 条。",
  generatedAt: "2026-07-24T00:30:00.000Z",
  windowStart: "2026-07-23T00:30:00.000Z",
  windowEnd: "2026-07-24T00:30:00.000Z",
  items: [
    {
      id: "item-news-important",
      kind: "news",
      title: "重要新闻",
      source: "新闻数据",
      publishedAt: "2026-07-24T02:00:00.000Z",
      summary: "重要新闻摘要。",
      sentimentValue: 4,
      sentimentLabel: "中性偏多",
      sentimentTone: "positive",
      sentimentScore: 1.5,
      newsLevelValue: 1,
      newsLevelLabel: "重要",
      newsTypeValue: 2,
      newsTypeLabel: "行业",
      relevance: 5,
      displaySections: [{ title: "机会线索", fields: [{ label: "机会线索", kind: "bullets", items: ["产业趋势改善。"] }] }],
      target: { id: "target-1", type: "stock", code: "600519", name: "贵州茅台", tags: [], reason: "", enabled: true },
    },
    {
      id: "item-news-normal",
      kind: "news",
      title: "普通新闻不应出现",
      source: "新闻数据",
      publishedAt: "2026-07-24T01:00:00.000Z",
      summary: "普通新闻摘要。",
      sentimentValue: 5,
      sentimentLabel: "利好",
      sentimentTone: "positive",
      newsLevelValue: 2,
      newsLevelLabel: "普通",
      newsTypeValue: 3,
      newsTypeLabel: "公司",
      displaySections: [],
      target: { id: "target-1", type: "stock", code: "600519", name: "贵州茅台", tags: [], reason: "", enabled: true },
    },
    {
      id: "item-research",
      kind: "research",
      title: "研报线索",
      source: "示例证券",
      publishedAt: "2026-07-24T03:00:00.000Z",
      summary: "研报摘要。",
      sentimentValue: 2,
      sentimentLabel: "中性偏空",
      sentimentTone: "negative",
      displaySections: [{ title: "风险提示", fields: [{ label: "风险提示", kind: "bullets", items: ["需求修复偏慢。"] }] }],
      target: { id: "target-1", type: "stock", code: "600519", name: "贵州茅台", tags: [], reason: "", enabled: true },
    },
    {
      id: "item-announcement",
      kind: "announcement",
      title: "公告线索",
      source: "交易所公告",
      publishedAt: "2026-07-24T04:00:00.000Z",
      summary: "公告摘要。",
      displaySections: [],
      target: { id: "target-1", type: "stock", code: "600519", name: "贵州茅台", tags: [], reason: "", enabled: true },
    },
  ],
};

const sampleMarketOverview: MarketOverview = {
  selectedIndexCode: "000001",
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
  ],
  candles: [
    { date: "2026-07-23", open: 3868.08, close: 3876.78, low: 3851.7, high: 3878.83, previousClose: 3867.03, volume: 56212260100, amount: 1025875517700 },
    { date: "2026-07-24", open: 3853.63, close: 3829.11, low: 3816.48, high: 3861.04, previousClose: 3876.78, volume: 434786455, amount: 789106691786 },
  ],
  chartSeries: {
    intraday: [
      { date: "2026-07-24 09:31", open: 3853.63, close: 3845.13, low: 3845.13, high: 3854.94, previousClose: null, volume: 19774082, amount: 31193776896 },
    ],
    daily: [
      { date: "2026-07-23", open: 3868.08, close: 3876.78, low: 3851.7, high: 3878.83, previousClose: 3867.03, volume: 56212260100, amount: 1025875517700 },
      { date: "2026-07-24", open: 3853.63, close: 3829.11, low: 3816.48, high: 3861.04, previousClose: 3876.78, volume: 434786455, amount: 789106691786 },
    ],
    weekly: [
      { date: "2026-07-20", open: 3868.08, close: 3829.11, low: 3816.48, high: 3878.83, previousClose: 3867.03, volume: 56647046555, amount: 1814982209486 },
    ],
    monthly: [
      { date: "2026-07-01", open: 3868.08, close: 3829.11, low: 3816.48, high: 3878.83, previousClose: 3867.03, volume: 56647046555, amount: 1814982209486 },
    ],
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
      { label: "平盘", value: 37, tone: "flat" },
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
  ],
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
      sourceLabel: "行情数据 index/range-gains",
    },
  },
};

const sampleHotspotOverview: HotspotOverview = {
  updatedAt: "2026-07-28 11:14:32",
  sourceErrors: [],
  industries: [
    {
      type: "industry",
      code: "340000",
      name: "食品饮料",
      changeRatio: 0.0141,
      changeRatio1W: -0.0025,
      ratioRank: 1,
      stockUp: 107,
      stockDown: 17,
      stockFlat: 2,
      stockTotal: 126,
      limitUp: 2,
      leadStockCode: "605179",
      leadStockName: "一鸣食品",
      totalValue: 3772545686120,
      dataTime: "2026-07-28 11:14:32",
    },
    ...["商贸零售", "银行", "交通运输", "家用电器", "纺织服饰", "社会服务", "美容护理", "综合"].map((name, index) => ({
      type: "industry" as const,
      code: `${450000 + index}`,
      name,
      changeRatio: 0.01 - index * 0.001,
      changeRatio1W: null,
      ratioRank: index + 2,
      stockUp: 60,
      stockDown: 20,
      stockFlat: 1,
      stockTotal: 81,
      limitUp: 1,
      leadStockCode: "",
      leadStockName: "",
      totalValue: null,
      dataTime: "2026-07-28 11:14:32",
    })),
  ],
  industryDeclines: [
    {
      type: "industry",
      code: "730000",
      name: "通信",
      changeRatio: -0.1088,
      changeRatio1W: -0.12,
      ratioRank: 31,
      stockUp: 5,
      stockDown: 98,
      stockFlat: 0,
      stockTotal: 103,
      limitUp: 0,
      leadStockCode: "",
      leadStockName: "",
      totalValue: null,
      dataTime: "2026-07-28 11:14:32",
    },
  ],
  concepts: [
    {
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
  ],
  conceptDeclines: [
    {
      type: "concept",
      code: "15032397",
      name: "博通概念",
      changeRatio: -0.0965,
      changeRatio1W: null,
      ratioRank: 1000,
      stockUp: 1,
      stockDown: 17,
      stockFlat: 0,
      stockTotal: 18,
      limitUp: 0,
      leadStockCode: "",
      leadStockName: "",
      totalValue: null,
      dataTime: "2026-07-28 11:14:32",
    },
  ],
};

let currentBrief: DailyBrief | null = null;

function jsonResponse(payload: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as Response;
}

function errorJsonResponse(payload: unknown, status = 503) {
  return {
    ok: false,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as Response;
}

function payloadFor(url: string) {
  if (url.startsWith("/api/briefs?")) return currentBrief;
  if (url.startsWith("/api/hotspots")) return sampleHotspotOverview;
  if (url.startsWith("/api/market-overview")) return sampleMarketOverview;
  if (url === "/api/watch-targets") {
    return [{ id: "target-1", type: "stock", code: "600519", name: "贵州茅台", tags: [], reason: "", enabled: true }];
  }
  if (url === "/api/agent-sessions") {
    return [];
  }
  if (url === "/api/settings") {
    return {
      briefTime: "08:30",
      dataWindowHours: 24,
      backfillDays: 7,
      defaultItemLimit: 20,
    };
  }
  return [];
}

describe("WorkbenchApp navigation", () => {
  beforeEach(() => {
    currentBrief = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => jsonResponse(payloadFor(String(input))))
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("exposes only the consolidated core workspace sections", async () => {
    render(<WorkbenchApp />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(9);
    });

    const navigation = screen.getByRole("navigation");
    const buttons = within(navigation).getAllByRole("button");

    expect(buttons.map((button) => button.textContent?.trim())).toEqual(["自选速览", "当日大盘", "研究", "自选", "设置"]);
    expect(screen.queryByText("研究功能")).toBeNull();
    expect(screen.queryByText("任务历史")).toBeNull();
    expect(screen.queryByText("代码或名称添加自选")).toBeNull();
  });

  it("renders the cold glass workspace shell", async () => {
    render(<WorkbenchApp />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(9);
    });

    const sidebars = screen.getAllByRole("complementary");

    expect(screen.getByRole("main").classList.contains("glass-shell")).toBe(true);
    expect(sidebars[0].classList.contains("glass-rail")).toBe(true);
  });

  it("keeps the agent page usable when agent storage is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/agent-sessions" || url === "/api/agent-runs") {
          return errorJsonResponse({
            code: "AGENT_DB_UNAVAILABLE",
            message: "Agent 数据库未连接，请先启动 Postgres 服务",
            retryable: true,
          });
        }
        return jsonResponse(payloadFor(url));
      })
    );

    render(<WorkbenchApp />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(9);
    });

    const navigation = screen.getByRole("navigation");
    fireEvent.click(within(navigation).getByRole("button", { name: "研究" }));

    expect(await screen.findByRole("alert")).not.toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("Agent 数据库未连接");
    expect((screen.getByRole("button", { name: "新建对话" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText("能力选择") as HTMLSelectElement).disabled).toBe(false);
  });

  it("loads the market overview only after the market view is opened", async () => {
    render(<WorkbenchApp />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(9);
    });
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining("/api/market-overview"), expect.anything());

    fireEvent.click(screen.getByRole("button", { name: "当日大盘" }));

    await screen.findByRole("heading", { name: "当日大盘" });
    await screen.findByText("上证指数");
    expect(fetch).toHaveBeenCalledWith("/api/market-overview?indexCode=000001", { cache: "no-store" });
  });
});

describe("WorkbenchApp self-selected digest", () => {
  beforeEach(() => {
    currentBrief = sampleBrief;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => jsonResponse(payloadFor(String(input))))
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    currentBrief = null;
  });

  it("uses self-selected digest wording and removes noisy overview controls", async () => {
    render(<WorkbenchApp />);

    await screen.findByRole("heading", { name: "自选速览" });

    const deprecatedBriefName = ["晨", "报"].join("");

    expect(screen.getByRole("button", { name: "自选速览" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "生成速览" })).not.toBeNull();
    expect(screen.getByText("速览归档")).not.toBeNull();
    expect(screen.queryByText(`${deprecatedBriefName}概览`)).toBeNull();
    expect(screen.queryByText("全部重要性")).toBeNull();
    expect(screen.queryByText("最新优先")).toBeNull();
    expect(screen.queryByText("展开要点 / 影响 / 机会风险")).toBeNull();
    expect(screen.queryByText("机会线索")).toBeNull();
    expect(screen.queryByText("风险提示")).toBeNull();
    expect(screen.queryByText("产业趋势改善。")).toBeNull();
    expect(screen.queryByText("需求修复偏慢。")).toBeNull();
    expect(screen.getByText("行业滚动")).not.toBeNull();
    expect(screen.getByText("概念滚动")).not.toBeNull();
    expect(screen.getAllByText("综合").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "查看全部" })[0].getAttribute("href")).toBe("/hotspots/industry");
    expect(screen.getAllByRole("link", { name: "查看全部" })[1].getAttribute("href")).toBe("/hotspots/concept");
    expect(screen.getAllByRole("button", { name: "涨幅" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: /食品饮料/ }).getAttribute("href")).toBe("/hotspots/industry/340000");
    expect(screen.getByRole("link", { name: /鸡尾酒/ }).getAttribute("href")).toBe("/hotspots/concept/14020004");
    fireEvent.click(screen.getAllByRole("button", { name: "跌幅" })[0]);
    expect(screen.getByRole("link", { name: /通信/ }).getAttribute("href")).toBe("/hotspots/industry/730000");
    expect(screen.queryByText("重要")).toBeNull();
    expect(screen.queryByText("关联度 5")).toBeNull();
    expect(screen.queryByText("今日投资新闻")).toBeNull();
    expect(screen.queryByText("今日投资实时行情")).toBeNull();
    expect(document.body.textContent).not.toContain("今日投资");
  });

  it("hides level 2 news while preserving research and announcements", async () => {
    render(<WorkbenchApp />);

    await screen.findByText("重要新闻");

    expect(screen.queryByText("普通新闻不应出现")).toBeNull();
    expect(screen.getByText("研报线索")).not.toBeNull();
    expect(screen.getByText("公告线索")).not.toBeNull();
  });

  it("filters by the five sentiment values and only shows news type filter for news", async () => {
    render(<WorkbenchApp />);

    await screen.findByText("重要新闻");

    expect(screen.queryByDisplayValue("全部新闻类型")).toBeNull();

    fireEvent.change(screen.getByLabelText("情绪筛选"), { target: { value: "2" } });

    expect(screen.queryByText("重要新闻")).toBeNull();
    expect(screen.getByText("研报线索")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "新闻" }));

    expect(screen.getByDisplayValue("全部新闻类型")).not.toBeNull();

    fireEvent.change(screen.getByLabelText("情绪筛选"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("新闻类型筛选"), { target: { value: "2" } });

    expect(screen.getByText("重要新闻")).not.toBeNull();
    expect(screen.queryByText("研报线索")).toBeNull();
  });
});
