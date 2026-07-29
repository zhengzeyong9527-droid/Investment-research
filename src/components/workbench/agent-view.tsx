import { Activity, Archive, Bot, Clipboard, Cpu, Database, Maximize2, PanelRight, Sparkles, Wrench, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { createAndMaybeExecuteAgent } from "@/components/workbench/api";
import { statusLabel } from "@/components/workbench/constants";
import type { AgentRun, SkillCatalogItem, SkillField, WatchTarget } from "@/components/workbench/types";
import { EmptyState } from "@/components/workbench/ui";
import { buildDefaultQuestion, normalizeFieldValue } from "@/components/workbench/utils";

export function AgentView(props: {
  catalog: SkillCatalogItem[];
  agentRuns: AgentRun[];
  selectedRun: AgentRun | null;
  targets: WatchTarget[];
  onSelect: (id: string) => void;
  onCreated: (id: string) => Promise<void>;
  setLoading: (value: boolean) => void;
  setNotice: (value: string) => void;
}) {
  const [selectedSkill, setSelectedSkill] = useState(props.catalog[0]?.key ?? "");
  const selected = props.catalog.find((skill) => skill.key === selectedSkill) ?? props.catalog[0];

  useEffect(() => {
    if (!selectedSkill && props.catalog[0]) setSelectedSkill(props.catalog[0].key);
  }, [props.catalog, selectedSkill]);

  return (
    <div className="grid grid-cols-[260px_minmax(0,1fr)_360px] gap-5 max-2xl:grid-cols-[240px_minmax(0,1fr)] max-xl:grid-cols-1">
      <aside className="panel p-3">
        <h3 className="mb-3 px-1 text-sm font-bold text-ink/60">能力路由</h3>
        <div className="grid gap-1.5">
          {props.catalog.map((skill) => (
            <button
              key={skill.key}
              onClick={() => setSelectedSkill(skill.key)}
              className={`skill-route ${selectedSkill === skill.key ? "skill-route-active" : ""}`}
            >
              <div className="font-semibold">{skill.shortName}</div>
              <div className="mt-1 text-xs opacity-60">{skill.scope}</div>
            </button>
          ))}
        </div>
      </aside>

      <section className="panel p-5">
        {selected && (
          <AgentLaunchForm
            skill={selected}
            targets={props.targets}
            onCreated={props.onCreated}
            setLoading={props.setLoading}
            setNotice={props.setNotice}
          />
        )}
      </section>

      <aside className="grid content-start gap-4 max-2xl:col-span-2 max-xl:col-span-1">
        <RunInspector selectedRun={props.selectedRun} />
        <div className="panel p-4">
          <h3 className="mb-3 font-display text-2xl">任务队列</h3>
          <div className="grid max-h-[360px] gap-2 overflow-y-auto pr-1">
            {props.agentRuns.length === 0 ? (
              <EmptyState icon={Archive} title="暂无 Agent 任务" compact />
            ) : (
              props.agentRuns.map((run) => (
                <button key={run.id} onClick={() => props.onSelect(run.id)} className="rounded-md border border-ink/10 bg-white/65 p-3 text-left hover:border-jade/40">
                  <div className="line-clamp-2 text-sm font-semibold">{run.question}</div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-ink/50">
                    <span className="truncate">{run.skillKey}</span>
                    <span className="shrink-0">{statusLabel[run.status]}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function AgentLaunchForm({
  skill,
  targets,
  onCreated,
  setLoading,
  setNotice,
}: {
  skill: SkillCatalogItem;
  targets?: WatchTarget[];
  onCreated: (id: string) => Promise<void>;
  setLoading: (value: boolean) => void;
  setNotice: (value: string) => void;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const inputPayload = Object.fromEntries(
      [...skill.requiredInputs, ...skill.optionalInputs].map((field) => [field.key, normalizeFieldValue(field, form.get(field.key))])
    );
    const question = String(form.get("question") || buildDefaultQuestion(skill, inputPayload));
    const run = await createAndMaybeExecuteAgent(question, inputPayload, skill.key, setLoading, setNotice);
    if (!run) return;
    formElement.reset();
    await onCreated(run.id);
  }

  return (
    <form onSubmit={submit}>
      <div className="mb-5">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold text-jade">
          <Bot size={15} />
          {skill.key}
        </div>
        <h3 className="font-display text-3xl">{skill.name}</h3>
        <p className="mt-2 text-sm leading-6 text-ink/62">{skill.scenario}</p>
      </div>

      {skill.riskLevel === "high" && (
        <div className="mb-4 rounded-md border border-persimmon/25 bg-persimmon/10 px-3 py-2 text-sm leading-6 text-persimmon">
          高风险研究入口：缺少必填信息时不会执行，输出只做研究复盘和风险提示。
        </div>
      )}

      <div className="grid gap-3">
        {targets && targets.length > 0 && (
          <select
            className="field rounded-md px-3 py-2"
            onChange={(event) => {
              const target = targets.find((item) => item.id === event.target.value);
              if (!target) return;
              const stockInput = document.querySelector<HTMLInputElement>("[data-stock-code-input]");
              if (stockInput) stockInput.value = target.code;
            }}
          >
            <option value="">从自选池带入代码</option>
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name} / {target.code}
              </option>
            ))}
          </select>
        )}
        {[...skill.requiredInputs, ...skill.optionalInputs].map((field) => (
          <label key={field.key} className="grid gap-1.5 text-sm font-semibold text-ink/70">
            {field.label}
            <SkillInput field={field} />
          </label>
        ))}
        <label className="grid gap-1.5 text-sm font-semibold text-ink/70">
          研究问题
          <textarea name="question" className="field min-h-24 rounded-md px-3 py-2" placeholder="可留空，系统会按所选功能自动生成问题" />
        </label>
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-jade px-4 py-2.5 font-semibold text-white transition hover:bg-ink">
          <Sparkles size={17} />
          创建并执行 Agent
        </button>
      </div>
    </form>
  );
}

function SkillInput({ field }: { field: SkillField }) {
  if (field.type === "textarea") {
    return <textarea name={field.key} className="field min-h-20 rounded-md px-3 py-2" placeholder={field.placeholder} required={field.required} />;
  }
  if (field.type === "select") {
    return (
      <select name={field.key} className="field rounded-md px-3 py-2" required={field.required} defaultValue={field.options?.[0]?.value ?? ""}>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      data-stock-code-input={field.key === "stockCode" || field.key === "stockCodeOrName" ? true : undefined}
      name={field.key}
      type={field.type === "number" ? "number" : "text"}
      className="field rounded-md px-3 py-2"
      placeholder={field.placeholder}
      required={field.required}
    />
  );
}

function RunInspector({ selectedRun }: { selectedRun: AgentRun | null }) {
  return (
    <div className="panel p-4">
      <h3 className="mb-3 flex items-center gap-2 font-display text-2xl">
        <PanelRight size={20} className="text-jade" />
        任务详情
      </h3>
      {!selectedRun ? (
        <EmptyState icon={Bot} title="选择一个任务查看结果" compact />
      ) : (
        <div className="grid gap-3">
          <div>
            <div className="text-xs text-ink/45">{selectedRun.skillKey}</div>
            <div className="mt-1 font-semibold leading-6">{selectedRun.question}</div>
          </div>
          <span className={`w-fit rounded px-2 py-1 text-xs font-bold ${selectedRun.status === "failed" ? "bg-persimmon/10 text-persimmon" : "bg-jade/10 text-jade"}`}>
            {statusLabel[selectedRun.status]}
          </span>
          {selectedRun.error && <div className="rounded border border-persimmon/25 bg-persimmon/10 p-3 text-sm leading-6 text-persimmon">{selectedRun.error}</div>}
          {selectedRun.outputMarkdown ? (
            <AgentOutput markdown={selectedRun.outputMarkdown} />
          ) : (
            <details className="rounded-md border border-ink/10 bg-paper/60 p-3">
              <summary className="cursor-pointer text-sm font-semibold">提示包</summary>
              <pre className="thin-scroll mt-3 max-h-[360px] whitespace-pre-wrap text-xs leading-5 text-ink/70">{selectedRun.promptPackage}</pre>
            </details>
          )}
          <EvidencePanel evidence={selectedRun.evidence ?? []} />
          <ExecutionPanel selectedRun={selectedRun} />
        </div>
      )}
    </div>
  );
}

function AgentOutput({ markdown }: { markdown: string }) {
  const [expanded, setExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyMarkdown() {
    try {
      await navigator.clipboard?.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="rounded-md border border-ink/10 bg-white/70 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-ink/72">输出结果</h4>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className="inline-flex items-center gap-1.5 rounded border border-ink/10 px-2 py-1 text-xs font-semibold text-ink/62 hover:border-jade/30 hover:text-jade" onClick={() => void copyMarkdown()}>
            <Clipboard size={14} />
            {copied ? "已复制" : "复制 Markdown"}
          </button>
          <button type="button" className="inline-flex items-center gap-1.5 rounded border border-ink/10 px-2 py-1 text-xs font-semibold text-ink/62 hover:border-jade/30 hover:text-jade" onClick={() => setExpanded((current) => !current)}>
            <Activity size={14} />
            {expanded ? "收起正文" : "展开阅读全文"}
          </button>
          <button type="button" className="inline-flex items-center gap-1.5 rounded border border-ink/10 px-2 py-1 text-xs font-semibold text-ink/62 hover:border-jade/30 hover:text-jade" onClick={() => setFullscreen(true)}>
            <Maximize2 size={14} />
            全屏查看
          </button>
        </div>
      </div>
      <div className={`thin-scroll rounded-md bg-paper/72 p-4 ${expanded ? "overflow-visible" : "max-h-[560px] overflow-y-auto"}`}>
        <MarkdownContent markdown={markdown} />
      </div>
      {fullscreen && (
        <div className="fixed inset-0 z-50 grid bg-ink/55 p-4 backdrop-blur-sm">
          <section role="dialog" aria-label="Agent 完整结果" className="thin-scroll mx-auto grid max-h-[calc(100vh-2rem)] w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg bg-paper shadow-2xl">
            <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
              <h3 className="font-display text-2xl">Agent 完整结果</h3>
              <button type="button" className="inline-flex items-center gap-1.5 rounded border border-ink/10 px-2 py-1 text-xs font-semibold text-ink/62 hover:border-jade/30 hover:text-jade" onClick={() => setFullscreen(false)}>
                <X size={14} />
                关闭
              </button>
            </div>
            <div className="thin-scroll overflow-y-auto p-5">
              <MarkdownContent markdown={markdown} />
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function MarkdownContent({ markdown }: { markdown: string }) {
  return (
    <div className="max-w-none text-sm leading-7 text-ink/82">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h1: ({ children }) => <h1 className="mb-4 font-display text-3xl leading-tight text-ink">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-3 mt-6 font-display text-2xl leading-tight text-ink">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-5 text-lg font-bold text-ink">{children}</h3>,
          p: ({ children }) => <p className="my-3">{children}</p>,
          ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-5">{children}</ol>,
          blockquote: ({ children }) => <blockquote className="my-4 border-l-4 border-jade/35 bg-jade/5 px-4 py-2 text-ink/72">{children}</blockquote>,
          code: ({ children }) => <code className="rounded bg-ink/8 px-1 py-0.5 text-[0.92em] text-ink">{children}</code>,
          pre: ({ children }) => <pre className="thin-scroll my-4 overflow-x-auto rounded-md bg-ink p-3 text-xs leading-6 text-paper">{children}</pre>,
          table: ({ children }) => <table className="my-4 w-full border-collapse overflow-hidden rounded-md text-xs">{children}</table>,
          th: ({ children }) => <th className="border border-ink/10 bg-ink/5 px-2 py-2 text-left font-bold">{children}</th>,
          td: ({ children }) => <td className="border border-ink/10 bg-white/55 px-2 py-2 align-top">{children}</td>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

function EvidencePanel({ evidence }: { evidence: NonNullable<AgentRun["evidence"]> }) {
  const [showAll, setShowAll] = useState(false);
  if (evidence.length === 0) return null;
  const visibleEvidence = showAll ? evidence : evidence.slice(0, 6);

  return (
    <section className="rounded-md border border-ink/10 bg-paper/60 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold">证据（{evidence.length}）</h4>
        {evidence.length > 6 && (
          <button type="button" className="rounded border border-ink/10 px-2 py-1 text-xs font-semibold text-ink/58 hover:border-jade/30 hover:text-jade" onClick={() => setShowAll((current) => !current)}>
            {showAll ? "收起证据" : "展开全部证据"}
          </button>
        )}
      </div>
      <div className="grid gap-2">
        {visibleEvidence.map((item) => (
          <div key={item.id} className="rounded border border-ink/10 bg-white/65 p-2 text-xs">
            <div className="font-semibold">{item.title}</div>
            <div className="mt-1 text-ink/45">{item.source}</div>
            {item.summary && <div className="mt-1 leading-5 text-ink/58">{item.summary}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}

function ExecutionPanel({ selectedRun }: { selectedRun: AgentRun }) {
  const steps = selectedRun.steps ?? [];
  const toolCalls = selectedRun.toolCalls ?? [];
  const modelCalls = selectedRun.modelCalls ?? [];
  if (steps.length === 0 && toolCalls.length === 0 && modelCalls.length === 0) return null;

  return (
    <section className="rounded-md border border-ink/10 bg-paper/60 p-3">
      <h4 className="mb-2 flex items-center gap-2 text-sm font-bold">
        <Activity size={15} className="text-jade" />
        执行信息
      </h4>
      <div className="grid gap-2">
        {steps.length > 0 && (
          <details open className="rounded border border-ink/10 bg-white/60 p-2">
            <summary className="cursor-pointer text-xs font-bold text-ink/65">步骤（{steps.length}）</summary>
            <div className="mt-2 grid gap-1.5">
              {steps.map((step) => (
                <div key={step.id} className="flex items-start gap-2 text-xs leading-5 text-ink/62">
                  <Database size={13} className="mt-1 shrink-0 text-jade" />
                  <span className="font-semibold text-ink/75">{step.nodeKey ?? step.title}</span>
                  <span>{step.status}</span>
                  <span>{step.message}</span>
                </div>
              ))}
            </div>
          </details>
        )}
        {toolCalls.length > 0 && (
          <details open className="rounded border border-ink/10 bg-white/60 p-2">
            <summary className="cursor-pointer text-xs font-bold text-ink/65">工具（{toolCalls.length}）</summary>
            <div className="mt-2 grid gap-1.5">
              {toolCalls.map((call) => (
                <div key={call.id} className="grid gap-1 rounded bg-paper/60 p-2 text-xs leading-5 text-ink/62">
                  <div className="flex items-center gap-2 font-semibold text-ink/75">
                    <Wrench size={13} className="text-jade" />
                    {call.toolKey}
                    <span className="text-ink/40">{call.status}</span>
                  </div>
                  <div>{call.outputSummary}</div>
                  <div className="text-ink/42">{call.sourceEndpoint}</div>
                </div>
              ))}
            </div>
          </details>
        )}
        {modelCalls.length > 0 && (
          <details open className="rounded border border-ink/10 bg-white/60 p-2">
            <summary className="cursor-pointer text-xs font-bold text-ink/65">模型（{modelCalls.length}）</summary>
            <div className="mt-2 grid gap-1.5">
              {modelCalls.map((call) => (
                <div key={call.id} className="flex flex-wrap items-center gap-2 text-xs leading-5 text-ink/62">
                  <Cpu size={13} className="text-jade" />
                  <span className="font-semibold text-ink/75">{call.model}</span>
                  <span>{call.status}</span>
                  <span>input {call.tokenInput}</span>
                  <span>output {call.tokenOutput}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
