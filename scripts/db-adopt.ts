import { Client } from "pg";
import { bootstrapDatabase, runCommand } from "./db-bootstrap";
import { REQUIRED_APP_TABLES, requirePostgresUrl } from "./db-infra";
import { isDirectExecution } from "./direct-execution";
import { loadDotEnv } from "../src/lib/load-env";

const confirmationFlag = "--confirm-backup";
export const LEGACY_BASELINE_MIGRATIONS = [
  "20260724000000_initial_schema",
  "20260803000000_rag_audit_pgvector",
  "20260803000001_batch5_json_indexes",
] as const;
const expectedColumns = {
  AgentRun: ["id", "inputPayload", "outputJson", "updatedAt"],
  RagDocument: ["id", "metadata", "licenseStatus", "sourceUrl", "removedAt"],
  RagChunk: ["id", "documentId", "metadata", "embedding", "licenseStatus", "removedAt"],
} as const;

export async function inspectLegacyDatabase(databaseUrl = requirePostgresUrl()) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    // A pg Client owns one connection; keep adoption probes sequential so pg 9
    // does not reject concurrent query() calls on the same client.
    const tables = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [[...REQUIRED_APP_TABLES]]
    );
    const columns = await client.query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [[...REQUIRED_APP_TABLES]]
    );
    const prismaMigrations = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
       ) AS exists`
    );
    const extension = await client.query<{ exists: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS exists"
    );
    const vectorColumn = await client.query<{ formatted_type: string }>(
      `SELECT format_type(a.atttypid, a.atttypmod) AS formatted_type
       FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = 'RagChunk'
         AND a.attname = 'embedding' AND NOT a.attisdropped`
    );
    const jsonColumns = await client.query<{ table_name: string; column_name: string; data_type: string }>(
      `SELECT table_name, column_name, data_type FROM information_schema.columns
       WHERE table_schema = 'public' AND (table_name, column_name) IN (
         ('AgentRun', 'inputPayload'), ('AgentRun', 'outputJson'),
         ('RagDocument', 'metadata'), ('RagChunk', 'metadata')
       )`
    );
    const embeddingIndex = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM pg_indexes
         WHERE schemaname = 'public' AND indexname = 'RagChunk_embedding_ivfflat_idx'
       ) AS exists`
    );
    const names = new Set(tables.rows.map((row) => row.table_name));
    const missingTables = REQUIRED_APP_TABLES.filter((name) => !names.has(name));
    const availableColumns = new Set(columns.rows.map((row) => `${row.table_name}.${row.column_name}`));
    const missingColumns = Object.entries(expectedColumns).flatMap(([table, required]) =>
      required.filter((column) => !availableColumns.has(`${table}.${column}`)).map((column) => `${table}.${column}`)
    );
    const invalidJsonColumns = jsonColumns.rows
      .filter((row) => row.data_type !== "jsonb")
      .map((row) => `${row.table_name}.${row.column_name}:${row.data_type}`);
    const foundJsonColumns = new Set(jsonColumns.rows.map((row) => `${row.table_name}.${row.column_name}`));
    const missingJsonColumns = [
      "AgentRun.inputPayload",
      "AgentRun.outputJson",
      "RagDocument.metadata",
      "RagChunk.metadata",
    ].filter((column) => !foundJsonColumns.has(column));
    const ragChunkEmbeddingType = vectorColumn.rows[0]?.formatted_type ?? "missing";
    let incompatibleEmbeddingCount = 0;
    if (
      missingTables.length === 0 &&
      !missingColumns.includes("RagChunk.embedding") &&
      extension.rows[0]?.exists === true &&
      /^vector(?:\(\d+\))?$/.test(ragChunkEmbeddingType)
    ) {
      const incompatibleEmbeddings = await client.query<{ count: number }>(
        `SELECT COUNT(*)::integer AS count
         FROM "RagChunk"
         WHERE "embedding" IS NOT NULL AND vector_dims("embedding") <> 1536`
      );
      incompatibleEmbeddingCount = incompatibleEmbeddings.rows[0]?.count ?? 0;
    }
    return {
      missingTables,
      missingColumns,
      invalidJsonColumns: [...missingJsonColumns.map((column) => `${column}:missing`), ...invalidJsonColumns],
      migrationTableExists: prismaMigrations.rows[0]?.exists === true,
      vectorExtensionExists: extension.rows[0]?.exists === true,
      ragChunkEmbeddingType,
      incompatibleEmbeddingCount,
      ragChunkEmbeddingIndexExists: embeddingIndex.rows[0]?.exists === true,
    };
  } finally {
    await client.end();
  }
}

