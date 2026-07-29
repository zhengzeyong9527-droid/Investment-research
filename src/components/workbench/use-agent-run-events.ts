import { useEffect } from "react";
import type { AgentRun } from "@/components/workbench/types";
import { fetchJson } from "@/components/workbench/api";

const TERMINAL_STATUSES = new Set<AgentRun["status"]>(["completed", "failed", "interrupted"]);

export function isTerminalAgentRunStatus(status: AgentRun["status"]) {
  return TERMINAL_STATUSES.has(status);
}

export function useAgentRunEvents({
  runId,
  enabled,
  onUpdate,
  onTerminal,
}: {
  runId: string | null;
  enabled: boolean;
  onUpdate: (run: AgentRun) => void;
  onTerminal?: (run: AgentRun) => void;
}) {
  useEffect(() => {
    if (!runId || !enabled) return;

    let closed = false;
    let polling = false;
    let timer: number | null = null;
    let source: EventSource | null = null;

    function stop() {
      closed = true;
      if (timer) window.clearTimeout(timer);
      source?.close();
    }

    function applyRun(run: AgentRun) {
      if (closed) return true;
      onUpdate(run);
      if (isTerminalAgentRunStatus(run.status)) {
        stop();
        onTerminal?.(run);
        return true;
      }
      return false;
    }

    async function poll() {
      if (closed) return;
      try {
        const run = await fetchJson<AgentRun>(`/api/agent-runs/${runId}`);
        if (applyRun(run)) return;
      } catch {
        // Keep polling: the run may still be alive even if one detail fetch fails.
      }
      if (!closed) timer = window.setTimeout(() => void poll(), 2000);
    }

    function startPolling() {
      if (closed || polling) return;
      polling = true;
      source?.close();
      void poll();
    }

    function handleEvent(event: MessageEvent) {
      try {
        const run = JSON.parse(event.data) as AgentRun;
        if (!isAgentRun(run)) {
          startPolling();
          return;
        }
        applyRun(run);
      } catch {
        startPolling();
      }
    }

    if (typeof EventSource === "undefined") {
      startPolling();
      return stop;
    }

    source = new EventSource(`/api/agent-runs/${runId}/events`);
    source.addEventListener("update", handleEvent);
    source.addEventListener("completed", handleEvent);
    source.addEventListener("failed", handleEvent);
    source.addEventListener("interrupted", handleEvent);
    source.onerror = startPolling;

    return () => {
      source?.removeEventListener("update", handleEvent);
      source?.removeEventListener("completed", handleEvent);
      source?.removeEventListener("failed", handleEvent);
      source?.removeEventListener("interrupted", handleEvent);
      stop();
    };
  }, [enabled, onTerminal, onUpdate, runId]);
}

function isAgentRun(value: unknown): value is AgentRun {
  return typeof value === "object" && value !== null && typeof (value as AgentRun).id === "string" && typeof (value as AgentRun).status === "string";
}
