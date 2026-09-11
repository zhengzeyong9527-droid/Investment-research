import { spawn } from "node:child_process";
import { Client } from "pg";
import {
  closeLangGraphCheckpointer,
  initializeLangGraphCheckpointer,
  verifyLangGraphCheckpointRoundTrip,
} from "../src/agents/checkpointer";
import { databaseChecksReady, inspectDatabaseReadiness, requirePostgresUrl } from "./db-infra";
import { isDirectExecution } from "./direct-execution";
import { loadDotEnv } from "../src/lib/load-env";

export async function runCommand(command: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const usesWindowsPnpmShim = process.platform === "win32" && command === "pnpm";
    const executable = usesWindowsPnpmShim ? (process.env.ComSpec ?? "cmd.exe") : command;
    const childArgs = usesWindowsPnpmShim
      ? ["/d", "/s", "/c", ["pnpm", ...args].join(" ")]
      : args;
    const child = spawn(executable, childArgs, { stdio: "inherit", shell: false });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}.`));
    });
  });
}

export type BootstrapTargetInspection = {
  migrationTableExists: boolean;
  existingTables: string[];
};

export async function inspectBootstrapTarget(databaseUrl = requirePostgresUrl()): Promise<BootstrapTargetInspection> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const migrationTable = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
       ) AS exists`
    );
    const existingTables = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'
       ORDER BY table_name`
    );
    return {
      migrationTableExists: migrationTable.rows[0]?.exists === true,
      existingTables: existingTables.rows.map((row) => row.table_name),
    };
  } finally {
    await client.end();
  }
}

export function assertBootstrapTargetSafe(inspection: BootstrapTargetInspection) {
  if (!inspection.migrationTableExists && inspection.existingTables.length > 0) {
    throw new Error(
      `Refusing bootstrap on a non-empty database without _prisma_migrations. ` +
        `Create and verify a backup, then use pnpm db:adopt. Existing tables: ${inspection.existingTables.join(", ")}.`
    );
  }
}

export async function bootstrapDatabase(databaseUrl = requirePostgresUrl()) {
  process.env.DATABASE_URL = databaseUrl;
  try {
    assertBootstrapTargetSafe(await inspectBootstrapTarget(databaseUrl));
    await runCommand("pnpm", ["exec", "prisma", "migrate", "deploy"]);
    await initializeLangGraphCheckpointer(databaseUrl, "production");
    await verifyLangGraphCheckpointRoundTrip(databaseUrl, "production");
    const checks = await inspectDatabaseReadiness(databaseUrl);
    if (!databaseChecksReady(checks)) {
      throw new Error(`Database bootstrap completed but readiness failed:\n${JSON.stringify(checks, null, 2)}`);
    }
    return checks;
  } finally {
    await closeLangGraphCheckpointer();
  }
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  loadDotEnv();
  const checks = await bootstrapDatabase();
  console.log("Database bootstrap is ready.");
  console.log(JSON.stringify(checks, null, 2));
}
