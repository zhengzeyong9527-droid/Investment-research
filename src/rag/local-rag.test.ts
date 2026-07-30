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

  it("boosts Chinese title and metadata matches for seed document recall", async () => {
    const service = new LocalRagService({
      store: new InMemoryRagStore(),
      embeddingProvider: new DeterministicEmbeddingProvider(16),
    });

    await service.ingestDocument({
      title: "茅台渠道风险 seed 文档",
      source: "eval-seed",
      content: "贵州茅台渠道风险主要来自批价波动、经销商库存、直营平台投放节奏和高端白酒消费需求变化。",
      metadata: { entity: "贵州茅台", topic: "渠道风险" },
    });
    await service.ingestDocument({
      title: "有色金属催化 seed 文档",
      source: "eval-seed",
      content: "有色金属行业催化因素包括美元周期、全球制造业需求、铜铝供给约束、锂价变化和新能源需求。",
      metadata: { entity: "有色金属", topic: "行业催化" },
    });

    const hits = await service.search({ query: "引用本地文档回答贵州茅台渠道风险", topK: 3 });

    expect(hits[0]).toMatchObject({
      title: "茅台渠道风险 seed 文档",
      metadata: expect.objectContaining({ entity: "贵州茅台", topic: "渠道风险" }),
    });
  });
});
