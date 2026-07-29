import { createHash } from "node:crypto";
import { getLlmConfig, type LlmConfig } from "@/lib/model-config";

export type ModelCallRecorder = (data: {
  agentRunId: string;
  model: string;
  mode: string;
  promptHash: string;
  tokenInput: number;
  tokenOutput: number;
  costCents: number;
  latencyMs: number;
  status: string;
  error?: string | null;
}) => Promise<{ id: string }>;

export type ModelRuntimeContext = {
  agentRunId: string;
  recordModelCall?: ModelCallRecorder;
};

export type StreamMarkdownContext = ModelRuntimeContext & {
  onToken?: (token: string) => void | Promise<void>;
};

export type ModelProvider = {
  configured: boolean;
  model: string;
  chatMarkdown(prompt: string, context: ModelRuntimeContext): Promise<string>;
  streamMarkdown(prompt: string, context: StreamMarkdownContext): Promise<string>;
  chatJson<T extends Record<string, unknown>>(prompt: string, context: ModelRuntimeContext): Promise<T>;
};

type OpenAICompatibleChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
};

type OpenAICompatibleStreamChunk = {
  choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
  error?: { message?: string };
};

export class OpenAIModelProvider implements ModelProvider {
  readonly configured: boolean;
  readonly model: string;
  readonly provider: string;

  constructor(private readonly config: LlmConfig = getLlmConfig()) {
    this.configured = config.configured;
    this.model = config.model;
    this.provider = config.provider;
  }

  async chatMarkdown(prompt: string, context: ModelRuntimeContext): Promise<string> {
    return this.callChatCompletions(prompt, "markdown", context);
  }

  async streamMarkdown(prompt: string, context: StreamMarkdownContext): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error("LLM API key is not configured. Set DEEPSEEK_API_KEY or OPENAI_API_KEY.");
    }
    const startedAt = Date.now();
    const promptHash = hashText(prompt);
    let output = "";
    try {
      const response = await fetch(this.config.chatCompletionsUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          stream: true,
          messages: [
            {
              role: "system",
              content: "You are an Investoday research agent. Stay evidence-based and never provide trading instructions.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => ({}))) as OpenAICompatibleChatResponse;
        throw new Error(payload.error?.message ?? `${this.provider} request failed: ${response.status}`);
      }

      const decoder = new TextDecoder();
      let buffer = "";
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          output += await parseStreamLine(line, context);
        }
      }
      if (buffer.trim()) {
        output += await parseStreamLine(buffer, context);
      }
      output = output.trim();
      if (!output) {
        throw new Error(`${this.provider} returned no content.`);
      }
      await context.recordModelCall?.({
        agentRunId: context.agentRunId,
        model: this.model,
        mode: "markdown_stream",
        promptHash,
        tokenInput: estimateTokens(prompt),
        tokenOutput: estimateTokens(output),
        costCents: 0,
        latencyMs: Date.now() - startedAt,
        status: "completed",
        error: null,
      });
      return output;
    } catch (error) {
      await context.recordModelCall?.({
        agentRunId: context.agentRunId,
        model: this.model,
        mode: "markdown_stream",
        promptHash,
        tokenInput: estimateTokens(prompt),
        tokenOutput: estimateTokens(output),
        costCents: 0,
        latencyMs: Date.now() - startedAt,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async chatJson<T extends Record<string, unknown>>(prompt: string, context: ModelRuntimeContext): Promise<T> {
    const content = await this.callChatCompletions(`${prompt}\n\nReturn strict JSON only.`, "json", context);
    return JSON.parse(content) as T;
  }

  private async callChatCompletions(prompt: string, mode: string, context: ModelRuntimeContext) {
    if (!this.config.apiKey) {
      throw new Error("LLM API key is not configured. Set DEEPSEEK_API_KEY or OPENAI_API_KEY.");
    }
    const startedAt = Date.now();
    const promptHash = hashText(prompt);
    try {
      const response = await fetch(this.config.chatCompletionsUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: "You are an Investoday research agent. Stay evidence-based and never provide trading instructions.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as OpenAICompatibleChatResponse;
      if (!response.ok) {
        throw new Error(payload.error?.message ?? `${this.provider} request failed: ${response.status}`);
      }
      const output = payload.choices?.[0]?.message?.content?.trim();
      if (!output) {
        throw new Error(`${this.provider} returned no content.`);
      }
      await context.recordModelCall?.({
        agentRunId: context.agentRunId,
        model: this.model,
        mode,
        promptHash,
        tokenInput: payload.usage?.prompt_tokens ?? estimateTokens(prompt),
        tokenOutput: payload.usage?.completion_tokens ?? estimateTokens(output),
        costCents: 0,
        latencyMs: Date.now() - startedAt,
        status: "completed",
        error: null,
      });
      return output;
    } catch (error) {
      await context.recordModelCall?.({
        agentRunId: context.agentRunId,
        model: this.model,
        mode,
        promptHash,
        tokenInput: estimateTokens(prompt),
        tokenOutput: 0,
        costCents: 0,
        latencyMs: Date.now() - startedAt,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export class StaticModelProvider implements ModelProvider {
  configured = true;
  model = "static-test-model";

  constructor(private readonly output: string | Record<string, unknown>) {}

  async chatMarkdown(_prompt: string, _context: ModelRuntimeContext) {
    return typeof this.output === "string" ? this.output : JSON.stringify(this.output);
  }

  async streamMarkdown(_prompt: string, context: StreamMarkdownContext) {
    const output = typeof this.output === "string" ? this.output : JSON.stringify(this.output);
    await context.onToken?.(output);
    return output;
  }

  async chatJson<T extends Record<string, unknown>>(_prompt: string, _context: ModelRuntimeContext) {
    return (typeof this.output === "string" ? JSON.parse(this.output) : this.output) as T;
  }
}

function hashText(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

async function parseStreamLine(line: string, context: StreamMarkdownContext) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return "";
  const data = trimmed.slice(5).trim();
  if (!data || data === "[DONE]") return "";
  const parsed = JSON.parse(data) as OpenAICompatibleStreamChunk;
  if (parsed.error?.message) throw new Error(parsed.error.message);
  const token = parsed.choices?.[0]?.delta?.content;
  if (!token) return "";
  await context.onToken?.(token);
  return token;
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}
