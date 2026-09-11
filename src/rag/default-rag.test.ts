import { afterEach, describe, expect, it, vi } from "vitest";

describe("default RAG service initialization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("reads embedding provider environment when getDefaultRagService is first called", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RAG_EMBEDDING_PROVIDER", "");
    vi.stubEnv("EMBEDDING_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("DEEPSEEK_API_KEY", "");

    const ragModule = await import("@/rag/local-rag");
    vi.stubEnv("RAG_EMBEDDING_PROVIDER", "deterministic");

    await expect(
      ragModule
        .getDefaultRagService({ store: new ragModule.InMemoryRagStore() })
        .search({ query: "贵州茅台渠道风险" })
    ).resolves.toEqual(expect.any(Array));
  });

  it("does not silently select deterministic embeddings outside tests", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RAG_EMBEDDING_PROVIDER", "");
    const ragModule = await import("@/rag/local-rag");

    expect(() => ragModule.getDefaultRagService({ store: new ragModule.InMemoryRagStore() })).toThrow(
      /RAG_EMBEDDING_PROVIDER/
    );
  });
});
