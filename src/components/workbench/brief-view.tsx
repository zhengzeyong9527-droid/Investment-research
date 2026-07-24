import { Archive, ChevronRight, Layers3, Newspaper, RefreshCw, Search, ShieldAlert, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { kindLabel } from "@/components/workbench/constants";
import type { BriefHistory, BriefItem, DailyBrief, WatchTarget } from "@/components/workbench/types";
import { EmptyState, IconButton, InsightPanel, SegmentedFilter } from "@/components/workbench/ui";
import {
  collectSectionValues,
  formatDateTime,
  itemSearchText,
  sortBriefItems,
} from "@/components/workbench/utils";

export function BriefView(props: {
  brief: DailyBrief | null;
  briefItems: BriefItem[];
  briefHistory: BriefHistory[];
  targets: WatchTarget[];
  loading: boolean;
  onGenerate: () => void;
  onBackfill: () => void;
}) {
  const [targetFilter, setTargetFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState<BriefItem["kind"] | "all">("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [newsTypeFilter, setNewsTypeFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const validTargets = props.targets.filter((target) => target.enabled && !target.code.startsWith("NAME:"));
  const pendingTargets = props.targets.filter((target) => target.enabled && target.code.startsWith("NAME:"));
  const visibleItems = useMemo(
    () => props.briefItems.filter((item) => item.kind !== "news" || item.newsLevelValue === 1),
    [props.briefItems]
  );

  useEffect(() => {
    if (kindFilter !== "news" && newsTypeFilter !== "all") {
      setNewsTypeFilter("all");
    }
  }, [kindFilter, newsTypeFilter]);

  const filteredItems = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    return visibleItems
      .filter((item) => targetFilter === "all" || item.target?.id === targetFilter)
      .filter((item) => kindFilter === "all" || item.kind === kindFilter)
      .filter((item) => sentimentFilter === "all" || item.sentimentValue === Number(sentimentFilter))
      .filter((item) => kindFilter !== "news" || newsTypeFilter === "all" || item.newsTypeValue === Number(newsTypeFilter))
      .filter((item) => !text || itemSearchText(item).toLowerCase().includes(text))
      .sort((a, b) => sortBriefItems(a, b, "latest"));
  }, [visibleItems, targetFilter, kindFilter, sentimentFilter, newsTypeFilter, keyword]);
  const riskNotes = collectSectionValues(filteredItems, "风险提示", 5);
  const opportunityNotes = collectSectionValues(filteredItems, "机会线索", 5);

  return (
    <div className="grid gap-5">
      <section className="control-deck p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-kicker">自选监控</p>
            <h3 className="mt-1 font-display text-2xl">范围与筛选</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <IconButton label="7 天补漏" onClick={props.onBackfill} disabled={props.loading} icon={Archive} />
            <IconButton label="生成速览" onClick={props.onGenerate} disabled={props.loading} icon={RefreshCw} />
          </div>
        </div>

        <div className="grid gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1 thin-scroll">
            <button className={`target-chip ${targetFilter === "all" ? "target-chip-active" : ""}`} onClick={() => setTargetFilter("all")}>
              <Layers3 size={16} />
              <span>全部自选</span>
              <strong>{validTargets.length}</strong>
            </button>
            {validTargets.map((target) => (
              <button
                key={target.id}
                className={`target-chip ${targetFilter === target.id ? "target-chip-active" : ""}`}
                onClick={() => setTargetFilter(target.id)}
              >
                <span>{target.name}</span>
                <strong>{target.type === "stock" ? target.code : "板块"}</strong>
              </button>
            ))}
          </div>

          <div className={`grid gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1 ${kindFilter === "news" ? "grid-cols-[minmax(220px,1.1fr)_repeat(2,minmax(150px,1fr))]" : "grid-cols-[minmax(220px,1.1fr)_minmax(150px,1fr)]"}`}>
            <SegmentedFilter
              value={kindFilter}
              onChange={(value) => setKindFilter(value as BriefItem["kind"] | "all")}
              options={[
                ["all", "全部"],
                ["news", "新闻"],
                ["research", "研报"],
                ["announcement", "公告"],
              ]}
            />
            <select
              value={sentimentFilter}
              onChange={(event) => setSentimentFilter(event.target.value)}
              className="field rounded-md px-3 py-2 text-sm"
              aria-label="情绪筛选"
            >
              <option value="all">全部情绪</option>
              <option value="5">利好</option>
              <option value="4">中性偏多</option>
              <option value="3">中性</option>
              <option value="2">中性偏空</option>
              <option value="1">利空</option>
            </select>
            {kindFilter === "news" && (
              <select
                value={newsTypeFilter}
                onChange={(event) => setNewsTypeFilter(event.target.value)}
                className="field rounded-md px-3 py-2 text-sm"
                aria-label="新闻类型筛选"
              >
                <option value="all">全部新闻类型</option>
                <option value="1">宏观</option>
                <option value="2">行业</option>
                <option value="3">公司</option>
                <option value="4">行情</option>
              </select>
            )}
          </div>

          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="field w-full rounded-md py-2.5 pl-10 pr-3 text-sm"
              placeholder="搜索标题、摘要、要点"
            />
          </label>

          {pendingTargets.length > 0 && (
            <div className="rounded-md border border-persimmon/20 bg-persimmon/10 px-3 py-2 text-xs leading-5 text-persimmon">
              {pendingTargets.length} 个自选仍待确认，暂不参与自选速览。
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-5 max-xl:grid-cols-1">
        <section className="panel p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-kicker">{props.brief?.briefDate ?? "今日"}</p>
              <h3 className="font-display text-2xl">自选内容</h3>
            </div>
            <span className="rounded bg-jade/10 px-2 py-1 text-xs font-semibold text-jade">{filteredItems.length} 条</span>
          </div>

          <div className="grid gap-3">
            {filteredItems.length === 0 ? (
              <EmptyState
                icon={Newspaper}
                title={
                  visibleItems.length === 0
                    ? pendingTargets.length > 0
                      ? "自选对象待确认，暂未进入速览范围"
                      : "暂无自选速览内容，尝试刷新或扩大补漏窗口"
                    : "当前筛选条件下没有匹配内容"
                }
              />
            ) : (
              filteredItems.map((item) => <BriefItemCard key={item.id} item={item} />)
            )}
          </div>
        </section>

        <aside className="grid content-start gap-4">
          <InsightPanel icon={TrendingUp} title="机会线索" items={opportunityNotes} tone="positive" />
          <InsightPanel icon={ShieldAlert} title="风险提示" items={riskNotes} tone="danger" />
          <section className="panel p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-display text-xl">速览归档</h3>
              <span className="rounded bg-brass/10 px-2 py-1 text-xs font-semibold text-brass">{props.briefHistory.length}</span>
            </div>
            <div className="grid max-h-[300px] gap-2 overflow-y-auto pr-1 thin-scroll">
              {props.briefHistory.length === 0 ? (
                <EmptyState icon={Archive} title="暂无速览归档" compact />
              ) : (
                props.briefHistory.slice(0, 6).map((brief) => (
                  <div key={brief.id} className="archive-row">
                    <div className="font-display text-lg">{brief.briefDate}</div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink/58">{brief.summary}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function BriefItemCard({ item }: { item: BriefItem }) {
  return (
    <article className={`brief-card ${briefCardToneClass(item.kind)} p-4 transition`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={kindBadgeClass(item.kind)}>{kindLabel[item.kind]}</span>
        {item.sentimentLabel && <span className={sentimentBadgeClass(item.sentimentTone)}>{item.sentimentLabel}</span>}
        {item.newsLevelLabel && <span className="rounded bg-ink px-2 py-1 text-xs font-semibold text-paper">{item.newsLevelLabel}</span>}
        {item.newsTypeLabel && <span className="rounded border border-ink/10 px-2 py-1 text-xs text-ink/55">{item.newsTypeLabel}</span>}
        {item.relevance !== undefined && <span className="text-xs text-ink/45">关联度 {item.relevance}</span>}
        <span className="text-xs text-ink/45">{item.source}</span>
        <span className="text-xs text-ink/45">{formatDateTime(item.publishedAt)}</span>
        {item.target && <span className="text-xs text-persimmon">{item.target.name}</span>}
      </div>
      <h4 className="text-base font-semibold leading-6">{item.title}</h4>
      <p className="mt-2 text-sm leading-6 text-ink/65">{item.summary}</p>
      <a href={`/brief-items/${item.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-jade hover:text-persimmon">
        查看完整内容
        <ChevronRight size={15} />
      </a>
    </article>
  );
}

function briefCardToneClass(kind: BriefItem["kind"]) {
  if (kind === "research") return "brief-card-research";
  if (kind === "announcement") return "brief-card-announcement";
  if (kind === "event") return "brief-card-event";
  return "brief-card-news";
}

function kindBadgeClass(kind: BriefItem["kind"]) {
  if (kind === "research") return "rounded bg-brass/10 px-2 py-1 text-xs font-semibold text-brass";
  if (kind === "announcement") return "rounded bg-moss/10 px-2 py-1 text-xs font-semibold text-moss";
  if (kind === "event") return "rounded bg-ink/10 px-2 py-1 text-xs font-semibold text-ink/70";
  return "rounded bg-jade/10 px-2 py-1 text-xs font-semibold text-jade";
}

function sentimentBadgeClass(tone?: "positive" | "neutral" | "negative") {
  if (tone === "positive") return "rounded bg-jade/10 px-2 py-1 text-xs font-semibold text-jade";
  if (tone === "negative") return "rounded bg-persimmon/10 px-2 py-1 text-xs font-semibold text-persimmon";
  return "rounded bg-brass/10 px-2 py-1 text-xs font-semibold text-brass";
}
