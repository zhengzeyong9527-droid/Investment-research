import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadDotEnv } from "@/lib/load-env";
import { createToolRegistry } from "@/tools/registry";

loadDotEnv();

const server = new McpServer({
  name: "investoday-tools",
  version: "0.1.0",
});

const registry = createToolRegistry();

server.tool(
  "market.changeRatioStatus",
  "Fetch A-share market breadth distribution from Investoday.",
  {},
  async () => {
    const result = await registry.call("market.changeRatioStatus", {}, mcpContext("market.changeRatioStatus"));
    return { content: [{ type: "text", text: JSON.stringify(result.data) }] };
  }
);

server.tool(
  "market.indexRealtime",
  "Fetch realtime broad-market index quotes from Investoday.",
  { indexCodes: z.array(z.string()).optional() },
  async ({ indexCodes }) => {
    const result = await registry.call("market.indexRealtime", { indexCodes }, mcpContext("market.indexRealtime"));
    return { content: [{ type: "text", text: JSON.stringify(result.data) }] };
  }
);

server.prompt("market-broadcast", "Prompt for non-operational A-share market broadcast.", () => ({
  messages: [
    {
      role: "user",
      content: {
        type: "text",
        text: "Generate a non-operational market environment broadcast with evidence and watch points.",
      },
    },
  ],
}));

const transport = new StdioServerTransport();
await server.connect(transport);

function mcpContext(toolKey: string) {
  return {
    agentRunId: "mcp",
    sessionId: "mcp",
    agentKey: "mcp",
    async recordToolCall() {
      return { id: `mcp-${toolKey}-${Date.now()}` };
    },
  };
}
