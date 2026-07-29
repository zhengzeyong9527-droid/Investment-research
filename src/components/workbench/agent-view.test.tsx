import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentView } from "@/components/workbench/agent-view";
import type { AgentRun } from "@/components/workbench/types";

const evidence = Array.from({ length: 8 }, (_, index) => ({
  id: `evidence-${index + 1}`,
  kind: "news",
  title: `Evidence ${index + 1}`,
  source: "Investoday",
  summary: `Evidence summary ${index + 1}`,
}));

const selectedRun: AgentRun = {
  id: "run-detail",
  question: "600519 / 30",
  skillKey: "investoday-research-report-analysis",
  status: "completed",
  inputPayload: { stockCodeOrName: "600519" },
  promptPackage: "",
  outputMarkdown: "# Markdown Report\n\n| Metric | Value |\n| --- | --- |\n| Rating | Buy |\n\nFull report body.",
  evidence,
  steps: [{ id: "step-1", nodeKey: "fetch", title: "fetch", status: "completed", message: "Fetched evidence" }],
  toolCalls: [{ id: "tool-1", toolKey: "stock.briefItems", status: "completed", outputSummary: "8 records", sourceEndpoint: "stock.briefItems" }],
  modelCalls: [{ id: "model-1", model: "deepseek-v4-flash", status: "completed", tokenInput: 100, tokenOutput: 200 }],
};

describe("AgentView result rendering", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders markdown output with expand, fullscreen, copy, evidence, and execution details", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <AgentView
        catalog={[]}
        agentRuns={[selectedRun]}
        selectedRun={selectedRun}
        targets={[]}
        onSelect={vi.fn()}
        onCreated={vi.fn()}
        setLoading={vi.fn()}
        setNotice={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Markdown Report" })).not.toBeNull();
    expect(screen.getByRole("table")).not.toBeNull();
    expect(screen.getByRole("button", { name: "展开阅读全文" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "全屏查看" })).not.toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "复制 Markdown" }));
    });
    expect(writeText).toHaveBeenCalledWith(selectedRun.outputMarkdown);

    expect(screen.getByText("证据（8）")).not.toBeNull();
    expect(screen.queryByText("Evidence 8")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "展开全部证据" }));
    expect(screen.getByText("Evidence 8")).not.toBeNull();

    expect(screen.getByText("执行信息")).not.toBeNull();
    expect(screen.getAllByText("stock.briefItems").length).toBeGreaterThan(0);
    expect(screen.getByText("deepseek-v4-flash")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "全屏查看" }));
    expect(screen.getByRole("dialog", { name: "Agent 完整结果" })).not.toBeNull();
  });
});
