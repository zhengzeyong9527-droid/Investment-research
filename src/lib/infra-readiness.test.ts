import { describe, expect, it, vi } from "vitest";
import {
  REQUIRED_APP_TABLES,
  REQUIRED_CHECKPOINT_TABLES,
  REQUIRED_PRISMA_MIGRATIONS,
  inspectDatabaseReadiness,
  inspectInfrastructureReadiness,
  inspectRedisReadiness,
  inspectWorkerReadiness,
  type DatabaseReadinessClient,
  type InfrastructureReadinessDependencies,
} from "@/lib/infra-readiness";

type FakeInfrastructureOptions = {
  appTables?: readonly string[];
  checkpointTables?: readonly string[];
  migrations?: readonly string[];
  vectorVersion?: string | null;
  vectorType?: string | null;
  databaseConnectError?: Error;
  selectError?: Error;
  redisPing?: string;
  redisError?: Error;
  workerHeartbeat?: string | null;
  workerTtl?: number;
};

function fakeInfrastructure(options: FakeInfrastructureOptions = {}) {
  const databaseEnd = vi.fn(async () => undefined);
  const redisDisconnect = vi.fn();
  const settings = {
    appTables: options.appTables ?? REQUIRED_APP_TABLES,
    checkpointTables: options.checkpointTables ?? REQUIRED_CHECKPOINT_TABLES,
    migrations: options.migrations ?? REQUIRED_PRISMA_MIGRATIONS,
    vectorVersion: options.vectorVersion === undefined ? "0.8.1" : options.vectorVersion,
    vectorType: options.vectorType === undefined ? "vector(1536)" : options.vectorType,
    redisPing: options.redisPing ?? "PONG",
    workerHeartbeat: options.workerHeartbeat === undefined ? "2026-09-08T05:00:00.000Z" : options.workerHeartbeat,
    workerTtl: options.workerTtl ?? 30,
  };

  const databaseClient: DatabaseReadinessClient = {
    async connect() {
      if (options.databaseConnectError) throw options.databaseConnectError;
    },
    async query<Row extends Record<string, unknown>>(text: string, values?: unknown[]) {
      if (text === "SELECT 1") {
        if (options.selectError) throw options.selectError;
        return { rows: [{} as Row] };
      }
      if (text.includes("pg_extension")) {
        return {
          rows: settings.vectorVersion ? ([{ extversion: settings.vectorVersion }] as unknown as Row[]) : [],
        };
      }
      if (text.includes("information_schema.tables")) {
        const requestedTables = (values?.[0] ?? []) as string[];
        const availableTables = requestedTables.includes("AgentRun")
          ? settings.appTables
          : settings.checkpointTables;
        return { rows: availableTables.map((table_name) => ({ table_name })) as unknown as Row[] };
      }
      if (text.includes("_prisma_migrations")) {
        return { rows: settings.migrations.map((migration_name) => ({ migration_name })) as unknown as Row[] };
      }
      if (text.includes("pg_attribute")) {
        return {
          rows: settings.vectorType ? ([{ formatted_type: settings.vectorType }] as unknown as Row[]) : [],
        };
      }
      throw new Error(`Unexpected readiness query: ${text}`);
    },
    end: databaseEnd,
  };

  const dependencies: InfrastructureReadinessDependencies = {
    createDatabaseClient: vi.fn(() => databaseClient),
    createRedisClient: vi.fn(() => ({
      async connect() {
        if (options.redisError) throw options.redisError;
      },
      async ping() {
        if (options.redisError) throw options.redisError;
        return settings.redisPing;
      },
      async get() {
        if (options.redisError) throw options.redisError;
        return settings.workerHeartbeat;
      },
      async ttl() {
        if (options.redisError) throw options.redisError;
        return settings.workerTtl;
      },
      disconnect: redisDisconnect,
    })),
  };

  return { dependencies, databaseEnd, redisDisconnect };
}

