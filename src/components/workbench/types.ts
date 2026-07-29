export type View = "brief" | "market" | "agent" | "watchlist" | "settings";

export type {
  HotspotDetail,
  HotspotListResult,
  HotspotOrder,
  HotspotOverview,
  HotspotStockQuote,
  HotspotType,
  RollingHotspot,
} from "@/lib/hotspots";

export type {
  MarketBreadth,
  MarketCandle,
  MarketChartSeries,
  MarketIndexQuote,
  MarketIndexRangeGain,
  MarketIndustryQuote,
  MarketIndustrySignal,
  MarketOverview,
  MarketRangeGainSource,
  MarketTimeframe,
} from "@/lib/market-overview";

export type WatchTarget = {
  id: string;
  type: "stock" | "sector";
  code: string;
  name: string;
  tags: string[];
  reason: string;
  enabled: boolean;
};

export type DisplayField = {
  label: string;
  kind?: "paragraph" | "bullets" | "ordered" | "tags" | "metric";
  value?: string;
  items?: string[];
  tone?: "default" | "positive" | "neutral" | "negative" | "warning";
};

export type DisplaySection = {
  title: string;
  fields: DisplayField[];
};

export type BriefItem = {
  id: string;
  kind: "news" | "research" | "announcement" | "event";
  title: string;
  source: string;
  publishedAt: string;
  summary: string;
  rawRef?: string;
  detailText?: string;
  sentimentValue?: number;
  sentimentLabel?: string;
  sentimentTone?: "positive" | "neutral" | "negative";
  sentimentScore?: number;
  newsLevelValue?: number;
  newsLevelLabel?: string;
  newsTypeValue?: number;
  newsTypeLabel?: string;
  relevance?: number;
  displaySections?: DisplaySection[];
  target?: WatchTarget | null;
};

export type DailyBrief = {
  id: string;
  briefDate: string;
  status: "success" | "empty" | "failed";
  summary: string;
  generatedAt: string;
  windowStart: string;
  windowEnd: string;
  items: BriefItem[];
};

export type SkillField = {
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
  riskLevel: "normal" | "high";
  requiredInputs: SkillField[];
  optionalInputs: SkillField[];
  compliance: string[];
};

export type AgentRun = {
  id: string;
  question: string;
  skillKey: string;
  agentKey?: string;
  sessionId?: string | null;
  triggerType?: string;
  status: "created" | "queued" | "planning" | "fetching_data" | "running_skill" | "interrupted" | "completed" | "failed";
  inputPayload: Record<string, unknown>;
  promptPackage: string;
  outputJson?: Record<string, unknown> | null;
  outputMarkdown?: string | null;
  error?: string | null;
  createdAt?: string;
  updatedAt?: string;
  evidence?: Array<{ id: string; kind: string; title: string; source: string; summary: string; sourceEndpoint?: string; publishedAt?: string | null }>;
  steps?: Array<{ id: string; nodeKey?: string; title: string; status: string; message: string }>;
  toolCalls?: Array<{ id: string; toolKey: string; status: string; outputSummary: string; sourceEndpoint: string; inputJson?: Record<string, unknown> | null; error?: string | null }>;
  modelCalls?: Array<{ id: string; model: string; status: string; tokenInput: number; tokenOutput: number }>;
};

export type AgentSession = {
  id: string;
  userId?: string | null;
  title: string;
  entry: string;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AgentMessage = {
  id: string;
  agentRunId?: string | null;
  sessionId: string;
  role: "user" | "assistant" | "system" | string;
  content: string;
  createdAt: string;
};

export type AgentSessionDetail = AgentSession & {
  messages: AgentMessage[];
  runs: AgentRun[];
  activeRun?: AgentRun | null;
};

export type AgentMemoryItem = {
  id: string;
  sessionId?: string | null;
  userId?: string | null;
  scope: string;
  kind: string;
  content: string;
  status: string;
  importance: number;
  confidence: number;
  lastUsedAt?: string | null;
  hitCount: number;
  sourceRunId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BriefHistory = {
  id: string;
  briefDate: string;
  status: string;
  summary: string;
  generatedAt: string;
  items: BriefItem[];
};

export type AppSettings = {
  briefTime: string;
  dataWindowHours: number;
  backfillDays: number;
  defaultItemLimit: number;
};
