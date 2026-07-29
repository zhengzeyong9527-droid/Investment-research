import { readFile } from "node:fs/promises";
import path from "node:path";

export type SkillInputField = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "boolean";
  required: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
};

export type SkillCatalogItem = {
  key: string;
  name: string;
  shortName: string;
  description: string;
  scenario: string;
  scope: "stock" | "sector" | "event" | "brief";
  status: "enabled";
  outputType: "markdown" | "markdown_html";
  riskLevel: "normal" | "high";
  skillPath: string;
  requiredInputs: SkillInputField[];
  optionalInputs: SkillInputField[];
  compliance: string[];
};

export const localSkillCatalog: SkillCatalogItem[] = [
  {
    key: "investoday-stock-market-broadcast",
    name: "盘面行情播报 Agent",
    shortName: "盘面播报",
    description: "基于市场宽度、主要指数、行业主题和资讯催化，生成非操作性的 A 股盘面行情播报。",
    scenario: "适用于当日大盘页的早盘、午盘、盘中和收盘后市场环境解读。",
    scope: "brief",
    status: "enabled",
    outputType: "markdown",
    riskLevel: "normal",
    skillPath: "skills/investoday-stock-market-broadcast/SKILL.md",
    requiredInputs: [],
    optionalInputs: [
      {
        key: "sessionType",
        label: "市场阶段",
        type: "select",
        required: false,
        options: [
          { label: "自动判断", value: "auto" },
          { label: "早盘", value: "morning" },
          { label: "午盘", value: "midday" },
          { label: "盘中", value: "intraday" },
          { label: "收盘后", value: "after_close" },
        ],
      },
      focusField(),
    ],
    compliance: [
      ...commonCompliance(),
      "不得输出买卖点、交易时机、仓位建议、目标价、止盈止损或短线交易信号。",
    ],
  },
  {
    key: "investoday-research-report-analysis",
    name: "研报解读 Agent",
    shortName: "研报解读",
    description: "读取个股或行业研报证据，整理机构观点、共识分歧、评级目标价口径和观察变量。",
    scenario: "适用于股票代码/名称驱动的研报解读、研报变化追踪和评级预测梳理。",
    scope: "stock",
    status: "enabled",
    outputType: "markdown_html",
    riskLevel: "normal",
    skillPath: "skills/investoday-research-report-analysis/SKILL.md",
    requiredInputs: [stockCodeOrNameField()],
    optionalInputs: [timeWindowField(), focusField()],
    compliance: commonCompliance(),
  },
  {
    key: "investoday-stock-research-interpretation",
    name: "公司研究 Agent",
    shortName: "公司研究",
    description: "围绕公司基础信息、研报舆情、业务主题和风险因素生成个股研究报告。",
    scenario: "适用于单只 A 股公司的研究画像、近期观点复盘和后续跟踪框架。",
    scope: "stock",
    status: "enabled",
    outputType: "markdown_html",
    riskLevel: "normal",
    skillPath: "skills/investoday-stock-research-interpretation/SKILL.md",
    requiredInputs: [stockCodeOrNameField()],
    optionalInputs: [timeWindowField(), focusField()],
    compliance: commonCompliance(),
  },
  {
    key: "investoday-industry-chief-analyst",
    name: "行业首席 Agent",
    shortName: "行业首席",
    description: "面向行业、板块、主题和产业链，输出行业定义、景气度、竞争格局、公司池和风险框架。",
    scenario: "适用于板块解读、主题拆解、产业链研究和行业比较。",
    scope: "sector",
    status: "enabled",
    outputType: "markdown_html",
    riskLevel: "normal",
    skillPath: "skills/investoday-industry-chief-analyst/SKILL.md",
    requiredInputs: [
      { key: "industryName", label: "行业/板块/主题", type: "text", required: true, placeholder: "如 半导体 / AI算力 / 白酒" },
    ],
    optionalInputs: [
      {
        key: "module",
        label: "分析模块",
        type: "select",
        required: false,
        options: [
          { label: "完整行业报告", value: "full" },
          { label: "景气度", value: "prosperity" },
          { label: "公司池", value: "company_pool" },
          { label: "估值与盈利", value: "valuation_profit" },
        ],
      },
      focusField(),
    ],
    compliance: commonCompliance(),
  },
  {
    key: "gs-growth-master-strategy",
    name: "成长大师 Agent",
    shortName: "成长大师",
    description: "按成长投资框架评估股票或行业，覆盖能力圈、生命周期、景气度、盈利预测、PEG 和成长股特征。",
    scenario: "适用于成长股研究、行业成长性判断和六维框架复盘。",
    scope: "stock",
    status: "enabled",
    outputType: "markdown_html",
    riskLevel: "normal",
    skillPath: "skills/gs-growth-master-strategy/SKILL.md",
    requiredInputs: [
      { key: "subject", label: "股票/行业", type: "text", required: true, placeholder: "如 600519 / 宁德时代 / AI算力" },
    ],
    optionalInputs: [
      {
        key: "depth",
        label: "分析深度",
        type: "select",
        required: false,
        options: [
          { label: "轻量版", value: "light" },
          { label: "六维完整版", value: "full" },
        ],
      },
    ],
    compliance: commonCompliance(),
  },
  {
    key: "investoday-ai-unwind-advisor",
    name: "AI 解套顾问 Agent",
    shortName: "解套顾问",
    description: "在明确亏损幅度和仓位比例后，从技术、基本面、舆情、行业轮动与风险控制角度做解套复盘。",
    scenario: "适用于被套股票的研究辅助和风险复盘。该功能不输出确定性买卖点。",
    scope: "stock",
    status: "enabled",
    outputType: "markdown",
    riskLevel: "high",
    skillPath: "skills/investoday-ai-unwind-advisor/SKILL.md",
    requiredInputs: [
      { key: "stockCode", label: "股票代码", type: "text", required: true, placeholder: "如 600519" },
      { key: "lossPercent", label: "亏损幅度(%)", type: "number", required: true, placeholder: "1-99" },
      { key: "positionPercent", label: "仓位比例(%)", type: "number", required: true, placeholder: "1-100" },
    ],
    optionalInputs: [focusField()],
    compliance: [
      ...commonCompliance(),
      "缺少股票代码、亏损幅度或仓位比例时必须停止执行。",
      "不得输出确定买点、卖点、仓位调整比例、止盈止损或收益承诺。",
    ],
  },
];

