"use client";

import { CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchJson, postJson } from "@/components/workbench/api";
import { AgentView } from "@/components/workbench/agent-view";
import { BriefView } from "@/components/workbench/brief-view";
import { navItems } from "@/components/workbench/constants";
import { MarketOverviewView } from "@/components/workbench/market-overview-view";
import { SettingsView } from "@/components/workbench/settings-view";
import type { AgentRun, AppSettings, BriefHistory, DailyBrief, SkillCatalogItem, View, WatchTarget } from "@/components/workbench/types";
import { WatchlistView } from "@/components/workbench/watchlist-view";
import { shanghaiDateString } from "@/components/workbench/utils";

export function WorkbenchApp() {
  const [view, setView] = useState<View>("brief");
  const [targets, setTargets] = useState<WatchTarget[]>([]);
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [history, setHistory] = useState<BriefHistory[]>([]);
  const [skillCatalog, setSkillCatalog] = useState<SkillCatalogItem[]>([]);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    briefTime: "08:30",
    dataWindowHours: 24,
    backfillDays: 7,
    defaultItemLimit: 20,
  });
  const [health, setHealth] = useState<{ ok: boolean; message: string } | null>(null);
  const [notice, setNotice] = useState("Agent 工作台已就绪");
  const [loading, setLoading] = useState(false);

  const today = useMemo(() => shanghaiDateString(new Date()), []);
  const briefItems = brief?.items ?? [];

  const loadAll = useCallback(async () => {
    const [targetData, briefData, catalogData, historyData, settingsData, runsData] = await Promise.all([
      fetchJson<WatchTarget[]>("/api/watch-targets"),
      fetchJson<DailyBrief | null>(`/api/briefs?date=${today}`),
      fetchJson<SkillCatalogItem[]>("/api/skill-catalog"),
      fetchJson<BriefHistory[]>("/api/briefs/history"),
      fetchJson<AppSettings>("/api/settings"),
      fetchJson<AgentRun[]>("/api/agent-runs"),
    ]);
    let nextTargets = targetData;
    if (targetData.some((target) => target.code.startsWith("NAME:"))) {
      const repaired = await postJson<{ repairedCount: number; failedCount: number; targets: WatchTarget[] }>(
        "/api/watch-targets/repair",
        {}
      );
      nextTargets = repaired.targets;
      if (repaired.repairedCount > 0) {
        setNotice(`已自动修复 ${repaired.repairedCount} 个历史自选对象。`);
      }
    }
    setTargets(nextTargets);
    setBrief(briefData);
    setSkillCatalog(catalogData);
    setHistory(historyData);
    setSettings(settingsData);
    setAgentRuns(runsData);
    setSelectedRun(runsData[0] ?? null);
  }, [today]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function generateBrief(windowHours = settings.dataWindowHours) {
    setLoading(true);
    setNotice("正在生成自选速览...");
    try {
      const nextBrief = await postJson<DailyBrief>("/api/briefs/generate", { briefDate: today, windowHours });
      setBrief(nextBrief);
      setHistory(await fetchJson<BriefHistory[]>("/api/briefs/history"));
      setNotice(nextBrief.status === "empty" ? "自选速览已生成，暂未获取到匹配内容。" : "自选速览已生成。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "自选速览生成失败");
    } finally {
      setLoading(false);
    }
  }

  async function reloadAgents(nextSelectedId?: string) {
    const runs = await fetchJson<AgentRun[]>("/api/agent-runs");
    setAgentRuns(runs);
    if (nextSelectedId) {
      setSelectedRun(runs.find((run) => run.id === nextSelectedId) ?? runs[0] ?? null);
    }
  }

  async function openAgentRun(id: string) {
    const run = await fetchJson<AgentRun>(`/api/agent-runs/${id}`);
    setSelectedRun(run);
  }

  return (
    <main className="glass-shell min-h-screen">
      <aside className="glass-rail fixed left-4 top-4 z-20 flex h-[calc(100vh-2rem)] w-[128px] flex-col items-center justify-between rounded-xl p-3 max-lg:static max-lg:h-auto max-lg:w-full max-lg:flex-row max-lg:rounded-none">
        <div className="grid w-full place-items-center gap-4 max-lg:flex">
          <div className="grid h-12 w-12 place-items-center rounded-xl border border-jade/20 bg-jade/10 text-jade">
            <Clock3 />
          </div>
          <nav className="grid w-full gap-2" aria-label="主导航">
            {navItems.map(({ view: itemView, label, icon: Icon }) => (
              <button
                key={itemView}
                onClick={() => setView(itemView)}
                className={`nav-button ${view === itemView ? "nav-button-active" : ""}`}
                title={label}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <div className="ml-[152px] grid min-h-screen gap-5 p-5 max-lg:ml-0">
        <Header view={view} notice={notice} loading={loading} />

        {view === "brief" && (
          <BriefView
            brief={brief}
            briefItems={briefItems}
            briefHistory={history}
            targets={targets}
            loading={loading}
            onGenerate={() => void generateBrief()}
            onBackfill={() => void generateBrief(settings.backfillDays * 24)}
          />
        )}

        {view === "market" && <MarketOverviewView setLoading={setLoading} setNotice={setNotice} />}

        {view === "agent" && (
          <AgentView
            catalog={skillCatalog}
            agentRuns={agentRuns}
            selectedRun={selectedRun}
            targets={targets}
            onSelect={openAgentRun}
            onCreated={async (id) => {
              await reloadAgents(id);
              await openAgentRun(id);
            }}
            setLoading={setLoading}
            setNotice={setNotice}
          />
        )}

        {view === "watchlist" && (
          <WatchlistView
            targets={targets}
            onChanged={async (message) => {
              setNotice(message);
              setTargets(await fetchJson<WatchTarget[]>("/api/watch-targets"));
            }}
          />
        )}

        {view === "settings" && (
          <SettingsView
            settings={settings}
            health={health}
            onSaved={(next) => {
              setSettings(next);
              setNotice("设置已保存。");
            }}
            onCheckHealth={async () => {
              const nextHealth = await fetchJson<{ ok: boolean; message: string }>("/api/health/investoday");
              setHealth(nextHealth);
              setNotice(nextHealth.message);
            }}
          />
        )}
      </div>
    </main>
  );
}

function Header({ view, notice, loading }: { view: View; notice: string; loading: boolean }) {
  const title = {
    brief: "自选速览",
    market: "当日大盘",
    agent: "研究 Agent",
    watchlist: "自选池",
    settings: "设置",
  }[view];

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-jade">
          Personal Research Desk
          <span className="rounded bg-jade/10 px-2 py-1 normal-case tracking-normal">
            {shanghaiDateString(new Date())}
          </span>
        </div>
        <h2 className="font-display text-4xl leading-tight text-ink max-sm:text-3xl">{title}</h2>
      </div>
      <div className="status-strip min-h-10 min-w-[280px] px-4 py-2 text-sm max-sm:min-w-0">
        <span className="inline-flex items-center gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          {notice}
        </span>
      </div>
    </header>
  );
}
