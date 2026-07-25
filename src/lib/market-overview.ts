import { defaultCommandRunner, type CommandRunner } from "@/lib/investoday";

export const DEFAULT_MARKET_INDEX_CODES = ["000001", "399001", "399006", "000300", "000905", "000852"] as const;
const EASTMONEY_INTRADAY_SOURCE = "eastmoney/intraday-kline";
const EASTMONEY_INDEX_SECIDS: Record<(typeof DEFAULT_MARKET_INDEX_CODES)[number], string> = {
  "000001": "1.000001",
  "399001": "0.399001",
  "399006": "0.399006",
  "000300": "1.000300",
  "000905": "1.000905",
  "000852": "1.000852",
};

export type MarketIndexQuote = {
  code: string;
  name: string;
  current: number | null;
  previousClose: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  changeRatio: number | null;
  volume: number | null;
  amount: number | null;
  dataTime: string;
};

export type MarketCandle = {
  date: string;
  open: number;
  close: number;
  low: number;
  high: number;
  previousClose: number | null;
  volume: number | null;
  amount: number | null;
};

export type MarketTimeframe = "intraday" | "daily" | "weekly" | "monthly";

export type MarketChartSeries = {
  intraday: MarketCandle[];
  daily: MarketCandle[];
  weekly: MarketCandle[];
  monthly: MarketCandle[];
};

export type MarketRangeGainSource = "investoday" | "computed" | "mixed";

export type MarketIndexRangeGain = {
  code: string;
  name: string;
  return1d: number | null;
  return1w: number | null;
  return1m: number | null;
  return3m: number | null;
  return6m: number | null;
  return1y: number | null;
  returnYtd: number | null;
  source: MarketRangeGainSource;
  sourceLabel: string;
};

export type MarketIndustrySignal = {
  return1d: number | null;
  return1w: number | null;
  return1m: number | null;
  netMainInflow1dMn: number | null;
  netMainInflow5dMn: number | null;
  netMainInflow20dMn: number | null;
  pePct5y: number | null;
  pbPct5y: number | null;
  psPct5y: number | null;
};

export type MarketBreadth = {
  dataTime: string;
  up: number;
  down: number;
  flat: number;
  total: number;
  upLimit: number;
  downLimit: number;
  upOver8: number;
  downOver8: number;
  upRatio: number;
  extremeRatio: number;
  buckets: Array<{ label: string; value: number; tone: "up" | "flat" | "down" }>;
};

export type MarketIndustryQuote = {
  code: string;
  name: string;
  price: number | null;
  changeRatio: number;
  changeRatio1W: number | null;
  volume: number | null;
  totalValue: number | null;
  ratioRank: number | null;
  stockUp: number;
  stockDown: number;
  stockFlat: number;
  stockTotal: number;
  leadStockCode: string;
  leadStockName: string;
  signal?: MarketIndustrySignal;
};

export type MarketOverview = {
  selectedIndexCode: string;
  indexQuotes: MarketIndexQuote[];
  candles: MarketCandle[];
  chartSeries: MarketChartSeries;
  breadth: MarketBreadth;
  industries: MarketIndustryQuote[];
  indexMetrics: {
    rangeGains: MarketIndexRangeGain | null;
  };
  updatedAt: string;
  sourceErrors: string[];
};

type ExternalFetcher = (url: string, init?: RequestInit) => Promise<Response>;

type FetchMarketOverviewInput = {
  indexCode?: string;
  now?: Date;
  run?: CommandRunner;
  fetchExternal?: ExternalFetcher;
};

type SourceResult<T> = {
  data: T;
  error?: string;
};

