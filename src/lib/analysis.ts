import type { AnalysisStatus, SkillScope, SkillStatus } from "@/lib/types";

export type SkillLookup = {
  key: string;
  name: string;
  status: SkillStatus;
  scope: SkillScope;
};

export type AnalysisRepository = {
  getSkillEntry(key: string): Promise<SkillLookup | null>;
  createRun(data: {
    skillKey: string;
    targetId?: string;
    briefItemId?: string;
    dailyBriefId?: string;
    status: AnalysisStatus;
    inputContext: string;
    output: string | null;
  }): Promise<{
    id: string;
    status: AnalysisStatus;
    inputContext: string;
    output: string | null;
  }>;
};

export async function createAnalysisPlaceholder(input: {
  skillKey: string;
  targetId?: string;
  briefItemId?: string;
  dailyBriefId?: string;
  context: Record<string, unknown>;
  repository: AnalysisRepository;
}) {
  const skill = await input.repository.getSkillEntry(input.skillKey);
  if (!skill) {
    throw new Error("分析入口不存在");
  }

  return input.repository.createRun({
    skillKey: input.skillKey,
    targetId: input.targetId,
    briefItemId: input.briefItemId,
    dailyBriefId: input.dailyBriefId,
    status: "pending",
    inputContext: JSON.stringify(
      {
        skillName: skill.name,
        skillStatus: skill.status,
        ...input.context,
      },
      null,
      2
    ),
    output: null,
  });
}
