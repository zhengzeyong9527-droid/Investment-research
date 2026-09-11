import { describe, expect, it } from "vitest";
import {
  REQUIRED_APP_TABLES,
  REQUIRED_CHECKPOINT_TABLES,
  REQUIRED_PRISMA_MIGRATIONS,
  databaseChecksReady,
  requirePostgresUrl,
} from "./db-infra";

describe("database infrastructure contract", () => {
  it("tracks the migration and table prerequisites used by readiness", () => {
    expect(REQUIRED_PRISMA_MIGRATIONS).toEqual([
      "20260724000000_initial_schema",
      "20260803000000_rag_audit_pgvector",
      "20260803000001_batch5_json_indexes",
      "20260908000000_rag_chunk_embedding_1536",
    ]);
    expect(REQUIRED_APP_TABLES).toContain("RagChunk");
    expect(REQUIRED_CHECKPOINT_TABLES).toEqual(
      expect.arrayContaining(["checkpoints", "checkpoint_blobs", "checkpoint_writes", "checkpoint_migrations"])
    );
  });

  it("rejects a missing or non-Postgres database URL", () => {
    expect(() => requirePostgresUrl("")).toThrow(/PostgreSQL/);
    expect(() => requirePostgresUrl("mysql://localhost/db")).toThrow(/PostgreSQL/);
    expect(requirePostgresUrl("postgresql://localhost/db")).toBe("postgresql://localhost/db");
  });

  it("requires every readiness component", () => {
    const ready = {
      database: { ok: true, message: "ok" },
      migrations: { ok: true, message: "ok" },
      pgvector: { ok: true, message: "ok" },
      checkpointer: { ok: false, message: "missing" },
    };
    expect(databaseChecksReady(ready)).toBe(false);
    ready.checkpointer.ok = true;
    expect(databaseChecksReady(ready)).toBe(true);
  });
});
