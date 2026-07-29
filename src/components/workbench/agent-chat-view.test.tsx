import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentChatView } from "@/components/workbench/agent-chat-view";
import type { AgentMessage, AgentRun, AgentSession, SkillCatalogItem } from "@/components/workbench/types";

const catalog: SkillCatalogItem[] = [
  {
    key: "investoday-research-report-analysis",
    name: "Research Report",
    shortName: "Report",
    description: "",
    scenario: "",
    scope: "stock",
    riskLevel: "normal",
    requiredInputs: [],
    optionalInputs: [],
    compliance: [],
  },
];

const session: AgentSession = {
  id: "session-1",
  title: "600519 / 30",
  entry: "research",
  lastActiveAt: "2026-07-27T10:00:00.000Z",
  createdAt: "2026-07-27T10:00:00.000Z",
  updatedAt: "2026-07-27T10:00:00.000Z",
};

const messages: AgentMessage[] = [
  { id: "message-user", sessionId: "session-1", role: "user", content: "600519 / 30", createdAt: "2026-07-27T10:00:00.000Z" },
  {
    id: "message-assistant",
    sessionId: "session-1",
    agentRunId: "run-1",
    role: "assistant",
    content: "# Report\n\nCompleted body.",
    createdAt: "2026-07-27T10:01:00.000Z",
  },
];

describe("AgentChatView", () => {
  afterEach(() => cleanup());

  it("sends a chat message with the selected ability", () => {
    const onSendMessage = vi.fn();
    render(
      <AgentChatView
        catalog={catalog}
        sessions={[session]}
        selectedSession={session}
        messages={messages}
        activeRun={null}
        streamingMarkdown=""
        onNewSession={vi.fn()}
        onSelectSession={vi.fn()}
        onSendMessage={onSendMessage}
        onOpenRunDetail={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("能力选择"), { target: { value: "investoday-research-report-analysis" } });
    fireEvent.change(screen.getByLabelText("输入投研问题"), { target: { value: "continue with risks" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));

    expect(onSendMessage).toHaveBeenCalledWith("continue with risks", "investoday-research-report-analysis");
  });

  it("restores the draft when sending fails", async () => {
    const onSendMessage = vi.fn(async () => false);
    render(
      <AgentChatView
        catalog={catalog}
        sessions={[session]}
        selectedSession={session}
        messages={messages}
        activeRun={null}
        streamingMarkdown=""
        onNewSession={vi.fn()}
        onSelectSession={vi.fn()}
        onSendMessage={onSendMessage}
        onOpenRunDetail={vi.fn()}
      />
    );

    const input = screen.getByLabelText("\u8f93\u5165\u6295\u7814\u95ee\u9898") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "continue with risks" } });
    fireEvent.submit(input.form!);

    await waitFor(() => {
      expect(input.value).toBe("continue with risks");
    });
  });

  it("renders a streaming assistant bubble from the active run", () => {
    const activeRun: AgentRun = {
      id: "run-streaming",
      sessionId: "session-1",
      question: "continue",
      skillKey: "investoday-research-report-analysis",
      status: "running_skill",
      inputPayload: {},
      promptPackage: "",
      outputMarkdown: "Partial answer",
    };

    render(
      <AgentChatView
        catalog={catalog}
        sessions={[session]}
        selectedSession={session}
        messages={messages}
        activeRun={activeRun}
        streamingMarkdown="Partial answer plus token"
        onNewSession={vi.fn()}
        onSelectSession={vi.fn()}
        onSendMessage={vi.fn()}
        onOpenRunDetail={vi.fn()}
      />
    );

    expect(screen.getByText("Partial answer plus token")).not.toBeNull();
    expect(screen.getByText("生成中")).not.toBeNull();
  });

  it("disables chat actions but keeps ability selection available when storage is unavailable", () => {
    const onSendMessage = vi.fn();
    render(
      <AgentChatView
        catalog={catalog}
        sessions={[]}
        selectedSession={null}
        messages={[]}
        activeRun={null}
        streamingMarkdown=""
        onNewSession={vi.fn()}
        onSelectSession={vi.fn()}
        onSendMessage={onSendMessage}
        onOpenRunDetail={vi.fn()}
        agentStorageAvailable={false}
        agentStorageMessage="Agent 数据库未连接。请依次启动 pnpm services:start、pnpm db:push、pnpm worker:agent、pnpm dev。"
      />
    );

    expect(screen.getByRole("alert").textContent).toContain("Agent 数据库未连接");
    expect((screen.getByRole("button", { name: "新建对话" }) as HTMLButtonElement).disabled).toBe(true);

    const abilitySelect = screen.getByLabelText("能力选择") as HTMLSelectElement;
    fireEvent.change(abilitySelect, { target: { value: "investoday-research-report-analysis" } });
    expect(abilitySelect.value).toBe("investoday-research-report-analysis");

    fireEvent.change(screen.getByLabelText("输入投研问题"), { target: { value: "continue with risks" } });
    expect((screen.getByRole("button", { name: "发送" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it("hides raw HTML source in assistant markdown and keeps the process behind a button", () => {
    render(
      <AgentChatView
        catalog={catalog}
        sessions={[session]}
        selectedSession={session}
        messages={[
          {
            id: "message-html",
            sessionId: "session-1",
            agentRunId: "run-html",
            role: "assistant",
            content: "Visible summary\n\n```html\n<!DOCTYPE html><html><body>hidden source</body></html>\n```",
            createdAt: "2026-07-27T10:01:00.000Z",
          },
        ]}
        activeRun={null}
        streamingMarkdown=""
        onNewSession={vi.fn()}
        onSelectSession={vi.fn()}
        onSendMessage={vi.fn()}
        onOpenRunDetail={vi.fn()}
      />
    );

    expect(screen.getByText("Visible summary")).not.toBeNull();
    expect(screen.queryByText(/DOCTYPE html/)).toBeNull();
    expect(screen.getByRole("button", { name: /\u67e5\u770b\u8fc7\u7a0b/ })).not.toBeNull();
  });

  it("shows generated HTML artifacts as links in the process drawer", () => {
    const runDetail: AgentRun = {
      id: "run-html",
      sessionId: "session-1",
      question: "\u751f\u6210HTML",
      skillKey: "investoday-stock-research-interpretation",
      status: "completed",
      inputPayload: {},
      promptPackage: "",
      outputMarkdown: "[\u6253\u5f00 HTML \u62a5\u544a](/api/skill-runs/skill-run-1/html)",
      outputJson: {
        artifacts: [{ kind: "html", title: "\u0048\u0054\u004d\u004c \u62a5\u544a", url: "/api/skill-runs/skill-run-1/html" }],
      },
    };

    render(
      <AgentChatView
        catalog={catalog}
        sessions={[session]}
        selectedSession={session}
        messages={messages}
        activeRun={null}
        streamingMarkdown=""
        onNewSession={vi.fn()}
        onSelectSession={vi.fn()}
        onSendMessage={vi.fn()}
        onOpenRunDetail={vi.fn()}
        runDetail={runDetail}
        onCloseRunDetail={vi.fn()}
      />
    );

    const link = screen.getByRole("link", { name: /HTML/ });
    expect(link.getAttribute("href")).toBe("/api/skill-runs/skill-run-1/html");
  });
});
