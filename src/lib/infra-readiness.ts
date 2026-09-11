import IORedis from "ioredis";
import { Client } from "pg";

export const REQUIRED_PRISMA_MIGRATIONS = [
  "20260724000000_initial_schema",
  "20260803000000_rag_audit_pgvector",
  "20260803000001_batch5_json_indexes",
  "20260908000000_rag_chunk_embedding_1536",
] as const;

export const REQUIRED_APP_TABLES = ["AgentRun", "RagDocument", "RagChunk"] as const;

export const REQUIRED_CHECKPOINT_TABLES = [
  "checkpoint_migrations",
  "checkpoints",
  "checkpoint_blobs",
  "checkpoint_writes",
] as const;

export type InfraCheck = {
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
};

export type DatabaseReadiness = {
  database: InfraCheck;
  migrations: InfraCheck;
  pgvector: InfraCheck;
  checkpointer: InfraCheck;
};

export type RedisReadiness = InfraCheck;

export type InfrastructureReadiness = DatabaseReadiness & {
  ok: boolean;
  redis: RedisReadiness;
  worker: InfraCheck;
};

type QueryResultLike<Row> = {
  rows: Row[];
};

export type DatabaseReadinessClient = {
  connect(): Promise<unknown>;
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResultLike<Row>>;
  end(): Promise<void>;
};

export type RedisReadinessClient = {
  connect(): Promise<unknown>;
  ping(): Promise<string>;
  get(key: string): Promise<string | null>;
  ttl(key: string): Promise<number>;
  on?(event: "error", listener: (error: unknown) => void): unknown;
  disconnect(): void;
};

export type InfrastructureReadinessDependencies = {
  createDatabaseClient(connectionString: string): DatabaseReadinessClient;
  createRedisClient(connectionString: string): RedisReadinessClient;
};

const defaultDependencies: InfrastructureReadinessDependencies = {
  createDatabaseClient(connectionString) {
    return new Client({
      connectionString,
      connectionTimeoutMillis: 1_500,
    }) as DatabaseReadinessClient;
  },
  createRedisClient(connectionString) {
    return new IORedis(connectionString, {
      lazyConnect: true,
      connectTimeout: 1_500,
      commandTimeout: 1_500,
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
    });
  },
};

export function requirePostgresUrl(value = process.env.DATABASE_URL) {
  if (!value || !/^postgres(?:ql)?:\/\//i.test(value)) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection URL.");
  }
  return value;
}

