import { describe, expect, it } from "vitest";
import {
  createLangGraphCheckpointer,
  initializeLangGraphCheckpointer,
} from "@/agents/checkpointer";

describe("langgraph checkpointer", () => {
  it("uses an in-memory saver in tests", () => {
    expect(createLangGraphCheckpointer("", "test")).toBeTruthy();
  });

  it("uses Postgres only when a Postgres URL is available outside tests", () => {
    expect(createLangGraphCheckpointer("", "production")).toBeNull();
    const first = createLangGraphCheckpointer("postgresql://user:pass@localhost:5432/db", "production");
    const second = createLangGraphCheckpointer("postgresql://user:pass@localhost:5432/db", "production");
    expect(first).toBeTruthy();
    expect(second).toBe(first);
  });

  it("does not require Postgres setup for the test saver", async () => {
    await expect(initializeLangGraphCheckpointer("", "test")).resolves.toBeTruthy();
  });
});
