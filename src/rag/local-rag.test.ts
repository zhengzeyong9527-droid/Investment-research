import { describe, expect, it, vi } from "vitest";
import {
  chunkDocument,
  DeterministicEmbeddingProvider,
  InMemoryRagStore,
  LocalRagService,
  type RagDocumentRecord,
  type RagStore,
} from "@/rag/local-rag";

describe("local RAG service", () => {
  it("chunks, embeds, stores, and retrieves local investment documents", async () => {
    const service = new LocalRagService({
      store: new InMemoryRagStore(),
      embeddingProvider: new DeterministicEmbeddingProvider(16),
    });

    const document = await service.ingestDocument({
      title: "贵州茅台渠道风险跟踪",
      source: "demo-seed",
      sourceUrl: "https://example.test/report",
      publishedAt: "2026-07-20",
      validUntil: "2027-07-20",
      content: "贵州茅台近90天的核心风险包括渠道批价波动、库存压力和高端白酒需求恢复节奏。",
      metadata: { stockCode: "600519" },
    });
    const hits = await service.search({ query: "茅台批价库存风险", topK: 3, filters: { stockCode: "600519" } });

    expect(document.chunkCount).toBeGreaterThan(0);
    expect(hits[0]).toMatchObject({
      title: "贵州茅台渠道风险跟踪",
      source: "demo-seed",
      licenseStatus: "internal",
      sourceUrl: "https://example.test/report",
      publishedAt: new Date("2026-07-20"),
      validUntil: new Date("2027-07-20"),
      metadata: expect.objectContaining({ stockCode: "600519" }),
    });
    expect(hits[0].content).toContain("批价");
  });

  it("keeps chunk boundaries stable and overlapping for recall", () => {
    const chunks = chunkDocument("一二三四五六七八九十".repeat(20), { maxChars: 60, overlapChars: 10 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[1].content.startsWith(chunks[0].content.slice(-10))).toBe(true);
  });

  it("uses the document-type strategy and persists chunk provenance metadata", async () => {
    const store = new InMemoryRagStore();
    const embedTexts = vi.fn(async (texts: string[]) => texts.map(() => [1, 0, 0, 0]));
    const service = new LocalRagService({
      store,
      embeddingProvider: { dimensions: 4, embedTexts },
    });

    const document = await service.ingestDocument({
      title: "公司动态研究",
      documentType: "research-report",
      content: "核心观点\nCDMO收入保持增长，项目储备持续增加。\n\n风险提示\n订单转化不及预期。",
      metadata: { stockCode: "000739" },
    });
    const chunks = await store.listChunks();

    expect(document.metadata).toMatchObject({ stockCode: "000739", ragDocumentType: "research-report" });
    expect(chunks).toHaveLength(document.chunkCount);
    expect(chunks[0].metadata).toMatchObject({
      stockCode: "000739",
      ragDocumentType: "research-report",
      ragContentNormalization: "whitespace-v1",
      ragChunkStrategy: "structure-aware-v1",
      ragChunkHeading: "核心观点",
      ragChunkOffsetBasis: "document.content",
      ragChunkCharStart: expect.any(Number),
      ragChunkCharEnd: expect.any(Number),
      ragChunkContentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(embedTexts).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringMatching(/^公司动态研究\n核心观点\nCDMO收入保持增长/)]),
    );

    const hits = await service.search({ query: "风险提示", topK: 3 });
    expect(hits[0].metadata.ragChunkHeading).toBe("风险提示");
    expect(hits[0].lexicalScore).toBeGreaterThan(0);
  });

  it("replaces stale chunks when the same document is ingested again", async () => {
    const store = new InMemoryRagStore();
    const service = new LocalRagService({
      store,
      embeddingProvider: new DeterministicEmbeddingProvider(4),
    });
    const input = {
      title: "重复摄取测试",
      source: "test",
      content: "核心观点\n第一条证据。第二条证据。",
    };
    const document = await service.ingestDocument(input);
    const current = (await store.listChunks())[0];
    const { createdAt: _createdAt, ...documentInput } = document;
    await store.replaceDocument(documentInput, [
      {
        ...current,
        id: "stale-chunk",
        content: "旧切块不应继续存在",
      },
    ]);

    const reingested = await service.ingestDocument(input);
    const chunks = await store.listChunks();

    expect(chunks).toHaveLength(reingested.chunkCount);
    expect(chunks.some((chunk) => chunk.id === "stale-chunk")).toBe(false);
  });

  it("stores the normalized text used by chunk offsets", async () => {
    const store = new InMemoryRagStore();
    const service = new LocalRagService({
      store,
      embeddingProvider: new DeterministicEmbeddingProvider(4),
    });

    const document = await service.ingestDocument({
      title: "位置测试",
      content: "  核心观点\r\n收入增长。\u00a0\r\n\r\n\r\n风险提示\r\n订单不及预期。  ",
      documentType: "research-report",
    });
    const chunks = await store.listChunks();

    expect(document.content).toBe("核心观点\n收入增长。\n\n风险提示\n订单不及预期。");
    for (const chunk of chunks) {
      const start = Number(chunk.metadata.ragChunkCharStart);
      const end = Number(chunk.metadata.ragChunkCharEnd);
      expect(document.content.slice(start, end)).toBe(chunk.content);
    }
  });

  it.each([
    { name: "missing vectors", vectors: [] as number[][], error: "returned 0 vectors" },
    { name: "wrong dimensions", vectors: [[1, 2, 3]], error: "expected 4" },
    { name: "non-finite values", vectors: [[1, 2, 3, Number.NaN]], error: "non-finite" },
  ])("rejects $name before changing the store", async ({ vectors, error }) => {
    const replaceDocument = vi.fn<RagStore["replaceDocument"]>();
    const store: RagStore = {
      replaceDocument,
      listDocuments: vi.fn(async () => []),
      listChunks: vi.fn(async () => []),
    };
    const service = new LocalRagService({
      store,
      embeddingProvider: { dimensions: 4, embedTexts: vi.fn(async () => vectors) },
    });

    await expect(
      service.ingestDocument({ title: "错误向量", content: "这是一段正文。" }),
    ).rejects.toThrow(error);
    expect(replaceDocument).not.toHaveBeenCalled();
  });

  it("rejects an invalid query embedding before searching the store", async () => {
    const searchChunks = vi.fn(async () => []);
    const store: RagStore = {
      replaceDocument: vi.fn(async (input) => ({ ...input, createdAt: new Date() })),
      listDocuments: vi.fn(async () => []),
      listChunks: vi.fn(async () => []),
      searchChunks,
    };
    const service = new LocalRagService({
      store,
      embeddingProvider: { dimensions: 4, embedTexts: vi.fn(async () => [[1, 2, 3]]) },
    });

    await expect(service.search({ query: "风险提示" })).rejects.toThrow("expected 4");
    expect(searchChunks).not.toHaveBeenCalled();
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

  it("excludes removed and expired chunks by default", async () => {
    const store = new InMemoryRagStore();
    const service = new LocalRagService({
      store,
      embeddingProvider: new DeterministicEmbeddingProvider(16),
    });

    const active = await service.ingestDocument({
      title: "有效授权文档",
      source: "licensed",
      licenseStatus: "authorized",
      licenseSource: "internal-contract",
      content: "贵州茅台批价风险仍是核心变量。",
    });
    await service.ingestDocument({
      title: "过期授权文档",
      source: "licensed",
      licenseStatus: "authorized",
      licenseSource: "expired-contract",
      validUntil: "2020-01-01",
      content: "贵州茅台过期资料不应进入检索。",
    });
    await service.ingestDocument({
      title: "待下架文档",
      source: "licensed",
      licenseStatus: "authorized",
      licenseSource: "removed-contract",
      content: "贵州茅台下架资料不应进入默认检索。",
    });
    const removed = (await service.listDocuments()).find((item) => item.title === "待下架文档");
    if (!removed) throw new Error("missing document");
    await service.removeDocument(removed.id, "license revoked");

    const hits = await service.search({ query: "贵州茅台批价资料", topK: 10 });

    expect(hits.map((hit) => hit.documentId)).toContain(active.id);
    expect(hits.map((hit) => hit.title)).not.toContain("过期授权文档");
    expect(hits.map((hit) => hit.title)).not.toContain("待下架文档");
  });

  it("delegates search to store searchChunks instead of listing every chunk when available", async () => {
    const store: RagStore = {
      replaceDocument: vi.fn(async (input: Omit<RagDocumentRecord, "createdAt">) => ({ ...input, createdAt: new Date() })),
      listDocuments: vi.fn(async () => []),
      listChunks: vi.fn(async () => {
        throw new Error("listChunks should not be used");
      }),
      searchChunks: vi.fn(async () => [
        {
          chunkId: "chunk-1",
          documentId: "doc-1",
          title: "数据库侧候选",
          content: "pgvector candidate",
          source: "db",
          licenseStatus: "authorized" as const,
          score: 0.9,
          lexicalScore: 0.5,
          vectorScore: 0.95,
          metadata: {},
        },
      ]),
    };
    const service = new LocalRagService({ store, embeddingProvider: new DeterministicEmbeddingProvider(16) });

    const hits = await service.search({ query: "pgvector", topK: 3 });

    expect(store.searchChunks).toHaveBeenCalled();
    expect(store.listChunks).not.toHaveBeenCalled();
    expect(hits[0]).toMatchObject({ title: "数据库侧候选", licenseStatus: "authorized" });
  });
});
