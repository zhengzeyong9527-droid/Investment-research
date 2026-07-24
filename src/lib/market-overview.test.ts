import { describe, expect, it, vi } from "vitest";
import { DEFAULT_MARKET_INDEX_CODES, fetchMarketOverview } from "@/lib/market-overview";
import type { CommandRunner } from "@/lib/investoday";

function ok(stdout: unknown) {
  return { ok: true, stdout: JSON.stringify(stdout), stderr: "" };
}

function fail(message: string) {
  return { ok: false, stdout: "", stderr: message };
}

describe("market overview data aggregation", () => {
  it("fetches realtime index, k-line, breadth, and SW industry data", async () => {
    const run = vi.fn<CommandRunner>().mockImplementation(async (_command, args) => {
      if (args[0] === "index-quote/realtime") {
        return ok([
          {
            indexCode: "000001",
            industryName: "上证指数",
            openPrice: 3853.63,
            closePriceYDay: 3876.78,
            currentPrice: 3829.11,
            changeRatio: -0.0123,
            highPrice: 3861.04,
            lowPrice: 3816.48,
            dealStockAmount: 434786455,
            dealMoney: 789106691786,
            dataTime: "2026-07-24 14:24:27",
          },
          {
            indexCode: "399001",
            industryName: "深证成指",
            currentPrice: 13874.17,
            changeRatio: -0.0176,
            dealMoney: 878013408915,
            dataTime: "2026-07-24 14:24:18",
          },
        ]);
      }
      if (args[0] === "index/quotes") {
        return ok([
          {
            date: "2026-06-30 00:00:00",
            indexCode: "000001",
            indexName: "上证指数",
            previousClosePrice: 3800,
            openPrice: 3810,
            highPrice: 3830,
            lowPrice: 3790,
            closePrice: 3820,
            volume: 51100000000,
            tradingAmountCny: 920000000000,
          },
          {
            date: "2026-07-16 00:00:00",
            indexCode: "000001",
            indexName: "上证指数",
            previousClosePrice: 3900,
            openPrice: 3890,
            highPrice: 3915,
            lowPrice: 3865,
            closePrice: 3880,
            volume: 53300000000,
            tradingAmountCny: 960000000000,
          },
          {
            date: "2026-07-23 00:00:00",
            indexCode: "000001",
            indexName: "上证指数",
            previousClosePrice: 3867.03,
            openPrice: 3868.08,
            highPrice: 3878.83,
            lowPrice: 3851.7,
            closePrice: 3876.78,
            volume: 56212260100,
            tradingAmountCny: 1025875517700.1,
          },
          {
            date: "2026-07-22 00:00:00",
            indexCode: "000001",
            indexName: "上证指数",
            previousClosePrice: 3864.36,
            openPrice: 3839.66,
            highPrice: 3884.43,
            lowPrice: 3839.66,
            closePrice: 3867.03,
            volume: 61425521500,
            tradingAmountCny: 1258148128160,
          },
        ]);
      }
      if (args[0] === "index/range-gains") {
        return ok({
          indexCode: "000001",
          indexName: "上证指数",
          return1dPct: -1.23,
          return1wPct: -2.8,
          return1mPct: 4.5,
          returnYtdPct: 12.3,
        });
      }
      if (args[0] === "index/valuation") {
        return ok([
          {
            indexCode: "000001",
            indexName: "上证指数",
            date: "2026-07-23 00:00:00",
            indexMarketValue: 10306712250.2484,
            pe: 16.777,
            pb: 1.3466,
            peRank5y: 0.8579,
            pbRank5y: 0.7008,
            turnoverRate: 0.0118,
            divYield: 0.0238,
          },
        ]);
      }
      if (args[0] === "market/change-ratio-status") {
        return ok({
          dataTime: "2026-07-24 14:22:43",
          upAmount: 721,
          downAmount: 4768,
          upTopAmount: 43,
          upOver8Amount: 27,
          upBx68Amount: 32,
          upBx26Amount: 200,
          upBx02Amount: 419,
          bxAmount: 37,
          downBx02Amount: 1641,
          downBx26Amount: 2921,
          downBx68Amount: 135,
          downOver8Amount: 55,
          downTopAmount: 16,
        });
      }
      if (args[0] === "industry-quote/realtime-v2") {
        return ok([
          {
            industryCode: "710000",
            industryName: "计算机",
            price: 4223.44,
            changeRatio: -0.0289,
            changeRatio1W: -0.0042,
            stockUpAmount: 38,
            stockDownAmount: 318,
            stockBxAmount: 2,
            stockAmount: 358,
            totalValue: 3983044355096,
            ratioRank: 26,
          },
          {
            industryCode: "340000",
            industryName: "食品饮料",
            price: 11822.5,
            changeRatio: 0.0112,
            changeRatio1W: 0.024,
            stockUpAmount: 82,
            stockDownAmount: 41,
            stockBxAmount: 1,
            stockAmount: 124,
            totalValue: 6850000000000,
            ratioRank: 1,
          },
          {
            industryCode: "480000",
            industryName: "银行",
            price: 3877.2,
            changeRatio: -0.002,
            changeRatio1W: 0.008,
            stockUpAmount: 12,
            stockDownAmount: 30,
            stockBxAmount: 0,
            stockAmount: 42,
            totalValue: 12100000000000,
            ratioRank: 15,
          },
        ]);
      }
      if (args[0] === "industry/rotation") {
        return ok([
          {
            industryCode: args.find((item) => item.startsWith("industryCode="))?.split("=")[1],
            industryName: "申万行业",
            date: "2026-07-23 00:00:00",
            marketSentiment: 0.62,
            hlStyleCorrXMomentum: 1,
          },
        ]);
      }
      if (args[0] === "industry/market-stats") {
        const body = JSON.parse(args[args.indexOf("--body-json") + 1]);
        return ok({
          industryCode: body.industryCode,
          industryName: "申万行业",
          return1d: 0.011,
          return1w: 2.4,
          return1m: 5.6,
          netMainInflow1dMn: 12000,
          netMainInflow5dMn: -34000,
          netMainInflow20dMn: 88000,
          pePct5y: 0.61,
          pbPct5y: 0.42,
          psPct5y: 0.77,
        });
      }
      return fail(`unexpected endpoint ${args[0]}`);
    });

    const overview = await fetchMarketOverview({
      indexCode: "000001",
      now: new Date("2026-07-24T06:24:00.000Z"),
      run,
    });

    expect(run).toHaveBeenCalledWith("investoday-api", [
      "index-quote/realtime",
      "--method",
      "POST",
      "--body-json",
      JSON.stringify({ indexCodes: DEFAULT_MARKET_INDEX_CODES }),
    ]);
    expect(run).toHaveBeenCalledWith("investoday-api", [
      "index/quotes",
      "--method",
      "POST",
      "--body-json",
      JSON.stringify({ indexCode: "000001", beginDate: "2024-02-05", endDate: "2026-07-24", pageNum: 1, pageSize: 500 }),
    ]);
    expect(run).toHaveBeenCalledWith("investoday-api", ["index/range-gains", "indexCode=000001"]);
    expect(run).toHaveBeenCalledWith("investoday-api", ["index/valuation", "indexCode=000001", "pageNum=1", "pageSize=5"]);
    expect(run).toHaveBeenCalledWith("investoday-api", [
      "industry/rotation",
      "industryCode=340000",
      "beginDate=2026-07-17",
      "endDate=2026-07-24",
      "pageNum=1",
      "pageSize=1",
    ]);
    expect(run).toHaveBeenCalledWith("investoday-api", [
      "industry/market-stats",
      "--method",
      "POST",
      "--body-json",
      JSON.stringify({ industryCode: "340000" }),
    ]);
    expect(run).toHaveBeenCalledWith("investoday-api", [
      "industry-quote/realtime-v2",
      "--method",
      "POST",
      "industryLevel=1",
      "industryType=SW",
      "sortColumn=changeRatio",
      "order=desc",
      "pageSize=40",
      "--body-json",
      JSON.stringify({ industryCodes: [] }),
    ]);
    expect(overview.selectedIndexCode).toBe("000001");
    expect(overview.indexQuotes).toHaveLength(2);
    expect(overview.candles.map((item) => item.date)).toEqual(["2026-06-30", "2026-07-16", "2026-07-22", "2026-07-23", "2026-07-24"]);
    expect(overview.candles[4]).toMatchObject({
      date: "2026-07-24",
      open: 3853.63,
      high: 3861.04,
      low: 3816.48,
      close: 3829.11,
      amount: 789106691786,
    });
    expect(overview.chartSeries.daily).toEqual(overview.candles);
    expect(overview.chartSeries.weekly.at(-1)).toMatchObject({
      date: "2026-07-20",
      open: 3839.66,
      close: 3829.11,
      high: 3884.43,
      low: 3816.48,
    });
    expect(overview.chartSeries.monthly.at(-1)).toMatchObject({
      date: "2026-07-01",
      open: 3890,
      close: 3829.11,
      high: 3915,
      low: 3816.48,
    });
    expect(overview.indexMetrics.rangeGains).toMatchObject({
      code: "000001",
      return1d: -0.0123,
      return1w: -0.028,
      return1m: 0.045,
      returnYtd: 0.123,
    });
    expect(overview.indexMetrics.valuation).toMatchObject({
      code: "000001",
      date: "2026-07-23",
      pe: 16.777,
      pb: 1.3466,
      peRank5y: 0.8579,
      pbRank5y: 0.7008,
      turnoverRate: 0.0118,
      dividendYield: 0.0238,
    });
    expect(overview.breadth.upRatio).toBeCloseTo(721 / (721 + 4768 + 37), 5);
    expect(overview.breadth.extremeRatio).toBeCloseTo((43 + 27 + 16 + 55) / (721 + 4768 + 37), 5);
    expect(overview.industries.map((item) => item.name)).toEqual(["食品饮料", "银行", "计算机"]);
    expect(overview.industries[0].signal).toMatchObject({
      marketSentiment: 0.62,
      styleMomentum: 1,
      return1w: 0.024,
      netMainInflow1dMn: 12000,
      netMainInflow5dMn: -34000,
      pePct5y: 0.61,
    });
    expect(overview.updatedAt).toBe("2026-07-24 14:24:27");
    expect(overview.sourceErrors).toEqual([]);
  });

  it("returns available market data when an optional source fails", async () => {
    const run = vi.fn<CommandRunner>().mockImplementation(async (_command, args) => {
      if (args[0] === "index-quote/realtime") {
        return ok([{ indexCode: "000001", industryName: "上证指数", currentPrice: 3829.11, dataTime: "2026-07-24 14:24:27" }]);
      }
      if (args[0] === "index/quotes") {
        return ok([]);
      }
      if (args[0] === "index/range-gains") {
        return ok({ indexCode: "000001", indexName: "上证指数" });
      }
      if (args[0] === "index/valuation") {
        return ok([]);
      }
      if (args[0] === "market/change-ratio-status") {
        return ok({ upAmount: 1, downAmount: 1, bxAmount: 0 });
      }
      if (args[0] === "industry-quote/realtime-v2") {
        return fail("industry service unavailable");
      }
      return fail(`unexpected endpoint ${args[0]}`);
    });

    const overview = await fetchMarketOverview({
      indexCode: "000001",
      now: new Date("2026-07-24T06:24:00.000Z"),
      run,
    });

    expect(overview.indexQuotes).toHaveLength(1);
    expect(overview.industries).toEqual([]);
    expect(overview.sourceErrors).toEqual(["industry-quote/realtime-v2"]);
  });
});
