import type { SkillScope } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { getSkillCatalog } from "@/lib/skill-catalog";

export const defaultSkillEntries: Array<{
  key: string;
  name: string;
  description: string;
  scope: SkillScope;
}> = [
  {
    key: "event-decoder",
    name: "热点事件解码",
    description: "围绕新闻、公告或自选速览事件整理背景、产业链影响和后续观察变量。",
    scope: "event",
  },
  {
    key: "sector-interpretation",
    name: "板块解读",
    description: "基于板块新闻、研报和主题线索，沉淀板块逻辑、分歧和风险边界。",
    scope: "sector",
  },
  {
    key: "stock-diagnosis",
    name: "个股诊断",
    description: "从公司资料、研报线索、财务质量和风险提示角度形成非操作性研究入口。",
    scope: "stock",
  },
  {
    key: "research-viewpoint",
    name: "研报观点梳理",
    description: "聚合机构研报口径，整理共识、分歧、评级目标价口径和验证指标。",
    scope: "brief",
  },
];

export async function ensureDefaultSkills() {
  const catalogSkills = getSkillCatalog().map((skill) => ({
    key: skill.key,
    name: skill.shortName,
    description: skill.description,
    scope: skill.scope as SkillScope,
  }));
  const skills = [...defaultSkillEntries, ...catalogSkills];
  await Promise.all(
    skills.map((skill) =>
      prisma.skillEntry.upsert({
        where: { key: skill.key },
        create: { ...skill, status: "enabled" },
        update: {
          name: skill.name,
          description: skill.description,
          scope: skill.scope,
          status: "enabled",
        },
      })
    )
  );
}
