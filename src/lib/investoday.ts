import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { lookupStockAlias } from "@/lib/stock-aliases";
import type { AdapterBriefItem, EnabledTarget, NormalizedWatchTarget } from "@/lib/types";

const execFileAsync = promisify(execFile);

export type CommandResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
};

export type CommandRunner = (command: string, args: string[]) => Promise<CommandResult>;

export async function defaultCommandRunner(command: string, args: string[]): Promise<CommandResult> {
  const invocation = resolveCliInvocation(command, args);
  try {
    const result = await execFileAsync(invocation.command, invocation.args, {
      timeout: 30_000,
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 8,
      shell: invocation.shell,
    });
    return { ok: true, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, stdout: "", stderr: message };
  }
}

export function resolveCliInvocation(
  command: string,
  args: string[],
  platform = process.platform,
  appData = process.env.APPDATA,
  nodePath = process.execPath
) {
  if (platform === "win32" && command === "investoday-api" && appData) {
    return {
      command: nodePath,
      args: [
        path.join(appData, "npm", "node_modules", "@investoday", "investoday-api", "bin", "investoday-api.js"),
        ...args,
      ],
      shell: false,
    };
  }

  return { command, args, shell: false };
}

export async function checkInvestodayHealth(run: CommandRunner = defaultCommandRunner) {
  const result = await run("investoday-api", ["list"]);
  if (result.ok) {
    return { ok: true, message: "investoday-api 可用" };
  }
  return {
    ok: false,
    message: `investoday-api 不可用：${result.stderr || result.stdout || "未返回错误信息"}`,
  };
}

export class InvestodayDataAdapter {
  constructor(private readonly run: CommandRunner = defaultCommandRunner) {}

  async resolveStockByCode(code: string): Promise<NormalizedWatchTarget> {
    const normalizedCode = code.trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      throw new Error("股票代码必须是 6 位数字");
    }

