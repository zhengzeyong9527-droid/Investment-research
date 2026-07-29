import { describe, expect, it, vi } from "vitest";
import { fetchHotspotDetail, fetchHotspotList, fetchHotspots } from "@/lib/hotspots";
import type { CommandRunner } from "@/lib/investoday";

function ok(stdout: unknown) {
  return { ok: true, stdout: JSON.stringify(stdout), stderr: "" };
}

function fail(message: string) {
  return { ok: false, stdout: "", stderr: message };
}

describe("hotspot data aggregation", () => {
  it("fetches a hotspot list with explicit order and page size", async () => {
    const run = vi.fn<CommandRunner>().mockImplementation(async (_command, args) => {
      if (args[0] === "industry-quote/realtime-v2") {
        return ok([
          { industryCode: "730000", industryName: "通信", changeRatio: -0.1088, stockAmount: 103 },
          { industryCode: "270000", industryName: "电子", changeRatio: -0.0702, stockAmount: 512 },
        ]);
      }
      return fail(`unexpected endpoint ${args[0]}`);
    });

    const list = await fetchHotspotList({ type: "industry", order: "asc", pageSize: 40, run });

    expect(run).toHaveBeenCalledWith("investoday-api", [
      "industry-quote/realtime-v2",
      "--method",
      "POST",
      "industryLevel=1",
      "industryType=SW",
      "sortColumn=changeRatio",
      "order=asc",
      "pageSize=40",
      "--body-json",
      JSON.stringify({ industryCodes: [] }),
    ]);
    expect(list.items.map((item) => item.name)).toEqual(["通信", "电子"]);
    expect(list.error).toBeUndefined();
  });

  it("fetches industry and concept rolling hotspots from Investoday", async () => {
    const run = vi.fn<CommandRunner>().mockImplementation(async (_command, args) => {
      if (args[0] === "industry-quote/realtime-v2" && args.includes("order=desc")) {
        return ok([
          {
            industryCode: "340000",
            industryName: "食品饮料",
            changeRatio: 0.0141,
            changeRatio1W: -0.0025,
            ratioRank: 1,
            stockUpAmount: 107,
            stockDownAmount: 17,
            stockBxAmount: 2,
            stockAmount: 126,
            limitUpAmount: 2,
            leadUpStockCode: "605179",
            leadUpStockName: "一鸣食品",
            dataTime: "2026-07-28 11:14:32",
          },
        ]);
      }
      if (args[0] === "industry-quote/realtime-v2" && args.includes("order=asc")) {
        return ok([
          {
            industryCode: "730000",
            industryName: "通信",
            changeRatio: -0.1088,
            stockUpAmount: 5,
            stockDownAmount: 98,
            stockAmount: 103,
            dataTime: "2026-07-28 11:14:32",
          },
        ]);
      }
      if (args[0] === "concept-quote/realtime-v2" && args.includes("order=desc")) {
        return ok([
          {
            conceptCode: "14020004",
            conceptName: "鸡尾酒",
            changeRatio: 0.04915,
            changeRatio1W: 0.0299,
            ratioRank: 1,
            stockUpAmount: 1,
            stockDownAmount: 1,
            stockBxAmount: 0,
            conceptAmount: 2,
            limitUpAmount: 1,
            leadUpStockCode: "002387",
            leadUpStockName: "维信诺",
            dataTime: "2026-07-28 11:14:32",
          },
        ]);
      }
      if (args[0] === "concept-quote/realtime-v2" && args.includes("order=asc")) {
        return ok([
          {
            conceptCode: "15032397",
            conceptName: "博通概念",
            changeRatio: -0.0965,
            stockUpAmount: 1,
            stockDownAmount: 17,
            conceptAmount: 18,
            dataTime: "2026-07-28 11:14:32",
          },
        ]);
      }
      return fail(`unexpected endpoint ${args[0]}`);
    });

    const overview = await fetchHotspots({ run });

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
    expect(run).toHaveBeenCalledWith("investoday-api", [
      "concept-quote/realtime-v2",
      "--method",
      "POST",
      "conceptType=1",
      "sortColumn=changeRatio",
      "order=desc",
      "pageSize=80",
      "--body-json",
      JSON.stringify({ conceptCodes: [] }),
    ]);
    expect(overview.industries[0]).toMatchObject({
      type: "industry",
      code: "340000",
      name: "食品饮料",
      changeRatio: 0.0141,
      stockTotal: 126,
      leadStockName: "一鸣食品",
    });
    expect(overview.concepts[0]).toMatchObject({
      type: "concept",
      code: "14020004",
      name: "鸡尾酒",
      changeRatio: 0.04915,
      stockTotal: 2,
      leadStockCode: "002387",
    });
    expect(overview.industryDeclines[0]).toMatchObject({ type: "industry", code: "730000", name: "通信", changeRatio: -0.1088 });
    expect(overview.conceptDeclines[0]).toMatchObject({ type: "concept", code: "15032397", name: "博通概念", changeRatio: -0.0965 });
    expect(overview.updatedAt).toBe("2026-07-28 11:14:32");
    expect(overview.sourceErrors).toEqual([]);
  });

  it("returns available hotspot lists when one source fails", async () => {
    const run = vi.fn<CommandRunner>().mockImplementation(async (_command, args) => {
      if (args[0] === "industry-quote/realtime-v2") return ok([]);
      if (args[0] === "concept-quote/realtime-v2") return fail("concept unavailable");
      return fail(`unexpected endpoint ${args[0]}`);
    });

    const overview = await fetchHotspots({ run });

    expect(overview.industries).toEqual([]);
    expect(overview.concepts).toEqual([]);
    expect(overview.industryDeclines).toEqual([]);
    expect(overview.conceptDeclines).toEqual([]);
    expect(overview.sourceErrors).toEqual(["concept-quote/realtime-v2", "concept-quote/realtime-v2"]);
  });

  it("fetches all hotspot component stocks without forcing sort order", async () => {
    const run = vi.fn<CommandRunner>().mockImplementation(async (_command, args) => {
      if (args[0] === "industry-quote/stock-realtime") {
        return ok([
          {
            industryCode: "330000",
            industryName: "家用电器",
            changeRatio: 0.0045,
            stockUpAmount: 61,
            stockDownAmount: 41,
            stockBxAmount: 1,
            stockAmount: 103,
            leadUpStockCode: "600619",
            leadUpStockName: "海立股份",
            stockRealQuotes: [
              { stockCode: "002860", stockName: "星帅尔", currentPrice: 19.56, changeRatio: 0.059, highPrice: 19.88, lowPrice: 17.6, dataTime: "2026-07-28 11:11:15" },
              { stockCode: "000045", stockName: "深纺织A", currentPrice: 9.96, changeRatio: -0.041, highPrice: 9.96, lowPrice: 9.29, dataTime: "2026-07-28 11:11:13" },
              { stockCode: "600619", stockName: "海立股份", currentPrice: 13.66, changeRatio: 0.0998, highPrice: 13.66, lowPrice: 13.66, dataTime: "2026-07-28 11:11:14" },
            ],
          },
        ]);
      }
      return fail(`unexpected endpoint ${args[0]}`);
    });

    const detail = await fetchHotspotDetail({ type: "industry", code: "330000", run });

    expect(run).toHaveBeenCalledWith("investoday-api", ["industry-quote/stock-realtime", "industryCode=330000", "pageSize=1000"]);
    expect(detail.hotspot).toMatchObject({
      type: "industry",
      code: "330000",
      name: "家用电器",
      stockTotal: 103,
      dataTime: "2026-07-28 11:11:15",
    });
    expect(detail.stocks.map((stock) => stock.code)).toEqual(["002860", "000045", "600619"]);
    expect(detail.stocks[0]).toMatchObject({
      name: "星帅尔",
      currentPrice: 19.56,
      changeRatio: 0.059,
    });
  });

  it("uses the jy concept detail endpoint for concept component stocks", async () => {
    const run = vi.fn<CommandRunner>().mockImplementation(async (_command, args) => {
      if (args[0] === "concept-quote/stock-realtime") {
        return ok([
          {
            conceptCode: "14020004",
            conceptName: "鸡尾酒",
            changeRatio: 0.04915,
            conceptAmount: 2,
            stockRealQuotes: [{ stockCode: "002387", stockName: "维信诺", currentPrice: 6.86, changeRatio: 0.0994 }],
          },
        ]);
      }
      return fail(`unexpected endpoint ${args[0]}`);
    });

    const detail = await fetchHotspotDetail({ type: "concept", code: "14020004", run });

    expect(run).toHaveBeenCalledWith("investoday-api", ["concept-quote/stock-realtime", "conceptType=jy", "conceptCode=14020004", "pageSize=1000"]);
    expect(detail.hotspot).toMatchObject({ type: "concept", code: "14020004", name: "鸡尾酒" });
    expect(detail.stocks[0].code).toBe("002387");
  });
});
