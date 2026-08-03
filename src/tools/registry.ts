import { defaultCommandRunner, InvestodayDataAdapter } from "@/lib/investoday";
import { fetchMarketOverview } from "@/lib/market-overview";
import { DEFAULT_AGENT_USER_ID, MemoryService } from "@/agents/memory";
import { getDefaultRagService, type RagHit } from "@/rag/local-rag";
import type { ToolManifest, ToolRegistry, ToolRegistryOptions, ToolRuntimeContext } from "@/tools/types";

const TOOL_MANIFESTS: ToolManifest[] = [
  tool("market.overview", "Fetch aggregated market overview", "market.overview"),
  tool("market.changeRatioStatus", "Fetch market breadth distribution", "market/change-ratio-status"),
  tool("market.indexRealtime", "Fetch realtime broad index quotes", "index-quote/realtime"),
  tool("news.market", "Fetch recent market news", "news"),
  tool("news.entityRelated", "Fetch entity related news", "news/entity-related"),
  tool("entity.recognition", "Recognize Investoday entities from natural language", "entity-recognition"),
  tool("stock.resolve", "Resolve stock code or name", "stock.resolve"),
  tool("stock.basicInfo", "Fetch stock basic information", "stock/basic-info"),
  tool("stock.briefItems", "Fetch stock brief items", "stock.briefItems"),
  tool("stock.industries", "Fetch stock industry classifications", "stock/industries"),
  tool("stock.unwindSignalStat", "Fetch stock unwind signal statistics", "stock/unwind-signal-stat"),
  tool("stock.unwindSignalDetails", "Fetch stock unwind signal details", "stock/unwind-signal-details"),
  tool("report.query", "Fetch research reports", "report/research"),
  tool("report.sentiment", "Fetch research sentiment", "research/sentiment"),
  tool("report.vectorSearch", "Search research report snippets", "report/vector-search"),
  tool("report.forecastRatings", "Fetch forecast and rating data", "report/stock-forecast-ratings"),
  tool("industry.data", "Fetch industry data", "industry.data"),
  tool("concept.resolve", "Resolve concept names", "concepts"),
  tool("concept.quote", "Fetch concept realtime quote", "concept-quote/realtime-v2"),
  tool("concept.stockRealtime", "Fetch concept component realtime quotes", "concept-quote/stock-realtime"),
  tool("valuation.data", "Fetch valuation data", "valuation.data"),
  tool("rag.ingestDocument", "Ingest a local document into the RAG index", "rag.ingestDocument", "write"),
  tool("rag.search", "Search local RAG chunks", "rag.search"),
  tool("rag.hybridSearch", "Hybrid search local RAG chunks", "rag.hybridSearch"),
  tool("rag.rerank", "Rerank local RAG hits", "rag.rerank"),
  tool("memory.search", "Search long-term memory", "memory.search"),
  tool("memory.write", "Write long-term memory", "memory.write", "write"),
  tool("skill.run", "Run a registered skill through the Skill Adapter", "skill.run"),
];

