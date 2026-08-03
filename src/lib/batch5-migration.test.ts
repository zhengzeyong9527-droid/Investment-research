import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync("prisma/migrations/20260803000001_batch5_json_indexes/migration.sql", "utf8");
const repositoriesSource = readFileSync("src/lib/repositories.ts", "utf8");

describe("batch 5 migration contract", () => {
  it("uses safe jsonb conversion for migrated structured fields", () => {
    expect(migrationSql).toContain("investoday_safe_jsonb");
    for (const table of [
      '"WatchTarget"',
      '"AgentRun"',
      '"SkillRun"',
      '"EvidenceRecord"',
      '"ToolCall"',
      '"RagDocument"',
      '"RagChunk"',
      '"AgentEvalCase"',
      '"UserFeedback"',
    ]) {
      expect(migrationSql).toContain(`ALTER TABLE ${table}`);
      expect(migrationSql).toMatch(new RegExp(`ALTER TABLE ${table}[\\s\\S]*TYPE JSONB USING investoday_safe_jsonb`));
    }
  });

  it("adds the batch 5 high-frequency query indexes", () => {
    for (const indexName of [
      '"AgentRun_sessionId_status_updatedAt_idx"',
      '"AgentRun_status_updatedAt_idx"',
      '"ToolCall_agentRunId_toolKey_status_idx"',
      '"EvidenceRecord_agentRunId_kind_source_idx"',
      '"ModelCall_agentRunId_status_idx"',
    ]) {
      expect(migrationSql).toContain(indexName);
    }
  });

  it("freezes direct AnalysisRun creation in the repository layer", () => {
    expect(repositoriesSource).not.toContain("analysisRun.create");
    expect(repositoriesSource).toContain('triggerType: "legacy-analysis-placeholder"');
    expect(repositoriesSource).toContain("prisma.agentRun.create");
  });
});
