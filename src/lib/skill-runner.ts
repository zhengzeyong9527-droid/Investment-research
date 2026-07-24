import type { SkillRunner } from "@/lib/agent";

type OpenAIChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export class OpenAISkillRunner implements SkillRunner {
  readonly configured: boolean;

  constructor(
    private readonly apiKey = process.env.OPENAI_API_KEY,
    private readonly model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
  ) {
    this.configured = Boolean(apiKey);
  }

  async runSkill(input: Parameters<SkillRunner["runSkill"]>[0]) {
    if (!this.apiKey) {
      throw new Error("OpenAI API Key 未配置");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
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

    const payload = (await response.json().catch(() => ({}))) as OpenAIChatResponse;
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `OpenAI 请求失败：${response.status}`);
    }

    const outputMarkdown = payload.choices?.[0]?.message?.content?.trim();
    if (!outputMarkdown) {
      throw new Error("OpenAI 未返回可用分析内容");
    }

    return { outputMarkdown, outputHtml: null };
  }
}
