import { Annotation, Command, END, INTERRUPT, START, StateGraph, isGraphInterrupt, isInterrupted } from "@langchain/langgraph";
import type { AgentKey } from "@/agents/types";
import { createLangGraphCheckpointer } from "@/agents/checkpointer";
import { appendAssistantMessage, type AgentRuntimeRepository, type ExecutableAgentRun } from "@/agents/executor";
import { createToolRegistry } from "@/tools/registry";
import type { ToolRegistry } from "@/tools/types";
import { OpenAIModelProvider, type ModelProvider } from "@/agents/model-provider";
import { createMockAgentRuntime, isAgentMockMode } from "@/agents/mock-runtime";
import { createGraphNodes } from "@/agents/graph/nodes";
import {
  routeAfterCheckMissing,
  routeAfterGrade,
  routeAfterMemory,
  routeAfterVerify,
  routeFromRouter,
} from "@/agents/graph/routes";
import { initialGraphState, type AgentGraphDeps } from "@/agents/graph/state";

const AgentState = Annotation.Root({
  runId: Annotation<string>,
  sessionId: Annotation<string | null>,
  userId: Annotation<string | null>,
  agentKey: Annotation<AgentKey>,
  question: Annotation<string>,
  skillKey: Annotation<string>,
  inputPayload: Annotation<Record<string, unknown>>,
  resolvedEntities: Annotation<unknown>,
  intentPlan: Annotation<Record<string, unknown> | undefined>,
  memoryHits: Annotation<unknown[]>,
  evidence: Annotation<unknown[]>,
  evidenceGaps: Annotation<unknown[]>,
  ragHits: Annotation<unknown[]>,
  evidenceGrade: Annotation<unknown>,
  skillResult: Annotation<unknown>,
  verification: Annotation<unknown>,
  interrupt: Annotation<Record<string, unknown> | null | undefined>,
  attempts: Annotation<number>,
  outputMarkdown: Annotation<string>,
  outputJson: Annotation<Record<string, unknown>>,
  status: Annotation<string>,
  nodeKeys: Annotation<string[]>,
  resumedFromInterrupt: Annotation<boolean | undefined>,
  marketData: Annotation<Record<string, unknown> | undefined>,
});

export const RESEARCH_GRAPH_NODE_KEYS = [
  "router",
  "resolve_entity",
  "plan_intent",
  "normalize_input",
  "check_missing",
  "retrieve_memory",
  "fetch_evidence",
  "local_rag_retrieve",
  "grade_evidence",
  "generate",
  "verify_output",
  "commit_memory",
  "finalize",
] as const;

export const MARKET_GRAPH_NODE_KEYS = [
  "router",
  "fetch_market",
  "build_market_evidence",
  "retrieve_memory",
  "local_rag_retrieve",
  "grade_evidence",
  "run_broadcast",
  "verify_output",
  "commit_memory",
  "finalize",
] as const;

export function getAgentGraphNodeKeys(agentKey: AgentKey): string[] {
  return [...(agentKey === "market-broadcast-agent" ? MARKET_GRAPH_NODE_KEYS : RESEARCH_GRAPH_NODE_KEYS)];
}

