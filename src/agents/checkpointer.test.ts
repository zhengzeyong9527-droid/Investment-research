import { describe, expect, it } from "vitest";
import { createLangGraphCheckpointer } from "@/agents/checkpointer";

describe("langgraph checkpointer", () => {
  it("creates no checkpointer without DATABASE_URL and a Postgres saver with one", () => {
    expect(createLangGraphCheckpointer("")).toBeNull();
    expect(createLangGraphCheckpointer("postgresql://user:pass@localhost:5432/db")).toBeTruthy();
  });
});
