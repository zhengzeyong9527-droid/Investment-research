import { Worker } from "bullmq";
import IORedis from "ioredis";
import { executeAgentGraphJob } from "@/agents/langgraph-runtime";
import { AGENT_QUEUE_NAME, type AgentJob } from "@/agents/queue";
import { OpenAIModelProvider } from "@/agents/model-provider";
import { createMockAgentRuntime, isAgentMockMode } from "@/agents/mock-runtime";
import { createToolRegistry } from "@/tools/registry";
import { loadDotEnv } from "@/lib/load-env";
import { getAgentRunForExecution, PrismaAgentRunRepository } from "@/lib/repositories";
import { closeLangGraphCheckpointer, initializeLangGraphCheckpointer } from "@/agents/checkpointer";
import { prisma } from "@/lib/prisma";

loadDotEnv();
if (!process.env.RAG_EMBEDDING_PROVIDER) {
  if (isAgentMockMode()) {
    process.env.RAG_EMBEDDING_PROVIDER = "deterministic";
  } else {
    throw new Error(
      "RAG_EMBEDDING_PROVIDER is required outside mock mode. Use openai-compatible in production or explicitly select deterministic for a local demo."
    );
  }
}
if (
  process.env.RAG_EMBEDDING_PROVIDER === "openai-compatible" &&
  !process.env.EMBEDDING_API_KEY &&
  !process.env.OPENAI_API_KEY &&
  !process.env.DEEPSEEK_API_KEY
) {
  throw new Error(
    "An embedding API key is required for openai-compatible embeddings (EMBEDDING_API_KEY, OPENAI_API_KEY, or DEEPSEEK_API_KEY)."
  );
}

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  if (isAgentMockMode()) {
    console.log("Agent Worker mock mode enabled without REDIS_URL; BullMQ worker is not started.");
    process.exit(0);
  }
  throw new Error("REDIS_URL is required to run the Agent Worker.");
}

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
const heartbeatKey = process.env.WORKER_HEARTBEAT_KEY ?? "investoday:agent-worker:heartbeat";
const heartbeatTtlSeconds = positiveInteger(process.env.WORKER_HEARTBEAT_TTL_SECONDS, 30);
const heartbeatIntervalMs = Math.max(1_000, Math.floor((heartbeatTtlSeconds * 1_000) / 3));
const repository = new PrismaAgentRunRepository();
const mockRuntime = isAgentMockMode() ? createMockAgentRuntime() : null;
const toolRegistry = mockRuntime?.toolRegistry ?? createToolRegistry();
const modelProvider = mockRuntime?.modelProvider ?? new OpenAIModelProvider();

await initializeLangGraphCheckpointer();

const worker = new Worker<AgentJob>(
  AGENT_QUEUE_NAME,
  async (job) => {
    const run = await getAgentRunForExecution(job.data.runId);
    if (!run) throw new Error(`AgentRun not found: ${job.data.runId}`);
    await executeAgentGraphJob({ run, repository, toolRegistry, modelProvider, resumePayload: job.data.resumePayload });
  },
  { connection, concurrency: 2 }
);

console.log(`Agent Worker listening on queue ${AGENT_QUEUE_NAME}`);

await publishHeartbeat();
const heartbeatTimer = setInterval(() => void publishHeartbeat(), heartbeatIntervalMs);
heartbeatTimer.unref();

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; closing Agent Worker.`);
  clearInterval(heartbeatTimer);
  await connection.del(heartbeatKey).catch(() => undefined);
  await Promise.allSettled([worker.close(), closeLangGraphCheckpointer(), prisma.$disconnect()]);
  connection.disconnect();
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

async function publishHeartbeat() {
  try {
    await connection.set(
      heartbeatKey,
      JSON.stringify({ queue: AGENT_QUEUE_NAME, pid: process.pid, updatedAt: new Date().toISOString() }),
      "EX",
      heartbeatTtlSeconds
    );
  } catch (error) {
    console.error(`Worker heartbeat failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
