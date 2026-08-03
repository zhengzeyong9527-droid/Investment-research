import { describe, expect, it } from "vitest";
import { createLangGraphCheckpointer } from "@/agents/checkpointer";

describe("langgraph checkpointer", () => {
  it("uses an in-memory saver in tests", () => {
    expect(createLangGraphCheckpointer("", "test")).toBeTruthy();
  });

  it("uses Postgres only when a Postgres URL is available outside tests", () => {
    expect(createLangGraphCheckpointer("", "production")).toBeNull();
    expect(createLangGraphCheckpointer("postgresql://user:pass@localhost:5432/db", "production")).toBeTruthy();
  });
});
