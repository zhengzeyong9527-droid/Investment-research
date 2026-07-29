import type { SkillRunner } from "@/lib/agent";
import { getLlmConfig, type LlmConfig } from "@/lib/model-config";

type OpenAICompatibleChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export class OpenAISkillRunner implements SkillRunner {
  readonly configured: boolean;

  constructor(private readonly config: LlmConfig = getLlmConfig()) {
    this.configured = config.configured;
  }

  async runSkill(input: Parameters<SkillRunner["runSkill"]>[0]) {
    if (!this.config.apiKey) {
      throw new Error("LLM API key is not configured. Set DEEPSEEK_API_KEY or OPENAI_API_KEY.");
    }

    const response = await fetch(this.config.chatCompletionsUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: [
              "你是一个本地个人投研产品中的中文投研 Agent。",
              "必须严格遵守提供的 SKILL.md 和合规边界。",
              "只做研究辅助和信息整理，不输出买卖点、仓位建议、止盈止损、目标收益或交易时机。",
            ].join("\n"),
          },
          {
            role: "user",
            content: input.promptPackage,
          },
        ],
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as OpenAICompatibleChatResponse;
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `${this.config.provider} request failed: ${response.status}`);
    }

    const outputMarkdown = payload.choices?.[0]?.message?.content?.trim();
    if (!outputMarkdown) {
      throw new Error(`${this.config.provider} returned no content.`);
    }

    return { outputMarkdown, outputHtml: null };
  }
}
