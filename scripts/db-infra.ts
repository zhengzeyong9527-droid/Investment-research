export {
  REQUIRED_APP_TABLES,
  REQUIRED_CHECKPOINT_TABLES,
  REQUIRED_PRISMA_MIGRATIONS,
  databaseChecksReady,
  inspectDatabaseReadiness,
  requirePostgresUrl,
} from "../src/lib/infra-readiness";

export type { DatabaseReadiness, InfraCheck } from "../src/lib/infra-readiness";
