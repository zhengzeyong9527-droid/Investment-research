import { defaultCommandRunner, type CommandRunner } from "@/lib/investoday";

export type HotspotType = "industry" | "concept";
export type HotspotOrder = "asc" | "desc";

export type RollingHotspot = {
  type: HotspotType;
  code: string;
  name: string;
  changeRatio: number;
  changeRatio1W: number | null;
  ratioRank: number | null;
  stockUp: number;
  stockDown: number;
  stockFlat: number;
  stockTotal: number;
  limitUp: number;
  leadStockCode: string;
  leadStockName: string;
  totalValue: number | null;
  dataTime: string;
};

export type HotspotStockQuote = {
  code: string;
  name: string;
  marketType: string;
  currentPrice: number | null;
  changeRatio: number;
  openPrice: number | null;
  previousClose: number | null;
  highPrice: number | null;
  lowPrice: number | null;
  dataTime: string;
};

export type HotspotOverview = {
  industries: RollingHotspot[];
  industryDeclines: RollingHotspot[];
  concepts: RollingHotspot[];
  conceptDeclines: RollingHotspot[];
  updatedAt: string;
  sourceErrors: string[];
};

export type HotspotListResult = {
  items: RollingHotspot[];
  updatedAt: string;
  error?: string;
};

export type HotspotDetail = {
  hotspot: RollingHotspot;
  stocks: HotspotStockQuote[];
  sourceEndpoint: string;
};

const INDUSTRY_OVERVIEW_PAGE_SIZE = 40;
const CONCEPT_OVERVIEW_PAGE_SIZE = 80;
const HOTSPOT_DETAIL_PAGE_SIZE = 1000;

export async function fetchHotspotList(input: {
  type: HotspotType;
  order?: HotspotOrder;
  pageSize?: number;
  run?: CommandRunner;
}): Promise<HotspotListResult> {
  const run = input.run ?? defaultCommandRunner;
  const order = input.order ?? "desc";
  const pageSize = String(input.pageSize ?? (input.type === "industry" ? INDUSTRY_OVERVIEW_PAGE_SIZE : CONCEPT_OVERVIEW_PAGE_SIZE));
  const endpoint = input.type === "industry" ? "industry-quote/realtime-v2" : "concept-quote/realtime-v2";
  const args =
    input.type === "industry"
      ? [
      "--method",
      "POST",
      "industryLevel=1",
      "industryType=SW",
      "sortColumn=changeRatio",
          `order=${order}`,
      `pageSize=${pageSize}`,
      "--body-json",
      JSON.stringify({ industryCodes: [] }),
        ]
      : [
      "--method",
      "POST",
      "conceptType=1",
      "sortColumn=changeRatio",
          `order=${order}`,
      `pageSize=${pageSize}`,
      "--body-json",
      JSON.stringify({ conceptCodes: [] }),
        ];
  const result = await fetchJsonArray(run, endpoint, args);
  const items = result.data
    .map((item) => normalizeHotspot(item, input.type))
    .filter((item): item is RollingHotspot => Boolean(item));
  return {
    items,
    updatedAt: firstNonEmpty(items.map((item) => item.dataTime)),
    error: result.error,
  };
}

export async function fetchHotspots(input: {
  run?: CommandRunner;
  pageSize?: number;
  industryPageSize?: number;
  conceptPageSize?: number;
} = {}): Promise<HotspotOverview> {
  const run = input.run ?? defaultCommandRunner;
  const industryPageSize = input.industryPageSize ?? input.pageSize ?? INDUSTRY_OVERVIEW_PAGE_SIZE;
  const conceptPageSize = input.conceptPageSize ?? input.pageSize ?? CONCEPT_OVERVIEW_PAGE_SIZE;
  const [industryGains, industryDeclines, conceptGains, conceptDeclines] = await Promise.all([
    fetchHotspotList({ type: "industry", order: "desc", pageSize: industryPageSize, run }),
    fetchHotspotList({ type: "industry", order: "asc", pageSize: industryPageSize, run }),
    fetchHotspotList({ type: "concept", order: "desc", pageSize: conceptPageSize, run }),
    fetchHotspotList({ type: "concept", order: "asc", pageSize: conceptPageSize, run }),
  ]);

  return {
    industries: industryGains.items,
    industryDeclines: industryDeclines.items,
    concepts: conceptGains.items,
    conceptDeclines: conceptDeclines.items,
    updatedAt: firstNonEmpty([industryGains.updatedAt, industryDeclines.updatedAt, conceptGains.updatedAt, conceptDeclines.updatedAt]),
    sourceErrors: [industryGains.error, industryDeclines.error, conceptGains.error, conceptDeclines.error].filter(
      (error): error is string => Boolean(error)
    ),
  };
}

