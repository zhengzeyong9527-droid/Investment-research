import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  RAG_EMBEDDING_PROVIDER: process.env.RAG_EMBEDDING_PROVIDER,
  EMBEDDING_API_KEY: process.env.EMBEDDING_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
};

describe("default RAG service initialization", () => {
  afterEach(() => {
    vi.resetModules();
    restoreEnv();
  });

  it("reads embedding provider environment when getDefaultRagService is first called", async () => {
    vi.resetModules();
    process.env.NODE_ENV = "production";
    delete process.env.RAG_EMBEDDING_PROVIDER;
    delete process.env.EMBEDDING_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;

    const module = await import("@/rag/local-rag");
    process.env.RAG_EMBEDDING_PROVIDER = "deterministic";

    await expect(module.getDefaultRagService().search({ query: "贵州茅台渠道风险" })).resolves.toEqual(expect.any(Array));
  });
});

function restoreEnv() {
  setOrDelete("NODE_ENV", originalEnv.NODE_ENV);
  setOrDelete("RAG_EMBEDDING_PROVIDER", originalEnv.RAG_EMBEDDING_PROVIDER);
  setOrDelete("EMBEDDING_API_KEY", originalEnv.EMBEDDING_API_KEY);
  setOrDelete("OPENAI_API_KEY", originalEnv.OPENAI_API_KEY);
  setOrDelete("DEEPSEEK_API_KEY", originalEnv.DEEPSEEK_API_KEY);
}

function setOrDelete(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
