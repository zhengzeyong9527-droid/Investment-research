import { useEffect } from "react";
import { fetchJson } from "@/components/workbench/api";
import type { AgentSessionDetail } from "@/components/workbench/types";

const TERMINAL = new Set(["completed", "failed", "interrupted"]);

export function useAgentSessionEvents({
  sessionId,
  enabled,
  onToken,
  onUpdate,
  onTerminal,
}: {
  sessionId?: string | null;
  enabled: boolean;
  onToken: (event: { runId?: string; token: string; markdown: string }) => void;
  onUpdate: (session: AgentSessionDetail) => void;
  onTerminal: (session: AgentSessionDetail) => void;
}) {
  useEffect(() => {
    if (!enabled || !sessionId) return;

    let cancelled = false;
    let source: EventSource | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    function stopPolling() {
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = null;
    }

    async function poll() {
      if (cancelled || !sessionId) return;
      try {
        const session = await fetchJson<AgentSessionDetail>(`/api/agent-sessions/${sessionId}`);
        if (cancelled) return;
        onUpdate(session);
        const latestRun = session.activeRun ?? session.runs[0] ?? null;
        if (latestRun && TERMINAL.has(latestRun.status)) {
          onTerminal(session);
          return;
        }
      } catch {
        // Keep polling quietly; storage may be restarting.
      }
      pollTimer = setTimeout(poll, 2000);
    }

    function wireTerminalEvent(eventName: string) {
      source?.addEventListener(eventName, (event) => {
        const session = parseEvent<AgentSessionDetail>(event);
        if (!isAgentSessionDetail(session)) {
          source?.close();
          void poll();
          return;
        }
        onTerminal(session);
        source?.close();
      });
    }

    if (typeof EventSource === "undefined") {
      void poll();
      return () => {
        cancelled = true;
        stopPolling();
      };
    }

    source = new EventSource(`/api/agent-sessions/${sessionId}/events`);
    source.addEventListener("token", (event) => {
      const payload = parseEvent<{ runId?: string; token: string; markdown: string }>(event);
      if (payload) onToken(payload);
    });
    source.addEventListener("update", (event) => {
      const session = parseEvent<AgentSessionDetail>(event);
      if (session) onUpdate(session);
    });
    wireTerminalEvent("completed");
    wireTerminalEvent("failed");
    wireTerminalEvent("interrupted");
    source.onerror = () => {
      source?.close();
      void poll();
    };

    return () => {
      cancelled = true;
      stopPolling();
      source?.close();
    };
  }, [enabled, onTerminal, onToken, onUpdate, sessionId]);
}

function parseEvent<T>(event: MessageEvent) {
  try {
    return JSON.parse(event.data) as T;
  } catch {
    return null;
  }
}

function isAgentSessionDetail(value: unknown): value is AgentSessionDetail {
  return typeof value === "object" && value !== null && Array.isArray((value as AgentSessionDetail).messages) && Array.isArray((value as AgentSessionDetail).runs);
}
