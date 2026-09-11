import { describe, expect, it, vi } from "vitest";
import { OpenAIModelProvider } from "@/agents/model-provider";
import { getLlmConfig } from "@/lib/model-config";
import { testProcessEnv } from "@/test/agent-fixtures";

describe("LLM model provider", () => {
  it("prefers DeepSeek OpenAI-compatible configuration", async () => {
    const config = getLlmConfig(testProcessEnv({
      LLM_PROVIDER: "deepseek",
      DEEPSEEK_API_KEY: "test-deepseek-key",
      DEEPSEEK_MODEL: "deepseek-v4-flash",
      DEEPSEEK_BASE_URL: "https://api.deepseek.com",
    }));
    expect(config).toMatchObject({
      provider: "deepseek",
      model: "deepseek-v4-flash",
      chatCompletionsUrl: "https://api.deepseek.com/chat/completions",
      configured: true,
    });

    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({
        choices: [{ message: { content: "盘面播报内容" } }],
        usage: { prompt_tokens: 10, completion_tokens: 6 },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const recordModelCall = vi.fn(async () => ({ id: "model-call-1" }));

    const output = await new OpenAIModelProvider(config).chatMarkdown("生成盘面行情播报", {
      agentRunId: "run-1",
      recordModelCall,
    });

    expect(output).toBe("盘面播报内容");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-deepseek-key",
        }),
      })
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      model: "deepseek-v4-flash",
      temperature: 0.2,
    });
    expect(recordModelCall).toHaveBeenCalledWith(expect.objectContaining({ model: "deepseek-v4-flash", status: "completed" }));
  });

  it("streams markdown chunks from an OpenAI-compatible response", async () => {
    const encoder = new TextEncoder();
    const chunks = [
      'data: {"choices":[{"delta":{"content":"Hello "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"world"}}]}\n\n',
      "data: [DONE]\n\n",
    ];
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } }))
    );
    const recordModelCall = vi.fn(async () => ({ id: "model-call-stream" }));
    const onToken = vi.fn();

    const output = await new OpenAIModelProvider({
      provider: "deepseek",
      apiKey: "test-deepseek-key",
      model: "deepseek-v4-flash",
      baseUrl: "https://api.deepseek.com",
      chatCompletionsUrl: "https://api.deepseek.com/chat/completions",
      configured: true,
    }).streamMarkdown("stream please", { agentRunId: "run-stream", recordModelCall, onToken });

    expect(output).toBe("Hello world");
    expect(onToken).toHaveBeenNthCalledWith(1, "Hello ");
    expect(onToken).toHaveBeenNthCalledWith(2, "world");
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))).toMatchObject({
      model: "deepseek-v4-flash",
      stream: true,
    });
    expect(recordModelCall).toHaveBeenCalledWith(expect.objectContaining({ mode: "markdown_stream", status: "completed" }));
  });
});
