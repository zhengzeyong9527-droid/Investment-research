import { describe, expect, it, vi } from "vitest";
import {
  adoptLegacyDatabase,
  assertLegacyDatabaseAdoptable,
  LEGACY_BASELINE_MIGRATIONS,
  type LegacyDatabaseInspection,
} from "./db-adopt";

function validInspection(
  overrides: Partial<LegacyDatabaseInspection> = {}
): LegacyDatabaseInspection {
  return {
  missingTables: [],
  missingColumns: [],
  invalidJsonColumns: [],
  migrationTableExists: false,
  vectorExtensionExists: true,
  ragChunkEmbeddingType: "vector",
  incompatibleEmbeddingCount: 0,
  ragChunkEmbeddingIndexExists: false,
    ...overrides,
  };
}

describe("legacy database adoption guard", () => {
  it("requires explicit confirmation before connecting or changing migration history", async () => {
    await expect(adoptLegacyDatabase([], "postgresql://localhost/unused")).rejects.toThrow("--confirm-backup");
  });

  it("rejects incompatible vectors before changing migration history", async () => {
    const run = vi.fn();
    const bootstrap = vi.fn();
    await expect(
      adoptLegacyDatabase(["--confirm-backup"], "postgresql://localhost/unused", {
        inspect: vi.fn().mockResolvedValue(validInspection({ incompatibleEmbeddingCount: 3 })),
        run,
        bootstrap,
      })
    ).rejects.toThrow("3 non-1536-dimensional");
    expect(run).not.toHaveBeenCalled();
    expect(bootstrap).not.toHaveBeenCalled();
  });

  it("baselines only historical migrations and executes the final migration through bootstrap", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    const bootstrap = vi.fn().mockResolvedValue(undefined);
    const databaseUrl = "postgresql://localhost/adoption-test";

    await adoptLegacyDatabase(["--confirm-backup"], databaseUrl, {
      inspect: vi.fn().mockResolvedValue(validInspection()),
      run,
      bootstrap,
    });

    expect(run.mock.calls.map(([, args]) => args.at(-1))).toEqual([...LEGACY_BASELINE_MIGRATIONS]);
    expect(run.mock.calls.flat().join(" ")).not.toContain("20260908000000_rag_chunk_embedding_1536");
    expect(bootstrap).toHaveBeenCalledWith(databaseUrl);
  });

  it("accepts an unconstrained vector column only when every stored vector is 1536-dimensional", () => {
    expect(() => assertLegacyDatabaseAdoptable(validInspection())).not.toThrow();
    expect(() =>
      assertLegacyDatabaseAdoptable(validInspection({ ragChunkEmbeddingType: "text" }))
    ).toThrow("expected a pgvector column");
  });

  it.each([
    ["missing core tables", validInspection({ missingTables: ["RagChunk"] }), "missing core tables"],
    ["missing required columns", validInspection({ missingColumns: ["RagChunk.embedding"] }), "missing required columns"],
    [
      "incompatible JSON columns",
      validInspection({ invalidJsonColumns: ["RagChunk.metadata:text"] }),
      "incompatible types",
    ],
    ["existing migration history", validInspection({ migrationTableExists: true }), "already exists"],
    ["missing pgvector", validInspection({ vectorExtensionExists: false }), "pgvector is not installed"],
  ])("rejects %s before adoption", (_label, inspection, message) => {
    expect(() => assertLegacyDatabaseAdoptable(inspection)).toThrow(message);
  });
});
