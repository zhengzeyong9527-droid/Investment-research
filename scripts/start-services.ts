import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "pg";
import EmbeddedPostgres from "embedded-postgres";
import { RedisMemoryServer } from "redis-memory-server";
import { loadDotEnv } from "@/lib/load-env";

const workspace = process.cwd();
const envPath = path.join(workspace, ".env");
const runtimeDir = path.join(process.env.LOCALAPPDATA ?? os.tmpdir(), "investoday-agent-runtime");
const dataDir = path.join(runtimeDir, "postgres-data");

loadDotEnv(envPath);

process.env.LC_ALL = "C";
process.env.LANG = "C";
process.env.LC_COLLATE = "C";
process.env.LC_CTYPE = "C";
process.env.LC_MESSAGES = "C";
process.env.LC_MONETARY = "C";
process.env.LC_NUMERIC = "C";
process.env.LC_TIME = "C";
process.env.PGCLIENTENCODING = "UTF8";

const postgresHost = "localhost";
const postgresPort = Number(process.env.POSTGRES_PORT ?? 5432);
const postgresUser = "postgres";
const postgresPassword = "postgres";
const postgresDatabase = "investoday_agent";
const redisPort = Number(process.env.REDIS_PORT ?? 6379);

mkdirSync(runtimeDir, { recursive: true });

const databaseUrl = `postgresql://${postgresUser}:${postgresPassword}@${postgresHost}:${postgresPort}/${postgresDatabase}`;
writeEnvValues({
  DATABASE_URL: databaseUrl,
  REDIS_URL: `redis://localhost:${redisPort}`,
});

console.log(`Starting embedded Postgres on ${postgresHost}:${postgresPort}...`);
const postgres = new EmbeddedPostgres({
  databaseDir: dataDir,
  port: postgresPort,
  user: postgresUser,
  password: postgresPassword,
  persistent: true,
  initdbFlags: ["--encoding=SQL_ASCII", "--locale=C"],
  postgresFlags: ["-c", "client_encoding=UTF8"],
  onLog: (message) => process.stdout.write(message),
  onError: (error) => console.error(error),
});

if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
  await postgres.initialise();
}
await postgres.start();
await ensureDatabase();
await ensureVectorType();
console.log(`Postgres ready: ${databaseUrl}`);

console.log(`Starting embedded Redis on localhost:${redisPort}...`);
const redis = await RedisMemoryServer.create({
  instance: {
    port: redisPort,
    ip: "127.0.0.1",
  },
});
console.log(`Redis ready: redis://localhost:${await redis.getPort()}`);
console.log("Investoday local services are running. Keep this process alive.");

async function shutdown(signal?: string) {
  if (signal) console.log(`Received ${signal}, stopping local services...`);
  await Promise.allSettled([redis.stop(), postgres.stop()]);
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

await new Promise(() => {});

async function ensureDatabase() {
  const client = new Client({
    host: postgresHost,
    port: postgresPort,
    user: postgresUser,
    password: postgresPassword,
    database: "postgres",
  });
  await client.connect();
  try {
    const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [postgresDatabase]);
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE ${quoteIdentifier(postgresDatabase)}`);
    }
  } finally {
    await client.end();
  }
}

async function ensureVectorType() {
  const client = new Client({
    host: postgresHost,
    port: postgresPort,
    user: postgresUser,
    password: postgresPassword,
    database: postgresDatabase,
  });
  await client.connect();
  try {
    await client.query("DO $$ BEGIN CREATE DOMAIN vector AS text; EXCEPTION WHEN duplicate_object THEN NULL; END $$;");
  } finally {
    await client.end();
  }
}

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function writeEnvValues(values: Record<string, string>) {
  const current = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const lines = current.split(/\r?\n/);
  const seen = new Set<string>();
  const next = lines.map((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (!match) return line;
    const key = match[1];
    if (!(key in values)) return line;
    seen.add(key);
    return `${key}="${values[key]}"`;
  });
  for (const [key, value] of Object.entries(values)) {
    if (!seen.has(key)) next.push(`${key}="${value}"`);
  }
  writeFileSync(envPath, next.join("\n").replace(/\n+$/, "\n"), "utf8");
}