    return this.resolveStock({ code: normalizedCode });
  }

  async resolveStock(input: { code?: string; name?: string }): Promise<NormalizedWatchTarget> {
    const code = input.code?.trim();
    const name = input.name?.trim();
    if (code && !/^\d{6}$/.test(code)) {
      throw new Error("股票代码必须是 6 位数字");
    }

    const match = code
      ? await this.fetchStockByCode(code)
      : name
        ? await this.fetchStockByNameOrAlias(name)
        : null;
    const stockName = stockNameOf(match);
    const stockCode = stockCodeOf(match);
    if (!match || !stockName || !stockCode) {
      throw new Error("未能从数据接口识别股票名称");
    }
    const matchRecord = match as Record<string, unknown>;

    return {
      type: "stock",
      code: stockCode,
      name: stockName,
      tags: [
        stringValue(matchRecord.exchangeCode) || stringValue(matchRecord.market) || stringValue(matchRecord.exchange),
        stringValue(matchRecord.industryName) || stringValue(matchRecord.boardName) || stringValue(matchRecord.industry),
      ].filter(Boolean),
      reason: "",
      enabled: true,
    };
  }

  async resolveSector(input: { code?: string; name?: string }): Promise<NormalizedWatchTarget> {
    const code = input.code?.trim();
    const name = input.name?.trim();
    const candidates = code
      ? await this.fetchJsonArray("industries", [`industryCode=${code}`, "pageSize=10"])
      : name
        ? await this.fetchJsonArray("industries", [`industryName=${name}`, "pageSize=10"])
        : [];
    const match = pickBestSector(candidates, code, name);
    const industryCode = stringValue(match?.industryCode) || stringValue(match?.code);
    const industryName = stringValue(match?.industryName) || stringValue(match?.name);
    if (!match || !industryCode || !industryName) {
      throw new Error("未能从数据接口识别板块名称");
    }

    return {
      type: "sector",
      code: industryCode,
      name: industryName,
      tags: [stringValue(match.industryType), stringValue(match.industryLevel), stringValue(match.indexCode)].filter(Boolean),
      reason: "",
      enabled: true,
    };
  }

  async fetchBriefItems(input: {
    target: EnabledTarget;
    windowStart: Date;
    windowEnd: Date;
  }): Promise<AdapterBriefItem[]> {
    const beginDate = toDateParam(input.windowStart);
    const endDate = toDateParam(input.windowEnd);
    const beginTime = toDateTimeParam(input.windowStart);
    const endTime = toDateTimeParam(input.windowEnd);
    const entityKey = input.target.type === "stock" ? "stockCode" : "industryCode";

    const [news, announcements, reports, reportSentiments] = await Promise.all([
      this.fetchJsonArray("news/entity-related", [
        `${entityKey}=${input.target.code}`,
        `beginTime=${beginTime}`,
        `endTime=${endTime}`,
        "pageSize=20",
      ]),
      input.target.type === "stock"
        ? this.fetchJsonArray("announcements", [
            `stockCode=${input.target.code}`,
            `beginDate=${beginDate}`,
            `endDate=${endDate}`,
            "pageSize=10",
          ])
        : Promise.resolve([]),
      this.fetchJsonArray("report/research", [
        "--method",
        "POST",
        "--body-json",
        JSON.stringify({
          [entityKey]: input.target.code,
          beginDate,
          endDate,
          pageSize: 10,
        }),
      ]),
      this.fetchJsonArray("research/sentiment", [
        "--method",
        "POST",
        "--body-json",
        JSON.stringify({
          [entityKey]: input.target.code,
          beginTime,
          endTime,
          pageNum: 1,
          pageSize: 20,
        }),
      ]),
    ]);

    return [
      ...news.map((item, index) => normalizeNewsItem(item, input.target, index)),
      ...announcements.map((item, index) => normalizeAnnouncementItem(item, input.target, index)),
      ...reports.map((item, index) => normalizeResearchItem(item, input.target, index)),
      ...reportSentiments.map((item, index) => normalizeResearchSentimentItem(item, input.target, index)),
    ].filter((item): item is AdapterBriefItem => Boolean(item));
  }

  private async fetchJsonArray(endpoint: string, args: string[]): Promise<Array<Record<string, unknown>>> {
    const result = await this.run("investoday-api", [endpoint, ...args]);
    if (!result.ok) {
      return [];
    }

    try {
      return parseJsonCandidates(result.stdout);
    } catch {
      return [];
    }
  }

  private async fetchStockByCode(code: string) {
    const items = await this.fetchJsonArray("stock/basic-info", [
      "--method",
      "POST",
      "--body-json",
      JSON.stringify({ stockCode: code, pageNum: 1, pageSize: 10 }),
    ]);
    return items.find((item) => stockCodeOf(item) === code) ?? items[0] ?? null;
  }

  private async fetchStockByName(name: string) {
    for (let pageNum = 1; pageNum <= 20; pageNum += 1) {
      const items = await this.fetchJsonArray("stock/all", [
        "--method",
        "POST",
        "--body-json",
        JSON.stringify({ pageNum, pageSize: 500 }),
      ]);
      const exact = items.find((item) => stockNameOf(item) === name || stringValue(item.stockFullName) === name);
      if (exact) return exact;
      const fuzzy = items.find((item) => stockNameOf(item).includes(name) || name.includes(stockNameOf(item)));
      if (fuzzy) return fuzzy;
      if (items.length < 500) break;
    }
    return null;
  }

  private async fetchStockBySearch(name: string) {
    const items = await this.fetchJsonArray("search", [`key=${name}`, "type=11"]);
    const match =
      items.find((item) => stockNameOf(item) === name || stringValue(item.stockFullName) === name) ??
      items.find((item) => stockNameOf(item).includes(name) || name.includes(stockNameOf(item))) ??
      items[0] ??
      null;
    const stockCode = stockCodeOf(match);
    if (!match || !stockCode) return null;
    return {
      stockCode,
      stockName: stockNameOf(match) || name,
      exchangeCode: stringValue(match.mkt) || stringValue(match.exchangeCode),
      boardName: stringValue(match.boardName),
    };
  }

  private async fetchStockByNameOrAlias(name: string) {
    const aliasCode = lookupStockAlias(name);
    if (aliasCode) {
      return (await this.fetchStockByCode(aliasCode)) ?? stockRecordFromAlias(name, aliasCode);
    }
    return (await this.fetchStockBySearch(name)) ?? this.fetchStockByName(name);
  }
}

function normalizeNewsItem(item: Record<string, unknown>, target: EnabledTarget, index: number): AdapterBriefItem | null {
  const title = stringValue(item.title);
  if (!title) return null;
  return {
    kind: "news",
    title,
    source: stringValue(item.source) || "新闻数据",
    publishedAt: parseDateValue(item.date ?? item.publishDate),
    summary: stringValue(item.summary) || stringValue(item.keyPoints) || `与 ${target.name} 相关的新闻线索。`,
    rawRef: `investoday:news:${stringValue(item.newsId) || target.code}:${index}`,
    rawPayload: item,
    normalizedPayload: pickPayload(item, [
      "newsId",
      "date",
      "publishDate",
      "summary",
      "keyPoints",
      "impactAnalysis",
      "investmentOpportunity",
      "investmentRisk",
      "sentimentScore",
      "sentiment",
      "sentimentAnalysis",
      "themeCode",
      "newsLevel",
      "newsType",
      "entityCode",
      "entityName",
      "relevance",
      "url",
      "source",
    ]),
    detailText: firstNonEmpty(item.content, item.detail, item.summary, item.keyPoints),
    sourceEndpoint: "news/entity-related",
    fetchedAt: new Date(),
  };
}

function normalizeAnnouncementItem(
  item: Record<string, unknown>,
  target: EnabledTarget,
  index: number
): AdapterBriefItem | null {
  const title = stringValue(item.title);
  if (!title) return null;
  return {
    kind: "announcement",
    title,
    source: stringValue(item.announcementSource) || "公告数据",
    publishedAt: parseDateValue(item.date ?? item.publishDate),
    summary: `${target.name} 公告：${title}`,
    rawRef: `investoday:announcement:${stringValue(item.announcementId) || target.code}:${index}`,
    rawPayload: item,
    normalizedPayload: pickPayload(item, ["announcementId", "date", "announcementSource", "url", "type", "content", "summary"]),
    detailText: firstNonEmpty(item.content, item.detail, item.summary, title),
    sourceEndpoint: "announcements",
    fetchedAt: new Date(),
  };
}

