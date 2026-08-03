CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "RagDocument"
  ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "licenseStatus" TEXT NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS "licenseSource" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "validFrom" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "validUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "removedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "removalReason" TEXT;

ALTER TABLE "RagChunk"
  ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "licenseStatus" TEXT NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS "licenseSource" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "validFrom" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "validUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "removedAt" TIMESTAMP(3);

UPDATE "RagChunk" c
SET
  "sourceUrl" = COALESCE(c."sourceUrl", d."sourceUrl"),
  "licenseStatus" = COALESCE(NULLIF(c."licenseStatus", ''), d."licenseStatus", 'internal'),
  "licenseSource" = COALESCE(NULLIF(c."licenseSource", ''), d."licenseSource", ''),
  "publishedAt" = COALESCE(c."publishedAt", d."publishedAt"),
  "validFrom" = COALESCE(c."validFrom", d."validFrom"),
  "validUntil" = COALESCE(c."validUntil", d."validUntil"),
  "removedAt" = COALESCE(c."removedAt", d."removedAt")
FROM "RagDocument" d
WHERE c."documentId" = d."id";

CREATE INDEX IF NOT EXISTS "RagDocument_licenseStatus_idx" ON "RagDocument"("licenseStatus");
CREATE INDEX IF NOT EXISTS "RagDocument_removedAt_idx" ON "RagDocument"("removedAt");
CREATE INDEX IF NOT EXISTS "RagDocument_validUntil_idx" ON "RagDocument"("validUntil");
CREATE INDEX IF NOT EXISTS "RagChunk_licenseStatus_idx" ON "RagChunk"("licenseStatus");
CREATE INDEX IF NOT EXISTS "RagChunk_removedAt_idx" ON "RagChunk"("removedAt");
CREATE INDEX IF NOT EXISTS "RagChunk_validUntil_idx" ON "RagChunk"("validUntil");

CREATE INDEX IF NOT EXISTS "RagChunk_embedding_ivfflat_idx"
  ON "RagChunk"
  USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 100)
  WHERE "embedding" IS NOT NULL AND "removedAt" IS NULL;