export function compileAgentGraph(deps: AgentGraphDeps) {
  const nodes = createGraphNodes(deps);
  const graph = new StateGraph(AgentState) as any;

  for (const [nodeKey, node] of Object.entries(nodes)) {
    graph.addNode(nodeKey, node);
  }

  graph.addEdge(START, "router");
  graph.addConditionalEdges("router", routeFromRouter, {
    resolve_entity: "resolve_entity",
    fetch_market: "fetch_market",
  });

  graph.addEdge("resolve_entity", "plan_intent");
  graph.addEdge("plan_intent", "normalize_input");
  graph.addEdge("normalize_input", "check_missing");
  graph.addConditionalEdges("check_missing", routeAfterCheckMissing, {
    normalize_input: "normalize_input",
    retrieve_memory: "retrieve_memory",
  });
  graph.addConditionalEdges("retrieve_memory", routeAfterMemory, {
    fetch_evidence: "fetch_evidence",
    local_rag_retrieve: "local_rag_retrieve",
  });
  graph.addEdge("fetch_evidence", "local_rag_retrieve");
  graph.addEdge("local_rag_retrieve", "grade_evidence");
  graph.addConditionalEdges("grade_evidence", routeAfterGrade, {
    degrade: "degrade",
    generate: "generate",
    run_broadcast: "run_broadcast",
  });
  graph.addEdge("generate", "verify_output");
  graph.addConditionalEdges("verify_output", routeAfterVerify, {
    commit_memory: "commit_memory",
    degrade: "degrade",
    generate: "generate",
    run_broadcast: "run_broadcast",
    finalize: "finalize",
  });

  graph.addEdge("fetch_market", "build_market_evidence");
  graph.addEdge("build_market_evidence", "retrieve_memory");
  graph.addEdge("run_broadcast", "verify_output");

  graph.addEdge("degrade", "finalize");
  graph.addEdge("commit_memory", "finalize");
  graph.addEdge("finalize", END);

  const checkpointer = createLangGraphCheckpointer();
  return checkpointer ? graph.compile({ checkpointer }) : graph.compile();
}

export async function executeAgentGraphJob(input: {
  run: ExecutableAgentRun;
  repository: AgentRuntimeRepository;
  toolRegistry?: ToolRegistry;
  modelProvider?: ModelProvider;
  resumePayload?: Record<string, unknown>;
}) {
  const mockRuntime = isAgentMockMode() ? createMockAgentRuntime() : null;
  const deps: AgentGraphDeps = {
    repository: input.repository,
    toolRegistry: input.toolRegistry ?? mockRuntime?.toolRegistry ?? createToolRegistry(),
    modelProvider: input.modelProvider ?? mockRuntime?.modelProvider ?? new OpenAIModelProvider(),
  };
  const compiled = compileAgentGraph(deps);
  const thread_id = input.run.sessionId ?? input.run.id;
  const invokeInput = input.resumePayload ? new Command({ resume: input.resumePayload }) : initialGraphState(input.run);
  try {
    const output = await compiled.invoke(invokeInput, { configurable: { thread_id } });
    if (isInterrupted<Record<string, unknown>>(output)) {
      await persistInterrupt(input.repository, input.run, output[INTERRUPT][0]?.value);
    }
    return output;
  } catch (error) {
    if (isInterrupted<Record<string, unknown>>(error)) {
      await persistInterrupt(input.repository, input.run, error[INTERRUPT][0]?.value);
      return error;
    }
    if (isGraphInterrupt(error)) {
      await persistInterrupt(input.repository, input.run, error.interrupts[0]?.value as Record<string, unknown> | undefined);
      return error;
    }
    await input.repository.updateAgentRun(input.run.id, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      completedAt: new Date(),
    });
    throw error;
  }
}

async function persistInterrupt(
  repository: AgentRuntimeRepository,
  run: ExecutableAgentRun,
  interruptPayload?: Record<string, unknown>
) {
  if (!interruptPayload || interruptPayload.type !== "missing_input") return;
  const message = typeof interruptPayload.message === "string" ? interruptPayload.message : "请补充缺失信息后继续。";
  const skillKey = typeof interruptPayload.skillKey === "string" ? interruptPayload.skillKey : run.skillKey;
  await repository.updateAgentRun(run.id, {
    status: "interrupted",
    skillKey,
    outputMarkdown: message,
    outputJson: {
      ...(run.graphState ? { previousGraphState: run.graphState } : {}),
      interrupt: interruptPayload,
      graphState: {
        nodeKeys: ["router", "resolve_entity", "plan_intent", "normalize_input", "check_missing"],
        interrupt: interruptPayload,
        attempts: 0,
      },
    },
    error: null,
    completedAt: new Date(),
  });
  await appendAssistantMessage(repository, run, message);
}

