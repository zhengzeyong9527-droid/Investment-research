import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { AnalysisRepository } from "@/lib/analysis";
import { createAnalysisPlaceholder } from "@/lib/analysis";
import { createAgentRunDraft, executeAgentRun, type AgentRunRepository } from "@/lib/agent";
import type { DailyBriefRepository } from "@/lib/briefs";
import { generateDailyBrief } from "@/lib/briefs";
import {
  checkInvestodayHealth,
  InvestodayDataAdapter,
  resolveCliInvocation,
} from "@/lib/investoday";
import { buildBriefItemDisplay, buildReadableField, cleanDisplayText, splitDisplayBlocks } from "@/lib/display";
import { getSkillCatalog, validateSkillInput } from "@/lib/skill-catalog";
import type { BriefDraft } from "@/lib/types";
import { buildWatchTargetRepairPlan, normalizeWatchTargetForSave, parseWatchTargetInput } from "@/lib/watch-targets";

describe("watch target validation", () => {
  it("rejects watch targets without a name or code", () => {
    expect(() =>
      parseWatchTargetInput({ type: "stock", code: "", name: "   ", tags: "", reason: "" })
    ).toThrow("名称和代码不能为空");
  });

  it("normalizes tags and keeps A-share or sector targets enabled by default", () => {
    const parsed = parseWatchTargetInput({
      type: "sector",
      code: " sw801080 ",
      name: " 电子 ",
      tags: "AI, 半导体，景气跟踪",
      reason: " 重点跟踪库存周期 ",
    });

    expect(parsed).toEqual({
      type: "sector",
      code: "SW801080",
      name: "电子",
      tags: ["AI", "半导体", "景气跟踪"],
      reason: "重点跟踪库存周期",
      enabled: true,
    });
  });
});

describe("daily brief generation", () => {
  it("updates the same brief date instead of creating duplicate daily briefs", async () => {
    const savedBriefs: BriefDraft[] = [];
    const repository: DailyBriefRepository = {
      async listEnabledTargets() {
        return [{ id: "target-1", type: "stock" as const, code: "600519", name: "贵州茅台" }];
      },
      async upsertBrief(brief) {
        const existingIndex = savedBriefs.findIndex((item) => item.briefDate === brief.briefDate);
        if (existingIndex >= 0) {
          savedBriefs[existingIndex] = brief;
        } else {
          savedBriefs.push(brief);
        }
        return { id: "brief-1", ...brief };
      },
    };
    const adapter = {
      async fetchBriefItems() {
        return [
          {
            kind: "news" as const,
            title: "白酒板块库存周期出现新变化",
            source: "新闻数据",
            publishedAt: new Date("2026-07-23T01:00:00.000Z"),
            summary: "自选股相关产业新闻摘要。",
            rawRef: "investoday:news:1",
            normalizedPayload: { newsLevel: 1 },
          },
        ];
      },
    };

    await generateDailyBrief({
      briefDate: "2026-07-23",
      now: new Date("2026-07-23T02:00:00.000Z"),
      windowHours: 24,
      repository,
      adapter,
    });
    await generateDailyBrief({
      briefDate: "2026-07-23",
      now: new Date("2026-07-23T03:00:00.000Z"),
      windowHours: 24,
      repository,
      adapter,
    });

    expect(savedBriefs).toHaveLength(1);
    expect(savedBriefs[0].status).toBe("success");
    expect(savedBriefs[0].items).toHaveLength(1);
  });

  it("creates an empty successful brief when no data is returned", async () => {
    const repository: DailyBriefRepository = {
      async listEnabledTargets() {
        return [{ id: "target-1", type: "sector" as const, code: "SW801080", name: "电子" }];
      },
      async upsertBrief(brief) {
        return { id: "brief-empty", ...brief };
      },
    };
    const adapter = {
      async fetchBriefItems() {
        return [];
      },
    };

    const brief = await generateDailyBrief({
      briefDate: "2026-07-23",
      now: new Date("2026-07-23T02:00:00.000Z"),
      windowHours: 24,
      repository,
      adapter,
    });

    expect(brief.status).toBe("empty");
    expect(brief.summary).toContain("未获取到匹配内容");
    expect(brief.items).toEqual([]);
  });

  it("keeps only level 1 news while preserving research and announcements", async () => {
    const savedBriefs: BriefDraft[] = [];
    const repository: DailyBriefRepository = {
      async listEnabledTargets() {
        return [{ id: "target-1", type: "stock" as const, code: "600519", name: "贵州茅台" }];
      },
      async upsertBrief(brief) {
        savedBriefs.push(brief);
        return { id: "brief-filtered", ...brief };
      },
    };
    const adapter = {
      async fetchBriefItems() {
        return [
          {
            kind: "news" as const,
            title: "重要新闻",
            source: "新闻数据",
            publishedAt: new Date("2026-07-23T01:00:00.000Z"),
            summary: "重要新闻摘要。",
            rawRef: "investoday:news:1",
            normalizedPayload: { newsLevel: 1 },
          },
          {
            kind: "news" as const,
            title: "普通新闻",
            source: "新闻数据",
            publishedAt: new Date("2026-07-23T01:10:00.000Z"),
            summary: "普通新闻摘要。",
            rawRef: "investoday:news:2",
            normalizedPayload: { newsLevel: 2 },
          },
          {
            kind: "research" as const,
            title: "研报线索",
            source: "示例证券",
            publishedAt: new Date("2026-07-23T01:20:00.000Z"),
            summary: "研报摘要。",
            rawRef: "investoday:research:1",
          },
          {
            kind: "announcement" as const,
            title: "公告线索",
            source: "交易所公告",
            publishedAt: new Date("2026-07-23T01:30:00.000Z"),
            summary: "公告摘要。",
            rawRef: "investoday:announcement:1",
          },
        ];
      },
    };

    const brief = await generateDailyBrief({
      briefDate: "2026-07-23",
      now: new Date("2026-07-23T02:00:00.000Z"),
      windowHours: 24,
      repository,
      adapter,
    });

    const filteredItems = brief.items as Array<{ title: string }>;

    expect(filteredItems.map((item) => item.title)).toEqual(["重要新闻", "研报线索", "公告线索"]);
    expect(savedBriefs[0].summary).toContain("新闻 1 条、研报 1 条、公告 1 条");
  });
});

