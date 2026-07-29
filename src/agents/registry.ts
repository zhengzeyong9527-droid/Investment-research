import type { AgentKey, AgentManifest } from "@/agents/types";

const RESEARCH_SKILLS = [
  "investoday-stock-research-interpretation",
  "investoday-research-report-analysis",
  "investoday-industry-chief-analyst",
  "gs-growth-master-strategy",
  "investoday-ai-unwind-advisor",
] as const;

const AGENT_MANIFESTS: AgentManifest[] = [
  {
    agentKey: "market-broadcast-agent",
    name: "Market Broadcast Agent",
    description: "Generates non-operational A-share market environment commentary.",
    entry: "market",
    graphKey: "marketBroadcastGraph",
    allowedSkills: ["investoday-stock-market-broadcast"],
    allowedTools: [
      "market.overview",
      "market.changeRatioStatus",
      "market.indexRealtime",
      "news.market",
      "memory.search",
      "skill.run",
    ],
    riskLevel: "normal",
    supportsHitl: false,
  },
  {
    agentKey: "research-router-agent",
    name: "Research Router Agent",
    description: "Routes natural-language research questions to the right Investoday skill.",
    entry: "research",
    graphKey: "researchRouterGraph",
    allowedSkills: [...RESEARCH_SKILLS],
    allowedTools: [
      "entity.recognition",
      "stock.resolve",
      "stock.basicInfo",
      "stock.briefItems",
      "stock.industries",
      "stock.unwindSignalStat",
      "stock.unwindSignalDetails",
      "report.query",
      "report.sentiment",
      "report.vectorSearch",
      "report.forecastRatings",
      "industry.data",
      "valuation.data",
      "news.market",
      "news.entityRelated",
      "concept.resolve",
      "concept.quote",
      "concept.stockRealtime",
      "memory.search",
      "skill.run",
    ],
    riskLevel: "normal",
    supportsHitl: true,
  },
  {
    agentKey: "unwind-advisor-subgraph",
    name: "Unwind Advisor Subgraph",
    description: "High-risk research-only recovery review path with mandatory human confirmation.",
    entry: "research",
    graphKey: "unwindSubgraph",
    allowedSkills: ["investoday-ai-unwind-advisor"],
    allowedTools: [
      "entity.recognition",
      "stock.resolve",
      "stock.basicInfo",
      "stock.briefItems",
      "stock.industries",
      "stock.unwindSignalStat",
      "stock.unwindSignalDetails",
      "report.query",
      "report.sentiment",
      "report.vectorSearch",
      "valuation.data",
      "industry.data",
      "news.entityRelated",
      "concept.resolve",
      "concept.quote",
      "concept.stockRealtime",
      "memory.search",
      "skill.run",
    ],
    riskLevel: "high",
    supportsHitl: true,
  },
];

export function listAgentManifests() {
  return AGENT_MANIFESTS;
}

export function getAgentManifest(agentKey: string): AgentManifest {
  const manifest = AGENT_MANIFESTS.find((agent) => agent.agentKey === agentKey);
  if (!manifest) {
    throw new Error(`Unknown agent: ${agentKey}`);
  }
  return manifest;
}

export function isAgentKey(value: string): value is AgentKey {
  return AGENT_MANIFESTS.some((agent) => agent.agentKey === value);
}
