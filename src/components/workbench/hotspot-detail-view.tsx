"use client";

import { ArrowLeft, Check, Clock3, Flame, Plus, Sparkles, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { ApiRequestError, postJson } from "@/components/workbench/api";
import type { HotspotDetail, HotspotStockQuote } from "@/components/workbench/types";

type AddState = "idle" | "saving" | "added" | "duplicate" | "failed";
type StockSortMode = "gain-desc" | "loss-asc";

export function HotspotDetailView({ detail }: { detail: HotspotDetail }) {
  const [addStates, setAddStates] = useState<Record<string, AddState>>({});
  const [sortMode, setSortMode] = useState<StockSortMode>("gain-desc");
  const typeLabel = detail.hotspot.type === "industry" ? "行业热点" : "概念热点";
  const typeIcon = detail.hotspot.type === "industry" ? Flame : Sparkles;
  const Icon = typeIcon;
  const hotspotTone = marketTone(detail.hotspot.changeRatio);
  const hasFullStockList = detail.hotspot.stockTotal <= 0 || detail.stocks.length >= detail.hotspot.stockTotal;
  const stockSectionTitle = hasFullStockList ? "成分股涨跌幅" : "领涨股";
  const stockSectionMeta = hasFullStockList ? `${detail.stocks.length} 只` : `已返回 ${detail.stocks.length} / 共 ${detail.hotspot.stockTotal}`;
  const stockListAriaLabel = `${detail.hotspot.name} ${stockSectionTitle}`;
  const sortedStocks = useMemo(
    () =>
      [...detail.stocks].sort((a, b) =>
        sortMode === "gain-desc" ? b.changeRatio - a.changeRatio : a.changeRatio - b.changeRatio
      ),
    [detail.stocks, sortMode]
  );

  async function addStock(stock: HotspotStockQuote) {
    setAddStates((states) => ({ ...states, [stock.code]: "saving" }));
    try {
      await postJson("/api/watch-targets", {
        type: "stock",
        code: stock.code,
        name: stock.name,
        tags: ["热点滚动", detail.hotspot.type === "industry" ? "行业领涨" : "概念领涨"],
        reason: `来自${detail.hotspot.name}热点详情：${formatPercent(stock.changeRatio)}，${stock.dataTime || detail.hotspot.dataTime}`,
      });
      setAddStates((states) => ({ ...states, [stock.code]: "added" }));
    } catch (error) {
      setAddStates((states) => ({
        ...states,
        [stock.code]: error instanceof ApiRequestError && error.status === 409 ? "duplicate" : "failed",
      }));
    }
  }

  return (
    <main className="glass-shell min-h-screen bg-terminal px-6 py-7 text-ink max-sm:px-4">
      <div className="grain" />
      <div className="relative mx-auto max-w-7xl">
        <a href="/" className="mb-5 inline-flex items-center gap-2 rounded-md border border-jade/20 bg-white/70 px-3 py-2 text-sm font-semibold text-jade shadow-sm backdrop-blur hover:border-jade/45 hover:bg-white">
          <ArrowLeft size={16} />
          返回工作台
        </a>

        <section
          aria-label={`${detail.hotspot.name}热点详情`}
          className={`hotspot-detail-hero hotspot-detail-${hotspotTone} mb-5 p-6 max-sm:p-5`}
        >
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded bg-jade/10 px-2 py-1 text-xs font-semibold text-jade">
                  <Icon size={14} />
                  {typeLabel}
                </span>
                <span className="rounded border border-ink/10 bg-white/62 px-2 py-1 text-xs font-semibold text-ink/55">
                  {detail.hotspot.code}
                </span>
              </div>
              <h1 className="font-display text-4xl leading-[1.16] text-ink max-md:text-3xl">{detail.hotspot.name}</h1>
              <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
                <span className="rounded-md bg-white/66 px-3 py-2 shadow-sm">今日 <strong className={marketValueClass(detail.hotspot.changeRatio)}>{formatPercent(detail.hotspot.changeRatio)}</strong></span>
                <span className="rounded-md bg-white/66 px-3 py-2 shadow-sm">近一周 <strong className={marketValueClass(detail.hotspot.changeRatio1W)}>{formatPercent(detail.hotspot.changeRatio1W)}</strong></span>
                <span className="rounded-md bg-white/66 px-3 py-2 shadow-sm">领涨 {detail.hotspot.leadStockName || "-"}</span>
              </div>
            </div>
            <div className="hotspot-source-card">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink/45">
                <Clock3 size={15} />
                更新时间
              </div>
              <div className="mt-1 font-semibold">{detail.hotspot.dataTime || "暂无更新时间"}</div>
            </div>
          </div>
        </section>

        <section className="mb-5 grid grid-cols-5 gap-3 max-lg:grid-cols-3 max-sm:grid-cols-2">
          <HotspotMetric label="上涨家数" value={String(detail.hotspot.stockUp)} tone="up" />
          <HotspotMetric label="下跌家数" value={String(detail.hotspot.stockDown)} tone="down" />
          <HotspotMetric label="平盘家数" value={String(detail.hotspot.stockFlat)} />
          <HotspotMetric label="涨停家数" value={String(detail.hotspot.limitUp)} tone="hot" />
          <HotspotMetric label="成分股" value={String(detail.hotspot.stockTotal || detail.stocks.length)} />
        </section>

        <section className="hotspot-stock-board p-5 max-sm:p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-kicker">成分股涨跌幅排序</p>
              <h2 className="mt-1 flex items-center gap-2 font-display text-2xl">
                <TrendingUp size={21} className={sortMode === "gain-desc" ? "market-up" : "market-down"} />
                {stockSectionTitle}
              </h2>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="hotspot-sort-controls" aria-label="成分股排序">
                <button
                  type="button"
                  aria-pressed={sortMode === "gain-desc"}
                  className={`hotspot-sort-button ${sortMode === "gain-desc" ? "hotspot-sort-button-active-up" : ""}`}
                  onClick={() => setSortMode("gain-desc")}
                >
                  涨幅降序
                </button>
                <button
                  type="button"
                  aria-pressed={sortMode === "loss-asc"}
                  className={`hotspot-sort-button ${sortMode === "loss-asc" ? "hotspot-sort-button-active-down" : ""}`}
                  onClick={() => setSortMode("loss-asc")}
                >
                  跌幅升序
                </button>
              </div>
              <span className="hotspot-stock-count">{stockSectionMeta}</span>
            </div>
          </div>

          <div className="grid gap-2" role="list" aria-label={stockListAriaLabel}>
            {detail.stocks.length === 0 ? (
              <div className="hotspot-empty">暂无成分股行情</div>
            ) : (
              sortedStocks.map((stock, index) => (
                <StockQuoteRow
                  key={stock.code}
                  stock={stock}
                  index={index}
                  state={addStates[stock.code] ?? "idle"}
                  onAdd={() => addStock(stock)}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function HotspotMetric({ label, value, tone = "flat" }: { label: string; value: string; tone?: "up" | "down" | "hot" | "flat" }) {
  return (
    <div className={`hotspot-metric hotspot-metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StockQuoteRow({
  stock,
  index,
  state,
  onAdd,
}: {
  stock: HotspotStockQuote;
  index: number;
  state: AddState;
  onAdd: () => void;
}) {
  const label = addButtonLabel(state);
  const disabled = state === "saving" || state === "added" || state === "duplicate";
  return (
    <article className="hotspot-stock-row" role="listitem">
      <div className="hotspot-stock-rank">{String(index + 1).padStart(2, "0")}</div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold leading-6">{stock.name}</h3>
          <span className="text-xs font-semibold text-ink/45">{stock.code}</span>
          {stock.marketType && <span className="rounded bg-ink/8 px-2 py-0.5 text-[0.68rem] font-semibold text-ink/45">{stock.marketType}</span>}
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2 text-xs font-semibold text-ink/50 max-md:grid-cols-2">
          <span>现价 {formatPrice(stock.currentPrice)}</span>
          <span>开盘 {formatPrice(stock.openPrice)}</span>
          <span>最高 {formatPrice(stock.highPrice)}</span>
          <span>最低 {formatPrice(stock.lowPrice)}</span>
        </div>
      </div>
      <div className="grid justify-items-end gap-2">
        <strong className={`font-display text-xl ${marketValueClass(stock.changeRatio)}`}>{formatPercent(stock.changeRatio)}</strong>
        <button
          type="button"
          disabled={disabled}
          onClick={onAdd}
          aria-label={`${label} ${stock.name}`}
          className="hotspot-add-button"
        >
          {state === "added" || state === "duplicate" ? <Check size={15} /> : <Plus size={15} />}
          <span>{label}</span>
        </button>
      </div>
    </article>
  );
}

function addButtonLabel(state: AddState) {
  if (state === "saving") return "加入中";
  if (state === "added") return "已加入";
  if (state === "duplicate") return "已在自选";
  if (state === "failed") return "重试加入";
  return "加入自选";
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  const percent = value * 100;
  return `${percent > 0 ? "+" : ""}${percent.toFixed(2)}%`;
}

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  return value.toFixed(value >= 100 ? 2 : 3).replace(/\.?0+$/, "");
}

function marketValueClass(value: number | null | undefined) {
  if (value === null || value === undefined || value === 0) return "market-flat";
  return value > 0 ? "market-up" : "market-down";
}

function marketTone(value: number | null | undefined) {
  if (value === null || value === undefined || value === 0) return "flat";
  return value > 0 ? "up" : "down";
}
