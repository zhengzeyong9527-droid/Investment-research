import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { AgentKey, BaseAgentState } from "@/agents/types";
import { getAgentManifest } from "@/agents/registry";
import { createLangGraphCheckpointer } from "@/agents/checkpointer";
import { executeAgentRunJob, type AgentRuntimeRepository, type ExecutableAgentRun } from "@/agents/executor";
import { createToolRegistry } from "@/tools/registry";
import type { ToolRegistry } from "@/tools/types";
import { OpenAIModelProvider, type ModelProvider } from "@/agents/model-provider";

const AgentState = Annotation.Root({
  runId: Annotation<string>,
  sessionId: Annotation<string>,
  agentKey: Annotation<string>,
  question: Annotation<string>,
  inputPayload: Annotation<Record<string, unknown>>,
  messages: Annotation<BaseAgentState["messages"]>,
  evidenceIds: Annotation<string[]>,
  toolCallIds: Annotation<string[]>,
  modelCallIds: Annotation<string[]>,
  memoryItemIds: Annotation<string[]>,
  skillRunIds: Annotation<string[]>,
  outputJson: Annotation<Record<string, unknown> | undefined>,
  outputMarkdown: Annotation<string | undefined>,
  nodeKeys: Annotation<string[]>,
});

export const RESEARCH_GRAPH_NODE_KEYS = [
  "resolve_entity",
  "plan_intent",
  "retrieve_memory",
  "fetch_tools",
  "local_rag_retrieve",
  "grade_evidence",
  "generate",
  "verify",
  "persist",
] as const;

export const MARKET_GRAPH_NODE_KEYS = [
  "load_market_data",
  "retrieve_memory",
  "build_evidence",
  "local_rag_retrieve",
  "grade_evidence",
  "run_broadcast_skill",
  "verify_output",
  "persist",
] as const;

export function getAgentGraphNodeKeys(agentKey: AgentKey): string[] {
  return [...(agentKey === "market-broadcast-agent" ? MARKET_GRAPH_NODE_KEYS : RESEARCH_GRAPH_NODE_KEYS)];
}

export function compileAgentGraph(agentKey: AgentKey) {
  const manifest = getAgentManifest(agentKey);
  const nodeKeys = getAgentGraphNodeKeys(agentKey);
  const graph = new StateGraph(AgentState) as any;
  for (const nodeKey of nodeKeys) {
    graph.addNode(nodeKey, async (state: {
      nodeKeys?: string[];
      outputJson?: Record<string, unknown>;
    }) => ({
      ...state,
      nodeKeys: [...(state.nodeKeys ?? []), nodeKey],
      outputJson: {
        ...(state.outputJson ?? {}),
        graphKey: manifest.graphKey,
        lastNodeKey: nodeKey,
      },
    }));
  }
  graph.addEdge(START, nodeKeys[0]);
  for (let index = 0; index < nodeKeys.length - 1; index += 1) {
    graph.addEdge(nodeKeys[index], nodeKeys[index + 1]);
  }
  graph.addEdge(nodeKeys[nodeKeys.length - 1], END);
  const checkpointer = createLangGraphCheckpointer();
  return checkpointer ? graph.compile({ checkpointer }) : graph.compile();
}

