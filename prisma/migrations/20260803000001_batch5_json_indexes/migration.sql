CREATE OR REPLACE FUNCTION investoday_safe_jsonb(value TEXT, fallback JSONB)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF value IS NULL OR btrim(value) = '' THEN
    RETURN fallback;
  END IF;
  RETURN value::jsonb;
EXCEPTION WHEN others THEN
  RETURN fallback;
END;
$$;

ALTER TABLE "WatchTarget"
  ALTER COLUMN "tags" DROP DEFAULT,
  ALTER COLUMN "tags" TYPE JSONB USING investoday_safe_jsonb("tags", '[]'::jsonb),
  ALTER COLUMN "tags" SET DEFAULT '[]'::jsonb;

ALTER TABLE "AgentRun"
  ALTER COLUMN "inputPayload" DROP DEFAULT,
  ALTER COLUMN "inputPayload" TYPE JSONB USING investoday_safe_jsonb("inputPayload", '{}'::jsonb),
  ALTER COLUMN "inputPayload" SET DEFAULT '{}'::jsonb,
  ALTER COLUMN "outputJson" DROP DEFAULT,
  ALTER COLUMN "outputJson" TYPE JSONB USING investoday_safe_jsonb("outputJson", '{}'::jsonb),
  ALTER COLUMN "outputJson" SET DEFAULT '{}'::jsonb;

ALTER TABLE "SkillRun"
  ALTER COLUMN "inputPayload" DROP DEFAULT,
  ALTER COLUMN "inputPayload" TYPE JSONB USING investoday_safe_jsonb("inputPayload", '{}'::jsonb),
  ALTER COLUMN "inputPayload" SET DEFAULT '{}'::jsonb;

ALTER TABLE "EvidenceRecord"
  ALTER COLUMN "rawPayload" DROP DEFAULT,
  ALTER COLUMN "rawPayload" TYPE JSONB USING investoday_safe_jsonb("rawPayload", '{}'::jsonb),
  ALTER COLUMN "rawPayload" SET DEFAULT '{}'::jsonb;

ALTER TABLE "ToolCall"
  ALTER COLUMN "inputJson" DROP DEFAULT,
  ALTER COLUMN "inputJson" TYPE JSONB USING investoday_safe_jsonb("inputJson", '{}'::jsonb),
  ALTER COLUMN "inputJson" SET DEFAULT '{}'::jsonb;

ALTER TABLE "RagDocument"
  ALTER COLUMN "metadata" DROP DEFAULT,
  ALTER COLUMN "metadata" TYPE JSONB USING investoday_safe_jsonb("metadata", '{}'::jsonb),
  ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb;

ALTER TABLE "RagChunk"
  ALTER COLUMN "metadata" DROP DEFAULT,
  ALTER COLUMN "metadata" TYPE JSONB USING investoday_safe_jsonb("metadata", '{}'::jsonb),
  ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb;

ALTER TABLE "AgentEvalCase"
  ALTER COLUMN "inputJson" DROP DEFAULT,
  ALTER COLUMN "inputJson" TYPE JSONB USING investoday_safe_jsonb("inputJson", '{}'::jsonb),
  ALTER COLUMN "inputJson" SET DEFAULT '{}'::jsonb;

ALTER TABLE "UserFeedback"
  ALTER COLUMN "tags" DROP DEFAULT,
  ALTER COLUMN "tags" TYPE JSONB USING investoday_safe_jsonb("tags", '[]'::jsonb),
  ALTER COLUMN "tags" SET DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS "AgentRun_sessionId_status_updatedAt_idx" ON "AgentRun"("sessionId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "AgentRun_status_updatedAt_idx" ON "AgentRun"("status", "updatedAt");
CREATE INDEX IF NOT EXISTS "ToolCall_agentRunId_toolKey_status_idx" ON "ToolCall"("agentRunId", "toolKey", "status");
CREATE INDEX IF NOT EXISTS "EvidenceRecord_agentRunId_kind_source_idx" ON "EvidenceRecord"("agentRunId", "kind", "source");
CREATE INDEX IF NOT EXISTS "ModelCall_agentRunId_status_idx" ON "ModelCall"("agentRunId", "status");

DROP FUNCTION investoday_safe_jsonb(TEXT, JSONB);
