import type { JsonRecord } from "@/lib/agent";
import type { ResolvedAgentEntities, ResolvedEntity } from "@/agents/entity-resolver";

export type PrimaryIntent =
  | "unwind_advice"
  | "stock_research"
  | "industry_research"
  | "market_broadcast"
  | "report_analysis"
  | "growth_analysis";

export type SecondaryIntent =
  | "company_context"
  | "industry_context"
  | "concept_trend"
  | "report_evidence"
  | "market_context"
  | "memory_context";

export type ExecutionMode = "single_skill" | "primary_with_tools" | "primary_with_supporting_skills";

export type IntentPlan = {
  primaryIntent: PrimaryIntent;
  primarySkillKey: string;
  secondaryIntents: SecondaryIntent[];
  entities: {
    stock?: ResolvedEntity;
    industry?: ResolvedEntity;
    concept?: ResolvedEntity;
    fund?: ResolvedEntity;
  };
  requiredInputs: string[];
  executionMode: ExecutionMode;
  reason: string;
};

export function planMultiIntent(input: {
  question: string;
  inputPayload: JsonRecord;
  resolvedEntities: Partial<ResolvedAgentEntities>;
  forcedSkillKey?: string;
}): IntentPlan {
  const text = `${input.question} ${Object.values(input.inputPayload).join(" ")}`;
  const primaryIntent = input.forcedSkillKey ? intentFromSkill(input.forcedSkillKey) : inferPrimaryIntent(text, input.resolvedEntities);
  const primarySkillKey = input.forcedSkillKey || skillFromIntent(primaryIntent);
  const secondaryIntents = inferSecondaryIntents(text, input.resolvedEntities, primaryIntent);
  return {
    primaryIntent,
    primarySkillKey,
    secondaryIntents,
    entities: {
      stock: input.resolvedEntities.stock,
      industry: input.resolvedEntities.industry,
      concept: input.resolvedEntities.concept,
      fund: input.resolvedEntities.fund,
    },
    requiredInputs: requiredInputsForIntent(primaryIntent),
    executionMode: secondaryIntents.length > 0 ? "primary_with_tools" : "single_skill",
    reason: buildReason(primaryIntent, secondaryIntents),
  };
}

function inferPrimaryIntent(text: string, entities: Partial<ResolvedAgentEntities>): PrimaryIntent {
  if (/盘面|大盘|市场环境|早盘|午盘|盘中|收盘|行情播报/.test(text)) return "market_broadcast";
  if (/解套|被套|亏损|仓位|浮亏|套了/.test(text)) return "unwind_advice";
  if (entities.stock || /\b\d{6}\b/.test(text)) {
    if (/成长|PEG|景气|六维/.test(text)) return "growth_analysis";
    return "stock_research";
  }
  if (/研报|评级|目标价|机构|观点/.test(text)) return "report_analysis";
  if (entities.industry || /行业|板块|主题|产业链|赛道/.test(text)) return "industry_research";
  return "stock_research";
}

function inferSecondaryIntents(text: string, entities: Partial<ResolvedAgentEntities>, primaryIntent: PrimaryIntent): SecondaryIntent[] {
  const intents = new Set<SecondaryIntent>();
  if (entities.stock && primaryIntent !== "stock_research") intents.add("company_context");
  if (entities.industry && primaryIntent !== "industry_research") intents.add("industry_context");
  if (entities.concept || /碳酸锂|锂概念|概念|商品/.test(text)) intents.add("concept_trend");
  if (/研报|评级|机构|观点/.test(text) && primaryIntent !== "report_analysis") intents.add("report_evidence");
  if (/大盘|市场|指数/.test(text) && primaryIntent !== "market_broadcast") intents.add("market_context");
  return [...intents];
}

function intentFromSkill(skillKey: string): PrimaryIntent {
  if (skillKey === "investoday-ai-unwind-advisor") return "unwind_advice";
  if (skillKey === "investoday-industry-chief-analyst" || skillKey.includes("industry")) return "industry_research";
  if (skillKey === "investoday-stock-market-broadcast") return "market_broadcast";
  if (skillKey === "investoday-research-report-analysis") return "report_analysis";
  if (skillKey === "gs-growth-master-strategy") return "growth_analysis";
  return "stock_research";
}

function skillFromIntent(intent: PrimaryIntent) {
  const map: Record<PrimaryIntent, string> = {
    unwind_advice: "investoday-ai-unwind-advisor",
    stock_research: "investoday-stock-research-interpretation",
    industry_research: "investoday-industry-chief-analyst",
    market_broadcast: "investoday-stock-market-broadcast",
    report_analysis: "investoday-research-report-analysis",
    growth_analysis: "gs-growth-master-strategy",
  };
  return map[intent];
}

function requiredInputsForIntent(intent: PrimaryIntent) {
  if (intent === "unwind_advice") return ["stockCode", "lossPercent", "positionPercent"];
  if (intent === "industry_research") return ["industryName"];
  if (intent === "stock_research" || intent === "report_analysis" || intent === "growth_analysis") return ["stockCodeOrName"];
  return [];
}

function buildReason(primary: PrimaryIntent, secondary: SecondaryIntent[]) {
  return secondary.length > 0 ? `${primary} with ${secondary.join(", ")}` : primary;
}