export async function executeAgentGraphJob(input: {
  run: ExecutableAgentRun;
  repository: AgentRuntimeRepository;
  toolRegistry?: ToolRegistry;
  modelProvider?: ModelProvider;
}) {
  const agentKey = (input.run.agentKey ?? "research-router-agent") as AgentKey;
  const nodeKeys = getAgentGraphNodeKeys(agentKey);
  const toolRegistry = input.toolRegistry ?? createToolRegistry();
  const graphState = {
    graphKey: getAgentManifest(agentKey).graphKey,
    nodeKeys,
    ragHits: [] as unknown[],
    toolResults: [] as unknown[],
    evidenceGaps: [] as unknown[],
  };
  if (process.env.NODE_ENV !== "test") {
    try {
      const compiled = compileAgentGraph(agentKey);
      const graphOutput = await compiled.invoke(
        {
          runId: input.run.id,
          sessionId: input.run.sessionId ?? input.run.id,
          agentKey,
          question: input.run.question,
          inputPayload: input.run.inputPayload,
          messages: [],
          evidenceIds: [],
          toolCallIds: [],
          modelCallIds: [],
          memoryItemIds: [],
          skillRunIds: [],
          outputJson: {},
          outputMarkdown: undefined,
          nodeKeys: [],
        },
        { configurable: { thread_id: input.run.sessionId ?? input.run.id } }
      );
      graphState.nodeKeys = Array.isArray(graphOutput.nodeKeys) ? graphOutput.nodeKeys : nodeKeys;
    } catch (error) {
      graphState.evidenceGaps.push({
        toolKey: "langgraph.invoke",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const repository = input.repository;
  for (let index = 0; index < nodeKeys.length; index += 1) {
    const nodeKey = nodeKeys[index];
    await repository.appendAgentStep({
      agentRunId: input.run.id,
      nodeKey,
      order: index + 1,
      title: nodeKey,
      status: "completed",
      message: nodeMessage(nodeKey),
    });
    if (nodeKey === "local_rag_retrieve") {
      try {
        const result = await toolRegistry.call("rag.search", { query: input.run.question, topK: 6 }, {
          agentRunId: input.run.id,
          sessionId: input.run.sessionId ?? input.run.id,
          agentKey,
          userId: input.run.userId,
          recordToolCall: repository.recordToolCall,
        });
        graphState.ragHits = Array.isArray(result.data) ? result.data : [];
        graphState.toolResults.push({ toolKey: "rag.search", ok: true, latencyMs: result.latencyMs ?? 0 });
        await persistGraphDiagnostics(repository, input.run.id, graphState);
      } catch (error) {
        graphState.evidenceGaps.push({
          toolKey: "rag.search",
          reason: error instanceof Error ? error.message : String(error),
        });
        graphState.toolResults.push({ toolKey: "rag.search", ok: false });
        await persistGraphDiagnostics(repository, input.run.id, graphState);
      }
    }
    if (isGenerateNode(agentKey, nodeKey)) {
      await executeAgentRunJob({
        run: { ...input.run, agentKey, graphState },
        repository,
        toolRegistry,
        modelProvider: input.modelProvider ?? new OpenAIModelProvider(),
      });
    }
  }
}

async function persistGraphDiagnostics(repository: AgentRuntimeRepository, runId: string, graphState: Record<string, unknown>) {
  await repository.updateAgentRun(runId, {
    outputJson: {
      graphState,
      ragHits: graphState.ragHits,
      evidenceGaps: graphState.evidenceGaps,
      toolResults: graphState.toolResults,
    },
  });
}

function isGenerateNode(agentKey: AgentKey, nodeKey: string) {
  return agentKey === "market-broadcast-agent" ? nodeKey === "run_broadcast_skill" : nodeKey === "generate";
}

function nodeMessage(nodeKey: string) {
  const messages: Record<string, string> = {
    resolve_entity: "Resolved request entities.",
    plan_intent: "Planned primary and supporting intent.",
    retrieve_memory: "Retrieved short-term and long-term memory.",
    fetch_tools: "Fetched external tool evidence.",
    local_rag_retrieve: "Retrieved local RAG evidence.",
    grade_evidence: "Graded evidence quality.",
    generate: "Generated answer.",
    verify: "Verified output.",
    persist: "Persisted run state.",
    load_market_data: "Loaded market data.",
    build_evidence: "Built market evidence package.",
    run_broadcast_skill: "Generated market broadcast.",
    verify_output: "Verified market output.",
  };
  return messages[nodeKey] ?? nodeKey;
}