export async function fetchMarketOverview(input: FetchMarketOverviewInput = {}): Promise<MarketOverview> {
  const run = input.run ?? defaultCommandRunner;
  const now = input.now ?? new Date();
  const selectedIndexCode = sanitizeIndexCode(input.indexCode);
  const beginDate = dateParam(addDays(now, -900));
  const endDate = dateParam(now);

  const [indexQuoteResult, candleResult, breadthResult, industryResult, rangeGainResult, intradayResult] = await Promise.all([
    fetchJsonArray(run, "index-quote/realtime", [
      "--method",
      "POST",
      "--body-json",
      JSON.stringify({ indexCodes: DEFAULT_MARKET_INDEX_CODES }),
    ]),
    fetchJsonArray(run, "index/quotes", [
      "--method",
      "POST",
      "--body-json",
      JSON.stringify({ indexCode: selectedIndexCode, beginDate, endDate, pageNum: 1, pageSize: 500 }),
    ]),
    fetchJsonRecord(run, "market/change-ratio-status", []),
    fetchJsonArray(run, "industry-quote/realtime-v2", [
      "--method",
      "POST",
      "industryLevel=1",
      "industryType=SW",
      "sortColumn=changeRatio",
      "order=desc",
      "pageSize=40",
      "--body-json",
      JSON.stringify({ industryCodes: [] }),
    ]),
    fetchJsonRecord(run, "index/range-gains", [`indexCode=${selectedIndexCode}`]),
    fetchEastmoneyIntradayCandles(selectedIndexCode, input.fetchExternal),
  ]);

  const indexQuotes = indexQuoteResult.data.map(normalizeIndexQuote).filter((item): item is MarketIndexQuote => Boolean(item));
  const selectedQuote = indexQuotes.find((quote) => quote.code === selectedIndexCode) ?? indexQuotes[0] ?? null;
  const candles = mergeRealtimeCandle(
    candleResult.data.map(normalizeCandle).filter((item): item is MarketCandle => Boolean(item)),
    selectedQuote
  );
  const chartSeries = {
    intraday: intradayResult.data,
    daily: candles,
    weekly: aggregateCandles(candles, "weekly"),
    monthly: aggregateCandles(candles, "monthly"),
  };
  const breadth = normalizeBreadth(breadthResult.data);
  const baseIndustries = industryResult.data
    .map(normalizeIndustry)
    .filter((item): item is MarketIndustryQuote => Boolean(item))
    .sort((a, b) => b.changeRatio - a.changeRatio);
  const industrySignalResult = await enrichIndustriesWithSignals(baseIndustries, run);
  const rangeGains = mergeRangeGain(
    normalizeRangeGain(rangeGainResult.data),
    buildComputedRangeGain(candles, selectedQuote, selectedIndexCode)
  );
  const sourceErrors = [indexQuoteResult, candleResult, breadthResult, industryResult, rangeGainResult, intradayResult]
    .map((result) => result.error)
    .filter((error): error is string => Boolean(error))
    .concat(industrySignalResult.sourceErrors);

  return {
    selectedIndexCode,
    indexQuotes,
    candles,
    chartSeries,
    breadth,
    industries: industrySignalResult.industries,
    indexMetrics: {
      rangeGains,
    },
    updatedAt: selectedQuote?.dataTime || firstNonEmpty(indexQuotes.map((quote) => quote.dataTime)) || breadth.dataTime || toDateTime(now),
    sourceErrors: unique(sourceErrors),
  };
}

async function fetchJsonArray(run: CommandRunner, endpoint: string, args: string[]): Promise<SourceResult<Array<Record<string, unknown>>>> {
  const result = await run("investoday-api", [endpoint, ...args]);
  if (!result.ok) {
    return { data: [], error: endpoint };
  }
  try {
    return { data: parseJsonCandidates(result.stdout) };
  } catch {
    return { data: [], error: endpoint };
  }
}

async function fetchJsonRecord(run: CommandRunner, endpoint: string, args: string[]): Promise<SourceResult<Record<string, unknown>>> {
  const result = await run("investoday-api", [endpoint, ...args]);
  if (!result.ok) {
    return { data: {}, error: endpoint };
  }
  try {
    const parsed = JSON.parse(result.stdout);
    if (isRecord(parsed?.data)) return { data: parsed.data };
    if (Array.isArray(parsed?.data) && isRecord(parsed.data[0])) return { data: parsed.data[0] };
    if (Array.isArray(parsed) && isRecord(parsed[0])) return { data: parsed[0] };
    if (isRecord(parsed)) return { data: parsed };
    return { data: {}, error: endpoint };
  } catch {
    return { data: {}, error: endpoint };
  }
}