export async function fetchHotspotDetail(input: {
  type: HotspotType;
  code: string;
  run?: CommandRunner;
}): Promise<HotspotDetail> {
  const run = input.run ?? defaultCommandRunner;
  const endpoint = input.type === "industry" ? "industry-quote/stock-realtime" : "concept-quote/stock-realtime";
  const args =
    input.type === "industry"
      ? [`industryCode=${input.code}`, `pageSize=${HOTSPOT_DETAIL_PAGE_SIZE}`]
      : ["conceptType=jy", `conceptCode=${input.code}`, `pageSize=${HOTSPOT_DETAIL_PAGE_SIZE}`];
  const result = await fetchJsonArray(run, endpoint, args);
  if (result.error) {
    throw new Error(`${endpoint} unavailable`);
  }
  const record = result.data[0];
  const hotspot = normalizeHotspot(record, input.type);
  if (!record || !hotspot) {
    throw new Error("热点详情暂无可用数据");
  }
  const stocks = arrayValue(record.stockRealQuotes)
    .map(normalizeStockQuote)
    .filter((item): item is HotspotStockQuote => Boolean(item));
  return {
    hotspot: {
      ...hotspot,
      dataTime: hotspot.dataTime || firstNonEmpty(stocks.map((stock) => stock.dataTime)),
    },
    stocks,
    sourceEndpoint: endpoint,
  };
}

async function fetchJsonArray(
  run: CommandRunner,
  endpoint: string,
  args: string[]
): Promise<{ data: Array<Record<string, unknown>>; error?: string }> {
  const result = await run("investoday-api", [endpoint, ...args]);
  if (!result.ok || !result.stdout.trim()) {
    return { data: [], error: endpoint };
  }
  try {
    return { data: parseJsonCandidates(result.stdout) };
  } catch {
    return { data: [], error: endpoint };
  }
}

function normalizeHotspot(item: Record<string, unknown> | null | undefined, type: HotspotType): RollingHotspot | null {
  if (!item) return null;
  const code = type === "industry" ? stringValue(item.industryCode) : stringValue(item.conceptCode);
  const name = type === "industry" ? stringValue(item.industryName) : stringValue(item.conceptName);
  if (!code || !name) return null;
  return {
    type,
    code,
    name,
    changeRatio: numberValue(item.changeRatio),
    changeRatio1W: numberOrNull(item.changeRatio1W),
    ratioRank: numberOrNull(item.ratioRank),
    stockUp: numberValue(item.stockUpAmount),
    stockDown: numberValue(item.stockDownAmount),
    stockFlat: numberValue(item.stockBxAmount),
    stockTotal: numberValue(type === "industry" ? item.stockAmount : item.conceptAmount),
    limitUp: numberValue(item.limitUpAmount),
    leadStockCode: stringValue(item.leadUpStockCode),
    leadStockName: stringValue(item.leadUpStockName),
    totalValue: numberOrNull(item.totalValue),
    dataTime: stringValue(item.dataTime),
  };
}

function normalizeStockQuote(item: unknown): HotspotStockQuote | null {
  if (!isRecord(item)) return null;
  const code = stringValue(item.stockCode);
  const name = stringValue(item.stockName);
  if (!code || !name) return null;
  return {
    code,
    name,
    marketType: stringValue(item.marketType),
    currentPrice: numberOrNull(item.currentPrice),
    changeRatio: numberValue(item.changeRatio),
    openPrice: numberOrNull(item.openPrice),
    previousClose: numberOrNull(item.closePriceYDay),
    highPrice: numberOrNull(item.highPrice),
    lowPrice: numberOrNull(item.lowPrice),
    dataTime: stringValue(item.dataTime),
  };
}

function parseJsonCandidates(stdout: string): Array<Record<string, unknown>> {
  const parsed = JSON.parse(stdout);
  if (Array.isArray(parsed)) return parsed.filter(isRecord);
  if (Array.isArray(parsed?.data)) return parsed.data.filter(isRecord);
  if (Array.isArray(parsed?.list)) return parsed.list.filter(isRecord);
  if (Array.isArray(parsed?.records)) return parsed.records.filter(isRecord);
  if (isRecord(parsed?.data)) return [parsed.data];
  if (isRecord(parsed)) return [parsed];
  return [];
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function firstNonEmpty(values: string[]) {
  return values.find(Boolean) ?? "";
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberValue(value: unknown): number {
  return numberOrNull(value) ?? 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
