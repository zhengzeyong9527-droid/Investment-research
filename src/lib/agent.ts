import type { AgentRunStatus, AgentStepStatus, EvidenceKind, SkillRunStatus } from "@/lib/types";
import {
  getSkillCatalog,
  getSkillCatalogItem,
  readSkillMarkdown,
  validateSkillInput,
  type SkillCatalogItem,
} from "@/lib/skill-catalog";

export type JsonRecord = Record<string, unknown>;

export type AgentRunRecord = {
  id: string;
  agentKey?: string;
  sessionId?: string | null;
  question: string;
  skillKey: string;
  status: AgentRunStatus;
  inputPayload: JsonRecord;
  promptPackage: string;
  outputJson?: JsonRecord | null;
  outputMarkdown?: string | null;
  error?: string | null;
};

export type EvidenceRecordInput = {
  kind: EvidenceKind;
  title: string;
  source: string;
  publishedAt?: Date | null;
  summary?: string;
  sourceEndpoint?: string;
  rawPayload?: unknown;
};

export type AgentRunRepository = {
  createAgentRun(data: {
    agentKey?: string;
    sessionId?: string | null;
    question: string;
    skillKey: string;
    triggerType?: string;
    status: AgentRunStatus;
    inputPayload: JsonRecord;
    promptPackage: string;
  }): Promise<AgentRunRecord>;
  updateAgentRun(
    id: string,
    data: Partial<{
      status: AgentRunStatus;
      skillKey: string;
      inputPayload: JsonRecord;
      outputMarkdown: string | null;
      outputJson: JsonRecord | null;
      error: string | null;
    }>
  ): Promise<Partial<AgentRunRecord> & { id: string }>;
  createAgentStep(data: {
    agentRunId: string;
    order: number;
    title: string;
    status: AgentStepStatus;
    message: string;
  }): Promise<{ id: string }>;
  createSkillRun(data: {
    agentRunId: string;
    skillKey: string;
    skillPath: string;
    status: SkillRunStatus;
    inputPayload: JsonRecord;
    promptPackage: string;
  }): Promise<{ id: string }>;
  updateSkillRun(
    id: string,
    data: Partial<{
      status: SkillRunStatus;
      outputMarkdown: string | null;
      outputHtml: string | null;
      error: string | null;
    }>
  ): Promise<{ id: string } & Record<string, unknown>>;
  listEvidenceForRun(agentRunId: string): Promise<EvidenceRecordInput[]>;
};

export type SkillRunner = {
  configured: boolean;
  runSkill(input: {
    skill: SkillCatalogItem;
    skillMarkdown: string;
    question: string;
    inputPayload: JsonRecord;
    evidence: EvidenceRecordInput[];
    promptPackage: string;
  }): Promise<{ outputMarkdown: string; outputHtml?: string | null }>;
};

export async function createAgentRunDraft(input: {
  question: string;
  inputPayload?: JsonRecord;
  skillKey?: string;
  repository: AgentRunRepository;
}) {
  const inputPayload = input.inputPayload ?? {};
  const skillKey = input.skillKey ?? inferSkillKey(input.question, inputPayload);
  const skill = getSkillCatalogItem(skillKey);
  validateSkillInput(skillKey, normalizeInputForSkill(skillKey, inputPayload, input.question));
  const promptPackage = buildPromptPackage({
    question: input.question,
    skill,
    inputPayload,
    evidence: [],
    skillMarkdown: "",
  });

  const agentRun = await input.repository.createAgentRun({
    question: input.question,
    skillKey,
    status: "created",
    inputPayload,
    promptPackage,
  });

  await input.repository.createAgentStep({
    agentRunId: agentRun.id,
    order: 1,
    title: "识别研究意图",
    status: "completed",
    message: `已选择 ${skill.name}`,
  });
  await input.repository.createSkillRun({
    agentRunId: agentRun.id,
    skillKey,
    skillPath: skill.skillPath,
    status: "pending",
    inputPayload,
    promptPackage,
  });

  return agentRun;
}

