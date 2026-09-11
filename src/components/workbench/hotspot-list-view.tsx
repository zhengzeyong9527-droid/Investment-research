"use client";

import { ArrowLeft, ChevronRight, Flame, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { HotspotType, RollingHotspot } from "@/components/workbench/types";

export function HotspotListView({
  type,
  gains,
  declines,
  updatedAt,
}: {
  type: HotspotType;
  gains: RollingHotspot[];
  declines: RollingHotspot[];
  updatedAt: string;
}) {
  const [mode, setMode] = useState<"gain" | "decline">("gain");
  const [keyword, setKeyword] = useState("");
  const sourceItems = mode === "gain" ? gains : declines;
  const title = type === "industry" ? "全部行业" : "全部概念";
  const subtitle = type === "industry" ? "申万一级行业涨跌幅" : "概念板块涨跌幅";
  const Icon = type === "industry" ? Flame : Sparkles;
  const query = keyword.trim().toLowerCase();
  const visibleItems = useMemo(
    () =>
      sourceItems.filter((item) => {
        if (!query) return true;
        return item.name.toLowerCase().includes(query) || item.code.toLowerCase().includes(query);
      }),
    [query, sourceItems]
  );

  return (
    <main className="glass-shell min-h-screen bg-terminal px-6 py-7 text-ink max-sm:px-4">
      <div className="grain" />
      <div className="relative mx-auto max-w-7xl">
        <Link href="/" className="mb-5 inline-flex items-center gap-2 rounded-md border border-jade/20 bg-white/70 px-3 py-2 text-sm font-semibold text-jade shadow-sm backdrop-blur hover:border-jade/45 hover:bg-white">
          <ArrowLeft size={16} />
          返回工作台
        </Link>

        <section className={`hotspot-list-hero hotspot-list-${type} mb-5 p-6 max-sm:p-5`}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-kicker">{subtitle}</p>
              <h1 className="mt-2 flex items-center gap-3 font-display text-4xl leading-tight text-ink max-md:text-3xl">
                <span className="hotspot-icon">
                  <Icon size={22} />
                </span>
                {title}
              </h1>
            </div>
            <div className="text-right text-sm font-semibold text-ink/50 max-sm:text-left">
              <div>{visibleItems.length} 个</div>
              {updatedAt && <div className="mt-1 text-xs">更新 {updatedAt.slice(5, 16)}</div>}
            </div>
          </div>
        </section>

        <section className="hotspot-list-shell p-5 max-sm:p-4">
          <div className="hotspot-list-toolbar">
            <div className="hotspot-mode-switch" role="group" aria-label={`${title}排序`}>
              <button type="button" className={mode === "gain" ? "is-active" : ""} onClick={() => setMode("gain")}>
                涨幅
              </button>
              <button type="button" className={mode === "decline" ? "is-active" : ""} onClick={() => setMode("decline")}>
                跌幅
              </button>
            </div>
            <label className="hotspot-list-search">
              <Search size={16} />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索名称或代码"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-2" role="list" aria-label={title}>
            {visibleItems.length === 0 ? (
              <div className="hotspot-empty">暂无匹配数据</div>
            ) : (
              visibleItems.map((item, index) => <HotspotListRow key={`${mode}-${item.code}`} item={item} index={index} />)
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function HotspotListRow({ item, index }: { item: RollingHotspot; index: number }) {
  return (
    <Link href={`/hotspots/${item.type}/${item.code}`} className="hotspot-list-row">
      <span className="hotspot-rank">{String(index + 1).padStart(2, "0")}</span>
      <span className="min-w-0">
        <strong>{item.name}</strong>
        <small>
          {item.code}
          {item.leadStockName ? ` · 领涨 ${item.leadStockName}` : ""}
        </small>
      </span>
      <span className="hotspot-list-breadth">
        <small>{item.stockUp} 涨</small>
        <small>{item.stockDown} 跌</small>
      </span>
      <strong className={marketValueClass(item.changeRatio)}>{formatPercent(item.changeRatio)}</strong>
      <ChevronRight size={16} className="text-ink/28" />
    </Link>
  );
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  const percent = value * 100;
  return `${percent > 0 ? "+" : ""}${percent.toFixed(2)}%`;
}

function marketValueClass(value: number | null | undefined) {
  if (value === null || value === undefined || value === 0) return "market-flat";
  return value > 0 ? "market-up" : "market-down";
}
