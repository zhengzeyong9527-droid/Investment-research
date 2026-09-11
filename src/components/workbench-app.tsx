"use client";

import { CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiRequestError, fetchJson, postJson } from "@/components/workbench/api";
import { AgentChatView } from "@/components/workbench/agent-chat-view";
import { BriefView } from "@/components/workbench/brief-view";
import { navItems, statusLabel } from "@/components/workbench/constants";
import { MarketOverviewView } from "@/components/workbench/market-overview-view";
import { PetWidget } from "@/components/workbench/pet-widget";
import { SettingsView } from "@/components/workbench/settings-view";
import type { AgentMemoryItem, AgentMessage, AgentRun, AgentSession, AgentSessionDetail, AppSettings, BriefHistory, DailyBrief, HotspotOverview, SkillCatalogItem, View, WatchTarget } from "@/components/workbench/types";
import { isTerminalAgentRunStatus, useAgentRunEvents } from "@/components/workbench/use-agent-run-events";
import { useAgentSessionEvents } from "@/components/workbench/use-agent-session-events";
import { WatchlistView } from "@/components/workbench/watchlist-view";
import { shanghaiDateString } from "@/components/workbench/utils";

const AGENT_STORAGE_UNAVAILABLE_NOTICE =
  "Agent 数据库未连接。请依次启动 pnpm services:start、pnpm db:push、pnpm worker:agent、pnpm dev。";
const DEFAULT_SETTINGS: AppSettings = {
  briefTime: "08:30",
  dataWindowHours: 24,
  backfillDays: 7,
  defaultItemLimit: 20,
};
const EMPTY_HOTSPOTS: HotspotOverview = {
  industries: [],
  industryDeclines: [],
  concepts: [],
  conceptDeclines: [],
  updatedAt: "",
  sourceErrors: [],
};

