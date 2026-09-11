import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => {
  const events: string[] = [];
  const upsertDocument = vi.fn(async (args: unknown) => {
    const create = (args as { create: Record<string, unknown> }).create;
    events.push(`document:${String(create.id)}`);
    return { ...create, createdAt: new Date("2026-09-08T00:00:00.000Z") };
  });
  const deleteMany = vi.fn(async (args: unknown) => {
    const documentId = (args as { where: { documentId: string } }).where.documentId;
    events.push(`delete:${documentId}`);
    return { count: 0 };
  });
  const upsert = vi.fn(async (args: unknown) => {
    const chunkId = (args as { where: { id: string } }).where.id;
    events.push(`upsert:${chunkId}`);
    return {};
  });
  const executeRawUnsafe = vi.fn(async (_query: string, _embedding: unknown, chunkId: unknown) => {
    events.push(`vector:${String(chunkId)}`);
    return 1;
  });
  const transactionClient = {
    ragDocument: { upsert: upsertDocument },
    ragChunk: { deleteMany, upsert },
    $executeRawUnsafe: executeRawUnsafe,
  };
  const transaction = vi.fn(async (operation: (client: unknown) => Promise<unknown>) => {
    events.push("transaction:start");
    const result = await operation(transactionClient);
    events.push("transaction:end");
    return result;
  });

  return { events, upsertDocument, deleteMany, upsert, executeRawUnsafe, transaction };
});

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: database.transaction },
}));

import { PrismaRagStore, type RagChunkRecord, type RagDocumentRecord } from "@/rag/local-rag";

function makeDocument(): Omit<RagDocumentRecord, "createdAt"> {
  return {
    id: "doc-1",
    title: "测试研报",
    content: "规范化后的研报正文",
    source: "unit-test",
    sourceUrl: "https://example.test/report",
    publishedAt: new Date("2026-09-08T00:00:00.000Z"),
    licenseStatus: "internal",
    licenseSource: "unit-test",
    validFrom: null,
    validUntil: null,
    removedAt: null,
    removalReason: null,
    metadata: { ragDocumentType: "research-report" },
    chunkCount: 2,
  };
}

function makeChunk(id: string, chunkIndex: number, embedding: number[]): RagChunkRecord {
  return {
    id,
    documentId: "doc-1",
    title: "测试研报",
    content: `第 ${chunkIndex + 1} 个切块`,
    source: "unit-test",
    sourceUrl: "https://example.test/report",
    chunkIndex,
    embedding,
    licenseStatus: "internal",
    licenseSource: "unit-test",
    publishedAt: new Date("2026-09-08T00:00:00.000Z"),
    validFrom: null,
    validUntil: null,
    removedAt: null,
    metadata: { ragChunkStrategy: "structure-aware-v1" },
  };
}

function makeEmbedding(value: number) {
  return Array.from({ length: 1536 }, () => value);
}

describe("PrismaRagStore.replaceDocument", () => {
  beforeEach(() => {
    database.events.splice(0);
    vi.clearAllMocks();
  });

  it("deletes stale chunks, then upserts each replacement and writes its vector in one transaction", async () => {
    const store = new PrismaRagStore();
    const chunks = [
      makeChunk("chunk-1", 0, makeEmbedding(0.1)),
      makeChunk("chunk-2", 1, makeEmbedding(0.2)),
    ];

    const document = await store.replaceDocument(makeDocument(), chunks);

    expect(database.transaction).toHaveBeenCalledTimes(1);
    expect(database.events).toEqual([
      "transaction:start",
      "document:doc-1",
      "delete:doc-1",
      "upsert:chunk-1",
      "vector:chunk-1",
      "upsert:chunk-2",
      "vector:chunk-2",
      "transaction:end",
    ]);
    expect(document).toMatchObject({ id: "doc-1", chunkCount: 2 });
    expect(database.deleteMany).toHaveBeenCalledWith({ where: { documentId: "doc-1" } });
    expect(database.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: "chunk-1" },
        create: expect.objectContaining({
          id: "chunk-1",
          documentId: "doc-1",
          embeddingJson: JSON.stringify(makeEmbedding(0.1)),
        }),
        update: expect.objectContaining({
          embeddingJson: JSON.stringify(makeEmbedding(0.1)),
        }),
      }),
    );
    const firstChunkUpsert = database.upsert.mock.calls[0]?.[0] as {
      update: Record<string, unknown>;
    };
    expect(firstChunkUpsert.update).not.toHaveProperty("id");
    expect(firstChunkUpsert.update).not.toHaveProperty("documentId");
    expect(database.executeRawUnsafe).toHaveBeenNthCalledWith(
      1,
      'UPDATE "RagChunk" SET "embedding" = $1::vector WHERE "id" = $2',
      expect.stringMatching(/^\[0\.1(?:,0\.1){1535}\]$/),
      "chunk-1",
    );
    expect(database.executeRawUnsafe).toHaveBeenNthCalledWith(
      2,
      'UPDATE "RagChunk" SET "embedding" = $1::vector WHERE "id" = $2',
      expect.stringMatching(/^\[0\.2(?:,0\.2){1535}\]$/),
      "chunk-2",
    );
  });

  it("propagates a pgvector write failure so the transaction can roll back", async () => {
    database.executeRawUnsafe.mockRejectedValueOnce(new Error("pgvector unavailable"));

    await expect(
      new PrismaRagStore().replaceDocument(makeDocument(), [makeChunk("chunk-1", 0, makeEmbedding(0.1))]),
    ).rejects.toThrow("pgvector unavailable");

    expect(database.events).toEqual([
      "transaction:start",
      "document:doc-1",
      "delete:doc-1",
      "upsert:chunk-1",
    ]);
    expect(database.executeRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it("rejects non-1536-dimensional chunks before opening a transaction", async () => {
    await expect(
      new PrismaRagStore().replaceDocument(makeDocument(), [makeChunk("chunk-1", 0, [0.1, 0.2])]),
    ).rejects.toThrow("expected 1536");

    expect(database.transaction).not.toHaveBeenCalled();
  });
});
