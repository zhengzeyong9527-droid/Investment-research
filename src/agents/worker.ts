import { Worker } from "bullmq";
import IORedis from "ioredis";
import { executeAgentGraphJob } from "@/agents/langgraph-runtime";
import { AGENT_QUEUE_NAME, type AgentJob } from "@/agents/queue";
import { OpenAIModelProvider } from "@/agents/model-provider";
import { createMockAgentRuntime, isAgentMockMode } from "@/agents/mock-runtime";
import { createToolRegistry } from "@/tools/registry";
import { loadDotEnv } from "@/lib/load-env";
import { getAgentRunForExecution, PrismaAgentRunRepository } from "@/lib/repositories";

loadDotEnv();
if (!process.env.RAG_EMBEDDING_PROVIDER && !process.env.EMBEDDING_API_KEY) {
  process.env.RAG_EMBEDDING_PROVIDER = "deterministic";
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
const repository = new PrismaAgentRunRepository();
const mockRuntime = isAgentMockMode() ? createMockAgentRuntime() : null;
const toolRegistry = mockRuntime?.toolRegistry ?? createToolRegistry();
const modelProvider = mockRuntime?.modelProvider ?? new OpenAIModelProvider();

new Worker<AgentJob>(
  AGENT_QUEUE_NAME,
  async (job) => {
    const run = await getAgentRunForExecution(job.data.runId);
    if (!run) throw new Error(`AgentRun not found: ${job.data.runId}`);
    await executeAgentGraphJob({ run, repository, toolRegistry, modelProvider, resumePayload: job.data.resumePayload });
  },
  { connection, concurrency: 2 }
);

console.log(`Agent Worker listening on queue ${AGENT_QUEUE_NAME}`);