export async function inspectDatabaseReadiness(
  databaseUrl = process.env.DATABASE_URL,
  dependencies: InfrastructureReadinessDependencies = defaultDependencies,
): Promise<DatabaseReadiness> {
  if (!databaseUrl || !/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    return databaseUnavailable("DATABASE_URL is not configured as a PostgreSQL URL.");
  }

  const client = dependencies.createDatabaseClient(databaseUrl);

  try {
    await client.connect();
    await client.query("SELECT 1");
  } catch {
    await client.end().catch(() => undefined);
    return databaseUnavailable("Database connection or SELECT 1 failed.");
  }

  try {
    // node-postgres Client represents one connection. Keep these probes sequential:
    // concurrent query() calls on the same Client are deprecated and will fail in pg 9.
    const extensions = await client.query<{ extversion: string }>(
      "SELECT extversion FROM pg_extension WHERE extname = 'vector'",
    );
    const appTables = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [[...REQUIRED_APP_TABLES]],
    );
    const checkpointTables = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [[...REQUIRED_CHECKPOINT_TABLES]],
    );
    const migrations = await client
      .query<{ migration_name: string }>(
        `SELECT migration_name FROM "_prisma_migrations"
         WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
      )
      .catch(() => ({ rows: [] }));
    const vectorColumn = await client.query<{ formatted_type: string }>(
      `SELECT format_type(a.atttypid, a.atttypmod) AS formatted_type
       FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = 'RagChunk'
         AND a.attname = 'embedding' AND NOT a.attisdropped`,
    );

    const appTableNames = new Set(appTables.rows.map((row) => row.table_name));
    const checkpointNames = new Set(checkpointTables.rows.map((row) => row.table_name));
    const migrationNames = new Set(migrations.rows.map((row) => row.migration_name));
    const missingAppTables = REQUIRED_APP_TABLES.filter((name) => !appTableNames.has(name));
    const missingCheckpointTables = REQUIRED_CHECKPOINT_TABLES.filter((name) => !checkpointNames.has(name));
    const missingMigrations = REQUIRED_PRISMA_MIGRATIONS.filter((name) => !migrationNames.has(name));
    const vectorType = vectorColumn.rows[0]?.formatted_type ?? "missing";
    const vectorReady = extensions.rows.length === 1 && vectorType === "vector(1536)";

    return {
      database: {
        ok: missingAppTables.length === 0,
        message:
          missingAppTables.length === 0
            ? "Database SELECT 1 succeeded and core application tables exist."
            : `Missing application tables: ${missingAppTables.join(", ")}`,
        details: { missingTables: missingAppTables },
      },
      migrations: {
        ok: missingMigrations.length === 0,
        message:
          missingMigrations.length === 0
            ? "All required Prisma migrations are applied."
            : `Missing applied migrations: ${missingMigrations.join(", ")}`,
        details: { missingMigrations },
      },
      pgvector: {
        ok: vectorReady,
        message: vectorReady
          ? `pgvector ${extensions.rows[0]?.extversion ?? "unknown"} is installed; RagChunk.embedding is vector(1536).`
          : `pgvector or RagChunk vector dimension is not ready (column: ${vectorType}).`,
        details: {
          installed: extensions.rows.length === 1,
          version: extensions.rows[0]?.extversion ?? null,
          ragChunkEmbeddingType: vectorType,
        },
      },
      checkpointer: {
        ok: missingCheckpointTables.length === 0,
        message:
          missingCheckpointTables.length === 0
            ? "LangGraph checkpoint tables exist."
            : `Missing checkpoint tables: ${missingCheckpointTables.join(", ")}`,
        details: { missingTables: missingCheckpointTables },
      },
    };
  } catch {
    return databaseUnavailable("Database readiness queries failed.");
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function inspectRedisReadiness(
  redisUrl = process.env.REDIS_URL,
  dependencies: InfrastructureReadinessDependencies = defaultDependencies,
): Promise<RedisReadiness> {
  if (!redisUrl || !/^rediss?:\/\//i.test(redisUrl)) {
    return { ok: false, message: "REDIS_URL is not configured as a Redis URL." };
  }

  const client = dependencies.createRedisClient(redisUrl);
  client.on?.("error", () => undefined);
  try {
    await client.connect();
    const pong = await client.ping();
    return pong === "PONG"
      ? { ok: true, message: "Redis PING returned PONG." }
      : { ok: false, message: "Redis PING returned an unexpected response." };
  } catch {
    return { ok: false, message: "Redis connection or PING failed." };
  } finally {
    client.disconnect();
  }
}

export async function inspectInfrastructureReadiness(
  options: { databaseUrl?: string; redisUrl?: string; workerHeartbeatKey?: string } = {},
  dependencies: InfrastructureReadinessDependencies = defaultDependencies,
): Promise<InfrastructureReadiness> {
  const [database, redis, worker] = await Promise.all([
    inspectDatabaseReadiness(options.databaseUrl, dependencies),
    inspectRedisReadiness(options.redisUrl, dependencies),
    inspectWorkerReadiness(options.redisUrl, options.workerHeartbeatKey, dependencies),
  ]);
  return { ok: databaseChecksReady(database) && redis.ok && worker.ok, ...database, redis, worker };
}

export async function inspectWorkerReadiness(
  redisUrl = process.env.REDIS_URL,
  heartbeatKey = process.env.WORKER_HEARTBEAT_KEY ?? "investoday:agent-worker:heartbeat",
  dependencies: InfrastructureReadinessDependencies = defaultDependencies,
): Promise<InfraCheck> {
  if (!redisUrl || !/^rediss?:\/\//i.test(redisUrl)) {
    return { ok: false, message: "Worker heartbeat cannot be checked without a valid REDIS_URL." };
  }
  const client = dependencies.createRedisClient(redisUrl);
  client.on?.("error", () => undefined);
  try {
    await client.connect();
    const [heartbeat, ttl] = await Promise.all([client.get(heartbeatKey), client.ttl(heartbeatKey)]);
    const ok = Boolean(heartbeat) && ttl > 0;
    return {
      ok,
      message: ok ? "Agent Worker heartbeat is current." : "Agent Worker heartbeat is missing or expired.",
      details: { ttlSeconds: ttl },
    };
  } catch {
    return { ok: false, message: "Agent Worker heartbeat query failed." };
  } finally {
    client.disconnect();
  }
}

export function databaseChecksReady(checks: DatabaseReadiness) {
  return Object.values(checks).every((check) => check.ok);
}

function databaseUnavailable(message: string): DatabaseReadiness {
  return {
    database: { ok: false, message },
    migrations: { ok: false, message: "Database is unavailable; migrations were not checked." },
    pgvector: { ok: false, message: "Database is unavailable; pgvector was not checked." },
    checkpointer: { ok: false, message: "Database is unavailable; checkpoint tables were not checked." },
  };
}
