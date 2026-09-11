import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { REQUIRED_PRISMA_MIGRATIONS } from "./db-infra";

const migrationsRoot = path.resolve(process.cwd(), "prisma", "migrations");

describe("Prisma migration baseline", () => {
  it("keeps every readiness migration on disk in execution order", async () => {
    expect([...REQUIRED_PRISMA_MIGRATIONS]).toEqual([...REQUIRED_PRISMA_MIGRATIONS].sort());
    for (const migration of REQUIRED_PRISMA_MIGRATIONS) {
      await expect(readFile(path.join(migrationsRoot, migration, "migration.sql"), "utf8")).resolves.toContain(";");
    }
  });

  it("enables pgvector before creating vector columns in the initial migration", async () => {
    const sql = await readFile(
      path.join(migrationsRoot, "20260724000000_initial_schema", "migration.sql"),
      "utf8"
    );
    expect(sql.indexOf("CREATE EXTENSION IF NOT EXISTS vector")).toBeGreaterThanOrEqual(0);
    expect(sql.indexOf('"embedding" vector(1536)')).toBeGreaterThan(sql.indexOf("CREATE EXTENSION IF NOT EXISTS vector"));
  });

  it("refuses to discard incompatible vectors before fixing the production dimension", async () => {
    const sql = await readFile(
      path.join(migrationsRoot, "20260908000000_rag_chunk_embedding_1536", "migration.sql"),
      "utf8"
    );
    expect(sql).toContain('vector_dims("embedding") <> 1536');
    expect(sql).toContain("RAISE EXCEPTION");
    expect(sql).not.toContain("ELSE NULL");
    expect(sql).toContain('ALTER COLUMN "embedding" TYPE vector(1536)');
  });
});
