import { describe, expect, it } from "vitest";
import { compileAgentGraph } from "@/agents/langgraph-runtime";

describe("langgraph runtime", () => {
  it("compiles the first production agent graphs", () => {
    expect(compileAgentGraph("market-broadcast-agent")).toBeTruthy();
    expect(compileAgentGraph("research-router-agent")).toBeTruthy();
  });
});
