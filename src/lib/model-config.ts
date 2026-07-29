export type LlmProvider = "deepseek" | "openai";

export type LlmConfig = {
  provider: LlmProvider;
  apiKey?: string;
  model: string;
  baseUrl: string;
  chatCompletionsUrl: string;
  configured: boolean;
};

export function getLlmConfig(env: NodeJS.ProcessEnv = process.env): LlmConfig {
  const requestedProvider = clean(env.LLM_PROVIDER)?.toLowerCase();
  const useOpenAI = requestedProvider === "openai" || (!requestedProvider && Boolean(clean(env.OPENAI_API_KEY)) && !clean(env.DEEPSEEK_API_KEY));

  if (useOpenAI) {
    return buildConfig({
      provider: "openai",
      apiKey: clean(env.OPENAI_API_KEY) ?? clean(env.LLM_API_KEY),
      model: clean(env.OPENAI_MODEL) ?? clean(env.LLM_MODEL) ?? "gpt-4.1-mini",
      baseUrl: clean(env.OPENAI_BASE_URL) ?? clean(env.LLM_BASE_URL) ?? "https://api.openai.com/v1",
    });
  }

  return buildConfig({
    provider: "deepseek",
    apiKey: clean(env.DEEPSEEK_API_KEY) ?? clean(env.LLM_API_KEY),
    model: clean(env.DEEPSEEK_MODEL) ?? clean(env.LLM_MODEL) ?? "deepseek-v4-flash",
    baseUrl: clean(env.DEEPSEEK_BASE_URL) ?? clean(env.LLM_BASE_URL) ?? "https://api.deepseek.com",
  });
}

function buildConfig(input: Omit<LlmConfig, "chatCompletionsUrl" | "configured">): LlmConfig {
  const baseUrl = input.baseUrl.replace(/\/+$/, "");
  return {
    ...input,
    baseUrl,
    chatCompletionsUrl: `${baseUrl}/chat/completions`,
    configured: Boolean(input.apiKey),
  };
}

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
