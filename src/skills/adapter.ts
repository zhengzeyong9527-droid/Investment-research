import type { ModelProvider } from "@/agents/model-provider";
import { loadSkillDefinition } from "@/skills/registry";

export type SkillAdapterInput = {
  skillKey: string;
  question: string;
  inputPayload: Record<string, unknown>;
  evidence: unknown[];
  memory: unknown[];
  conversationHistory?: Array<{ role: string; content: string }>;
};

export type SkillAdapterContext = {
  agentRunId: string;
  modelProvider: ModelProvider;
  recordModelCall?: Parameters<ModelProvider["chatMarkdown"]>[1]["recordModelCall"];
  onToken?: (token: string) => void | Promise<void>;
};

export async function runSkillAdapter(input: SkillAdapterInput, context: SkillAdapterContext) {
  const definition = await loadSkillDefinition(input.skillKey);
  const promptPackage = buildSkillPromptPackage({
    ...input,
    skillMarkdown: definition.markdown,
    complianceRules: definition.manifest.complianceRules,
  });
  const outputMarkdown = context.onToken
    ? await context.modelProvider.streamMarkdown(promptPackage, {
        agentRunId: context.agentRunId,
        recordModelCall: context.recordModelCall,
        onToken: context.onToken,
      })
    : await context.modelProvider.chatMarkdown(promptPackage, {
        agentRunId: context.agentRunId,
        recordModelCall: context.recordModelCall,
      });
  return {
    skillKey: input.skillKey,
    skillPath: definition.manifest.skillPath,
    promptPackage,
    outputMarkdown,
    outputJson: {
      skillKey: input.skillKey,
      evidenceCount: input.evidence.length,
      memoryCount: input.memory.length,
    },
  };
}

function buildSkillPromptPackage(input: SkillAdapterInput & { skillMarkdown: string; complianceRules: string[] }) {
  return [
    `# Skill: ${input.skillKey}`,
    "",
    "## User Question",
    input.question,
    "",
    "## Input Payload",
    JSON.stringify(input.inputPayload, null, 2),
    "",
    "## Conversation History",
    JSON.stringify(input.conversationHistory ?? [], null, 2),
    "",
    "## Evidence Package",
    JSON.stringify(input.evidence, null, 2),
    "",
    "## Memory Context",
    JSON.stringify(input.memory, null, 2),
    "",
    "## Compliance Rules",
    input.complianceRules.map((rule) => `- ${rule}`).join("\n"),
    "",
    "## SKILL.md",
    input.skillMarkdown,
  ].join("\n");
}