describe("skill analysis placeholders", () => {
  it("stores context for pending skill entries without running real analysis", async () => {
    const repository: AnalysisRepository = {
      async getSkillEntry(key: string) {
        return {
          key,
          name: "热点事件解码",
          status: "pending" as const,
          scope: "event" as const,
        };
      },
      async createRun(data) {
        return { id: "run-1", ...data };
      },
    };

    const run = await createAnalysisPlaceholder({
      skillKey: "event-decoder",
      targetId: "target-1",
      briefItemId: "item-1",
      dailyBriefId: "brief-1",
      context: { targetName: "贵州茅台", title: "重点新闻" },
      repository,
    });

    expect(run.status).toBe("pending");
    expect(run.output).toBeNull();
    expect(run.inputContext).toContain("贵州茅台");
  });
});

describe("investoday health check", () => {
  it("uses the npm package bin for investoday-api on Windows to preserve spaced arguments", () => {
    expect(
      resolveCliInvocation(
        "investoday-api",
        ["search-api", "query=贵州茅台 600519 新闻"],
        "win32",
        "C:\\Users\\me\\AppData\\Roaming",
        "node.exe",
        "",
        ""
      )
    ).toEqual({
      command: "node.exe",
      args: [
        "C:\\Users\\me\\AppData\\Roaming\\npm\\node_modules\\@investoday\\investoday-api\\bin\\investoday-api.js",
        "search-api",
        "query=贵州茅台 600519 新闻",
      ],
      shell: false,
    });
  });

  it("uses pnpm global package bin when the npm appdata install is absent", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "investoday-api-"));
    try {
      const localAppData = path.join(root, "Local");
      const binDir = path.join(
        localAppData,
        "pnpm",
        "global",
        "v11",
        "install-id",
        "node_modules",
        "@investoday",
        "investoday-api",
        "bin"
      );
      const binPath = path.join(binDir, "investoday-api.js");
      mkdirSync(binDir, { recursive: true });
      writeFileSync(binPath, "");

      expect(
        resolveCliInvocation("investoday-api", ["list"], "win32", path.join(root, "Roaming"), "node.exe", localAppData, "")
      ).toEqual({
        command: "node.exe",
        args: [binPath, "list"],
        shell: false,
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports healthy when the CLI responds", async () => {
    const run = vi.fn().mockResolvedValue({ ok: true, stdout: "investoday-api", stderr: "" });

    await expect(checkInvestodayHealth(run)).resolves.toEqual({
      ok: true,
      message: "investoday-api 可用",
    });
    expect(run).toHaveBeenCalledWith("investoday-api", ["list"]);
  });

  it("reports a readable error when the CLI is unavailable", async () => {
    const run = vi.fn().mockResolvedValue({ ok: false, stdout: "", stderr: "not found" });

    await expect(checkInvestodayHealth(run)).resolves.toEqual({
      ok: false,
      message: "investoday-api 不可用：not found",
    });
  });
});