export function createToolRegistry(options: ToolRegistryOptions = {}): ToolRegistry {
  const run = options.run ?? defaultCommandRunner;
  return {
    list() {
      return TOOL_MANIFESTS;
    },
    get(toolKey: string) {
      const manifest = TOOL_MANIFESTS.find((item) => item.toolKey === toolKey);
      if (!manifest) throw new Error(`Unknown tool: ${toolKey}`);
      return manifest;
    },
    async call<T>(toolKey: string, input: Record<string, unknown>, context: ToolRuntimeContext) {
      const manifest = this.get(toolKey);
      const startedAt = Date.now();
      try {
        const data = await executeTool(toolKey, input, run, context);
        const toolCall = await context.recordToolCall({
          agentRunId: context.agentRunId,
          toolKey,
          inputJson: input,
          outputSummary: summarize(data),
          rawPayloadRef: null,
          status: "completed",
          latencyMs: Date.now() - startedAt,
          error: null,
          sourceEndpoint: manifest.sourceEndpoint,
        });
        return {
          toolCallId: toolCall.id,
          data: data as T,
          ok: true,
          error: null,
          sourceEndpoint: manifest.sourceEndpoint,
          latencyMs: Date.now() - startedAt,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const toolCall = await context.recordToolCall({
          agentRunId: context.agentRunId,
          toolKey,
          inputJson: input,
          outputSummary: "",
          rawPayloadRef: null,
          status: "failed",
          latencyMs: Date.now() - startedAt,
          error: message,
          sourceEndpoint: manifest.sourceEndpoint,
        });
        throw new Error(`${toolKey} failed (${toolCall.id}): ${message}`);
      }
    },
  };
}

async function executeTool(toolKey: string, input: Record<string, unknown>, run: NonNullable<ToolRegistryOptions["run"]>, context: ToolRuntimeContext) {
  if (toolKey === "market.overview") {
    return fetchMarketOverview({ indexCode: stringOrUndefined(input.indexCode), run });
  }
  if (toolKey === "market.changeRatioStatus") {
    return fetchJsonRecord(run, "market/change-ratio-status", []);
  }
  if (toolKey === "market.indexRealtime") {
    const indexCodes = Array.isArray(input.indexCodes) ? input.indexCodes.map(String) : ["000001", "399001", "399006", "000300"];
    return fetchJsonArray(run, "index-quote/realtime", [
      "--method",
      "POST",
      "--body-json",
      JSON.stringify({ indexCodes }),
    ]);
  }
  if (toolKey === "news.market") {
    return fetchJsonArray(run, "news", buildNewsArgs(input));
  }
  if (toolKey === "news.entityRelated") {
    return fetchJsonArray(run, "news/entity-related", buildEntityNewsArgs(input));
  }
  if (toolKey === "entity.recognition") {
    const query = stringOrUndefined(input.query) ?? stringOrUndefined(input.input) ?? "";
    if (!query) return {};
    return fetchJsonRecord(run, "entity-recognition", ["--method", "POST", `input=${query}`]);
  }
  if (toolKey === "stock.resolve") {
    const adapter = new InvestodayDataAdapter(run);
    const query = stringOrUndefined(input.query) ?? stringOrUndefined(input.stockCodeOrName) ?? stringOrUndefined(input.stockName) ?? stringOrUndefined(input.name);
    const code = stringOrUndefined(input.stockCode) ?? extractStockCode(query ?? "");
    const name = code ? stringOrUndefined(input.stockName) : query;
    return adapter.resolveStock({ code, name });
  }
  if (toolKey === "stock.basicInfo") {
    const adapter = new InvestodayDataAdapter(run);
    const stockCode = stringOrUndefined(input.stockCode) ?? stringOrUndefined(input.stockCodeOrName) ?? extractStockCode(JSON.stringify(input));
    const stockName = stringOrUndefined(input.stockName) ?? stringOrUndefined(input.name);
    if (!stockCode && !stockName) return null;
    return adapter.resolveStock({ code: stockCode, name: stockName });
  }
  if (toolKey === "stock.briefItems") {
    const adapter = new InvestodayDataAdapter(run);
    const industryCode = stringOrUndefined(input.industryCode);
    const industryName = stringOrUndefined(input.industryName) ?? stringOrUndefined(input.industry);
    const targetType = stringOrUndefined(input.targetType);
    if (targetType === "sector" || industryCode || industryName) {
      const target = await adapter.resolveSector({ code: industryCode, name: industryName });
      const { windowStart, windowEnd } = dateObjects(input);
      return adapter.fetchBriefItems({ target: enabledTarget(target), windowStart, windowEnd });
    }

    const stockCode = stringOrUndefined(input.stockCode) ?? stringOrUndefined(input.stockCodeOrName) ?? extractStockCode(JSON.stringify(input));
    if (!stockCode) return [];
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - Number(input.timeWindowDays ?? 30) * 24 * 60 * 60 * 1000);
    return adapter.fetchBriefItems({
      target: {
        id: "agent-target",
        type: "stock",
        code: stockCode,
        name: stringOrUndefined(input.stockName) ?? stockCode,
      },
      windowStart,
      windowEnd,
    });
  }
  if (toolKey === "stock.industries") {
    const stockCode = stringOrUndefined(input.stockCode) ?? extractStockCode(JSON.stringify(input));
    if (!stockCode) return [];
    return fetchJsonArray(run, "stock/industries", [
      "--method",
      "POST",
      "--body-json",
      JSON.stringify({ stockCode, pageNum: 1, pageSize: 10 }),
    ]);
  }
  if (toolKey === "stock.unwindSignalStat") {
    const stockCode = stringOrUndefined(input.stockCode) ?? extractStockCode(JSON.stringify(input));
    if (!stockCode) return [];
    return fetchJsonArray(run, "stock/unwind-signal-stat", [
      "--method",
      "POST",
      "--body-json",
      JSON.stringify({ stockCode, pageNum: 1, pageSize: 10 }),
    ]);
  }
  if (toolKey === "stock.unwindSignalDetails") {
    const stockCode = stringOrUndefined(input.stockCode) ?? extractStockCode(JSON.stringify(input));
    if (!stockCode) return [];
    return fetchJsonArray(run, "stock/unwind-signal-details", [
      "--method",
      "POST",
      "--body-json",
      JSON.stringify({ stockCode, ...dateWindow(input), pageNum: 1, pageSize: Number(input.pageSize ?? 20) }),
    ]);
  }
  if (toolKey === "report.query") {
    const entity = await resolveReportEntity(input, run);
    if (!entity) return [];
    return fetchJsonArray(run, "report/research", [
      "--method",
      "POST",
      "--body-json",
      JSON.stringify({
        [entity.key]: entity.code,
        ...dateWindow(input),
        pageSize: Number(input.pageSize ?? 20),
      }),
    ]);
  }
  if (toolKey === "report.sentiment") {
    const entity = await resolveReportEntity(input, run);
    if (!entity) return [];
    const window = dateTimeWindow(input);
    return fetchJsonArray(run, "research/sentiment", [
      "--method",
      "POST",
      "--body-json",
      JSON.stringify({
        [entity.key]: entity.code,
        beginTime: window.beginTime,
        endTime: window.endTime,
        pageNum: 1,
        pageSize: Number(input.pageSize ?? 20),
      }),
    ]);
  }
  if (toolKey === "report.vectorSearch") {
    const entity = await resolveReportEntity(input, run);
    if (!entity) throw new Error("report.vectorSearch requires stockCode or industryCode");
    const window = dateWindow(input);
    return fetchJsonArray(run, "report/vector-search", [
      "--method",
      "POST",
      `${entity.key}=${entity.code}`,
      `beginDate=${window.beginDate}`,
      `endDate=${window.endDate}`,
      `topK=${String(input.topK ?? input.pageSize ?? 10)}`,
      "--body-json",
      JSON.stringify({
        query: stringOrUndefined(input.query) ?? stringOrUndefined(input.question) ?? stringOrUndefined(input.stockName) ?? stringOrUndefined(input.industryName) ?? entity.code,
      }),
    ]);
  }
  if (toolKey === "report.forecastRatings") {
    const stockCode = stringOrUndefined(input.stockCode) ?? extractStockCode(stringOrUndefined(input.stockCodeOrName) ?? "");
    if (!stockCode) throw new Error("report.forecastRatings is only supported for stock research input");
    return fetchJsonArray(run, "report/stock-forecast-ratings", [
      `stockCode=${stockCode}`,
      ...dateWindowArgs(input),
      "pageNum=1",
      `pageSize=${String(input.pageSize ?? 20)}`,
    ]);
  }
  if (toolKey === "industry.data") {
    const adapter = new InvestodayDataAdapter(run);
    const industryCode = stringOrUndefined(input.industryCode);
    const industryName = stringOrUndefined(input.industryName) ?? stringOrUndefined(input.industry) ?? stringOrUndefined(input.query);
    if (!industryCode && !industryName) throw new Error("industry.data requires industryCode or industryName");
    const target = await adapter.resolveSector({ code: industryCode, name: industryName });
    const { windowStart, windowEnd } = dateObjects(input);
    const [briefItems, marketStats, quoteSummaries, reports, sentiment] = await Promise.all([
      adapter.fetchBriefItems({ target: enabledTarget(target), windowStart, windowEnd }),
      fetchJsonRecordSafe(run, "industry/market-stats", [
        "--method",
        "POST",
        "--body-json",
        JSON.stringify({ industryCode: target.code }),
      ]),
      fetchJsonArraySafe(run, "market/quote-summaries", [
        "--method",
        "POST",
        "--body-json",
        JSON.stringify({ industryCodes: [target.code], industrySubCodes: [], conceptCodes: [] }),
      ]),
      fetchJsonArraySafe(run, "report/research", [
        "--method",
        "POST",
        "--body-json",
        JSON.stringify({ industryCode: target.code, ...dateWindow(input), pageSize: Number(input.pageSize ?? 20) }),
      ]),
      fetchJsonArraySafe(run, "research/sentiment", [
        "--method",
        "POST",
        "--body-json",
        JSON.stringify({
          industryCode: target.code,
          ...dateTimeWindow(input),
          pageNum: 1,
          pageSize: Number(input.pageSize ?? 20),
        }),
      ]),
    ]);
    return { target, briefItems, marketStats, quoteSummaries, reports, sentiment };
  }
  if (toolKey === "concept.resolve") {
    const conceptName = stringOrUndefined(input.conceptName) ?? stringOrUndefined(input.query) ?? stringOrUndefined(input.name);
    if (!conceptName) return [];
    return fetchJsonArray(run, "concepts", [`conceptName=${conceptName}`, "pageNum=1", "pageSize=10"]);
  }
  if (toolKey === "concept.quote") {
    const conceptCode = stringOrUndefined(input.conceptCode);
    if (!conceptCode) return [];
    return fetchJsonArray(run, "concept-quote/realtime-v2", [
      "--method",
      "POST",
      "conceptType=1",
      "sortColumn=changeRatio",
      "--body-json",
      JSON.stringify({ conceptCodes: [conceptCode] }),
    ]);
  }
  if (toolKey === "concept.stockRealtime") {
    const conceptCode = stringOrUndefined(input.conceptCode);
    if (!conceptCode) return [];
    return fetchJsonRecord(run, "concept-quote/stock-realtime", ["conceptType=jy", `conceptCode=${conceptCode}`, "pageSize=1000"]);
  }
  if (toolKey === "rag.ingestDocument") {
    const title = stringOrUndefined(input.title);
    const content = stringOrUndefined(input.content);
    if (!title || !content) throw new Error("rag.ingestDocument requires title and content");
    return getDefaultRagService().ingestDocument({
      title,
      content,
      source: stringOrUndefined(input.source) ?? "local-upload",
      sourceUrl: stringOrUndefined(input.sourceUrl) ?? null,
      publishedAt: stringOrUndefined(input.publishedAt) ?? null,
      licenseStatus: licenseStatusOrDefault(input.licenseStatus),
      licenseSource: stringOrUndefined(input.licenseSource) ?? stringOrUndefined(input.source) ?? "local-upload",
      validFrom: stringOrUndefined(input.validFrom) ?? null,
      validUntil: stringOrUndefined(input.validUntil) ?? null,
      metadata: recordMetadata(input.metadata),
    });
  }
  if (toolKey === "rag.search" || toolKey === "rag.hybridSearch") {
    const query = stringOrUndefined(input.query) ?? stringOrUndefined(input.question);
    if (!query) return [];
    return getDefaultRagService().search({
      query,
      topK: numberOrUndefined(input.topK) ?? numberOrUndefined(input.limit) ?? 8,
      filters: recordMetadata(input.filters),
      includeRemoved: input.includeRemoved === true,
    });
  }
  if (toolKey === "rag.rerank") {
    const hits = Array.isArray(input.hits) ? (input.hits as RagHit[]) : [];
    return hits
      .map((hit, index) => ({ ...hit, score: Number(hit.score ?? 0) + Math.max(0, 0.001 * (hits.length - index)) }))
      .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));
  }
  if (toolKey === "memory.search") {
    return new MemoryService().search({
      userId: context.userId ?? DEFAULT_AGENT_USER_ID,
      sessionId: context.sessionId,
      query: stringOrUndefined(input.query) ?? stringOrUndefined(input.question) ?? JSON.stringify(input),
      inputPayload: input,
      limit: Number(input.limit ?? 8),
    });
  }
  if (toolKey === "memory.write") {
    const content = stringOrUndefined(input.content);
    if (!content) throw new Error("memory.write requires content");
    const item = await new MemoryService().write({
      userId: context.userId ?? DEFAULT_AGENT_USER_ID,
      sessionId: context.sessionId,
      scope: stringOrUndefined(input.scope) ?? "user",
      kind: stringOrUndefined(input.kind) ?? "user_preference",
      content,
      sourceRunId: context.agentRunId,
      confidence: numberOrUndefined(input.confidence) ?? 0.65,
      importance: numberOrUndefined(input.importance) ?? 0.5,
    });
    return { written: true, id: item.id };
  }
  return [];
}

