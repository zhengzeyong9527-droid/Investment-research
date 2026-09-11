import { describe, expect, it } from "vitest";
import { assertBootstrapTargetSafe } from "./db-bootstrap";

describe("database bootstrap target guard", () => {
  it("accepts a genuinely empty database", () => {
    expect(() =>
      assertBootstrapTargetSafe({ migrationTableExists: false, existingTables: [] })
    ).not.toThrow();
  });

  it("accepts a database that is already managed by Prisma migrations", () => {
    expect(() =>
      assertBootstrapTargetSafe({ migrationTableExists: true, existingTables: ["AgentRun"] })
    ).not.toThrow();
  });

  it("refuses an unmanaged non-empty database before Prisma can write migration history", () => {
    expect(() =>
      assertBootstrapTargetSafe({ migrationTableExists: false, existingTables: ["AgentRun", "RagChunk"] })
    ).toThrow(/pnpm db:adopt/);
  });
});
