"use client";

import { Bot, Brain, ChevronDown, ExternalLink, MessageSquarePlus, PanelRight, Search, Send, Sparkles, Trash2, UserRound } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { statusLabel } from "@/components/workbench/constants";
import type { AgentMemoryItem, AgentMessage, AgentRun, AgentSession, SkillCatalogItem } from "@/components/workbench/types";
import { stripHtmlFromMarkdown } from "@/skills/output";

export function AgentChatView(props: {
  catalog: SkillCatalogItem[];
  sessions: AgentSession[];
  selectedSession: AgentSession | null;
  messages: AgentMessage[];
  activeRun: AgentRun | null;
  streamingMarkdown: string;
  memories?: AgentMemoryItem[];
  onArchiveMemory?: (id: string) => void | Promise<void>;
  onNewSession: () => void | Promise<void>;
  onSelectSession: (id: string) => void | Promise<void>;
  onSendMessage: (content: string, abilityKey: string) => boolean | void | Promise<boolean | void>;
  onOpenRunDetail: (runId: string) => void | Promise<void>;
  runDetail?: AgentRun | null;
  onCloseRunDetail?: () => void;
  agentStorageAvailable?: boolean;
  agentStorageMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [abilityKey, setAbilityKey] = useState("auto");
  const [abilityMenuOpen, setAbilityMenuOpen] = useState(false);
  const filteredSessions = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return props.sessions;
    return props.sessions.filter((session) => session.title.toLowerCase().includes(keyword));
  }, [props.sessions, query]);
  const running = Boolean(props.activeRun && !isTerminalRunStatus(props.activeRun.status));
  const storageUnavailable = props.agentStorageAvailable === false;
  const abilityOptions = useMemo(
    () => [
      { key: "auto", label: "智能调度", description: "自动判断最合适的投研路径" },
      ...props.catalog.map((skill) => ({
        key: skill.key,
        label: skill.shortName || skill.name,
        description: skill.scenario || skill.description || skill.scope,
      })),
    ],
    [props.catalog]
  );
  const selectedAbility = abilityOptions.find((option) => option.key === abilityKey) ?? abilityOptions[0];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || running || storageUnavailable) return;
    setDraft("");
    try {
      const accepted = await props.onSendMessage(content, abilityKey);
      if (accepted === false) {
        setDraft(content);
      }
    } catch {
      setDraft(content);
    }
  }

  return (
    <div className="relative grid h-full min-h-0 grid-cols-[244px_minmax(0,1fr)] gap-4 overflow-hidden max-xl:h-auto max-xl:min-h-[calc(100dvh-8.5rem)] max-xl:grid-cols-1 max-xl:overflow-visible">
      <aside className="panel flex min-h-0 flex-col p-2.5">
        <button
          type="button"
          onClick={() => void props.onNewSession()}
          disabled={storageUnavailable}
          className="mb-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-jade/25 bg-jade/10 px-3 text-sm font-bold text-jade hover:bg-jade/15 disabled:cursor-not-allowed disabled:border-ink/10 disabled:bg-ink/5 disabled:text-ink/35"
        >
          <MessageSquarePlus size={17} />
          新建对话
        </button>
        <label className="mb-2.5 flex min-h-9 items-center gap-2 rounded-md border border-ink/10 bg-white/60 px-2.5 text-sm text-ink/60">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink/35"
            placeholder="搜索对话"
          />
        </label>
        <MemoryPanel memories={props.memories ?? []} onArchiveMemory={props.onArchiveMemory} />
        <div className="thin-scroll grid gap-1.5 overflow-y-auto pr-1">
          {filteredSessions.length === 0 ? (
            <div className="rounded-md border border-dashed border-ink/12 bg-white/45 p-4 text-sm text-ink/45">暂无对话</div>
          ) : (
            filteredSessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => void props.onSelectSession(session.id)}
                className={`rounded-md border px-2.5 py-2 text-left transition ${
                  props.selectedSession?.id === session.id
                    ? "border-jade/35 bg-jade/10 text-ink"
                    : "border-ink/10 bg-white/55 text-ink/68 hover:border-jade/25 hover:bg-white/75"
                }`}
              >
                <div className="line-clamp-2 text-[13px] font-bold leading-5">{session.title}</div>
                <div className="mt-1 text-[11px] text-ink/42">{formatShortTime(session.lastActiveAt)}</div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="panel grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
        <div className="thin-scroll min-h-0 overflow-y-auto p-5 xl:p-6">
          {storageUnavailable && (
            <div role="alert" className="mx-auto mb-4 max-w-4xl rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold leading-6 text-rose-700">
              {props.agentStorageMessage || "Agent 数据库未连接。"}
            </div>
          )}
          {!props.selectedSession && props.messages.length === 0 ? (
            <WelcomeState />
          ) : (
            <div className="mx-auto grid max-w-6xl gap-4">
              {props.messages.map((message) => (
                <ChatMessageBubble key={message.id} message={message} onOpenRunDetail={props.onOpenRunDetail} />
              ))}
              {props.activeRun && running && (
                <AssistantStreamingBubble
                  run={props.activeRun}
                  markdown={props.streamingMarkdown || props.activeRun.outputMarkdown || ""}
                  onOpenRunDetail={props.onOpenRunDetail}
                />
              )}
            </div>
          )}
        </div>

        <form onSubmit={submit} className="border-t border-white/70 bg-white/38 p-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="relative">
                <select
                  aria-label="能力选择"
                  value={abilityKey}
                  onChange={(event) => setAbilityKey(event.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                >
                  <option value="auto">智能调度</option>
                  {props.catalog.map((skill) => (
                    <option key={skill.key} value={skill.key}>
                      {skill.shortName || skill.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setAbilityMenuOpen((value) => !value)}
                  className="ability-router-trigger"
                  aria-haspopup="listbox"
                  aria-expanded={abilityMenuOpen}
                >
                  <Sparkles size={15} className="text-jade" />
                  <span>{selectedAbility.label}</span>
                  <ChevronDown size={15} className="text-ink/42" />
                </button>
                {abilityMenuOpen && (
                  <div className="ability-router-menu" role="listbox">
                    {abilityOptions.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        role="option"
                        aria-selected={abilityKey === option.key}
                        className={`ability-router-option ${abilityKey === option.key ? "ability-router-option-active" : ""}`}
                        onClick={() => {
                          setAbilityKey(option.key);
                          setAbilityMenuOpen(false);
                        }}
                      >
                        <span>{option.label}</span>
                        <small>{option.description}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {running && <span className="rounded-full bg-jade/10 px-3 py-2 text-xs font-bold text-jade">{statusLabel[props.activeRun!.status]}</span>}
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_44px] gap-2 rounded-lg border border-jade/30 bg-white/78 p-2 shadow-[0_14px_32px_rgba(7,143,123,0.08)]">
              <textarea
                aria-label="输入投研问题"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="输入投研问题，例如：600519 近30天研报怎么看？"
                className="min-h-20 resize-none bg-transparent px-3 py-2 text-base leading-7 text-ink outline-none placeholder:text-ink/35"
                disabled={running}
              />
              <button
                type="submit"
                disabled={!draft.trim() || running || storageUnavailable}
                className="grid h-11 w-11 place-items-center self-end rounded-md bg-jade text-white shadow-[0_12px_26px_rgba(7,143,123,0.22)] disabled:bg-ink/20 disabled:shadow-none"
                aria-label="发送"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-ink/42">以上内容由 AI 生成，不构成投资建议</p>
          </div>
        </form>
      </section>
      {props.runDetail && (
        <RunDetailDrawer run={props.runDetail} onClose={props.onCloseRunDetail ?? (() => undefined)} />
      )}
    </div>
  );
}

function MemoryPanel({
  memories,
  onArchiveMemory,
}: {
  memories: AgentMemoryItem[];
  onArchiveMemory?: (id: string) => void | Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? memories : memories.slice(0, 4);
  return (
    <section className="mb-2.5 rounded-md border border-ink/10 bg-white/45 p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-ink/58">
          <Brain size={14} className="text-jade" />
          <span>记忆管理</span>
        </div>
        {memories.length > 4 && (
          <button type="button" onClick={() => setExpanded((value) => !value)} className="text-xs font-bold text-jade">
            {expanded ? "收起" : `展开 ${memories.length}`}
          </button>
        )}
      </div>
      {visible.length === 0 ? (
        <div className="text-xs leading-5 text-ink/42">暂无长期记忆</div>
      ) : (
        <div className="grid gap-1.5">
          {visible.map((memory) => (
            <div key={memory.id} className="rounded-md border border-ink/8 bg-white/55 p-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="rounded-full bg-jade/10 px-2 py-0.5 text-[11px] font-bold text-jade">{memory.kind}</span>
                {onArchiveMemory && (
                  <button
                    type="button"
                    onClick={() => void onArchiveMemory(memory.id)}
                    className="grid h-6 w-6 place-items-center rounded border border-ink/10 text-ink/40 hover:border-rose-200 hover:text-rose-500"
                    aria-label="归档记忆"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <div className="line-clamp-2 text-[11px] leading-5 text-ink/62">{memory.content}</div>
              <div className="mt-1 text-[11px] text-ink/35">hits {memory.hitCount ?? 0}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function WelcomeState() {
  return (
    <div className="mx-auto grid max-w-4xl gap-5 pt-8">
      <div className="rounded-lg border border-white/76 bg-white/66 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
        <div className="mb-3 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-jade/10 text-jade">
            <Bot size={22} />
          </div>
          <div>
            <div className="text-sm font-bold text-jade">AI 投研助理</div>
            <h3 className="font-display text-2xl text-ink">直接开始一轮研究对话</h3>
          </div>
        </div>
        <p className="max-w-3xl text-sm leading-7 text-ink/62">
          你可以直接输入股票、行业、研报问题，也可以先在下方选择具体能力。默认智能调度会自动判断适合的投研 skill。
        </p>
      </div>
    </div>
  );
}

function ChatMessageBubble({
  message,
  onOpenRunDetail,
}: {
  message: AgentMessage;
  onOpenRunDetail: (runId: string) => void | Promise<void>;
}) {
  const assistant = message.role === "assistant";
  return (
    <article className={`chat-message-row ${assistant ? "chat-message-assistant" : "chat-message-user"}`}>
      {assistant && <ChatAvatar role="assistant" />}
      <div className={`chat-bubble ${assistant ? "chat-bubble-assistant" : "chat-bubble-user"}`}>
        <div className={`mb-2 flex items-center gap-3 ${assistant ? "justify-between" : "justify-end"}`}>
          {assistant && <span className="text-xs font-bold text-jade">Investoday Agent</span>}
          <span className={`text-[11px] ${assistant ? "text-ink/36" : "text-ink/42"}`}>{formatShortTime(message.createdAt)}</span>
        </div>
        {assistant ? <MarkdownBody markdown={message.content} /> : <div className="whitespace-pre-wrap text-sm leading-7">{message.content}</div>}
        {assistant && message.agentRunId && (
          <button
            type="button"
            onClick={() => void onOpenRunDetail(message.agentRunId!)}
            className="mt-3 inline-flex items-center gap-1 rounded-md border border-ink/10 bg-white/65 px-2 py-1 text-xs font-bold text-ink/55 hover:border-jade/25 hover:text-jade"
          >
            <PanelRight size={14} />
            查看过程
          </button>
        )}
      </div>
      {!assistant && <ChatAvatar role="user" />}
    </article>
  );
}

function AssistantStreamingBubble({
  run,
  markdown,
  onOpenRunDetail,
}: {
  run: AgentRun;
  markdown: string;
  onOpenRunDetail: (runId: string) => void | Promise<void>;
}) {
  return (
    <article className="chat-message-row chat-message-assistant">
      <ChatAvatar role="assistant" active />
      <div className="chat-bubble chat-bubble-assistant chat-bubble-streaming">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-jade/10 px-2.5 py-1 text-xs font-bold text-jade">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-jade" />
          生成中
        </div>
        {markdown ? <MarkdownBody markdown={markdown} /> : <div className="text-sm leading-7 text-ink/55">{statusLabel[run.status] ?? run.status}</div>}
        <button
          type="button"
          onClick={() => void onOpenRunDetail(run.id)}
          className="mt-3 inline-flex items-center gap-1 rounded-md border border-ink/10 bg-white/65 px-2 py-1 text-xs font-bold text-ink/55 hover:border-jade/25 hover:text-jade"
        >
          <PanelRight size={14} />
          查看过程
        </button>
      </div>
    </article>
  );
}

function ChatAvatar({ role, active = false }: { role: "assistant" | "user"; active?: boolean }) {
  const assistant = role === "assistant";
  return (
    <div className={`chat-avatar ${assistant ? "chat-avatar-assistant" : "chat-avatar-user"} ${active ? "chat-avatar-active" : ""}`}>
      {assistant ? <Bot size={18} /> : <UserRound size={18} />}
    </div>
  );
}

function MarkdownBody({ markdown }: { markdown: string }) {
  const cleanMarkdown = stripHtmlFromMarkdown(markdown);
  return (
    <div className="agent-markdown agent-chat-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} skipHtml>
        {cleanMarkdown}
      </ReactMarkdown>
    </div>
  );
}

function RunDetailDrawer({ run, onClose }: { run: AgentRun; onClose: () => void }) {
  const artifacts = getArtifacts(run);
  const memoryHits = getMemoryHits(run);
  const evidenceGrade = getEvidenceGrade(run);
  const verification = getVerification(run);
  return (
    <aside className="absolute right-4 top-4 z-20 grid max-h-[calc(100%-2rem)] w-[380px] gap-4 overflow-y-auto rounded-lg border border-white/80 bg-white/92 p-4 shadow-[0_24px_60px_rgba(45,70,76,0.18)] backdrop-blur max-lg:fixed max-lg:inset-x-4 max-lg:bottom-4 max-lg:top-auto max-lg:max-h-[78dvh] max-lg:w-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-jade">{run.skillKey}</div>
          <h3 className="mt-1 line-clamp-2 font-display text-2xl text-ink">执行详情</h3>
          <div className="mt-1 text-xs text-ink/45">{statusLabel[run.status] ?? run.status}</div>
        </div>
        <button type="button" onClick={onClose} className="rounded-md border border-ink/10 bg-white/70 px-2 py-1 text-sm font-bold text-ink/55">
          关闭
        </button>
      </div>
      {artifacts.length > 0 && (
        <DetailSection title="生成文件">
          {artifacts.map((artifact) => (
            <a
              key={`${artifact.kind}-${artifact.url}`}
              href={artifact.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center justify-between gap-3 rounded-md border border-jade/20 bg-jade/10 px-3 py-2 text-sm font-bold text-jade hover:bg-jade/15"
            >
              <span>{artifact.title}</span>
              <ExternalLink size={15} />
            </a>
          ))}
        </DetailSection>
      )}
      <DetailSection title="证据">
        <DetailSection title="记忆召回">
          {memoryHits.length === 0 ? (
            <EmptyDetail />
          ) : (
            memoryHits.map((memory) => (
              <div key={memory.id} className="rounded-md border border-ink/10 bg-white/62 p-3 text-xs leading-5 text-ink/62">
                <div className="font-bold text-ink">{memory.kind}</div>
                <div>{memory.content}</div>
                <div className="mt-1 text-ink/40">score {formatScore(memory.score)}</div>
              </div>
            ))
          )}
        </DetailSection>
        <DetailSection title="证据评分">
          {evidenceGrade ? (
            <div className="rounded-md border border-ink/10 bg-white/62 p-3 text-xs leading-5 text-ink/62">
              <div className="font-bold text-ink">{evidenceGrade.passed ? "passed" : "not passed"} · score {formatScore(evidenceGrade.score)}</div>
              <div>evidence {evidenceGrade.evidenceCount}</div>
              {evidenceGrade.missing.length > 0 && <div>missing: {evidenceGrade.missing.join(", ")}</div>}
              {Object.keys(evidenceGrade.sourceCounts).length > 0 && <div>sources: {JSON.stringify(evidenceGrade.sourceCounts)}</div>}
            </div>
          ) : (
            <EmptyDetail />
          )}
        </DetailSection>
        <DetailSection title="输出验证">
          {verification ? (
            <div className="rounded-md border border-ink/10 bg-white/62 p-3 text-xs leading-5 text-ink/62">
              <div className="font-bold text-ink">{verification.passed ? "passed" : "issues found"}</div>
              <div>runtime date: {verification.runtimeDate}</div>
              {verification.timeWindow && <div>window: {verification.timeWindow.beginDate} - {verification.timeWindow.endDate}</div>}
              {verification.issues.map((issue) => (
                <div key={`${issue.code}-${issue.message}`}>{issue.code}: {issue.message}</div>
              ))}
            </div>
          ) : (
            <EmptyDetail />
          )}
        </DetailSection>
        {(run.evidence ?? []).length === 0 ? (
          <EmptyDetail />
        ) : (
          (run.evidence ?? []).map((item) => (
            <div key={item.id} className="rounded-md border border-ink/10 bg-white/62 p-3">
              <div className="text-sm font-bold text-ink">{item.title}</div>
              <div className="mt-1 text-xs text-ink/45">{item.source}</div>
              {item.summary && <p className="mt-2 text-xs leading-5 text-ink/62">{item.summary}</p>}
            </div>
          ))
        )}
      </DetailSection>
      <DetailSection title="执行步骤">
        {(run.steps ?? []).length === 0 ? (
          <EmptyDetail />
        ) : (
          (run.steps ?? []).map((step) => (
            <div key={step.id} className="rounded-md border border-ink/10 bg-white/62 p-3 text-xs leading-5 text-ink/62">
              <div className="font-bold text-ink">{step.title}</div>
              <div>{step.status}</div>
              {step.message && <div>{step.message}</div>}
            </div>
          ))
        )}
      </DetailSection>
      <DetailSection title="工具与模型">
        <div className="grid gap-2">
          {(run.toolCalls ?? []).map((tool) => (
            <div key={tool.id} className="rounded-md border border-ink/10 bg-white/62 p-3 text-xs leading-5 text-ink/62">
              <div className="font-bold text-ink">{tool.toolKey}</div>
              <div>{tool.status}</div>
              {tool.outputSummary && <div>{tool.outputSummary}</div>}
            </div>
          ))}
          {(run.modelCalls ?? []).map((model) => (
            <div key={model.id} className="rounded-md border border-ink/10 bg-white/62 p-3 text-xs leading-5 text-ink/62">
              <div className="font-bold text-ink">{model.model}</div>
              <div>
                {model.status} · {model.tokenInput}/{model.tokenOutput} tokens
              </div>
            </div>
          ))}
          {(run.toolCalls ?? []).length === 0 && (run.modelCalls ?? []).length === 0 && <EmptyDetail />}
        </div>
      </DetailSection>
    </aside>
  );
}

function getArtifacts(run: AgentRun) {
  const artifacts = run.outputJson?.artifacts;
  if (!Array.isArray(artifacts)) return [];
  return artifacts
    .map((artifact) => {
      const item = artifact && typeof artifact === "object" ? (artifact as Record<string, unknown>) : {};
      const kind = typeof item.kind === "string" ? item.kind : "";
      const title = typeof item.title === "string" ? item.title : "";
      const url = typeof item.url === "string" ? item.url : "";
      return { kind, title, url };
    })
    .filter((artifact) => artifact.kind && artifact.title && artifact.url);
}

function getMemoryHits(run: AgentRun) {
  const hits = run.outputJson?.memoryHits;
  if (!Array.isArray(hits)) return [];
  return hits
    .map((hit) => {
      const item = hit && typeof hit === "object" ? (hit as Record<string, unknown>) : {};
      return {
        id: typeof item.id === "string" ? item.id : `${item.kind ?? "memory"}-${item.score ?? 0}`,
        kind: typeof item.kind === "string" ? item.kind : "memory",
        content: typeof item.content === "string" ? item.content : "",
        score: typeof item.score === "number" ? item.score : Number(item.score ?? 0),
      };
    })
    .filter((item) => item.content);
}

function getEvidenceGrade(run: AgentRun) {
  const value = run.outputJson?.evidenceGrade;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const sourceCounts = item.sourceCounts && typeof item.sourceCounts === "object" && !Array.isArray(item.sourceCounts) ? (item.sourceCounts as Record<string, number>) : {};
  return {
    passed: Boolean(item.passed),
    score: typeof item.score === "number" ? item.score : Number(item.score ?? 0),
    evidenceCount: typeof item.evidenceCount === "number" ? item.evidenceCount : Number(item.evidenceCount ?? 0),
    missing: Array.isArray(item.missing) ? item.missing.map(String) : [],
    sourceCounts,
  };
}

function getVerification(run: AgentRun) {
  const value = run.outputJson?.verification;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const timeWindow = item.timeWindow && typeof item.timeWindow === "object" && !Array.isArray(item.timeWindow) ? (item.timeWindow as Record<string, unknown>) : null;
  return {
    passed: Boolean(item.passed),
    runtimeDate: typeof item.runtimeDate === "string" ? item.runtimeDate : "",
    issues: Array.isArray(item.issues)
      ? item.issues.map((issue) => {
          const record = issue && typeof issue === "object" ? (issue as Record<string, unknown>) : {};
          return { code: String(record.code ?? "issue"), message: String(record.message ?? "") };
        })
      : [],
    timeWindow: timeWindow
      ? {
          beginDate: String(timeWindow.beginDate ?? ""),
          endDate: String(timeWindow.endDate ?? ""),
        }
      : null,
  };
}

function formatScore(value: number) {
  if (!Number.isFinite(value)) return "0.00";
  return value.toFixed(2);
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-sm font-bold text-ink">{title}</h4>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

function EmptyDetail() {
  return <div className="rounded-md border border-dashed border-ink/12 bg-white/45 p-3 text-xs text-ink/45">暂无记录</div>;
}

function formatShortTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}-${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function isTerminalRunStatus(status: AgentRun["status"]) {
  return status === "completed" || status === "failed" || status === "interrupted";
}
