import { executeAgentGraphJob } from "@/agents/langgraph-runtime";
import { createMockAgentRuntime, isAgentMockMode } from "@/agents/mock-runtime";
import { getAgentRunForExecution, type PrismaAgentRunRepository } from "@/lib/repositories";

export async function executeInlineWhenMockQueue(input: {
  runId: string;
  repository: PrismaAgentRunRepository;
  resumePayload?: Record<string, unknown>;
}) {
  if (!isAgentMockMode() || process.env.REDIS_URL) return false;
  const run = await getAgentRunForExecution(input.runId);
  if (!run) throw new Error(`AgentRun not found: ${input.runId}`);
  const runtime = createMockAgentRuntime();
  await executeAgentGraphJob({
    run,
    repository: input.repository,
    toolRegistry: runtime.toolRegistry,
    modelProvider: runtime.modelProvider,
    resumePayload: input.resumePayload,
  });
  return true;
}
