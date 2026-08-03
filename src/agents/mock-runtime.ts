import { StaticModelProvider, type ModelProvider, type ModelRuntimeContext, type StreamMarkdownContext } from "@/agents/model-provider";
import { createAgentQueue, type AgentQueueClient } from "@/agents/queue";
import type { ToolManifest, ToolRegistry, ToolRuntimeContext } from "@/tools/types";

const MOCK_MODEL_DEFAULT_OUTPUT = [
  "# Mock 投研报告",
  "",
  "本报告由 AGENT_MOCK_MODE 生成，用于验证 Agent 图、落库与接口流程。",
  "",
  "- 结论：当前仅输出稳定的测试文本，不代表真实投资建议。",
  "- 证据：使用 mock 工具返回的可追踪样本数据。",
  "- 风险：mock 模式不连接真实行情、LLM、Redis 或外部数据源。",
].join("\n");

export type MockAgentRuntime = {
  modelProvider: ModelProvider;
  toolRegistry: ToolRegistry;
  queue: AgentQueueClient;
};

export function isAgentMockMode(env: NodeJS.ProcessEnv = process.env) {
  return env.AGENT_MOCK_MODE === "1";
}

export function createMockAgentRuntime(env: NodeJS.ProcessEnv = process.env): MockAgentRuntime {
  return {
    modelProvider: new RecordingStaticModelProvider(env.MOCK_MODEL_OUTPUT || MOCK_MODEL_DEFAULT_OUTPUT),
    toolRegistry: createMockToolRegistry({ emptyEvidence: env.MOCK_TOOL_EMPTY_EVIDENCE === "1" }),
    queue: createAgentQueue("", { AGENT_MOCK_MODE: "1" }),
  };
}

export function createMockToolRegistry(options: { emptyEvidence?: boolean } = {}): ToolRegistry {
  const manifests = new Map(MOCK_TOOL_KEYS.map((toolKey) => [toolKey, manifestFor(toolKey)]));
  return {
    list() {
      return [...manifests.values()];
    },
    get(toolKey: string) {
      return manifests.get(toolKey) ?? manifestFor(toolKey);
    },
    async call<T = unknown>(toolKey: string, input: Record<string, unknown>, context: ToolRuntimeContext) {
      const startedAt = Date.now();
      const data = mockToolData(toolKey, input, Boolean(options.emptyEvidence));
      const record = await context.recordToolCall({
        agentRunId: context.agentRunId,
        toolKey,
        inputJson: input,
        outputSummary: summarizeMockOutput(data),
        rawPayloadRef: null,
        status: "completed",
        latencyMs: Date.now() - startedAt,
        error: null,
        sourceEndpoint: manifestFor(toolKey).sourceEndpoint,
      });
      return {
        toolCallId: record.id,
        data: data as T,
        ok: true,
        error: null,
        sourceEndpoint: manifestFor(toolKey).sourceEndpoint,
        latencyMs: Date.now() - startedAt,
      };
    },
  };
}

class RecordingStaticModelProvider extends StaticModelProvider {
  constructor(output: string) {
    super(output);
    this.model = "mock-static-model";
  }

  override async chatMarkdown(prompt: string, context: ModelRuntimeContext) {
    const output = await super.chatMarkdown(prompt, context);
    await recordMockModelCall(context, prompt, output, "markdown");
    return output;
  }

  override async streamMarkdown(prompt: string, context: StreamMarkdownContext) {
    const output = await super.streamMarkdown(prompt, context);
    await recordMockModelCall(context, prompt, output, "markdown_stream");
    return output;
  }
}

async function recordMockModelCall(context: ModelRuntimeContext, prompt: string, output: string, mode: string) {
  await context.recordModelCall?.({
    agentRunId: context.agentRunId,
    model: "mock-static-model",
    mode,
    promptHash: String(prompt.length),
    tokenInput: Math.ceil(prompt.length / 4),
    tokenOutput: Math.ceil(output.length / 4),
    costCents: 0,
    latencyMs: 0,
    status: "completed",
    error: null,
  });
}