describe("stock code quick add", () => {
  it("resolves a six digit stock code through stock basic info", async () => {
    const run = vi.fn().mockResolvedValue({
      ok: true,
      stdout: JSON.stringify({
        data: [{ stockCode: "600519", stockName: "贵州茅台", exchangeCode: "SH", boardName: "主板" }],
      }),
      stderr: "",
    });
    const adapter = new InvestodayDataAdapter(run);

    await expect(adapter.resolveStockByCode("600519")).resolves.toEqual({
      type: "stock",
      code: "600519",
      name: "贵州茅台",
      tags: ["SH", "主板"],
      reason: "",
      enabled: true,
    });
    expect(run).toHaveBeenCalledWith("investoday-api", [
      "stock/basic-info",
      "--method",
      "POST",
      "--body-json",
      JSON.stringify({ stockCode: "600519", pageNum: 1, pageSize: 10 }),
    ]);
  });

  it("rejects non six digit stock code resolution", async () => {
    const adapter = new InvestodayDataAdapter(vi.fn());

    await expect(adapter.resolveStockByCode("60051A")).rejects.toThrow("股票代码必须是 6 位数字");
  });

  it("resolves stock names by scanning the stock list", async () => {
    const run = vi.fn().mockResolvedValue({
      ok: true,
      stdout: JSON.stringify({
        data: [
          { stockCode: "000001", stockName: "平安银行", exchangeCode: "SZ", boardName: "主板" },
          { stockCode: "600519", stockName: "贵州茅台", exchangeCode: "SH", boardName: "主板" },
        ],
      }),
      stderr: "",
    });
    const adapter = new InvestodayDataAdapter(run);

    await expect(adapter.resolveStock({ name: "贵州茅台" })).resolves.toMatchObject({
      type: "stock",
      code: "600519",
      name: "贵州茅台",
    });
  });

  it("resolves stock names through search before falling back to the stock list", async () => {
    const run = vi.fn().mockImplementation(async (_command: string, args: string[]) => {
      if (args[0] === "search") {
        return {
          ok: true,
          stdout: JSON.stringify([{ code: "002756", shortName: "永兴材料", mkt: "SZ" }]),
          stderr: "",
        };
      }
      return { ok: true, stdout: JSON.stringify({ data: [] }), stderr: "" };
    });
    const adapter = new InvestodayDataAdapter(run);

    await expect(adapter.resolveStock({ name: "永兴材料" })).resolves.toMatchObject({
      type: "stock",
      code: "002756",
      name: "永兴材料",
    });
    expect(run).toHaveBeenCalledWith("investoday-api", ["search", "key=永兴材料", "type=11"]);
  });

  it("rejects an unknown stock name instead of saving a pending pseudo code", async () => {
    const run = vi.fn().mockResolvedValue({ ok: false, stdout: "", stderr: "invalid api" });
    const adapter = new InvestodayDataAdapter(run);
    await expect(adapter.resolveStock({ name: "暂未收录股票" })).rejects.toThrow("未能从数据接口识别股票名称");
    return;

    await expect(adapter.resolveStock({ name: "暂未收录股票" })).resolves.toEqual({
      type: "stock",
      code: "NAME:暂未收录股票",
      name: "暂未收录股票",
      tags: ["名称待解析"],
      reason: "",
      enabled: true,
    });
  });

  it("fails unknown stock names without creating NAME pseudo codes", async () => {
    const run = vi.fn().mockResolvedValue({ ok: false, stdout: "", stderr: "invalid api" });
    const adapter = new InvestodayDataAdapter(run);

    await expect(adapter.resolveStock({ name: "暂未收录股票" })).rejects.toThrow("未能从数据接口识别股票名称");
  });

  it("resolves sector names through industries", async () => {
    const run = vi.fn().mockResolvedValue({
      ok: true,
      stdout: JSON.stringify([{ industryCode: "340500", industryName: "白酒Ⅱ", industryType: "INDUS4_CL" }]),
      stderr: "",
    });
    const adapter = new InvestodayDataAdapter(run);

    await expect(adapter.resolveSector({ name: "白酒" })).resolves.toMatchObject({
      type: "sector",
      code: "340500",
      name: "白酒Ⅱ",
    });
  });
});