export function WorkbenchApp() {
  const [view, setView] = useState<View>("brief");
  const [targets, setTargets] = useState<WatchTarget[]>([]);
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [hotspots, setHotspots] = useState<HotspotOverview>(EMPTY_HOTSPOTS);
  const [history, setHistory] = useState<BriefHistory[]>([]);
  const [skillCatalog, setSkillCatalog] = useState<SkillCatalogItem[]>([]);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);
  const [liveRunId, setLiveRunId] = useState<string | null>(null);
  const [agentSessions, setAgentSessions] = useState<AgentSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AgentSession | null>(null);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [agentMemories, setAgentMemories] = useState<AgentMemoryItem[]>([]);
  const [activeAgentRun, setActiveAgentRun] = useState<AgentRun | null>(null);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [streamingMarkdown, setStreamingMarkdown] = useState("");
  const [runDetail, setRunDetail] = useState<AgentRun | null>(null);
  const [agentStorageStatus, setAgentStorageStatus] = useState<"checking" | "available" | "unavailable">("checking");
  const [agentStorageMessage, setAgentStorageMessage] = useState(AGENT_STORAGE_UNAVAILABLE_NOTICE);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [health, setHealth] = useState<{ ok: boolean; message: string } | null>(null);
  const [notice, setNotice] = useState("Agent 工作台已就绪");
  const [loading, setLoading] = useState(false);
  const [marketWeak, setMarketWeak] = useState(false);

  const today = useMemo(() => shanghaiDateString(new Date()), []);
  const briefItems = brief?.items ?? [];
  const petBusy = loading || Boolean(liveRunId) || Boolean(liveSessionId) || Boolean(activeAgentRun && !isTerminalAgentRunStatus(activeAgentRun.status));

  const markAgentStorageAvailable = useCallback(() => {
    setAgentStorageStatus("available");
    setAgentStorageMessage("");
  }, []);

  const markAgentStorageUnavailable = useCallback((error?: unknown) => {
    const message = resolveAgentStorageMessage(error);
    setAgentStorageStatus("unavailable");
    setAgentStorageMessage(message);
    setSelectedSession(null);
    setAgentMessages([]);
    setAgentMemories([]);
    setActiveAgentRun(null);
    setLiveSessionId(null);
    setRunDetail(null);
    setNotice(message);
  }, []);

  const rememberAgentRun = useCallback((run: AgentRun) => {
    setAgentRuns((current) => mergeAgentRunList(current, run));
    setSelectedRun((current) => (current?.id === run.id || !current ? run : current));
  }, []);

  const finishLiveRun = useCallback(
    (run: AgentRun) => {
      rememberAgentRun(run);
      setLiveRunId(null);
      setLoading(false);
      setNotice(`Agent 任务${statusLabel[run.status] ?? run.status}`);
      void fetchJson<AgentRun>(`/api/agent-runs/${run.id}`)
        .then((finalRun) => {
          if (isTerminalAgentRunStatus(finalRun.status)) rememberAgentRun(finalRun);
        })
        .catch(() => undefined);
    },
    [rememberAgentRun]
  );

  const applySessionDetail = useCallback((session: AgentSessionDetail) => {
    const { messages, runs, activeRun, ...summary } = session;
    setAgentSessions((current) => mergeAgentSessionList(current, summary));
    setSelectedSession(summary);
    setAgentMessages(messages);
    setActiveAgentRun(activeRun ?? null);
    setStreamingMarkdown(activeRun?.outputMarkdown ?? "");
    if (runs.length > 0) {
      setAgentRuns((current) => runs.reduce((next, run) => mergeAgentRunList(next, run), current));
    }
  }, []);

  const finishLiveSession = useCallback(
    (session: AgentSessionDetail) => {
      applySessionDetail(session);
      setLiveSessionId(null);
      setLoading(false);
      void reloadAgentMemory();
      const latestRun = session.runs[0] ?? null;
      setNotice(latestRun ? `Agent ${statusLabel[latestRun.status] ?? latestRun.status}` : "Agent 对话已更新");
    },
    [applySessionDetail]
  );

  const handleSessionToken = useCallback((event: { runId?: string; token: string; markdown: string }) => {
    setStreamingMarkdown(event.markdown);
    setActiveAgentRun((current) => (current && current.id === event.runId ? { ...current, outputMarkdown: event.markdown } : current));
  }, []);

  useAgentRunEvents({
    runId: liveRunId,
    enabled: Boolean(liveRunId),
    onUpdate: rememberAgentRun,
    onTerminal: finishLiveRun,
  });

  useAgentSessionEvents({
    sessionId: liveSessionId,
    enabled: Boolean(liveSessionId),
    onToken: handleSessionToken,
    onUpdate: applySessionDetail,
    onTerminal: finishLiveSession,
  });

  const loadAll = useCallback(async () => {
    const [targetResult, briefResult, hotspotResult, catalogResult, historyResult, settingsResult, sessionsResult, runsResult, memoryResult] = await Promise.allSettled([
      fetchJson<WatchTarget[]>("/api/watch-targets"),
      fetchJson<DailyBrief | null>(`/api/briefs?date=${today}`),
      fetchJson<HotspotOverview>("/api/hotspots"),
      fetchJson<SkillCatalogItem[]>("/api/skill-catalog"),
      fetchJson<BriefHistory[]>("/api/briefs/history"),
      fetchJson<AppSettings>("/api/settings"),
      fetchJson<AgentSession[]>("/api/agent-sessions"),
      fetchJson<AgentRun[]>("/api/agent-runs"),
      fetchJson<AgentMemoryItem[]>("/api/agent-memory"),
    ]);
    const targetData = settledValue(targetResult, []);
    const briefData = settledValue(briefResult, null);
    const hotspotData = settledValue(hotspotResult, EMPTY_HOTSPOTS);
    const catalogData = settledValue(catalogResult, []);
    const historyData = settledValue(historyResult, []);
    const settingsData = settledValue(settingsResult, DEFAULT_SETTINGS);

    const coreFailure = firstRejectedReason([targetResult, briefResult, catalogResult, historyResult, settingsResult]);
    if (coreFailure) {
      setNotice(`基础数据加载失败：${readableError(coreFailure, "请检查数据库和服务状态")}`);
    }

    let nextTargets = targetData;
    if (targetResult.status === "fulfilled" && targetData.some((target) => target.code.startsWith("NAME:"))) {
      try {
        const repaired = await postJson<{ repairedCount: number; failedCount: number; targets: WatchTarget[] }>(
          "/api/watch-targets/repair",
          {}
        );
        nextTargets = repaired.targets;
        if (repaired.repairedCount > 0) {
          setNotice(`已自动修复 ${repaired.repairedCount} 个历史自选对象。`);
        }
      } catch (error) {
        setNotice(`自选对象修复失败：${readableError(error, "请稍后重试")}`);
      }
    }
    setTargets(nextTargets);
    setBrief(briefData);
    setHotspots(hotspotData);
    setSkillCatalog(catalogData);
    setHistory(historyData);
    setSettings(settingsData);
    if (sessionsResult.status === "fulfilled" && runsResult.status === "fulfilled") {
      const sessionsData = sessionsResult.value;
      const runsData = runsResult.value;
      markAgentStorageAvailable();
      setAgentSessions(sessionsData);
      setAgentRuns(runsData);
      setAgentMemories(memoryResult.status === "fulfilled" ? memoryResult.value : []);
      setSelectedRun(runsData[0] ?? null);
      setLiveRunId(runsData[0] && !isTerminalAgentRunStatus(runsData[0].status) ? runsData[0].id : null);
    } else {
      markAgentStorageUnavailable(firstRejectedReason([sessionsResult, runsResult]));
      setAgentSessions([]);
      setAgentRuns([]);
      setSelectedRun(null);
      setLiveRunId(null);
    }
  }, [markAgentStorageAvailable, markAgentStorageUnavailable, today]);

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
      return false;
    }
  }

  async function reloadAgents(nextSelectedId?: string) {
    try {
      const runs = await fetchJson<AgentRun[]>("/api/agent-runs");
      markAgentStorageAvailable();
      setAgentRuns(runs);
      if (nextSelectedId) {
        const nextRun = runs.find((run) => run.id === nextSelectedId) ?? runs[0] ?? null;
        setSelectedRun(nextRun);
        setLiveRunId(nextRun && !isTerminalAgentRunStatus(nextRun.status) ? nextRun.id : null);
      }
    } catch (error) {
      markAgentStorageUnavailable(error);
    }
  }

  async function reloadAgentSessions() {
    try {
      setAgentSessions(await fetchJson<AgentSession[]>("/api/agent-sessions"));
      markAgentStorageAvailable();
    } catch (error) {
      markAgentStorageUnavailable(error);
    }
  }

  async function reloadAgentMemory() {
    try {
      setAgentMemories(await fetchJson<AgentMemoryItem[]>("/api/agent-memory"));
    } catch {
      setAgentMemories([]);
    }
  }

  async function archiveAgentMemory(id: string) {
    try {
      await fetch(`/api/agent-memory/${id}`, { method: "DELETE" });
      setAgentMemories((current) => current.filter((item) => item.id !== id));
      setNotice("Agent memory archived");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Agent memory archive failed");
    }
  }

  async function openAgentRun(id: string) {
    try {
      const run = await fetchJson<AgentRun>(`/api/agent-runs/${id}`);
      markAgentStorageAvailable();
      rememberAgentRun(run);
      setSelectedRun(run);
      setLiveRunId(isTerminalAgentRunStatus(run.status) ? null : run.id);
    } catch (error) {
      markAgentStorageUnavailable(error);
    }
  }

  async function newAgentSession() {
    if (agentStorageStatus === "unavailable") {
      setNotice(agentStorageMessage);
      return;
    }
    setLoading(true);
    setNotice("正在创建新对话...");
    try {
      const session = await postJson<AgentSession>("/api/agent-sessions", { entry: "research" });
      markAgentStorageAvailable();
      setAgentSessions((current) => mergeAgentSessionList(current, session));
      setSelectedSession(session);
      setAgentMessages([]);
      setActiveAgentRun(null);
      setStreamingMarkdown("");
      setLiveSessionId(null);
      setRunDetail(null);
      setNotice("新对话已创建");
    } catch (error) {
      if (isAgentStorageError(error)) {
        markAgentStorageUnavailable(error);
      } else {
        setNotice(error instanceof Error ? error.message : "新建对话失败");
      }
    } finally {
      setLoading(false);
    }
  }

  async function openAgentSession(id: string) {
    if (agentStorageStatus === "unavailable") {
      setNotice(agentStorageMessage);
      return;
    }
    setLoading(true);
    setNotice("正在打开对话...");
    try {
      const session = await fetchJson<AgentSessionDetail>(`/api/agent-sessions/${id}`);
      markAgentStorageAvailable();
      applySessionDetail(session);
      setRunDetail(null);
      setLiveSessionId(session.activeRun ? id : null);
      setNotice("对话已打开");
    } catch (error) {
      if (isAgentStorageError(error)) {
        markAgentStorageUnavailable(error);
      } else {
        setNotice(error instanceof Error ? error.message : "打开对话失败");
      }
    } finally {
      setLoading(false);
    }
  }

  async function sendAgentMessage(content: string, abilityKey: string) {
    if (agentStorageStatus === "unavailable") {
      setNotice(agentStorageMessage);
      return false;
    }
    setLoading(true);
    setNotice("Agent 正在执行...");
    try {
      let session = selectedSession;
      if (!session) {
        session = await postJson<AgentSession>("/api/agent-sessions", { entry: "research" });
        markAgentStorageAvailable();
        setAgentSessions((current) => mergeAgentSessionList(current, session!));
        setSelectedSession(session);
      }
      const result = await postJson<{ session: AgentSessionDetail; run: AgentRun }>(`/api/agent-sessions/${session.id}/messages`, {
        content,
        abilityKey,
      });
      markAgentStorageAvailable();
      if (result.session) applySessionDetail(result.session);
      setActiveAgentRun(result.run);
      setStreamingMarkdown(result.run.outputMarkdown ?? "");
      setLiveSessionId(session.id);
      setNotice("Agent 已进入执行队列");
      void reloadAgentSessions();
      return true;
    } catch (error) {
      if (isAgentStorageError(error)) {
        markAgentStorageUnavailable(error);
      } else {
        setNotice(error instanceof Error ? error.message : "发送失败");
      }
      setLoading(false);
    }
  }

  async function openRunDetail(id: string) {
    try {
      const run = await fetchJson<AgentRun>(`/api/agent-runs/${id}`);
      markAgentStorageAvailable();
      rememberAgentRun(run);
      setRunDetail(run);
    } catch (error) {
      markAgentStorageUnavailable(error);
    }
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

      <div
        className={
          view === "agent"
            ? "ml-[152px] grid h-screen grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden p-5 max-lg:ml-0 max-lg:h-auto max-lg:min-h-screen max-lg:overflow-visible"
            : "ml-[152px] grid min-h-screen gap-5 p-5 max-lg:ml-0"
        }
      >
        <Header view={view} notice={notice} loading={loading} />

        {view === "brief" && (
          <BriefView
            brief={brief}
            briefItems={briefItems}
            hotspots={hotspots}
            briefHistory={history}
            targets={targets}
            loading={loading}
            onGenerate={() => void generateBrief()}
            onBackfill={() => void generateBrief(settings.backfillDays * 24)}
          />
        )}

        {view === "market" && (
          <MarketOverviewView
            setLoading={setLoading}
            setNotice={setNotice}
            onMarketWeakChange={setMarketWeak}
            onAgentCreated={async (id) => {
              await reloadAgents(id);
              await openAgentRun(id);
            }}
          />
        )}

        {view === "agent" && (
          <AgentChatView
            catalog={skillCatalog}
            sessions={agentSessions}
            selectedSession={selectedSession}
            messages={agentMessages}
            activeRun={activeAgentRun}
            streamingMarkdown={streamingMarkdown}
            memories={agentMemories}
            onArchiveMemory={archiveAgentMemory}
            onNewSession={newAgentSession}
            onSelectSession={openAgentSession}
            onSendMessage={sendAgentMessage}
            onOpenRunDetail={openRunDetail}
            runDetail={runDetail}
            onCloseRunDetail={() => setRunDetail(null)}
            agentStorageAvailable={agentStorageStatus !== "unavailable"}
            agentStorageMessage={agentStorageMessage}
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
      <PetWidget busy={petBusy} marketWeak={marketWeak} />
    </main>
  );
}

function mergeAgentRunList(runs: AgentRun[], nextRun: AgentRun) {
  const index = runs.findIndex((run) => run.id === nextRun.id);
  if (index === -1) return [nextRun, ...runs];
  return runs.map((run) => (run.id === nextRun.id ? { ...run, ...nextRun } : run));
}

function mergeAgentSessionList(sessions: AgentSession[], nextSession: AgentSession) {
  const merged = [nextSession, ...sessions.filter((session) => session.id !== nextSession.id)];
  return merged.sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());
}

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function firstRejectedReason(results: Array<PromiseSettledResult<unknown>>) {
  return results.find((result) => result.status === "rejected")?.reason;
}

function resolveAgentStorageMessage(error?: unknown) {
  if (isAgentStorageError(error)) return AGENT_STORAGE_UNAVAILABLE_NOTICE;
  return error instanceof Error && error.message ? error.message : AGENT_STORAGE_UNAVAILABLE_NOTICE;
}

function isAgentStorageError(error: unknown) {
  return error instanceof ApiRequestError && (error.code === "AGENT_DB_UNAVAILABLE" || error.status === 503);
}

function readableError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
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