async function fetchJsonArray(run: NonNullable<ToolRegistryOptions["run"]>, endpoint: string, args: string[]) {
  const result = await run("investoday-api", [endpoint, ...args]);
  if (!result.ok) throw new Error(result.stderr || result.stdout || endpoint);
  const parsed = JSON.parse(result.stdout);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.data)) return parsed.data;
  if (Array.isArray(parsed?.records)) return parsed.records;
  return [];
}

async function fetchJsonRecord(run: NonNullable<ToolRegistryOptions["run"]>, endpoint: string, args: string[]) {
  const result = await run("investoday-api", [endpoint, ...args]);
  if (!result.ok) throw new Error(result.stderr || result.stdout || endpoint);
  const parsed = JSON.parse(result.stdout);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.data && typeof parsed.data === "object") {
    return parsed.data;
  }
  return parsed;
}

async function fetchJsonArraySafe(run: NonNullable<ToolRegistryOptions["run"]>, endpoint: string, args: string[]) {
  try {
    return await fetchJsonArray(run, endpoint, args);
  } catch {
    return [];
  }
}

async function fetchJsonRecordSafe(run: NonNullable<ToolRegistryOptions["run"]>, endpoint: string, args: string[]) {
  try {
    return await fetchJsonRecord(run, endpoint, args);
  } catch {
    return null;
  }
}

