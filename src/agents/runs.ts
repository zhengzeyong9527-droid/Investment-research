import { getAgentManifest } from "@/agents/registry";
import type { AgentKey, TriggerType } from "@/agents/types";

export type AgentRunTaskRepository = {
  createAgentSession(data: {
    userId?: string;
    title: string;
    entry: "market" | "research";
  }): Promise<{ id: string }>;
  touchAgentSession?(id: string): Promise<{ id: string } & Record<string, unknown>>;
  createAgentRun(data: {
    agentKey: AgentKey;
    sessionId: string;
    question: string;
    skillKey: string;
    triggerType: TriggerType;
    status: "created";
    inputPayload: Record<string, unknown>;
    promptPackage: string;
  }): Promise<{ id: string; agentKey: string; sessionId: string | null; status: string } & Record<string, unknown>>;
  appendAgentStep(data: {
    agentRunId: string;
    nodeKey: string;
    order: number;
    title: string;
    status: "pending" | "running" | "completed" | "failed";
    message: string;
  }): Promise<{ id: string }>;
};

export type AgentQueue = {
  enqueue(job: { runId: string; agentKey: AgentKey; sessionId: string }): Promise<{ id: string } & Record<string, unknown>>;
};

export async function createAgentRunTask(input: {
  agentKey: AgentKey;
  sessionId?: string;
  abilityKey?: "auto" | string;
  question: string;
  inputPayload?: Record<string, unknown>;
  triggerType: TriggerType;
  userId?: string;
  repository: AgentRunTaskRepository;
  queue: AgentQueue;
}) {
  const manifest = getAgentManifest(input.agentKey);
  const question = input.question.trim() || defaultQuestion(input.agentKey);
  const session = input.sessionId
    ? { id: input.sessionId }
    : await input.repository.createAgentSession({
        userId: input.userId,
        title: question,
        entry: manifest.entry,
      });

  if (input.sessionId) {
    await input.repository.touchAgentSession?.(input.sessionId);
  }

  const abilityKey = input.abilityKey ?? abilityKeyFromPayload(input.inputPayload);
  const skillKey = resolveInitialSkillKey(manifest.allowedSkills, abilityKey);
  const inputPayload = {
    ...(input.inputPayload ?? {}),
    ...(abilityKey && abilityKey !== "auto" ? { abilityKey } : {}),
  };

  const run = await input.repository.createAgentRun({
    agentKey: input.agentKey,
    sessionId: session.id,
    question,
    skillKey,
    triggerType: input.triggerType,
    status: "created",
    inputPayload,
    promptPackage: "",
  });
  await input.repository.appendAgentStep({
    agentRunId: run.id,
    nodeKey: "enqueue",
    order: 1,
    title: "Enqueue agent worker job",
    status: "completed",
    message: "Agent run created and queued for worker execution.",
  });
  await input.queue.enqueue({ runId: run.id, agentKey: input.agentKey, sessionId: session.id });
  return run;
}

function defaultQuestion(agentKey: AgentKey) {
  return agentKey === "market-broadcast-agent" ? "生成盘面行情播报" : "生成投研问答";
}

function abilityKeyFromPayload(inputPayload?: Record<string, unknown>) {
  const abilityKey = inputPayload?.abilityKey;
  return typeof abilityKey === "string" ? abilityKey : undefined;
}

function resolveInitialSkillKey(allowedSkills: string[], abilityKey?: string) {
  if (abilityKey && abilityKey !== "auto" && allowedSkills.includes(abilityKey)) return abilityKey;
  return allowedSkills[0] ?? "";
}
