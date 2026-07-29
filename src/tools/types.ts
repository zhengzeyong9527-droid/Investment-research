import type { CommandRunner } from "@/lib/investoday";

export type ToolStatus = "completed" | "failed";

export type ToolManifest = {
  toolKey: string;
  description: string;
  sourceEndpoint: string;
  riskLevel: "read" | "write" | "high";
  timeoutMs: number;
  retry: number;
  cacheTtlSeconds?: number;
};

export type ToolCallAuditInput = {
  agentRunId: string;
  toolKey: string;
  inputJson: Record<string, unknown>;
  outputSummary: string;
  rawPayloadRef?: string | null;
  status: ToolStatus;
  latencyMs: number;
  error?: string | null;
  sourceEndpoint: string;
};

export type ToolRuntimeContext = {
  agentRunId: string;
  sessionId: string;
  agentKey: string;
  userId?: string | null;
  recordToolCall: (data: ToolCallAuditInput) => Promise<{ id: string }>;
};

export type ToolResult<T = unknown> = {
  toolCallId: string;
  data: T;
};

export type ToolRegistry = {
  list(): ToolManifest[];
  get(toolKey: string): ToolManifest;
  call<T = unknown>(toolKey: string, input: Record<string, unknown>, context: ToolRuntimeContext): Promise<ToolResult<T>>;
};

export type ToolRegistryOptions = {
  run?: CommandRunner;
};
