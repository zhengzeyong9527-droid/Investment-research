import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { AgentKey } from "@/agents/types";

export const AGENT_QUEUE_NAME = "agent-runs";

export type AgentJob = {
  runId: string;
  agentKey: AgentKey;
  sessionId: string;
  resumePayload?: Record<string, unknown>;
};

export type AgentQueueClient = {
  enqueue(job: AgentJob): Promise<{ id: string }>;
  close?(): Promise<void>;
};

export class AgentQueueUnavailableError extends Error {
  constructor(message = "AGENT_QUEUE_UNAVAILABLE: REDIS_URL is required unless AGENT_MOCK_MODE=1.") {
    super(message);
    this.name = "AgentQueueUnavailableError";
  }
}

type AgentQueueEnv = {
  AGENT_MOCK_MODE?: string;
};

export function createAgentQueue(redisUrl = process.env.REDIS_URL, env: AgentQueueEnv = process.env as AgentQueueEnv): AgentQueueClient {
  if (!redisUrl) {
    if (env.AGENT_MOCK_MODE !== "1") {
      throw new AgentQueueUnavailableError();
    }
    return {
      async enqueue(job) {
        return { id: `local-no-redis-${job.runId}` };
      },
    };
  }
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue<AgentJob>(AGENT_QUEUE_NAME, { connection });
  return {
    async enqueue(job) {
      const queued = await queue.add(job.agentKey, job, {
        attempts: 2,
        removeOnComplete: 100,
        removeOnFail: 200,
      });
      return { id: String(queued.id) };
    },
    async close() {
      await queue.close();
      connection.disconnect();
    },
  };
}
