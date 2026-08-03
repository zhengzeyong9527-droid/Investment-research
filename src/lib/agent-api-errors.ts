import { NextResponse } from "next/server";

export const AGENT_DB_UNAVAILABLE_CODE = "AGENT_DB_UNAVAILABLE";
export const AGENT_DB_UNAVAILABLE_MESSAGE = "Agent 数据库未连接，请先启动 Postgres 服务";
export const AGENT_QUEUE_UNAVAILABLE_CODE = "AGENT_QUEUE_UNAVAILABLE";
export const AGENT_QUEUE_UNAVAILABLE_MESSAGE = "Agent 队列未连接，请先启动 Redis 或开启 AGENT_MOCK_MODE=1";

export type AgentApiErrorCategory = "infra" | "model" | "tool" | "runtime" | "validation";

export type AgentApiErrorPayload = {
  code: string;
  message: string;
  error: string;
  retryable: boolean;
  category: AgentApiErrorCategory;
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
        category: "infra",
      } satisfies AgentApiErrorPayload,
    };
  }

  if (isAgentQueueUnavailable(error)) {
    return {
      status: 503,
      payload: {
        code: AGENT_QUEUE_UNAVAILABLE_CODE,
        message: AGENT_QUEUE_UNAVAILABLE_MESSAGE,
        error: errorMessage(error) || AGENT_QUEUE_UNAVAILABLE_MESSAGE,
        retryable: true,
        category: "infra",
      } satisfies AgentApiErrorPayload,
    };
  }

  const modelError = classifyModelError(error);
  if (modelError) {
    return {
      status: modelError.status,
      payload: {
        code: modelError.code,
        message: modelError.message,
        error: errorMessage(error) || modelError.message,
        retryable: modelError.retryable,
        category: "model",
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
      category: fallbackStatus >= 500 ? "runtime" : "validation",
    } satisfies AgentApiErrorPayload,
  };
}

export function agentApiErrorResponse(error: unknown, fallbackMessage = "Agent request failed", fallbackStatus = 400) {
  const { payload, status } = createAgentApiError(error, fallbackMessage, fallbackStatus);
  return NextResponse.json(payload, { status });
}

export function isAgentDatabaseUnavailable(error: unknown) {
  const message = errorMessage(error);
  return /Can't reach database server|P1001|ECONNREFUSED|ECONNRESET|connect ETIMEDOUT|Timed out fetching a new connection/i.test(message);
}

export function isAgentQueueUnavailable(error: unknown) {
  const message = errorMessage(error);
  return /AGENT_QUEUE_UNAVAILABLE|Redis.*required|REDIS_URL is required|Queue.*unavailable|ECONNREFUSED.*6379|connect ETIMEDOUT.*6379/i.test(message);
}

function classifyModelError(error: unknown) {
  const message = errorMessage(error);
  if (/insufficient balance|insufficient_quota|quota exceeded|billing/i.test(message)) {
    return {
      code: "MODEL_INSUFFICIENT_BALANCE",
      message: "模型余额或额度不足，请检查 DeepSeek/OpenAI 账户余额。",
      status: 402,
      retryable: false,
    };
  }
  if (/invalid api key|incorrect api key|unauthorized|forbidden|401|403|api key is not configured/i.test(message)) {
    return {
      code: "MODEL_AUTH_FAILED",
      message: "模型 API Key 未配置或鉴权失败。",
      status: 401,
      retryable: false,
    };
  }
  if (/rate limit|too many requests|429/i.test(message)) {
    return {
      code: "MODEL_RATE_LIMITED",
      message: "模型服务限流，请稍后重试。",
      status: 429,
      retryable: true,
    };
  }
  return null;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "");
}
