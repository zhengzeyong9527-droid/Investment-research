import type { AgentRun } from "@/components/workbench/types";

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  retryable?: boolean;

  constructor(message: string, options: { status: number; code?: string; retryable?: boolean }) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options.status;
    this.code = options.code;
    this.retryable = options.retryable;
  }
}

export async function createAndMaybeExecuteAgent(
  question: string,
  inputPayload: Record<string, unknown> | undefined,
  skillKey: string | undefined,
  setLoading: (value: boolean) => void,
  setNotice: (value: string) => void
) {
  setLoading(true);
  setNotice("正在创建 Agent 任务...");
  try {
    const run = await postJson<AgentRun>("/api/research/agent", { question, inputPayload: inputPayload ?? {}, skillKey });
    setNotice("Agent 任务已创建并进入队列");
    return run;
  } catch (error) {
    setNotice(error instanceof Error ? error.message : "Agent 任务失败");
    return null;
  } finally {
    setLoading(false);
  }
}

export async function createMarketBroadcastAgent(
  inputPayload: Record<string, unknown> | undefined,
  setLoading: (value: boolean) => void,
  setNotice: (value: string) => void
) {
  setLoading(true);
  setNotice("正在创建盘面播报 Agent...");
  try {
    const run = await postJson<AgentRun>("/api/market-overview/agent", {
      question: "生成盘面行情播报",
      inputPayload: inputPayload ?? {},
    });
    setNotice("盘面播报任务已创建并进入队列");
    return run;
  } catch (error) {
    setNotice(error instanceof Error ? error.message : "盘面播报任务失败");
    return null;
  } finally {
    setLoading(false);
  }
}

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw await buildApiError(response);
  }
  return response.json();
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw await buildApiError(response);
  }
  return response.json();
}

export async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw await buildApiError(response);
  }
  return response.json();
}

async function buildApiError(response: Response) {
  const text = await response.text().catch(() => "");
  const payload = parseErrorPayload(text);
  const payloadMessage = payload?.message ?? payload?.error ?? text;
  const message = payloadMessage || `请求失败 (${response.status})`;
  return new ApiRequestError(message, {
    status: response.status,
    code: payload?.code,
    retryable: payload?.retryable,
  });
}

function parseErrorPayload(text: string): { code?: string; message?: string; error?: string; retryable?: boolean } | null {
  if (!text) return null;
  try {
    const value = JSON.parse(text) as unknown;
    if (typeof value !== "object" || value === null) return null;
    return value as { code?: string; message?: string; error?: string; retryable?: boolean };
  } catch {
    return null;
  }
}