describe("infrastructure readiness", () => {
  it("reports ready only after SQL, schema, migrations, pgvector, checkpoints, and Redis PING pass", async () => {
    const { dependencies, databaseEnd, redisDisconnect } = fakeInfrastructure();

    const report = await inspectInfrastructureReadiness(
      {
        databaseUrl: "postgresql://user:secret@database:5432/research",
        redisUrl: "redis://:secret@redis:6379/0",
      },
      dependencies,
    );

    expect(report).toMatchObject({
      ok: true,
      database: { ok: true },
      migrations: { ok: true },
      pgvector: { ok: true },
      checkpointer: { ok: true },
      redis: { ok: true },
    });
    expect(databaseEnd).toHaveBeenCalledOnce();
    expect(redisDisconnect).toHaveBeenCalledTimes(2);
  });

  it("rejects a reachable PostgreSQL port when the required schema is absent", async () => {
    const { dependencies } = fakeInfrastructure({
      appTables: ["AgentRun"],
      checkpointTables: [],
      migrations: [],
      vectorVersion: null,
      vectorType: null,
    });

    const report = await inspectDatabaseReadiness(
      "postgresql://user:secret@database:5432/research",
      dependencies,
    );

    expect(report.database).toMatchObject({ ok: false, details: { missingTables: ["RagDocument", "RagChunk"] } });
    expect(report.migrations.ok).toBe(false);
    expect(report.pgvector).toMatchObject({
      ok: false,
      details: { installed: false, ragChunkEmbeddingType: "missing" },
    });
    expect(report.checkpointer.ok).toBe(false);
  });

  it("rejects Redis when a connection exists but PING does not return PONG", async () => {
    const { dependencies, redisDisconnect } = fakeInfrastructure({ redisPing: "QUEUED" });

    const report = await inspectRedisReadiness("redis://:secret@redis:6379/0", dependencies);

    expect(report).toEqual({ ok: false, message: "Redis PING returned an unexpected response." });
    expect(redisDisconnect).toHaveBeenCalledOnce();
  });

  it.each([
    { label: "missing", heartbeat: null, ttl: -2 },
    { label: "expired", heartbeat: "stale", ttl: -1 },
  ])("rejects a $label Worker heartbeat", async ({ heartbeat, ttl }) => {
    const { dependencies } = fakeInfrastructure({ workerHeartbeat: heartbeat, workerTtl: ttl });

    const report = await inspectWorkerReadiness(
      "redis://:secret@redis:6379/0",
      "investoday:agent-worker:heartbeat",
      dependencies,
    );

    expect(report).toEqual({
      ok: false,
      message: "Agent Worker heartbeat is missing or expired.",
      details: { ttlSeconds: ttl },
    });
  });

  it("accepts a current Worker heartbeat", async () => {
    const { dependencies } = fakeInfrastructure({ workerHeartbeat: "current", workerTtl: 18 });

    const report = await inspectWorkerReadiness(
      "redis://:secret@redis:6379/0",
      "investoday:agent-worker:heartbeat",
      dependencies,
    );

    expect(report).toEqual({
      ok: true,
      message: "Agent Worker heartbeat is current.",
      details: { ttlSeconds: 18 },
    });
  });

  it("does not expose connection URLs or credentials in failure reports", async () => {
    const databaseUrl = "postgresql://alice:super-secret@database:5432/research";
    const redisUrl = "redis://:another-secret@redis:6379/0";
    const { dependencies } = fakeInfrastructure({
      databaseConnectError: new Error(`cannot connect to ${databaseUrl}`),
      redisError: new Error(`cannot connect to ${redisUrl}`),
    });

    const report = await inspectInfrastructureReadiness({ databaseUrl, redisUrl }, dependencies);
    const serialized = JSON.stringify(report);

    expect(report.ok).toBe(false);
    expect(serialized).not.toContain(databaseUrl);
    expect(serialized).not.toContain(redisUrl);
    expect(serialized).not.toContain("super-secret");
    expect(serialized).not.toContain("another-secret");
  });
});