function normalizeResearchItem(
  item: Record<string, unknown>,
  target: EnabledTarget,
  index: number
): AdapterBriefItem | null {
  const title = stringValue(item.title) || stringValue(item.reportTitle);
  if (!title) return null;
  return {
    kind: "research",
    title,
    source: stringValue(item.orgName) || stringValue(item.institutionName) || "研报数据",
    publishedAt: parseDateValue(item.publishDate ?? item.date),
    summary:
      stringValue(item.coreViewpoint) ||
      stringValue(item.coreContent) ||
      stringValue(item.investmentHighlights) ||
      `与 ${target.name} 相关的研报线索。`,
    rawRef: `investoday:research:${stringValue(item.reportId) || target.code}:${index}`,
    rawPayload: item,
    normalizedPayload: pickPayload(item, [
      "guid",
      "reportId",
      "analystName",
      "author",
      "rating",
      "targetPrice",
      "orgName",
      "institutionName",
      "date",
      "publishDate",
      "coreViewpoint",
      "coreContent",
      "investmentOpportunity",
      "investmentRisk",
      "sentiment",
      "keyReason",
    ]),
    detailText: firstNonEmpty(
      item.content,
      item.fullText,
      item.abstract,
      item.coreViewpoint,
      item.coreContent,
      item.investmentHighlights
    ),
    sourceEndpoint: "report/research",
    fetchedAt: new Date(),
  };
}

function normalizeResearchSentimentItem(
  item: Record<string, unknown>,
  target: EnabledTarget,
  index: number
): AdapterBriefItem | null {
  const title = stringValue(item.title);
  if (!title) return null;
  return {
    kind: "research",
    title,
    source: stringValue(item.institutionName) || stringValue(item.orgName) || "研报数据",
    publishedAt: parseDateValue(item.date ?? item.publishDate),
    summary: firstNonEmpty(item.coreContent, item.analysisViewpoint, item.keyReason, `与 ${target.name} 相关的研报观点线索。`),
    rawRef: `investoday:research-sentiment:${stringValue(item.guid) || target.code}:${index}`,
    rawPayload: item,
    normalizedPayload: pickPayload(item, [
      "guid",
      "date",
      "title",
      "coreContent",
      "analysisViewpoint",
      "investmentOpportunity",
      "investmentRisk",
      "comScore",
      "sentiment",
      "keyReason",
      "sentimentAnalysis",
      "analysisFramework",
      "stockName",
      "stockCode",
      "minRelevance",
    ]),
    detailText: firstNonEmpty(item.coreContent, item.analysisViewpoint, item.investmentOpportunity, item.investmentRisk),
    sourceEndpoint: "research/sentiment",
    fetchedAt: new Date(),
  };
}

function parseJsonCandidates(stdout: string): Array<Record<string, unknown>> {
  const parsed = JSON.parse(stdout);
  if (Array.isArray(parsed)) return parsed.filter(isRecord);
  if (Array.isArray(parsed?.data)) return parsed.data.filter(isRecord);
  if (Array.isArray(parsed?.list)) return parsed.list.filter(isRecord);
  if (Array.isArray(parsed?.records)) return parsed.records.filter(isRecord);
  if (isRecord(parsed?.data)) return [parsed.data];
  if (isRecord(parsed)) return [parsed];
  return [];
}

function stockCodeOf(item: Record<string, unknown> | null | undefined) {
  return stringValue(item?.stockCode) || stringValue(item?.code) || stringValue(item?.id);
}

function stockNameOf(item: Record<string, unknown> | null | undefined) {
  return stringValue(item?.stockName) || stringValue(item?.name) || stringValue(item?.shortName);
}

function pickBestSector(items: Array<Record<string, unknown>>, code?: string, name?: string) {
  if (code) {
    return items.find((item) => stringValue(item.industryCode) === code || stringValue(item.code) === code) ?? items[0] ?? null;
  }
  if (name) {
    return (
      items.find((item) => stringValue(item.industryName) === name || stringValue(item.name) === name) ??
      items.find((item) => stringValue(item.industryName).includes(name) || name.includes(stringValue(item.industryName))) ??
      items[0] ??
      null
    );
  }
  return items[0] ?? null;
}

function stockRecordFromAlias(name: string, code: string) {
  return {
    stockCode: code,
    stockName: name,
    exchangeCode: code.startsWith("6") ? "SH" : "SZ",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickPayload(item: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, item[key]]).filter(([, value]) => value !== undefined));
}

function firstNonEmpty(...values: unknown[]) {
  return values.map(stringValue).find(Boolean) ?? "";
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseDateValue(value: unknown): Date {
  const text = stringValue(value);
  if (!text) return new Date();
  return new Date(text.replace(" ", "T"));
}

function toDateParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toDateTimeParam(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}
