import { Worker } from "bullmq";
import IORedis from "ioredis";
import { executeAgentGraphJob } from "@/agents/langgraph-runtime";
import { AGENT_QUEUE_NAME, type AgentJob } from "@/agents/queue";
import { OpenAIModelProvider } from "@/agents/model-provider";
import { createToolRegistry } from "@/tools/registry";
import { loadDotEnv } from "@/lib/load-env";
import { getAgentRunForExecution, PrismaAgentRunRepository } from "@/lib/repositories";

loadDotEnv();

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is required to run the Agent Worker.");
}

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
const repository = new PrismaAgentRunRepository();
const toolRegistry = createToolRegistry();
const modelProvider = new OpenAIModelProvider();

new Worker<AgentJob>(
  AGENT_QUEUE_NAME,
  async (job) => {
    const run = await getAgentRunForExecution(job.data.runId);
    if (!run) throw new Error(`AgentRun not found: ${job.data.runId}`);
    await executeAgentGraphJob({ run, repository, toolRegistry, modelProvider });
  },
  { connection, concurrency: 2 }
);

console.log(`Agent Worker listening on queue ${AGENT_QUEUE_NAME}`);
