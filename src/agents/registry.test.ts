import { describe, expect, it } from "vitest";
import { getAgentManifest, listAgentManifests } from "@/agents/registry";

describe("agent registry", () => {
  it("registers the first production agents with fixed graph and tool boundaries", () => {
    expect(listAgentManifests().map((agent) => agent.agentKey)).toEqual([
      "market-broadcast-agent",
      "research-router-agent",
      "unwind-advisor-subgraph",
    ]);

    expect(getAgentManifest("market-broadcast-agent")).toMatchObject({
      agentKey: "market-broadcast-agent",
      graphKey: "marketBroadcastGraph",
      entry: "market",
      allowedSkills: ["investoday-stock-market-broadcast"],
      allowedTools: expect.arrayContaining([
        "market.overview",
        "market.changeRatioStatus",
        "market.indexRealtime",
        "news.market",
        "memory.search",
        "skill.run",
      ]),
      riskLevel: "normal",
      supportsHitl: false,
    });

    expect(getAgentManifest("research-router-agent").allowedSkills).toEqual([
      "investoday-stock-research-interpretation",
      "investoday-research-report-analysis",
      "investoday-industry-chief-analyst",
      "gs-growth-master-strategy",
      "investoday-ai-unwind-advisor",
    ]);

    expect(getAgentManifest("unwind-advisor-subgraph")).toMatchObject({
      riskLevel: "high",
      supportsHitl: true,
    });
  });

  it("throws for unknown agent keys", () => {
    expect(() => getAgentManifest("unknown-agent")).toThrow("Unknown agent");
  });
});
