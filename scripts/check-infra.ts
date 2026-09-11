import {
  databaseChecksReady,
  inspectDatabaseReadiness,
  inspectRedisReadiness,
  inspectWorkerReadiness,
  requirePostgresUrl,
} from "../src/lib/infra-readiness";
import { isDirectExecution } from "./direct-execution";
import { loadDotEnv } from "../src/lib/load-env";

export { inspectRedisReadiness, inspectWorkerReadiness } from "../src/lib/infra-readiness";
export type { RedisReadiness } from "../src/lib/infra-readiness";

async function main() {
  loadDotEnv();
  const database = await inspectDatabaseReadiness(requirePostgresUrl());
  const [redis, worker] = await Promise.all([inspectRedisReadiness(), inspectWorkerReadiness()]);
  const report = { ok: databaseChecksReady(database) && redis.ok && worker.ok, ...database, redis, worker };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  await main();
}
