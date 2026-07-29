import { NextResponse } from "next/server";

export const AGENT_DB_UNAVAILABLE_CODE = "AGENT_DB_UNAVAILABLE";
export const AGENT_DB_UNAVAILABLE_MESSAGE = "Agent 数据库未连接，请先启动 Postgres 服务";

export type AgentApiErrorPayload = {
  code: string;
  message: string;
  error: string;
  retryable: boolean;
};

export function createAgentApiError(error: unknown, fallbackMessage = "Agent request failed", fallbackStatus = 400) {
  if (isAgentDatabaseUnavailable(error)) {
    return {
      status: 503,
      payload: {
        code: AGENT_DB_UNAVAILABLE_CODE,
        message: AGENT_DB_UNAVAILABLE_MESSAGE,
        error: AGENT_DB_UNAVAILABLE_MESSAGE,
        retryable: true,
      } satisfies AgentApiErrorPayload,
    };
  }

  const message = error instanceof Error && error.message ? error.message : fallbackMessage;
  return {
    status: fallbackStatus,
    payload: {
      code: "AGENT_REQUEST_FAILED",
      message,
      error: message,
      retryable: false,
    } satisfies AgentApiErrorPayload,
  };
}

export function agentApiErrorResponse(error: unknown, fallbackMessage = "Agent request failed", fallbackStatus = 400) {
  const { payload, status } = createAgentApiError(error, fallbackMessage, fallbackStatus);
  return NextResponse.json(payload, { status });
}

export function isAgentDatabaseUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /Can't reach database server|P1001|ECONNREFUSED|ECONNRESET|connect ETIMEDOUT|Timed out fetching a new connection/i.test(message);
}
