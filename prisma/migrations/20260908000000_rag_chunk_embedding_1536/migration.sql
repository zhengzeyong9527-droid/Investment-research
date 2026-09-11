DO $$
DECLARE
  current_type TEXT;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
  INTO current_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'RagChunk'
    AND a.attname = 'embedding'
    AND NOT a.attisdropped;

  IF current_type <> 'vector(1536)' THEN
    IF EXISTS (
      SELECT 1
      FROM "RagChunk"
      WHERE "embedding" IS NOT NULL
        AND vector_dims("embedding") <> 1536
    ) THEN
      RAISE EXCEPTION
        'RagChunk.embedding contains vectors that are not 1536-dimensional. Re-embed or clear them explicitly before this migration.';
    END IF;

    DROP INDEX IF EXISTS "RagChunk_embedding_ivfflat_idx";

    EXECUTE 'ALTER TABLE "RagChunk"
      ALTER COLUMN "embedding" TYPE vector(1536)
      USING "embedding"::vector(1536)';
  END IF;
END
$$;

DROP INDEX IF EXISTS "RagChunk_embedding_ivfflat_idx";

CREATE INDEX "RagChunk_embedding_ivfflat_idx"
  ON "RagChunk"
  USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 100)
  WHERE "embedding" IS NOT NULL AND "removedAt" IS NULL;