describe("watch target save normalization", () => {
  it("allows stock code or name as alternatives when saving a watch target", async () => {
    const resolver = {
      resolveStock: vi.fn().mockResolvedValue({
        type: "stock" as const,
        code: "600519",
        name: "贵州茅台",
        tags: ["SH"],
        reason: "",
        enabled: true,
      }),
      resolveSector: vi.fn(),
    };

    await expect(
      normalizeWatchTargetForSave({ type: "stock", code: "", name: "贵州茅台", tags: "", reason: "长期跟踪" }, resolver)
    ).resolves.toMatchObject({
      code: "600519",
      name: "贵州茅台",
      reason: "长期跟踪",
    });
    expect(resolver.resolveStock).toHaveBeenCalledWith({ name: "贵州茅台" });
  });

  it("treats text entered in the code field as a stock name when it is not a six digit code", async () => {
    const resolver = {
      resolveStock: vi.fn().mockResolvedValue({
        type: "stock" as const,
        code: "600519",
        name: "贵州茅台",
        tags: [],
        reason: "",
        enabled: true,
      }),
      resolveSector: vi.fn(),
    };

    await normalizeWatchTargetForSave({ type: "stock", code: "贵州茅台", name: "" }, resolver);

    expect(resolver.resolveStock).toHaveBeenCalledWith({ name: "贵州茅台" });
  });

  it("allows sector code or name as alternatives when saving a watch target", async () => {
    const resolver = {
      resolveStock: vi.fn(),
      resolveSector: vi.fn().mockResolvedValue({
        type: "sector" as const,
        code: "340500",
        name: "白酒Ⅱ",
        tags: ["INDUS4_CL"],
        reason: "",
        enabled: true,
      }),
    };

    await expect(
      normalizeWatchTargetForSave({ type: "sector", code: "白酒", name: "" }, resolver)
    ).resolves.toMatchObject({
      code: "340500",
      name: "白酒Ⅱ",
    });
    expect(resolver.resolveSector).toHaveBeenCalledWith({ name: "白酒" });
  });
});

describe("watch target repair", () => {
  it("merges a pending-name target into an existing resolved target", () => {
    const plan = buildWatchTargetRepairPlan(
      {
        id: "pending-1",
        type: "stock",
        code: "NAME:永兴材料",
        name: "永兴材料",
        tags: ["锂电"],
        reason: "关注材料价格",
        enabled: true,
      },
      {
        type: "stock",
        code: "002756",
        name: "永兴材料",
        tags: ["SZ", "主板"],
        reason: "",
        enabled: true,
      },
      [
        {
          id: "real-1",
          type: "stock",
          code: "002756",
          name: "永兴材料",
          tags: ["新能源"],
          reason: "已有关注",
          enabled: true,
        },
      ]
    );

    expect(plan).toEqual({
      action: "merge",
      fromId: "pending-1",
      intoId: "real-1",
      input: {
        type: "stock",
        code: "002756",
        name: "永兴材料",
        tags: ["新能源", "锂电", "SZ", "主板"],
        reason: "已有关注，关注材料价格",
        enabled: true,
      },
    });
  });
});