export async function executeAgentRun(input: {
  agentRun: Pick<AgentRunRecord, "id" | "question" | "skillKey" | "inputPayload" | "promptPackage">;
  repository: AgentRunRepository;
  runner: SkillRunner;
}) {
  if (!input.runner.configured) {
    return input.repository.updateAgentRun(input.agentRun.id, {
      status: "failed",
      error: "OpenAI API Key 未配置，已保留任务和提示包，但未执行真实分析。",
      outputMarkdown: null,
    });
  }

  const skill = getSkillCatalogItem(input.agentRun.skillKey);
  await input.repository.updateAgentRun(input.agentRun.id, { status: "running_skill", error: null });
  const evidence = await input.repository.listEvidenceForRun(input.agentRun.id);
  const skillMarkdown = await readSkillMarkdown(skill.key);
  const promptPackage = buildPromptPackage({
    question: input.agentRun.question,
    skill,
    inputPayload: input.agentRun.inputPayload,
    evidence,
    skillMarkdown,
  });

  try {
    const result = await input.runner.runSkill({
      skill,
      skillMarkdown,
      question: input.agentRun.question,
      inputPayload: input.agentRun.inputPayload,
      evidence,
      promptPackage,
    });
    return input.repository.updateAgentRun(input.agentRun.id, {
      status: "completed",
      outputMarkdown: result.outputMarkdown,
      error: null,
    });
  } catch (error) {
    return input.repository.updateAgentRun(input.agentRun.id, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      outputMarkdown: null,
    });
  }
}

export function inferSkillKey(question: string, inputPayload: JsonRecord = {}) {
  const text = `${question} ${Object.values(inputPayload).join(" ")}`;
  if (/盘面|大盘|市场环境|早盘|午盘|盘中|收盘|行情播报/.test(text)) return "investoday-stock-market-broadcast";
  if (/解套|被套|亏损|仓位/.test(text)) return "investoday-ai-unwind-advisor";
  if (/行业|板块|主题|产业链|赛道/.test(text)) return "investoday-industry-chief-analyst";
  if (/成长|PEG|景气|六维/.test(text)) return "gs-growth-master-strategy";
  if (/研报|评级|目标价|机构|观点/.test(text)) return "investoday-research-report-analysis";
  return "investoday-stock-research-interpretation";
}

export function buildPromptPackage(input: {
  question: string;
  skill: SkillCatalogItem;
  inputPayload: JsonRecord;
  evidence: EvidenceRecordInput[];
  skillMarkdown: string;
}) {
  return [
    `# Agent Skill: ${input.skill.key}`,
    "",
    "## 用户问题",
    input.question,
    "",
    "## 输入参数",
    JSON.stringify(input.inputPayload, null, 2),
    "",
    "## 证据记录",
    input.evidence.length > 0 ? JSON.stringify(input.evidence, null, 2) : "暂无已保存证据，执行器应通过数据适配层补充。",
    "",
    "## 合规边界",
    input.skill.compliance.map((item) => `- ${item}`).join("\n"),
    "",
    "## 本地 Skill 说明",
    input.skillMarkdown || `执行时读取 ${input.skill.skillPath}`,
  ].join("\n");
}

export function normalizeInputForSkill(skillKey: string, inputPayload: JsonRecord, question: string) {
  if (skillKey === "investoday-research-report-analysis" || skillKey === "investoday-stock-research-interpretation") {
    return {
      ...inputPayload,
      stockCodeOrName: inputPayload.stockCodeOrName ?? inputPayload.stockCode ?? inputPayload.name ?? extractStockCode(question),
    };
  }
  if (skillKey === "investoday-industry-chief-analyst") {
    return { ...inputPayload, industryName: inputPayload.industryName ?? inputPayload.subject ?? question };
  }
  if (skillKey === "gs-growth-master-strategy") {
    return { ...inputPayload, subject: inputPayload.subject ?? inputPayload.stockCode ?? extractStockCode(question) ?? question };
  }
  if (skillKey === "investoday-stock-market-broadcast") {
    return { ...inputPayload, sessionType: inputPayload.sessionType ?? "auto", question };
  }
  return inputPayload;
}

export function skillCatalogForAgent() {
  return getSkillCatalog().map(({ key, name, description, requiredInputs }) => ({
    key,
    name,
    description,
    requiredInputs,
  }));
}

function extractStockCode(text: string) {
  return text.match(/\b\d{6}\b/)?.[0];
}
