import { readFile } from "node:fs/promises";
import path from "node:path";

export type SkillManifest = {
  skillKey: string;
  name: string;
  skillPath: string;
  version: string;
  requires: string[];
  requiredReferences: string[];
  optionalReferences: string[];
  complianceRules: string[];
  outputType: "markdown" | "json_markdown" | "html_markdown";
  riskLevel: "normal" | "high";
};

export type SkillDefinition = {
  manifest: SkillManifest;
  markdown: string;
};

const MARKET_BROADCAST_COMPLIANCE = [
  "no_buy_sell_points",
  "no_position_advice",
  "no_target_price",
  "no_stop_loss_take_profit",
  "no_trading_timing",
  "no_support_pressure_trade_basis",
  "no_short_term_signal",
];

const SKILL_MANIFESTS: SkillManifest[] = [
  {
    skillKey: "investoday-stock-market-broadcast",
    name: "Market Broadcast Skill",
    skillPath: "skills/investoday-stock-market-broadcast/SKILL.md",
    version: "1.4.1",
    requires: ["investoday-finance-data"],
    requiredReferences: [],
    optionalReferences: [],
    complianceRules: MARKET_BROADCAST_COMPLIANCE,
    outputType: "json_markdown",
    riskLevel: "normal",
  },
  researchSkill("investoday-stock-research-interpretation", "skills/investoday-stock-research-interpretation/SKILL.md"),
  researchSkill("investoday-research-report-analysis", "skills/investoday-research-report-analysis/SKILL.md"),
  researchSkill("investoday-industry-analysis", "skills/investoday-industry-chief-analyst/SKILL.md"),
  researchSkill("investoday-industry-chief-analyst", "skills/investoday-industry-chief-analyst/SKILL.md"),
  researchSkill("gs-growth-master-strategy", "skills/gs-growth-master-strategy/SKILL.md"),
  {
    ...researchSkill("investoday-ai-unwind-advisor", "skills/investoday-ai-unwind-advisor/SKILL.md"),
    riskLevel: "high",
    outputType: "markdown",
  },
];

export function listSkillManifests() {
  return SKILL_MANIFESTS;
}

export function getSkillManifest(skillKey: string): SkillManifest {
  const manifest = SKILL_MANIFESTS.find((skill) => skill.skillKey === skillKey);
  if (!manifest) {
    throw new Error(`Unknown skill: ${skillKey}`);
  }
  return manifest;
}

export async function loadSkillDefinition(skillKey: string): Promise<SkillDefinition> {
  const baseManifest = getSkillManifest(skillKey);
  const markdown = await readFile(path.join(process.cwd(), baseManifest.skillPath), "utf8");
  const frontMatter = parseFrontMatter(markdown);
  return {
    markdown,
    manifest: {
      ...baseManifest,
      version: frontMatter.version ?? baseManifest.version,
      requires: frontMatter.requires.length > 0 ? frontMatter.requires : baseManifest.requires,
    },
  };
}

function researchSkill(skillKey: string, skillPath: string): SkillManifest {
  return {
    skillKey,
    name: skillKey,
    skillPath,
    version: "1.0.0",
    requires: [],
    requiredReferences: [],
    optionalReferences: [],
    complianceRules: ["research_only", "no_trading_advice"],
    outputType: "json_markdown",
    riskLevel: "normal",
  };
}

function parseFrontMatter(markdown: string) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const frontMatter = match?.[1] ?? "";
  const version = frontMatter.match(/^version:\s*"?([^"\r\n]+)"?/m)?.[1]?.trim();
  const requiresLine = frontMatter.match(/skills:\s*\[([^\]]+)\]/)?.[1] ?? "";
  const requires = requiresLine
    .split(",")
    .map((item) => item.replace(/["']/g, "").trim())
    .filter(Boolean);
  return { version, requires };
}