describe("brief source payload preservation", () => {
  it("keeps raw and normalized payload fields when normalizing research items", async () => {
    const rawReport = {
      reportId: "r-1",
      title: "贵州茅台深度跟踪",
      orgName: "示例证券",
      publishDate: "2026-07-23 08:00:00",
      analystName: "研究员A",
      rating: "买入",
      targetPrice: "2100",
      coreViewpoint: "渠道库存与价格体系为主要观察变量。",
      content: "这是一段完整研报内容。",
    };
    const run = vi.fn().mockImplementation(async (_command: string, args: string[]) => {
      if (args[0] === "report/research") {
        return { ok: true, stdout: JSON.stringify({ data: [rawReport] }), stderr: "" };
      }
      return { ok: true, stdout: "[]", stderr: "" };
    });
    const adapter = new InvestodayDataAdapter(run);

    const items = await adapter.fetchBriefItems({
      target: { id: "target-1", type: "stock", code: "600519", name: "贵州茅台" },
      windowStart: new Date("2026-07-22T00:00:00.000Z"),
      windowEnd: new Date("2026-07-23T00:00:00.000Z"),
    });

    expect(items).toHaveLength(1);
    expect(items[0].rawPayload).toEqual(rawReport);
    expect(items[0].normalizedPayload).toMatchObject({
      analystName: "研究员A",
      rating: "买入",
      targetPrice: "2100",
    });
    expect(items[0].detailText).toContain("完整研报内容");
    expect(items[0].sourceEndpoint).toBe("report/research");
  });
});

describe("brief item display mapping", () => {
  it("cleans markdown and html residue before rendering display text", () => {
    const cleaned = cleanDisplayText("- **需求复苏不及预期**：业绩可能承压。<br/>- **技术迭代加速**：可能带来竞争压力。\\br");

    expect(cleaned).toContain("需求复苏不及预期");
    expect(cleaned).toContain("技术迭代加速");
    expect(cleaned).not.toMatch(/\*\*|<br|\\br|^- /);
  });

  it("turns numbered and bullet style text into structured readable fields", () => {
    const riskField = buildReadableField(
      "风险提示",
      "- **需求复苏不及预期**：业绩可能承压。<br/>- **技术迭代加速**：可能带来竞争压力。"
    );
    const viewField = buildReadableField(
      "研报观点",
      "1. **政策驱动需求释放**：离网电源需求刚需。<br/>2. **技术适配性卓越**：降低转换损耗。"
    );

    expect(riskField).toMatchObject({ kind: "bullets", items: ["需求复苏不及预期：业绩可能承压。", "技术迭代加速：可能带来竞争压力。"] });
    expect(viewField).toMatchObject({ kind: "ordered", items: ["政策驱动需求释放：离网电源需求刚需。", "技术适配性卓越：降低转换损耗。"] });
    expect(viewField).not.toBeNull();
    if (!viewField) throw new Error("expected view field");
    expect(splitDisplayBlocks(viewField.items?.join("\n") ?? "").items).toHaveLength(2);
  });

  it("translates news payload fields into Chinese product labels", () => {
    const display = buildBriefItemDisplay({
      kind: "news",
      title: "永兴材料发布重要新闻",
      source: "新闻数据",
      publishedAt: new Date("2026-07-23T08:00:00.000Z"),
      summary: "摘要内容",
      rawRef: "internal",
      rawPayload: {
        newsId: 1,
        newsType: 3,
        newsLevel: 1,
        sentiment: 5,
        sentimentScore: 3.2,
        relevance: 5,
        keyPoints: "关键要点",
        impactAnalysis: "影响分析",
        investmentOpportunity: "机会线索",
        investmentRisk: "风险提示",
      },
      normalizedPayload: {},
      detailText: "",
      sourceEndpoint: "news/entity-related",
    });

    expect(display).toMatchObject({
      sentimentValue: 5,
      sentimentLabel: "利好",
      newsLevelValue: 1,
      newsLevelLabel: "重要",
      newsTypeValue: 3,
      newsTypeLabel: "公司",
      relevance: 5,
      sentimentScore: 3.2,
    });
    const rendered = JSON.stringify(display);
    expect(rendered).toContain("关键要点");
    expect(rendered).toContain("机会线索");
    expect(rendered).not.toContain("news/entity-related");
    expect(rendered).not.toContain('"sentiment":');
    expect(rendered).not.toContain('"newsLevel":');
  });
});