async function fetchEastmoneyIntradayCandles(indexCode: string, fetchExternal?: ExternalFetcher): Promise<SourceResult<MarketCandle[]>> {
  const secid = EASTMONEY_INDEX_SECIDS[sanitizeIndexCode(indexCode) as (typeof DEFAULT_MARKET_INDEX_CODES)[number]];
  const fetcher = fetchExternal ?? globalThis.fetch?.bind(globalThis);
  if (!secid || !fetcher) {
    return { data: [], error: EASTMONEY_INTRADAY_SOURCE };
  }

  const url = new URL("https://push2his.eastmoney.com/api/qt/stock/kline/get");
  url.searchParams.set("secid", secid);
  url.searchParams.set("fields1", "f1,f2,f3,f4,f5,f6");
  url.searchParams.set("fields2", "f51,f52,f53,f54,f55,f56,f57,f58");
  url.searchParams.set("klt", "1");
  url.searchParams.set("fqt", "1");
  url.searchParams.set("end", "20500101");
  url.searchParams.set("lmt", "320");

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), 8_000) : null;
  try {
    const response = await fetcher(url.toString(), {
      cache: "no-store",
      headers: { accept: "application/json,text/plain,*/*" },
      signal: controller?.signal,
    });
    if (!response.ok) return { data: [], error: EASTMONEY_INTRADAY_SOURCE };
    const payload = await response.json();
    const data = isRecord(payload) && isRecord(payload.data) ? payload.data : {};
    const klines = Array.isArray(data.klines) ? data.klines : [];
    const candles = klines
      .map(normalizeEastmoneyIntradayKline)
      .filter((item): item is MarketCandle => Boolean(item))
      .sort((a, b) => a.date.localeCompare(b.date));
    const latestDate = dateOnly(candles.at(-1)?.date);
    const latestCandles = latestDate ? candles.filter((item) => dateOnly(item.date) === latestDate) : candles;
    return { data: latestCandles.slice(-300) };
  } catch {
    return { data: [], error: EASTMONEY_INTRADAY_SOURCE };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function normalizeEastmoneyIntradayKline(row: unknown): MarketCandle | null {
  const parts = stringValue(row).split(",");
  if (parts.length < 7) return null;
  const date = stringValue(parts[0]);
  const open = numberOrNull(parts[1]);
  const close = numberOrNull(parts[2]);
  const high = numberOrNull(parts[3]);
  const low = numberOrNull(parts[4]);
  if (!date || open === null || close === null || high === null || low === null) return null;
  return {
    date,
    open,
    close,
    high,
    low,
    previousClose: null,
    volume: numberOrNull(parts[5]),
    amount: numberOrNull(parts[6]),
  };
}

function normalizeIndexQuote(item: Record<string, unknown>): MarketIndexQuote | null {
  const code = stringValue(item.indexCode);
  if (!code) return null;
  return {
    code,
    name: stringValue(item.indexName) || stringValue(item.industryName) || code,
    current: numberOrNull(item.currentPrice ?? item.closePrice),
    previousClose: numberOrNull(item.closePriceYDay ?? item.previousClosePrice),
    open: numberOrNull(item.openPrice),
    high: numberOrNull(item.highPrice),
    low: numberOrNull(item.lowPrice),
    changeRatio: numberOrNull(item.changeRatio ?? item.pxChangeRate),
    volume: numberOrNull(item.dealStockAmount ?? item.volume),
    amount: numberOrNull(item.dealMoney ?? item.tradingAmountCny),
    dataTime: stringValue(item.dataTime ?? item.date),
  };
}

function normalizeCandle(item: Record<string, unknown>): MarketCandle | null {
  const date = dateOnly(item.date);
  const open = numberOrNull(item.openPrice);
  const close = numberOrNull(item.closePrice ?? item.currentPrice);
  const low = numberOrNull(item.lowPrice);
  const high = numberOrNull(item.highPrice);
  if (!date || open === null || close === null || low === null || high === null) return null;
  return {
    date,
    open,
    close,
    low,
    high,
    previousClose: numberOrNull(item.previousClosePrice ?? item.closePriceYDay),
    volume: numberOrNull(item.volume ?? item.dealStockAmount),
    amount: numberOrNull(item.tradingAmountCny ?? item.dealMoney),
  };
}

function normalizeRangeGain(item: Record<string, unknown>): MarketIndexRangeGain | null {
  const code = stringValue(item.indexCode ?? item.stockCode);
  if (!code) return null;
  return {
    code,
    name: stringValue(item.indexName ?? item.stockName) || code,
    return1d: percentPointToRatio(item.return1dPct),
    return1w: percentPointToRatio(item.return1wPct),
    return1m: percentPointToRatio(item.return1mPct),
    return3m: percentPointToRatio(item.return3mPct),
    return6m: percentPointToRatio(item.return6mPct),
    return1y: percentPointToRatio(item.return1yPct),
    returnYtd: percentPointToRatio(item.returnYtdPct),
    source: "investoday",
    sourceLabel: "今日投资 index/range-gains",
  };
}

const RANGE_GAIN_KEYS = ["return1d", "return1w", "return1m", "return3m", "return6m", "return1y", "returnYtd"] as const;

function mergeRangeGain(primary: MarketIndexRangeGain | null, fallback: MarketIndexRangeGain | null): MarketIndexRangeGain | null {
  if (!primary) return fallback;
  if (!fallback) return primary;
  const merged: MarketIndexRangeGain = { ...primary };
  let usedFallback = false;
  let hasPrimaryValue = false;
  for (const key of RANGE_GAIN_KEYS) {
    if (primary[key] !== null) {
      hasPrimaryValue = true;
      continue;
    }
    if (fallback[key] !== null) {
      merged[key] = fallback[key];
      usedFallback = true;
    }
  }
  if (usedFallback && hasPrimaryValue) {
    merged.source = "mixed";
    merged.sourceLabel = "今日投资 index/range-gains，缺失项按日K收盘价计算";
  } else if (usedFallback && !hasPrimaryValue) {
    merged.source = "computed";
    merged.sourceLabel = "按今日投资 index/quotes 日K收盘价计算";
  }
  return merged;
}

function buildComputedRangeGain(
  candles: MarketCandle[],
  quote: MarketIndexQuote | null,
  selectedIndexCode: string
): MarketIndexRangeGain | null {
  const sorted = [...candles].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted.at(-1);
  if (!latest) return null;
  const latestClose = latest.close;
  const latestDate = dateOnly(latest.date);
  const previousCandle = sorted.at(-2);
  const return1d = quote?.changeRatio ?? ratio(latestClose, latest.previousClose ?? previousCandle?.close ?? null);
  const yearStart = `${latestDate.slice(0, 4)}-01-01`;
  const ytdBase =
    [...sorted].reverse().find((item) => dateOnly(item.date) < yearStart)?.close ??
    sorted.find((item) => dateOnly(item.date) >= yearStart)?.close ??
    null;
  return {
    code: selectedIndexCode,
    name: quote?.name || selectedIndexCode,
    return1d: roundedRatioOrNull(return1d),
    return1w: ratio(latestClose, closeAtOrBefore(sorted, latestDate, 7)),
    return1m: ratio(latestClose, closeAtOrBefore(sorted, latestDate, 30)),
    return3m: ratio(latestClose, closeAtOrBefore(sorted, latestDate, 90)),
    return6m: ratio(latestClose, closeAtOrBefore(sorted, latestDate, 180)),
    return1y: ratio(latestClose, closeAtOrBefore(sorted, latestDate, 365)),
    returnYtd: ratio(latestClose, ytdBase),
    source: "computed",
    sourceLabel: "按今日投资 index/quotes 日K收盘价计算",
  };
}

function closeAtOrBefore(candles: MarketCandle[], latestDate: string, daysBefore: number) {
  const target = parseUtcDate(latestDate);
  target.setUTCDate(target.getUTCDate() - daysBefore);
  const targetKey = dateParam(target);
  return [...candles].reverse().find((item) => dateOnly(item.date) <= targetKey)?.close ?? null;
}

function ratio(current: number, baseline: number | null | undefined) {
  if (baseline === null || baseline === undefined || baseline === 0) return null;
  return roundedRatioOrNull(current / baseline - 1);
}

function roundedRatioOrNull(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? roundRatio(value) : null;
}

function normalizeBreadth(item: Record<string, unknown>): MarketBreadth {
  const up = numberValue(item.upAmount);
  const down = numberValue(item.downAmount);
  const flat = numberValue(item.bxAmount);
  const total = up + down + flat;
  const upLimit = numberValue(item.upTopAmount);
  const downLimit = numberValue(item.downTopAmount);
  const upOver8 = numberValue(item.upOver8Amount);
  const downOver8 = numberValue(item.downOver8Amount);
  return {
    dataTime: stringValue(item.dataTime),
    up,
    down,
    flat,
    total,
    upLimit,
    downLimit,
    upOver8,
    downOver8,
    upRatio: total > 0 ? up / total : 0,
    extremeRatio: total > 0 ? (upLimit + upOver8 + downLimit + downOver8) / total : 0,
    buckets: [
      { label: "涨停", value: upLimit, tone: "up" },
      { label: ">8%", value: upOver8, tone: "up" },
      { label: "6-8%", value: numberValue(item.upBx68Amount), tone: "up" },
      { label: "2-6%", value: numberValue(item.upBx26Amount), tone: "up" },
      { label: "0-2%", value: numberValue(item.upBx02Amount), tone: "up" },
      { label: "平盘", value: flat, tone: "flat" },
      { label: "0--2%", value: numberValue(item.downBx02Amount), tone: "down" },
      { label: "-2--6%", value: numberValue(item.downBx26Amount), tone: "down" },
      { label: "-6--8%", value: numberValue(item.downBx68Amount), tone: "down" },
      { label: "<-8%", value: downOver8, tone: "down" },
      { label: "跌停", value: downLimit, tone: "down" },
    ],
  };
}

function normalizeIndustry(item: Record<string, unknown>): MarketIndustryQuote | null {
  const code = stringValue(item.industryCode);
  const name = stringValue(item.industryName);
  if (!code || !name) return null;
  return {
    code,
    name,
    price: numberOrNull(item.price),
    changeRatio: numberValue(item.changeRatio ?? item.pxChangeRate),
    changeRatio1W: numberOrNull(item.changeRatio1W),
    volume: numberOrNull(item.volume),
    totalValue: numberOrNull(item.totalValue),
    ratioRank: numberOrNull(item.ratioRank),
    stockUp: numberValue(item.stockUpAmount),
    stockDown: numberValue(item.stockDownAmount),
    stockFlat: numberValue(item.stockBxAmount),
    stockTotal: numberValue(item.stockAmount),
    leadStockCode: stringValue(item.leadUpStockCode),
    leadStockName: stringValue(item.leadUpStockName),
  };
}

async function enrichIndustriesWithSignals(
  industries: MarketIndustryQuote[],
  run: CommandRunner
): Promise<{ industries: MarketIndustryQuote[]; sourceErrors: string[] }> {
  const errors = new Set<string>();
  const enriched = await mapWithConcurrency(industries, 6, async (industry) => {
    const statsResult = await fetchJsonRecord(run, "industry/market-stats", [
      "--method",
      "POST",
      "--body-json",
      JSON.stringify({ industryCode: industry.code }),
    ]);
    if (statsResult.error) errors.add("industry/market-stats");
    return {
      ...industry,
      signal: normalizeIndustrySignal(statsResult.data, industry),
    };
  });
  return { industries: enriched, sourceErrors: [...errors] };
}

function normalizeIndustrySignal(
  stats: Record<string, unknown>,
  industry: MarketIndustryQuote
): MarketIndustrySignal {
  return {
    return1d: percentageMaybeRatio(stats.return1d ?? industry.changeRatio),
    return1w: percentageMaybeRatio(stats.return1w ?? industry.changeRatio1W),
    return1m: percentageMaybeRatio(stats.return1m),
    netMainInflow1dMn: numberOrNull(stats.netMainInflow1dMn),
    netMainInflow5dMn: numberOrNull(stats.netMainInflow5dMn),
    netMainInflow20dMn: numberOrNull(stats.netMainInflow20dMn),
    pePct5y: numberOrNull(stats.pePct5y),
    pbPct5y: numberOrNull(stats.pbPct5y),
    psPct5y: numberOrNull(stats.psPct5y),
  };
}

function mergeRealtimeCandle(candles: MarketCandle[], quote: MarketIndexQuote | null) {
  const sorted = [...candles].sort((a, b) => a.date.localeCompare(b.date));
  if (!quote?.dataTime || quote.open === null || quote.high === null || quote.low === null || quote.current === null) {
    return sorted.slice(-500);
  }
  const realtimeCandle: MarketCandle = {
    date: dateOnly(quote.dataTime),
    open: quote.open,
    high: quote.high,
    low: quote.low,
    close: quote.current,
    previousClose: quote.previousClose,
    volume: quote.volume,
    amount: quote.amount,
  };
  if (!realtimeCandle.date) return sorted.slice(-500);
  const existingIndex = sorted.findIndex((item) => item.date === realtimeCandle.date);
  if (existingIndex >= 0) {
    sorted[existingIndex] = realtimeCandle;
  } else {
    sorted.push(realtimeCandle);
  }
  return sorted.sort((a, b) => a.date.localeCompare(b.date)).slice(-500);
}

function aggregateCandles(candles: MarketCandle[], timeframe: "weekly" | "monthly"): MarketCandle[] {
  const groups = new Map<string, MarketCandle>();
  for (const candle of [...candles].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = timeframe === "weekly" ? weekStartKey(candle.date) : monthStartKey(candle.date);
    const current = groups.get(key);
    if (!current) {
      groups.set(key, { ...candle, date: key });
      continue;
    }
    groups.set(key, {
      date: key,
      open: current.open,
      close: candle.close,
      low: Math.min(current.low, candle.low),
      high: Math.max(current.high, candle.high),
      previousClose: current.previousClose,
      volume: addNullable(current.volume, candle.volume),
      amount: addNullable(current.amount, candle.amount),
    });
  }
  return [...groups.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(timeframe === "weekly" ? -260 : -120);
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  async function runNext() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runNext));
  return results;
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

function sanitizeIndexCode(value?: string) {
  const code = stringValue(value);
  return DEFAULT_MARKET_INDEX_CODES.includes(code as (typeof DEFAULT_MARKET_INDEX_CODES)[number]) ? code : "000001";
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateParam(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toDateTime(date: Date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function dateOnly(value: unknown) {
  return stringValue(value).slice(0, 10);
}

function weekStartKey(value: string) {
  const date = parseUtcDate(value);
  const day = date.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return dateParam(date);
}

function monthStartKey(value: string) {
  return `${stringValue(value).slice(0, 7)}-01`;
}

function parseUtcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

function firstNonEmpty(values: string[]) {
  return values.find(Boolean) ?? "";
}

function percentPointToRatio(value: unknown): number | null {
  const parsed = numberOrNull(value);
  return parsed === null ? null : roundRatio(parsed / 100);
}

function percentageMaybeRatio(value: unknown): number | null {
  const parsed = numberOrNull(value);
  if (parsed === null) return null;
  return roundRatio(Math.abs(parsed) > 1 ? parsed / 100 : parsed);
}

function roundRatio(value: number) {
  return Number(value.toFixed(8));
}

function addNullable(left: number | null, right: number | null): number | null {
  if (left === null && right === null) return null;
  return (left ?? 0) + (right ?? 0);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberValue(value: unknown): number {
  return numberOrNull(value) ?? 0;
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