function mockToolData(toolKey: string, input: Record<string, unknown>, emptyEvidence: boolean): unknown {
  if (toolKey === "memory.search") return [];
  if (toolKey === "stock.resolve") {
    const code = stringValue(input.stockCode) || codeFromText(stringValue(input.query) || stringValue(input.stockCodeOrName)) || "600519";
    return { code, name: code === "600519" ? "贵州茅台" : stringValue(input.stockName) || code, type: "stock", correlation: 1 };
  }
  if (toolKey === "rag.search") {
    return emptyEvidence
      ? []
      : [
          {
            chunkId: "mock-rag-chunk-1",
            documentId: "mock-rag-doc-1",
            title: "Mock RAG 样本文档",
            content: "用于验证 RAG hit 审计字段和图状态持久化。",
            source: "mock-runtime",
            sourceUrl: "mock://rag/doc-1",
            licenseStatus: "internal",
            publishedAt: new Date("2026-01-01T00:00:00.000Z"),
            validUntil: null,
            removedAt: null,
            score: 0.88,
            lexicalScore: 0.8,
            vectorScore: 0.9,
            metadata: { mock: true },
          },
        ];
  }
  if (emptyEvidence && EVIDENCE_TOOL_KEYS.has(toolKey)) return [];
  if (toolKey === "market.overview") return { tradeDate: "2026-08-03", summary: "Mock 市场窄幅震荡" };
  if (toolKey === "market.changeRatioStatus") return [{ bucket: "up", count: 1200 }, { bucket: "down", count: 900 }];
  if (toolKey === "market.indexRealtime") return [{ indexCode: "000001", name: "上证指数", changeRatio: 0.01 }];
  if (toolKey === "news.market") return [{ title: "Mock 市场新闻", source: "mock-runtime", summary: "用于市场播报测试。" }];
  if (toolKey === "industry.data") {
    return {
      target: { code: stringValue(input.industryCode) || "IND001", name: stringValue(input.industryName) || "有色金属" },
      reports: [{ title: "Mock 行业研报", source: "mock-runtime", summary: "行业景气度样本证据。" }],
    };
  }
  return [
    {
      title: "Mock 公司证据",
      source: "mock-runtime",
      summary: "公司经营、研报和新闻样本证据。",
      stockCode: stringValue(input.stockCode) || stringValue(input.stockCodeOrName) || "600519",
      stockName: stringValue(input.stockName) || "贵州茅台",
      publishedAt: "2026-08-03",
    },
  ];
}

function manifestFor(toolKey: string): ToolManifest {
  return {
    toolKey,
    description: `Mock implementation for ${toolKey}`,
    sourceEndpoint: `mock://${toolKey}`,
    riskLevel: "read",
    timeoutMs: 1000,
    retry: 0,
  };
}

function summarizeMockOutput(data: unknown) {
  if (Array.isArray(data)) return `${data.length} mock records`;
  if (data && typeof data === "object") return `${Object.keys(data).length} mock fields`;
  return String(data ?? "");
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function codeFromText(text: string) {
  return text.match(/\b\d{6}\b/)?.[0];
}

const EVIDENCE_TOOL_KEYS = new Set([
  "stock.basicInfo",
  "stock.briefItems",
  "report.query",
  "report.sentiment",
  "report.vectorSearch",
  "report.forecastRatings",
  "stock.industries",
  "stock.unwindSignalStat",
  "stock.unwindSignalDetails",
  "news.entityRelated",
  "industry.data",
  "concept.resolve",
  "concept.quote",
  "concept.stockRealtime",
]);

const MOCK_TOOL_KEYS = [
  "memory.search",
  "rag.search",
  "stock.resolve",
  "stock.basicInfo",
  "stock.briefItems",
  "stock.industries",
  "report.query",
  "report.sentiment",
  "report.vectorSearch",
  "report.forecastRatings",
  "stock.unwindSignalStat",
  "stock.unwindSignalDetails",
  "news.entityRelated",
  "industry.data",
  "concept.resolve",
  "concept.quote",
  "concept.stockRealtime",
  "market.overview",
  "market.changeRatioStatus",
  "market.indexRealtime",
  "news.market",
];
