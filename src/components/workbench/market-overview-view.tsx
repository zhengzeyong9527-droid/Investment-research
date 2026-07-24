"use client";

import type { EChartsOption } from "echarts";
import { AlertTriangle, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchJson } from "@/components/workbench/api";
import { MarketChart } from "@/components/workbench/market-chart";
import type { MarketCandle, MarketIndexQuote, MarketIndustryQuote, MarketIntradayTick, MarketOverview, MarketTimeframe } from "@/components/workbench/types";

const UP_COLOR = "#d84b3a";
const DOWN_COLOR = "#0d9b7f";
const FLAT_COLOR = "#8aa0a5";

const TIMEFRAME_LABELS: Array<{ value: MarketTimeframe; label: string; ariaLabel: string }> = [
  { value: "intraday", label: "分时", ariaLabel: "指数分时图" },
  { value: "daily", label: "日K", ariaLabel: "指数日K图" },
  { value: "weekly", label: "周K", ariaLabel: "指数周K图" },
  { value: "monthly", label: "月K", ariaLabel: "指数月K图" },
];

type IndicatorState = {
  ma: boolean;
  boll: boolean;
  macd: boolean;
};

export function MarketOverviewView({
  setLoading,
  setNotice,
}: {
  setLoading: (value: boolean) => void;
  setNotice: (value: string) => void;
}) {
  const [selectedIndexCode, setSelectedIndexCode] = useState("000001");
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [loading, setLocalLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeframe, setTimeframe] = useState<MarketTimeframe>("daily");
  const [indicators, setIndicators] = useState<IndicatorState>({ ma: true, boll: false, macd: false });
  const [intradayTicks, setIntradayTicks] = useState<Record<string, MarketIntradayTick[]>>({});

  const loadOverview = useCallback(
    async (indexCode: string, quiet = false) => {
      if (!quiet) {
        setLocalLoading(true);
        setLoading(true);
      }
      try {
        const data = await fetchJson<MarketOverview>(`/api/market-overview?indexCode=${indexCode}`);
        setOverview(data);
        setIntradayTicks((previous) => appendIntradayTicks(previous, data.indexQuotes));
        setError("");
        setNotice(data.sourceErrors.length > 0 ? `大盘数据已刷新，${data.sourceErrors.length} 个来源暂不可用` : `大盘数据已刷新 ${data.updatedAt}`);
      } catch {
        setError("大盘数据获取失败");
        setNotice("大盘数据获取失败");
      } finally {
        if (!quiet) {
          setLocalLoading(false);
          setLoading(false);
        }
      }
    },
    [setLoading, setNotice]
  );

  useEffect(() => {
    void loadOverview(selectedIndexCode);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadOverview(selectedIndexCode, true);
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [loadOverview, selectedIndexCode]);

  const selectedQuote = overview?.indexQuotes.find((quote) => quote.code === overview.selectedIndexCode) ?? overview?.indexQuotes[0] ?? null;
  const selectedTicks = useMemo(() => {
    if (!selectedQuote) return [];
    const ticks = intradayTicks[selectedQuote.code] ?? [];
    return ticks.length > 0 ? ticks : tickFromQuote(selectedQuote);
  }, [intradayTicks, selectedQuote]);
  const activeCandles = useMemo(() => {
    if (!overview) return [];
    if (timeframe === "weekly") return overview.chartSeries.weekly;
    if (timeframe === "monthly") return overview.chartSeries.monthly;
    return overview.chartSeries.daily;
  }, [overview, timeframe]);
  const timeframeMeta = TIMEFRAME_LABELS.find((item) => item.value === timeframe) ?? TIMEFRAME_LABELS[1];
  const mainChartOption = useMemo(
    () => (timeframe === "intraday" ? buildIntradayOption(selectedTicks, selectedQuote) : buildCandleOption(activeCandles, indicators)),
    [activeCandles, indicators, selectedQuote, selectedTicks, timeframe]
  );
  const breadthOption = useMemo(() => buildBreadthOption(overview), [overview]);
  const todayBubbleOption = useMemo(() => buildIndustryBubbleOption(overview?.industries ?? [], "today"), [overview]);
  const weeklyBubbleOption = useMemo(() => buildIndustryBubbleOption(overview?.industries ?? [], "weekly"), [overview]);
  const marketTemperature = useMemo(() => calculateMarketTemperature(overview), [overview]);
  const fundBands = useMemo(() => buildFundBands(overview?.industries ?? []), [overview]);
  const profitGaugeOption = useMemo(() => buildGaugeOption("赚钱效应", overview?.breadth.upRatio ?? 0, UP_COLOR), [overview]);
  const temperatureGaugeOption = useMemo(() => buildGaugeOption("盘面温度", marketTemperature.temperature, "#b57a20"), [marketTemperature.temperature]);
  const extremeGaugeOption = useMemo(() => buildGaugeOption("极端波动", overview?.breadth.extremeRatio ?? 0, "#b57a20"), [overview]);

  if (loading && !overview) {
    return <MarketSkeleton />;
  }

  if (error && !overview) {
    return (
      <section className="market-glass grid min-h-[420px] place-items-center p-8">
        <div className="max-w-sm text-center">
          <AlertTriangle className="mx-auto text-persimmon" size={34} />
          <h3 className="mt-4 font-display text-2xl text-ink">大盘数据获取失败</h3>
          <p className="mt-2 text-sm leading-6 text-ink/58">实时行情源暂时不可用，可以稍后重试。</p>
          <button type="button" className="market-refresh-button mx-auto mt-5" onClick={() => void loadOverview(selectedIndexCode)}>
            <RefreshCw size={16} />
            重试
          </button>
        </div>
      </section>
    );
  }

  if (!overview) return null;

  return (
    <div className="market-dashboard grid gap-5">
      <section className="market-glass market-hero p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-kicker">实时行情</p>
            <h3 className="mt-1 font-display text-2xl text-ink">指数脉冲</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="market-time-pill">更新 {overview.updatedAt}</span>
            <button type="button" className="market-refresh-button" onClick={() => void loadOverview(selectedIndexCode)}>
              <RefreshCw size={16} />
              刷新
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-persimmon/20 bg-persimmon/10 px-3 py-2 text-xs text-persimmon">
            {error}
          </div>
        )}

        <div className="mt-4 grid grid-cols-6 gap-3 max-2xl:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
          {overview.indexQuotes.map((quote) => (
            <button
              key={quote.code}
              type="button"
              onClick={() => setSelectedIndexCode(quote.code)}
              className={`market-index-pill ${quote.code === overview.selectedIndexCode ? "market-index-pill-active" : ""}`}
            >
              <span className="flex items-center justify-between gap-2">
                <strong>{quote.name}</strong>
                <span className={quote.changeRatio !== null && quote.changeRatio >= 0 ? "market-up" : "market-down"}>
                  {formatPercent(quote.changeRatio)}
                </span>
              </span>
              <span className="mt-2 flex items-end justify-between gap-2">
                <span className="font-display text-2xl">{formatNumber(quote.current)}</span>
                <span className="text-xs text-ink/45">{formatMoneyCn(quote.amount)}</span>
              </span>
              {quote.code === overview.selectedIndexCode && overview.indexMetrics.rangeGains && (
                <span className="market-range-line">
                  1周 {formatPercent(overview.indexMetrics.rangeGains.return1w)} / YTD {formatPercent(overview.indexMetrics.rangeGains.returnYtd)}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1.75fr)_minmax(320px,0.75fr)] items-start gap-5 max-xl:grid-cols-1">
        <section className="market-glass market-panel p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl text-ink">K线与量能</h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="market-segmented" aria-label="行情周期">
                  {TIMEFRAME_LABELS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`market-segment-button ${timeframe === item.value ? "market-segment-button-active" : ""}`}
                      onClick={() => setTimeframe(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5" aria-label="技术指标">
                  {(["ma", "boll", "macd"] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={`market-indicator-toggle ${indicators[key] ? "market-indicator-toggle-active" : ""}`}
                      onClick={() => setIndicators((current) => ({ ...current, [key]: !current[key] }))}
                    >
                      {key === "ma" ? "MA" : key === "boll" ? "BOLL" : "MACD"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <span className="market-mini-pill">{selectedQuote ? `${selectedQuote.name} ${formatPercent(selectedQuote.changeRatio)} · ${timeframeMeta.label}` : "指数"}</span>
          </div>
          <IndexMetricStrip overview={overview} />
          <MarketChart ariaLabel={timeframeMeta.ariaLabel} option={mainChartOption} className="h-[470px] max-md:h-[360px]" />
        </section>

        <aside className="grid gap-5">
          <section className="market-glass market-panel p-4">
            <PanelHeader title="赚钱效应" meta={`${overview.breadth.up} 涨 / ${overview.breadth.down} 跌`} />
            <MarketChart ariaLabel="赚钱效应仪表盘" option={profitGaugeOption} className="h-[220px]" />
          </section>
          <section className="market-glass market-panel p-4">
            <PanelHeader title="盘面温度" meta={`情绪 ${formatPercent(marketTemperature.sentimentAverage)}`} />
            <MarketChart ariaLabel="盘面温度仪表盘" option={temperatureGaugeOption} className="h-[220px]" />
          </section>
          <section className="market-glass market-panel p-4">
            <PanelHeader title="极端波动" meta={`涨停 ${overview.breadth.upLimit} / 跌停 ${overview.breadth.downLimit}`} />
            <MarketChart ariaLabel="极端波动仪表盘" option={extremeGaugeOption} className="h-[220px]" />
          </section>
          <section className="market-glass market-panel p-4">
            <PanelHeader title="涨跌分布" meta={`样本 ${overview.breadth.total}`} />
            <MarketChart ariaLabel="涨跌分布阶梯图" option={breadthOption} className="h-[230px]" />
          </section>
        </aside>
      </div>

      <div className="grid grid-cols-2 gap-5 max-xl:grid-cols-1">
        <section className="market-glass market-panel p-4">
          <PanelHeader title="今日行业气泡" meta="涨跌幅 / 上涨占比 / 体量" />
          <MarketChart ariaLabel="今日行业气泡图" option={todayBubbleOption} className="h-[430px] max-md:h-[340px]" />
        </section>

        <section className="market-glass market-panel p-4">
          <PanelHeader title="近一周行业气泡" meta="周涨跌 / 5日主力净流 / 体量" />
          <MarketChart ariaLabel="近一周行业气泡图" option={weeklyBubbleOption} className="h-[430px] max-md:h-[340px]" />
        </section>
      </div>

      <section className="market-glass market-panel p-4">
        <PanelHeader title="资金温度带" meta="按 5日主力净流强度排序" />
        <div className="market-fund-band">
          {fundBands.map((item) => (
            <div key={item.code} className="market-fund-row" title={`${item.name} 5日主力净流 ${formatFundFlow(item.value)}`}>
              <span>{item.name}</span>
              <div className="market-fund-track">
                <i
                  style={
                    {
                      width: item.width,
                      background: item.value >= 0 ? "rgba(216,75,58,.72)" : "rgba(13,155,127,.72)",
                    } as CSSProperties
                  }
                />
              </div>
              <strong className={item.value >= 0 ? "market-up" : "market-down"}>{formatFundFlow(item.value)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="market-source-strip">
        <span>数据来源：index-quote/realtime、index/quotes、index/range-gains、index/valuation、market/change-ratio-status、industry-quote/realtime-v2、industry/rotation、industry/market-stats</span>
        {overview.sourceErrors.length > 0 && <span className="text-persimmon">暂缺：{overview.sourceErrors.join(", ")}</span>}
      </section>
    </div>
  );
}

function PanelHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-display text-xl text-ink">{title}</h3>
      <span className="market-mini-pill">{meta}</span>
    </div>
  );
}

function IndexMetricStrip({ overview }: { overview: MarketOverview }) {
  const valuation = overview.indexMetrics.valuation;
  const range = overview.indexMetrics.rangeGains;
  return (
    <div className="market-metric-grid mb-3">
      <span className="market-metric-capsule">1日 {formatPercent(range?.return1d ?? null)}</span>
      <span className="market-metric-capsule">1周 {formatPercent(range?.return1w ?? null)}</span>
      <span className="market-metric-capsule">1月 {formatPercent(range?.return1m ?? null)}</span>
      <span className="market-metric-capsule">YTD {formatPercent(range?.returnYtd ?? null)}</span>
      <span className="market-metric-capsule">PE {formatFixed(valuation?.pe, 2)}</span>
      <span className="market-metric-capsule">PB {formatFixed(valuation?.pb, 2)}</span>
      <span className="market-metric-capsule">PE百分位 {formatPercent(valuation?.peRank5y ?? null)}</span>
      <span className="market-metric-capsule">股息率 {formatPercent(valuation?.dividendYield ?? null)}</span>
    </div>
  );
}

function tickFromQuote(quote: MarketIndexQuote): MarketIntradayTick[] {
  if (!quote.dataTime || quote.current === null) return [];
  return [
    {
      time: quote.dataTime,
      price: quote.current,
      previousClose: quote.previousClose,
      changeRatio: quote.changeRatio,
      amount: quote.amount,
    },
  ];
}

function appendIntradayTicks(current: Record<string, MarketIntradayTick[]>, quotes: MarketIndexQuote[]) {
  const next = { ...current };
  for (const quote of quotes) {
    const tick = tickFromQuote(quote)[0];
    if (!tick) continue;
    const existing = next[quote.code] ?? [];
    if (existing.some((item) => item.time === tick.time)) {
      next[quote.code] = existing;
      continue;
    }
    next[quote.code] = [...existing, tick].slice(-240);
  }
  return next;
}

function calculateMarketTemperature(overview: MarketOverview | null) {
  const sentimentValues = (overview?.industries ?? [])
    .map((industry) => industry.signal?.marketSentiment)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const sentimentAverage = sentimentValues.length > 0 ? sentimentValues.reduce((sum, value) => sum + value, 0) / sentimentValues.length : 0;
  const breadthRatio = overview?.breadth.upRatio ?? 0;
  return {
    sentimentAverage,
    temperature: clampRatio(sentimentAverage * 0.62 + breadthRatio * 0.38),
  };
}

function buildFundBands(industries: MarketIndustryQuote[]) {
  const items = industries
    .map((industry) => ({
      code: industry.code,
      name: industry.name,
      value: industry.signal?.netMainInflow5dMn ?? industry.signal?.netMainInflow1dMn ?? 0,
    }))
    .filter((item) => item.value !== 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 12);
  const maxAbs = Math.max(...items.map((item) => Math.abs(item.value)), 1);
  return items.map((item) => ({
    ...item,
    width: `${Math.max(8, (Math.abs(item.value) / maxAbs) * 100)}%`,
  }));
}

function MarketSkeleton() {
  return (
    <div className="market-dashboard grid gap-5">
      <section className="market-glass p-5">
        <div className="market-skeleton h-7 w-44" />
        <div className="mt-5 grid grid-cols-6 gap-3 max-2xl:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="market-skeleton h-24 rounded-xl" />
          ))}
        </div>
      </section>
      <section className="market-glass grid min-h-[420px] place-items-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full border border-jade/20 bg-jade/10" />
          <div className="font-semibold text-ink/68">正在加载大盘数据</div>
        </div>
      </section>
    </div>
  );
}

function buildCandleOption(candles: MarketCandle[], indicators: IndicatorState): EChartsOption {
  const dates = candles.map((item) => item.date);
  const candleData = candles.map((item) => [item.open, item.close, item.low, item.high]);
  const volumes = candles.map((item) => item.volume ?? 0);
  const hasMacd = indicators.macd;
  const xAxisIndexes = hasMacd ? [0, 1, 2] : [0, 1];
  const series: NonNullable<EChartsOption["series"]> = [
    {
      name: "K线",
      type: "candlestick",
      data: candleData,
      itemStyle: { color: UP_COLOR, color0: DOWN_COLOR, borderColor: UP_COLOR, borderColor0: DOWN_COLOR },
    },
  ];

  if (indicators.ma) {
    series.push(
      { name: "MA5", type: "line", data: movingAverage(candles, 5), smooth: true, showSymbol: false, lineStyle: { width: 1.35 } },
      { name: "MA10", type: "line", data: movingAverage(candles, 10), smooth: true, showSymbol: false, lineStyle: { width: 1.35 } },
      { name: "MA20", type: "line", data: movingAverage(candles, 20), smooth: true, showSymbol: false, lineStyle: { width: 1.35 } },
      { name: "MA60", type: "line", data: movingAverage(candles, 60), smooth: true, showSymbol: false, lineStyle: { width: 1.2, type: "dashed" } }
    );
  }

  if (indicators.boll) {
    const boll = bollingerBands(candles, 20);
    series.push(
      { name: "BOLL中轨", type: "line", data: boll.mid, smooth: true, showSymbol: false, lineStyle: { width: 1, color: "rgba(65,94,99,.72)" } },
      { name: "BOLL上轨", type: "line", data: boll.upper, smooth: true, showSymbol: false, lineStyle: { width: 1, color: "rgba(181,122,32,.58)" } },
      { name: "BOLL下轨", type: "line", data: boll.lower, smooth: true, showSymbol: false, lineStyle: { width: 1, color: "rgba(13,155,127,.5)" } }
    );
  }

  series.push({
    name: "成交量",
    type: "bar",
    xAxisIndex: 1,
    yAxisIndex: 1,
    data: volumes,
    itemStyle: {
      color: (params: unknown) => {
        const dataIndex = (params as { dataIndex?: number }).dataIndex ?? 0;
        const candle = candles[dataIndex];
        return candle && candle.close >= candle.open ? "rgba(216,75,58,.54)" : "rgba(13,155,127,.54)";
      },
    },
  });

  if (hasMacd) {
    const macd = macdSeries(candles);
    series.push(
      {
        name: "MACD",
        type: "bar",
        xAxisIndex: 2,
        yAxisIndex: 2,
        data: macd.macd,
        itemStyle: { color: (params: unknown) => (Number((params as { value?: unknown }).value ?? 0) >= 0 ? "rgba(216,75,58,.48)" : "rgba(13,155,127,.48)") },
      },
      { name: "DIFF", type: "line", xAxisIndex: 2, yAxisIndex: 2, data: macd.diff, showSymbol: false, lineStyle: { width: 1.1 } },
      { name: "DEA", type: "line", xAxisIndex: 2, yAxisIndex: 2, data: macd.dea, showSymbol: false, lineStyle: { width: 1.1 } }
    );
  }

  return {
    animation: true,
    color: [UP_COLOR, DOWN_COLOR, "#b57a20", "#415e63"],
    tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
    axisPointer: { link: [{ xAxisIndex: "all" }] },
    legend: { top: 0, right: 8, itemWidth: 10, itemHeight: 6, textStyle: { color: "rgba(21,34,37,.52)", fontSize: 11 } },
    grid: hasMacd
      ? [
          { left: 42, right: 18, top: 34, height: "50%" },
          { left: 42, right: 18, top: "68%", height: "10%" },
          { left: 42, right: 18, top: "82%", height: "12%" },
        ]
      : [
          { left: 42, right: 18, top: 34, height: "60%" },
          { left: 42, right: 18, top: "76%", height: "14%" },
        ],
    xAxis: [
      { type: "category", data: dates, boundaryGap: false, axisLine: { lineStyle: { color: "rgba(21,34,37,.18)" } }, axisLabel: { color: "rgba(21,34,37,.48)" } },
      { type: "category", data: dates, gridIndex: 1, boundaryGap: false, axisLabel: { show: false }, axisLine: { lineStyle: { color: "rgba(21,34,37,.12)" } } },
      ...(hasMacd ? [{ type: "category" as const, data: dates, gridIndex: 2, boundaryGap: false, axisLabel: { show: false }, axisLine: { lineStyle: { color: "rgba(21,34,37,.12)" } } }] : []),
    ],
    yAxis: [
      { scale: true, splitLine: { lineStyle: { color: "rgba(21,34,37,.08)" } }, axisLabel: { color: "rgba(21,34,37,.48)" } },
      { scale: true, gridIndex: 1, splitNumber: 2, axisLabel: { show: false }, splitLine: { show: false } },
      ...(hasMacd ? [{ scale: true, gridIndex: 2, splitNumber: 2, axisLabel: { show: false }, splitLine: { show: false } }] : []),
    ],
    dataZoom: [
      { type: "inside", xAxisIndex: xAxisIndexes, start: 48, end: 100 },
      { show: false, xAxisIndex: xAxisIndexes, start: 48, end: 100 },
    ],
    series,
  } as EChartsOption;
}

function buildIntradayOption(ticks: MarketIntradayTick[], quote: MarketIndexQuote | null): EChartsOption {
  const data = ticks.map((tick) => [tick.time.slice(11, 16), tick.price]);
  const previousClose = quote?.previousClose ?? ticks.find((tick) => tick.previousClose !== null)?.previousClose ?? null;
  return {
    animation: true,
    tooltip: {
      trigger: "axis",
      formatter: (params: unknown) => {
        const item = Array.isArray(params) ? (params[0] as { data?: [string, number] } | undefined) : undefined;
        const price = item?.data?.[1] ?? quote?.current ?? null;
        return `分时<br/>${item?.data?.[0] ?? "--"} ${formatNumber(price)}`;
      },
    },
    grid: { left: 44, right: 18, top: 28, bottom: 38 },
    xAxis: { type: "category", data: data.map((item) => item[0]), boundaryGap: false, axisLine: { lineStyle: { color: "rgba(21,34,37,.16)" } }, axisLabel: { color: "rgba(21,34,37,.48)" } },
    yAxis: { type: "value", scale: true, splitLine: { lineStyle: { color: "rgba(21,34,37,.08)" } }, axisLabel: { color: "rgba(21,34,37,.48)" } },
    series: [
      {
        name: "分时",
        type: "line",
        data: data.map((item) => item[1]),
        showSymbol: data.length <= 8,
        smooth: true,
        lineStyle: { width: 2, color: quote?.changeRatio !== null && quote?.changeRatio !== undefined && quote.changeRatio >= 0 ? UP_COLOR : DOWN_COLOR },
        areaStyle: { color: quote?.changeRatio !== null && quote?.changeRatio !== undefined && quote.changeRatio >= 0 ? "rgba(216,75,58,.12)" : "rgba(13,155,127,.12)" },
        markPoint: { data: [{ type: "max", name: "高" }, { type: "min", name: "低" }] },
        markLine: previousClose === null ? undefined : { symbol: "none", lineStyle: { color: "rgba(21,34,37,.32)", type: "dashed" }, data: [{ yAxis: previousClose, name: "昨收" }] },
      },
    ],
  } as EChartsOption;
}

function buildGaugeOption(title: string, value: number, color: string): EChartsOption {
  return {
    series: [
      {
        type: "gauge",
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 1,
        radius: "92%",
        progress: { show: true, roundCap: true, width: 16, itemStyle: { color } },
        axisLine: { roundCap: true, lineStyle: { width: 16, color: [[1, "rgba(21,34,37,.08)"]] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        title: { show: true, offsetCenter: [0, "42%"], color: "rgba(21,34,37,.56)", fontSize: 12 },
        detail: {
          valueAnimation: true,
          formatter: () => `${Math.round(value * 100)}%`,
          offsetCenter: [0, "4%"],
          fontSize: 30,
          color: "#152225",
          fontWeight: 700,
        },
        data: [{ value, name: title }],
      },
    ],
  } as EChartsOption;
}

function buildBreadthOption(overview: MarketOverview | null): EChartsOption {
  const buckets = overview?.breadth.buckets ?? [];
  return {
    tooltip: { trigger: "axis" },
    grid: { left: 34, right: 10, top: 18, bottom: 36 },
    xAxis: { type: "category", data: buckets.map((item) => item.label), axisLabel: { color: "rgba(21,34,37,.52)", interval: 0, rotate: 32 }, axisLine: { lineStyle: { color: "rgba(21,34,37,.14)" } } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "rgba(21,34,37,.08)" } }, axisLabel: { color: "rgba(21,34,37,.45)" } },
    series: [
      {
        type: "bar",
        data: buckets.map((item) => ({
          value: item.value,
          itemStyle: { color: item.tone === "up" ? UP_COLOR : item.tone === "down" ? DOWN_COLOR : FLAT_COLOR },
        })),
        barWidth: "58%",
      },
    ],
  } as EChartsOption;
}

function buildIndustryBubbleOption(industries: MarketIndustryQuote[], mode: "today" | "weekly"): EChartsOption {
  const maxValue = Math.max(...industries.map((item) => item.totalValue ?? item.stockTotal), 1);
  const data = industries.map((item) => {
    const total = item.stockTotal || item.stockUp + item.stockDown + item.stockFlat;
    const upRatio = total > 0 ? item.stockUp / total : 0;
    const weeklyReturn = item.signal?.return1w ?? item.changeRatio1W ?? 0;
    const fundFlow = item.signal?.netMainInflow5dMn ?? item.signal?.netMainInflow1dMn ?? 0;
    const sizeValue = item.totalValue ?? item.stockTotal;
    return [
      mode === "today" ? item.changeRatio * 100 : weeklyReturn * 100,
      mode === "today" ? upRatio * 100 : fundFlow,
      sizeValue,
      item.name,
      item.stockUp,
      item.stockDown,
      fundFlow,
      item.signal?.marketSentiment ?? null,
    ];
  });
  const getBubbleData = (params: unknown) => {
    if (Array.isArray(params)) return params;
    const payload = (params as { data?: unknown }).data;
    return Array.isArray(payload) ? payload : [];
  };
  const formatBubbleTooltip = (params: unknown) => {
    const item = getBubbleData(params);
    const xValue = Number(item[0] ?? 0);
    const yValue = Number(item[1] ?? 0);
    const name = String(item[3] ?? "--");
    const up = Number(item[4] ?? 0);
    const down = Number(item[5] ?? 0);
    const flow = Number(item[6] ?? 0);
    const sentiment = typeof item[7] === "number" ? item[7] : null;
    if (mode === "today") {
    return `${name}<br/>今日涨跌 ${xValue.toFixed(2)}%<br/>上涨占比 ${yValue.toFixed(1)}%<br/>上涨 ${up} / 下跌 ${down}<br/>5日主力净流 ${formatFundFlow(flow)}<br/>市场温度 ${formatPercent(sentiment)}`;
    }
    return `${name}<br/>近一周 ${xValue.toFixed(2)}%<br/>5日主力净流 ${formatFundFlow(yValue)}<br/>上涨 ${up} / 下跌 ${down}<br/>市场温度 ${formatPercent(sentiment)}`;
  };
  return {
    tooltip: {
      trigger: "item",
      formatter: formatBubbleTooltip,
    },
    grid: { left: 46, right: 18, top: 34, bottom: 42 },
    xAxis: {
      name: mode === "today" ? "今日涨跌幅" : "近一周涨跌幅",
      type: "value",
      axisLabel: { formatter: "{value}%", color: "rgba(21,34,37,.52)" },
      splitLine: { lineStyle: { color: "rgba(21,34,37,.08)" } },
      axisLine: { lineStyle: { color: "rgba(21,34,37,.14)" } },
    },
    yAxis: {
      name: mode === "today" ? "上涨占比" : "5日主力净流",
      type: "value",
      axisLabel: {
        formatter: (value: number) => (mode === "today" ? `${value.toFixed(0)}%` : formatFundFlow(value)),
        color: "rgba(21,34,37,.52)",
      },
      splitLine: { lineStyle: { color: "rgba(21,34,37,.08)" } },
      axisLine: { lineStyle: { color: "rgba(21,34,37,.14)" } },
    },
    series: [
      {
        type: "scatter",
        data,
        symbolSize: (params: unknown) => {
          const item = Array.isArray(params) ? params : [];
          return 16 + Math.sqrt(Math.max(Number(item[2] ?? 1), 1) / maxValue) * 46;
        },
        itemStyle: {
          color: (params: unknown) => (Number(getBubbleData(params)[0] ?? 0) >= 0 ? "rgba(216,75,58,.72)" : "rgba(13,155,127,.72)"),
          borderColor: "rgba(255,255,255,.86)",
          borderWidth: 1,
          shadowBlur: 14,
          shadowColor: "rgba(61,86,92,.16)",
        },
        label: {
          show: true,
          formatter: (params: unknown) => String(getBubbleData(params)[3] ?? ""),
          color: "#152225",
          fontSize: 11,
          overflow: "truncate",
          width: 72,
        },
        labelLayout: { hideOverlap: true },
      },
    ],
  } as EChartsOption;
}

function movingAverage(candles: MarketCandle[], days: number) {
  return candles.map((_, index) => {
    if (index < days - 1) return null;
    const values = candles.slice(index - days + 1, index + 1);
    return Number((values.reduce((sum, item) => sum + item.close, 0) / days).toFixed(2));
  });
}

function bollingerBands(candles: MarketCandle[], days: number) {
  const mid = movingAverage(candles, days);
  const upper = candles.map((_, index) => {
    if (index < days - 1) return null;
    const values = candles.slice(index - days + 1, index + 1).map((item) => item.close);
    const average = Number(mid[index] ?? 0);
    const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / days;
    return Number((average + Math.sqrt(variance) * 2).toFixed(2));
  });
  const lower = candles.map((_, index) => {
    if (index < days - 1) return null;
    const values = candles.slice(index - days + 1, index + 1).map((item) => item.close);
    const average = Number(mid[index] ?? 0);
    const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / days;
    return Number((average - Math.sqrt(variance) * 2).toFixed(2));
  });
  return { mid, upper, lower };
}

function macdSeries(candles: MarketCandle[]) {
  const closes = candles.map((item) => item.close);
  const ema12 = emaSeries(closes, 12);
  const ema26 = emaSeries(closes, 26);
  const diff = closes.map((_, index) => roundValue(ema12[index] - ema26[index], 4));
  const dea = emaSeries(diff, 9).map((value) => roundValue(value, 4));
  const macd = diff.map((value, index) => roundValue((value - dea[index]) * 2, 4));
  return { diff, dea, macd };
}

function emaSeries(values: number[], days: number) {
  const alpha = 2 / (days + 1);
  const result: number[] = [];
  values.forEach((value, index) => {
    result[index] = index === 0 ? value : value * alpha + result[index - 1] * (1 - alpha);
  });
  return result;
}

function roundValue(value: number, digits: number) {
  return Number(value.toFixed(digits));
}

function clampRatio(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function formatFixed(value: number | null | undefined, digits: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return value.toFixed(digits);
}

function formatNumber(value: number | null) {
  if (value === null) return "--";
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(2)}%`;
}

function formatMoneyCn(value: number | null) {
  if (value === null) return "--";
  if (Math.abs(value) >= 100_000_000_000) return `${(value / 100_000_000_000).toFixed(2)}千亿`;
  if (Math.abs(value) >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}亿`;
  return `${(value / 10_000).toFixed(1)}万`;
}

function formatFundFlow(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  if (Math.abs(value) >= 10_000) return `${sign}${(value / 10_000).toFixed(1)}亿`;
  return `${sign}${value.toFixed(1)}万`;
}