export type LegacyDatabaseInspection = Awaited<ReturnType<typeof inspectLegacyDatabase>>;

export function assertLegacyDatabaseAdoptable(inspection: LegacyDatabaseInspection) {
  if (inspection.missingTables.length > 0) {
    throw new Error(`Refusing adoption; missing core tables: ${inspection.missingTables.join(", ")}.`);
  }
  if (inspection.missingColumns.length > 0) {
    throw new Error(`Refusing adoption; missing required columns: ${inspection.missingColumns.join(", ")}.`);
  }
  if (inspection.invalidJsonColumns.length > 0) {
    throw new Error(`Refusing adoption; required JSONB columns have incompatible types: ${inspection.invalidJsonColumns.join(", ")}.`);
  }
  if (inspection.migrationTableExists) {
    throw new Error("Refusing adoption; _prisma_migrations already exists. Use prisma migrate status instead.");
  }
  if (!inspection.vectorExtensionExists) {
    throw new Error("Refusing adoption; pgvector is not installed in the target database.");
  }
  if (!/^vector(?:\(\d+\))?$/.test(inspection.ragChunkEmbeddingType)) {
    throw new Error(
      `Refusing adoption; RagChunk.embedding is ${inspection.ragChunkEmbeddingType}, expected a pgvector column.`
    );
  }
  if (inspection.incompatibleEmbeddingCount > 0) {
    throw new Error(
      `Refusing adoption; RagChunk.embedding contains ${inspection.incompatibleEmbeddingCount} non-1536-dimensional vector(s). Back up and re-embed or explicitly clear those vectors before adoption.`
    );
  }
}

type AdoptionDependencies = {
  inspect(databaseUrl: string): Promise<LegacyDatabaseInspection>;
  run(command: string, args: string[]): Promise<void>;
  bootstrap(databaseUrl: string): Promise<unknown>;
};

const defaultAdoptionDependencies: AdoptionDependencies = {
  inspect: inspectLegacyDatabase,
  run: runCommand,
  bootstrap: bootstrapDatabase,
};

export async function adoptLegacyDatabase(
  args = process.argv.slice(2),
  databaseUrl = requirePostgresUrl(),
  dependencies: AdoptionDependencies = defaultAdoptionDependencies
) {
  if (!args.includes(confirmationFlag)) {
    throw new Error(`Refusing to adopt an existing database without ${confirmationFlag}. Create and verify a backup first.`);
  }
  const inspection = await dependencies.inspect(databaseUrl);
  assertLegacyDatabaseAdoptable(inspection);

  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = databaseUrl;
  try {
    // These migrations describe the already-present legacy schema. The final
    // vector(1536) migration must run for real; never mark it applied here.
    for (const migration of LEGACY_BASELINE_MIGRATIONS) {
      await dependencies.run("pnpm", ["exec", "prisma", "migrate", "resolve", "--applied", migration]);
    }
    await dependencies.bootstrap(databaseUrl);
  } finally {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  }
  console.log("Existing database adopted and bootstrapped. Run `pnpm infra:verify` next.");
  return inspection;
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  loadDotEnv();
  await adoptLegacyDatabase();
}
