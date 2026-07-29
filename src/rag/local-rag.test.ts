import { describe, expect, it } from "vitest";
import { chunkDocument, DeterministicEmbeddingProvider, InMemoryRagStore, LocalRagService } from "@/rag/local-rag";

describe("local RAG service", () => {
  it("chunks, embeds, stores, and retrieves local investment documents", async () => {
    const service = new LocalRagService({
      store: new InMemoryRagStore(),
      embeddingProvider: new DeterministicEmbeddingProvider(16),
    });

    const document = await service.ingestDocument({
      title: "贵州茅台渠道风险跟踪",
      source: "demo-seed",
      content: "贵州茅台近90天的核心风险包括渠道批价波动、库存压力和高端白酒需求恢复节奏。",
      metadata: { stockCode: "600519" },
    });
    const hits = await service.search({ query: "茅台批价库存风险", topK: 3, filters: { stockCode: "600519" } });

    expect(document.chunkCount).toBeGreaterThan(0);
    expect(hits[0]).toMatchObject({
      title: "贵州茅台渠道风险跟踪",
      source: "demo-seed",
      metadata: expect.objectContaining({ stockCode: "600519" }),
    });
    expect(hits[0].content).toContain("批价");
  });

  it("keeps chunk boundaries stable and overlapping for recall", () => {
    const chunks = chunkDocument("一二三四五六七八九十".repeat(20), { maxChars: 60, overlapChars: 10 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[1].content.startsWith(chunks[0].content.slice(-10))).toBe(true);
  });
});
