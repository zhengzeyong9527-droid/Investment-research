import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { AgentKey } from "@/agents/types";

export const AGENT_QUEUE_NAME = "agent-runs";

export type AgentJob = {
  runId: string;
  agentKey: AgentKey;
  sessionId: string;
};

export type AgentQueueClient = {
  enqueue(job: AgentJob): Promise<{ id: string }>;
  close?(): Promise<void>;
};

export function createAgentQueue(redisUrl = process.env.REDIS_URL): AgentQueueClient {
  if (!redisUrl) {
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
