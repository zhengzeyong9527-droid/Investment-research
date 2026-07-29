import type { AgentKey } from "@/agents/types";

export type EvalCase = {
  id: string;
  agentKey: AgentKey;
  name: string;
  prompt: string;
  tags: string[];
  expectedCitations?: string[];
};

export type EvalRunSnapshot = {
  caseId: string;
  outputMarkdown?: string | null;
  expectedCitations?: string[];
  evidence?: Array<{ title?: string }>;
  toolResults?: Array<{ toolKey: string; ok?: boolean; latencyMs?: number }>;
  ragHits?: Array<{ chunkId: string; documentId: string; score?: number }>;
  latencyMs?: number;
  costCents?: number;
};

export type EvalMetricResult = {
  completion: number;
  toolSuccessRate: number;
  citationPrecision: number;
  ragRecallAtK: number;
  hallucinationRate: number;
  latencyMs: number;
  costCents: number;
};

export type EvalResult = {
  caseId: string;
  passed: boolean;
  score: number;
  metrics: EvalMetricResult;
  notes: string[];
};

export function smokeEvalCases(): EvalCase[] {
  const base: Array<Omit<EvalCase, "id">> = [
    {
      agentKey: "research-router-agent",
      name: "茅台近30天研报风险",
      prompt: "研究贵州茅台（600519）近30天研报怎么看？请引用证据。",
      tags: ["smoke", "stock", "citation"],
      expectedCitations: ["[1]"],
    },
    {
      agentKey: "research-router-agent",
      name: "行业对象继承",
      prompt: "研究有色金属行业近30天有什么变化？",
      tags: ["smoke", "industry", "memory"],
      expectedCitations: ["[1]"],
    },
    {
      agentKey: "market-broadcast-agent",
      name: "盘面播报",
      prompt: "生成今日盘面播报，引用市场广度和指数证据。",
      tags: ["smoke", "market"],
      expectedCitations: ["[1]"],
    },
    {
      agentKey: "research-router-agent",
      name: "本地RAG召回",
      prompt: "引用本地文档回答茅台渠道风险。",
      tags: ["smoke", "rag"],
      expectedCitations: ["[1]"],
    },
    {
      agentKey: "research-router-agent",
      name: "解套参数追问",
      prompt: "我的永兴材料被套40%，还有解套空间吗？",
      tags: ["smoke", "interrupt"],
      expectedCitations: [],
    },
  ];

  const themes = [
    "贵州茅台",
    "宁德时代",
    "比亚迪",
    "有色金属",
    "白酒",
    "半导体",
    "银行",
    "医药",
    "人工智能",
    "新能源",
  ];
  for (let index = 0; base.length < 50; index += 1) {
    const theme = themes[index % themes.length];
    base.push({
      agentKey: index % 9 === 0 ? "market-broadcast-agent" : "research-router-agent",
      name: `${theme} 投研回归 ${index + 1}`,
      prompt: `分析${theme}近30天的证据、风险和后续关注。`,
      tags: [index % 2 === 0 ? "stock" : "industry", index % 3 === 0 ? "rag" : "tool"],
      expectedCitations: ["[1]"],
    });
  }

  return base.map((item, index) => ({ ...item, id: `eval-${String(index + 1).padStart(3, "0")}` }));
}

export function evaluateRunSnapshot(snapshot: EvalRunSnapshot): EvalResult {
  const output = snapshot.outputMarkdown?.trim() ?? "";
  const expectedCitations = snapshot.expectedCitations ?? [];
  const toolResults = snapshot.toolResults ?? [];
  const ragHits = snapshot.ragHits ?? [];
  const completion = output.length > 0 ? 1 : 0;
  const toolSuccessRate =
    toolResults.length === 0 ? 1 : toolResults.filter((item) => item.ok !== false).length / toolResults.length;
  const citationPrecision =
    expectedCitations.length === 0
      ? 1
      : expectedCitations.filter((citation) => output.includes(citation)).length / expectedCitations.length;
  const ragRecallAtK = ragHits.length > 0 ? 1 : 0;
  const hallucinationRate = completion && snapshot.evidence?.length === 0 && expectedCitations.length > 0 ? 1 : 0;
  const metrics: EvalMetricResult = {
    completion,
    toolSuccessRate: round(toolSuccessRate),
    citationPrecision: round(citationPrecision),
    ragRecallAtK,
    hallucinationRate,
    latencyMs: snapshot.latencyMs ?? 0,
    costCents: snapshot.costCents ?? 0,
  };
  const score = round(
    0.3 * metrics.completion +
      0.2 * metrics.toolSuccessRate +
      0.2 * metrics.citationPrecision +
      0.2 * metrics.ragRecallAtK +
      0.1 * (1 - metrics.hallucinationRate)
  );
  const notes = [
    ...(metrics.completion ? [] : ["empty_output"]),
    ...(metrics.toolSuccessRate === 1 ? [] : ["tool_failure"]),
    ...(metrics.citationPrecision === 1 ? [] : ["citation_gap"]),
    ...(metrics.hallucinationRate === 0 ? [] : ["possible_hallucination"]),
  ];
  return { caseId: snapshot.caseId, passed: score >= 0.7, score, metrics, notes };
}

export function buildEvalReport(results: EvalResult[]) {
  const summary = summarizeResults(results);
  const markdown = [
    "# Agent Eval Report",
    "",
    `- total: ${summary.total}`,
    `- passed: ${summary.passed}`,
    `- average_score: ${summary.averageScore}`,
    `- completion: ${summary.averageMetrics.completion}`,
    `- tool_success: ${summary.averageMetrics.toolSuccessRate}`,
    `- citation_precision: ${summary.averageMetrics.citationPrecision}`,
    `- rag_recall_at_k: ${summary.averageMetrics.ragRecallAtK}`,
    `- hallucination_rate: ${summary.averageMetrics.hallucinationRate}`,
    "",
    "| case | pass | score | notes |",
    "|---|---:|---:|---|",
    ...results.map((item) => `| ${item.caseId} | ${item.passed ? "yes" : "no"} | ${item.score} | ${item.notes.join(", ")} |`),
    "",
  ].join("\n");
  return { markdown, json: JSON.stringify({ summary, results }, null, 2) };
}

function summarizeResults(results: EvalResult[]) {
  const total = results.length;
  const averageMetrics = averageMetricsFor(results);
  return {
    total,
    passed: results.filter((item) => item.passed).length,
    averageScore: round(total ? results.reduce((sum, item) => sum + item.score, 0) / total : 0),
    averageMetrics,
  };
}

function averageMetricsFor(results: EvalResult[]): EvalMetricResult {
  const total = results.length || 1;
  return {
    completion: average(results, "completion", total),
    toolSuccessRate: average(results, "toolSuccessRate", total),
    citationPrecision: average(results, "citationPrecision", total),
    ragRecallAtK: average(results, "ragRecallAtK", total),
    hallucinationRate: average(results, "hallucinationRate", total),
    latencyMs: average(results, "latencyMs", total),
    costCents: average(results, "costCents", total),
  };
}

function average(results: EvalResult[], key: keyof EvalMetricResult, total: number) {
  return round(results.reduce((sum, item) => sum + Number(item.metrics[key] ?? 0), 0) / total);
}

function round(value: number) {
  return Number(value.toFixed(3));
}
