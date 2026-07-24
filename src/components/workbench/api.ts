import type { AgentRun } from "@/components/workbench/types";

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
    const run = await postJson<AgentRun>("/api/agent-runs", { question, inputPayload: inputPayload ?? {}, skillKey });
    setNotice("任务已创建，正在尝试执行...");
    const executed = await postJson<AgentRun>(`/api/agent-runs/${run.id}/execute`, {});
    setNotice(executed.status === "completed" ? "Agent 分析已完成。" : executed.error ?? "Agent 任务已保存。");
    return { ...run, ...executed };
  } catch (error) {
    setNotice(error instanceof Error ? error.message : "Agent 任务失败");
    return null;
  } finally {
    setLoading(false);
  }
}

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(await response.text());
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
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error ?? "请求失败");
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
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error ?? "请求失败");
  }
  return response.json();
}