describe("local skill catalog", () => {
  it("registers the six local skills as product features", () => {
    expect(getSkillCatalog().map((skill) => skill.key)).toEqual([
      "investoday-stock-market-broadcast",
      "investoday-research-report-analysis",
      "investoday-stock-research-interpretation",
      "investoday-industry-chief-analyst",
      "gs-growth-master-strategy",
      "investoday-ai-unwind-advisor",
    ]);
  });

  it("requires unwind depth and position ratio for the unwind advisor", () => {
    expect(() =>
      validateSkillInput("investoday-ai-unwind-advisor", { stockCode: "600519", lossPercent: "18" })
    ).toThrow("仓位比例为必填项");
  });
});

describe("agent orchestration", () => {
  it("creates a run draft and routes report questions to the research report skill", async () => {
    const repository: AgentRunRepository = {
      async createAgentRun(data) {
        return { id: "agent-1", ...data };
      },
      async createAgentStep(data) {
        return { id: "step-1", ...data };
      },
      async createSkillRun(data) {
        return { id: "skill-run-1", ...data };
      },
      async listEvidenceForRun() {
        return [];
      },
      async updateAgentRun() {
        throw new Error("not needed");
      },
      async updateSkillRun() {
        throw new Error("not needed");
      },
    };

    const run = await createAgentRunDraft({
      question: "帮我解读一下 600519 最近研报变化",
      inputPayload: { stockCode: "600519" },
      repository,
    });

    expect(run.skillKey).toBe("investoday-research-report-analysis");
    expect(run.status).toBe("created");
    expect(run.promptPackage).toContain("investoday-research-report-analysis");
  });

  it("creates a quick report run when the homepage supplies a stock context", async () => {
    const repository: AgentRunRepository = {
      async createAgentRun(data) {
        return { id: "agent-quick", ...data };
      },
      async createAgentStep(data) {
        return { id: "step-quick", ...data };
      },
      async createSkillRun(data) {
        return { id: "skill-run-quick", ...data };
      },
      async listEvidenceForRun() {
        return [];
      },
      async updateAgentRun() {
        throw new Error("not needed");
      },
      async updateSkillRun() {
        throw new Error("not needed");
      },
    };

    const run = await createAgentRunDraft({
      question: "梳理今日自选池研报观点",
      inputPayload: { stockCodeOrName: "600519" },
      repository,
    });

    expect(run.status).toBe("created");
    expect(run.skillKey).toBe("investoday-research-report-analysis");
  });

  it("does not execute a real skill when OpenAI API key is missing", async () => {
    const repository: AgentRunRepository = {
      async createAgentRun(data) {
        return { id: "agent-1", ...data };
      },
      async createAgentStep(data) {
        return { id: "step-1", ...data };
      },
      async createSkillRun(data) {
        return { id: "skill-run-1", ...data };
      },
      async listEvidenceForRun() {
        return [];
      },
      async updateAgentRun(id, data) {
        return { id, ...data };
      },
      async updateSkillRun(id, data) {
        return { id, ...data };
      },
    };

    await expect(
      executeAgentRun({
        agentRun: {
          id: "agent-1",
          question: "分析 600519",
          skillKey: "investoday-stock-research-interpretation",
          inputPayload: { stockCode: "600519" },
          promptPackage: "prompt",
        },
        repository,
        runner: { configured: false, async runSkill() { throw new Error("should not run"); } },
      })
    ).resolves.toMatchObject({ status: "failed" });
  });
});
