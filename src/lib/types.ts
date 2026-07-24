export type TargetType = "stock" | "sector";
export type BriefItemKind = "news" | "research" | "announcement" | "event";
export type BriefStatus = "success" | "empty" | "failed";
export type SkillScope = "stock" | "sector" | "event" | "brief";
export type SkillStatus = "pending" | "enabled";
export type AnalysisStatus = "pending" | "completed" | "failed";
export type AgentRunStatus = "created" | "planning" | "fetching_data" | "running_skill" | "completed" | "failed";
export type AgentStepStatus = "pending" | "running" | "completed" | "failed";
export type SkillRunStatus = "pending" | "running" | "completed" | "failed" | "skipped";
export type EvidenceKind = "news" | "research" | "announcement" | "event" | "market" | "company" | "industry" | "raw";

export type WatchTargetInput = {
  type: TargetType;
  code: string;
  name: string;
  tags?: string | string[];
  reason?: string;
  enabled?: boolean;
};

export type NormalizedWatchTarget = {
  type: TargetType;
  code: string;
  name: string;
  tags: string[];
  reason: string;
  enabled: boolean;
};

export type EnabledTarget = {
  id: string;
  type: TargetType;
  code: string;
  name: string;
};

export type AdapterBriefItem = {
  kind: BriefItemKind;
  title: string;
  source: string;
  publishedAt: Date;
  summary: string;
  rawRef: string;
  rawPayload?: unknown;
  normalizedPayload?: Record<string, unknown>;
  detailText?: string;
  sourceEndpoint?: string;
  fetchedAt?: Date;
};

export type BriefItemDraft = AdapterBriefItem & {
  targetId: string | null;
};

export type BriefDraft = {
  briefDate: string;
  status: BriefStatus;
  windowStart: Date;
  windowEnd: Date;
  summary: string;
  generatedAt: Date;
  items: BriefItemDraft[];
};