export function getSkillCatalog() {
  return localSkillCatalog;
}

export function getSkillCatalogItem(key: string) {
  const skill = localSkillCatalog.find((item) => item.key === key);
  if (!skill) {
    throw new Error("未知 skill 功能");
  }
  return skill;
}

export function validateSkillInput(skillKey: string, input: Record<string, unknown>) {
  const skill = getSkillCatalogItem(skillKey);
  for (const field of skill.requiredInputs) {
    const value = input[field.key];
    if (value === undefined || value === null || String(value).trim() === "") {
      throw new Error(`${field.label.replace(/\(.+\)/, "")}为必填项`);
    }
  }

  if (skillKey === "investoday-ai-unwind-advisor") {
    assertNumberRange(input.lossPercent, "亏损幅度", 1, 99);
    assertNumberRange(input.positionPercent, "仓位比例", 1, 100);
    const stockCode = String(input.stockCode ?? "").trim();
    if (!/^\d{6}$/.test(stockCode)) {
      throw new Error("股票代码必须是 6 位数字");
    }
  }

  return input;
}

export async function readSkillMarkdown(skillKey: string) {
  const skill = getSkillCatalogItem(skillKey);
  return readFile(path.join(process.cwd(), skill.skillPath), "utf8");
}

function stockCodeOrNameField(): SkillInputField {
  return { key: "stockCodeOrName", label: "股票代码/名称", type: "text", required: true, placeholder: "如 600519 或 贵州茅台" };
}

function timeWindowField(): SkillInputField {
  return {
    key: "timeWindowDays",
    label: "时间窗口",
    type: "select",
    required: false,
    options: [
      { label: "近 30 天", value: "30" },
      { label: "近 90 天", value: "90" },
      { label: "近 180 天", value: "180" },
    ],
  };
}

function focusField(): SkillInputField {
  return { key: "focus", label: "关注问题", type: "textarea", required: false, placeholder: "可填写你特别想追问的研究问题" };
}

function commonCompliance() {
  return [
    "仅做信息整理、研究辅助、风险提示和观察维度。",
    "不得输出买卖点、仓位建议、止盈止损、目标收益或交易时机。",
    "机构评级和目标价仅作为机构研报口径展示，不改写为产品建议。",
  ];
}

function assertNumberRange(value: unknown, label: string, min: number, max: number) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < min || numberValue > max) {
    throw new Error(`${label}必须在 ${min}-${max} 之间`);
  }
}
