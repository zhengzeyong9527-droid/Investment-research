import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { AgentKey, BaseAgentState } from "@/agents/types";
import { getAgentManifest } from "@/agents/registry";
import { createLangGraphCheckpointer } from "@/agents/checkpointer";

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
});

export function compileAgentGraph(agentKey: AgentKey) {
  const manifest = getAgentManifest(agentKey);
  const graph = new StateGraph(AgentState)
    .addNode("validate_input", async (state) => state)
    .addNode(manifest.graphKey, async (state) => state)
    .addEdge(START, "validate_input")
    .addEdge("validate_input", manifest.graphKey)
    .addEdge(manifest.graphKey, END);
  const checkpointer = createLangGraphCheckpointer();
  return checkpointer ? graph.compile({ checkpointer }) : graph.compile();
}