function buildNewsArgs(input: Record<string, unknown>) {
  const args: string[] = [];
  if (input.beginTime) args.push(`beginTime=${String(input.beginTime)}`);
  if (input.endTime) args.push(`endTime=${String(input.endTime)}`);
  args.push(`pageNum=${String(input.pageNum ?? 1)}`);
  args.push(`pageSize=${String(input.pageSize ?? 10)}`);
  return args;
}

function buildEntityNewsArgs(input: Record<string, unknown>) {
  const args = buildNewsArgs(input);
  const stockCode = stringOrUndefined(input.stockCode);
  const industryCode = stringOrUndefined(input.industryCode);
  const conceptCode = stringOrUndefined(input.conceptCode);
  if (stockCode) args.push(`stockCode=${stockCode}`);
  if (industryCode) args.push(`industryCode=${industryCode}`);
  if (conceptCode) args.push(`conceptCode=${conceptCode}`);
  if (input.minRelevance) args.push(`minRelevance=${String(input.minRelevance)}`);
  return args;
}

function dateWindow(input: Record<string, unknown>) {
  const end = new Date();
  const start = new Date(end.getTime() - Number(input.timeWindowDays ?? 90) * 24 * 60 * 60 * 1000);
  return {
    beginDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function dateWindowArgs(input: Record<string, unknown>) {
  const window = dateWindow(input);
  return [`beginDate=${window.beginDate}`, `endDate=${window.endDate}`];
}

function dateTimeWindow(input: Record<string, unknown>) {
  const end = new Date();
  const start = new Date(end.getTime() - Number(input.timeWindowDays ?? 90) * 24 * 60 * 60 * 1000);
  return {
    beginTime: start.toISOString().slice(0, 19).replace("T", " "),
    endTime: end.toISOString().slice(0, 19).replace("T", " "),
  };
}

function dateObjects(input: Record<string, unknown>) {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - Number(input.timeWindowDays ?? 30) * 24 * 60 * 60 * 1000);
  return { windowStart, windowEnd };
}

function enabledTarget(target: { type: "stock" | "sector"; code: string; name: string }) {
  return {
    id: `${target.type}:${target.code}`,
    type: target.type,
    code: target.code,
    name: target.name,
  };
}

async function resolveReportEntity(input: Record<string, unknown>, run: NonNullable<ToolRegistryOptions["run"]>) {
  const stockCode = stringOrUndefined(input.stockCode) ?? extractStockCode(stringOrUndefined(input.stockCodeOrName) ?? "");
  if (stockCode) return { key: "stockCode", code: stockCode };
  const industryCode = stringOrUndefined(input.industryCode);
  if (industryCode) return { key: "industryCode", code: industryCode };
  const industryName = stringOrUndefined(input.industryName) ?? stringOrUndefined(input.industry);
  if (industryName) {
    const target = await new InvestodayDataAdapter(run).resolveSector({ name: industryName });
    return { key: "industryCode", code: target.code };
  }
  const conceptCode = stringOrUndefined(input.conceptCode);
  if (conceptCode) return { key: "conceptCode", code: conceptCode };
  const conceptName = stringOrUndefined(input.conceptName);
  if (conceptName) {
    const concepts = await fetchJsonArraySafe(run, "concepts", [`conceptName=${conceptName}`, "pageNum=1", "pageSize=10"]);
    const first = concepts[0];
    const code = stringOrUndefined(first?.conceptCode) ?? stringOrUndefined(first?.code);
    if (code) return { key: "conceptCode", code };
  }
  return null;
}

function tool(toolKey: string, description: string, sourceEndpoint: string, riskLevel: ToolManifest["riskLevel"] = "read"): ToolManifest {
  return { toolKey, description, sourceEndpoint, riskLevel, timeoutMs: 30_000, retry: 1 };
}

function summarize(data: unknown) {
  if (Array.isArray(data)) return `${data.length} records`;
  if (data && typeof data === "object") return `${Object.keys(data).length} fields`;
  return String(data ?? "");
}

function stringOrUndefined(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberOrUndefined(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function licenseStatusOrDefault(value: unknown) {
  return value === "authorized" || value === "internal" || value === "public" ? value : "internal";
}

function recordMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, string | number | boolean | null | undefined>) : undefined;
}

function extractStockCode(text: string) {
  return text.match(/\b\d{6}\b/)?.[0];
}
