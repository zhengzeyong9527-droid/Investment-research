import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { act } from "react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkbenchApp } from "@/components/workbench-app";
import type { AgentRun, AgentSession, AgentSessionDetail } from "@/components/workbench/types";

const runningRun: AgentRun = {
  id: "run-live",
  question: "600519 / 30",
  skillKey: "investoday-research-report-analysis",
  status: "fetching_data",
  inputPayload: { stockCodeOrName: "600519" },
  promptPackage: "",
};

const completedRun: AgentRun = {
  ...runningRun,
  status: "completed",
  outputMarkdown: "# Final Report\n\nLive completed report body.",
  evidence: [{ id: "evidence-1", kind: "news", title: "Live evidence", source: "Investoday", summary: "Evidence summary" }],
};

const sessionSummary: AgentSession = {
  id: "session-live",
  title: "600519 / 30",
  entry: "research",
  lastActiveAt: "2026-07-27T10:00:00.000Z",
  createdAt: "2026-07-27T10:00:00.000Z",
  updatedAt: "2026-07-27T10:00:00.000Z",
};

const runningSession: AgentSessionDetail = {
  ...sessionSummary,
  messages: [{ id: "message-user", sessionId: "session-live", role: "user", content: "600519 / 30", createdAt: "2026-07-27T10:00:00.000Z" }],
  runs: [runningRun],
  activeRun: runningRun,
};

const completedSession: AgentSessionDetail = {
  ...sessionSummary,
  messages: [
    { id: "message-user", sessionId: "session-live", role: "user", content: "600519 / 30", createdAt: "2026-07-27T10:00:00.000Z" },
    {
      id: "message-assistant",
      sessionId: "session-live",
      agentRunId: "run-live",
      role: "assistant",
      content: "# Final Report\n\nLive completed report body.",
      createdAt: "2026-07-27T10:01:00.000Z",
    },
  ],
  runs: [completedRun],
  activeRun: null,
};

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  listeners = new Map<string, Array<(event: MessageEvent) => void>>();
  onerror: (() => void) | null = null;
  closed = false;
  url: string;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((item) => item !== listener)
    );
  }

  close() {
    this.closed = true;
  }

  emit(type: string, payload: unknown) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data: JSON.stringify(payload) } as MessageEvent);
    }
  }
}

function jsonResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as Response;
}

function basePayloadFor(url: string) {
  if (url === "/api/watch-targets") return [];
  if (url.startsWith("/api/briefs?")) return null;
  if (url === "/api/skill-catalog") return [];
  if (url === "/api/briefs/history") return [];
  if (url === "/api/settings") {
    return { briefTime: "08:30", dataWindowHours: 24, backfillDays: 7, defaultItemLimit: 20 };
  }
  if (url === "/api/agent-sessions") return [sessionSummary];
  if (url === "/api/agent-sessions/session-live") return runningSession;
  if (url === "/api/agent-runs") return [];
  if (url === "/api/agent-runs/run-live") return runningRun;
  return [];
}

describe("agent session live updates", () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => jsonResponse(basePayloadFor(String(input))))
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("updates selected run and queue when SSE emits a completed event", async () => {
    render(<WorkbenchApp />);

    const navigation = screen.getByRole("navigation");
    fireEvent.click(within(navigation).getAllByRole("button")[2]);
    fireEvent.click(await screen.findByText("600519 / 30"));
    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    expect(FakeEventSource.instances[0].url).toBe("/api/agent-sessions/session-live/events");

    act(() => {
      FakeEventSource.instances[0].emit("completed", completedSession);
    });

    expect(await screen.findByRole("heading", { name: "Final Report" })).not.toBeNull();
    expect(screen.getAllByText("Live completed report body.").length).toBeGreaterThan(0);
    expect(FakeEventSource.instances[0].closed).toBe(true);
  });

  it("falls back to polling when SSE errors", async () => {
    let sessionDetailCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/agent-sessions/session-live") {
          sessionDetailCalls += 1;
          return jsonResponse(sessionDetailCalls === 1 ? runningSession : completedSession);
        }
        return jsonResponse(basePayloadFor(url));
      })
    );

    render(<WorkbenchApp />);
    const navigation = screen.getByRole("navigation");
    fireEvent.click(within(navigation).getAllByRole("button")[2]);
    fireEvent.click(await screen.findByText("600519 / 30"));
    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));

    act(() => {
      FakeEventSource.instances[0].onerror?.();
    });

    expect(await screen.findByRole("heading", { name: "Final Report" })).not.toBeNull();
    expect(fetch).toHaveBeenCalledWith("/api/agent-sessions/session-live", { cache: "no-store" });
  });
});
