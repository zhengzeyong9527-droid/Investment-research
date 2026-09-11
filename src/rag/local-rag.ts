import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  chunkDocument,
  normalizeChunkingText,
  parseRagDocumentType,
  type RagDocumentType,
  type StructuredChunk,
} from "@/rag/chunkers/structured-chunker";

export { chunkDocument } from "@/rag/chunkers/structured-chunker";
export type { ChunkDocumentOptions, RagDocumentType, StructuredChunk } from "@/rag/chunkers/structured-chunker";

export type RagMetadata = Record<string, string | number | boolean | null | undefined>;
export type RagLicenseStatus = "authorized" | "internal" | "public";

export type RagDocumentInput = {
  title: string;
  content: string;
  documentType?: RagDocumentType;
  source?: string;
  sourceUrl?: string | null;
  publishedAt?: Date | string | null;
  licenseStatus?: RagLicenseStatus;
  licenseSource?: string;
  validFrom?: Date | string | null;
  validUntil?: Date | string | null;
  metadata?: RagMetadata;
};

export type RagDocumentRecord = {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceUrl?: string | null;
  publishedAt?: Date | null;
  licenseStatus: RagLicenseStatus;
  licenseSource: string;
  validFrom?: Date | null;
  validUntil?: Date | null;
  removedAt?: Date | null;
  removalReason?: string | null;
  metadata: RagMetadata;
  chunkCount: number;
  createdAt: Date;
};

export type RagChunkRecord = {
  id: string;
  documentId: string;
  title: string;
  content: string;
  source: string;
  sourceUrl?: string | null;
  chunkIndex: number;
  embedding: number[];
  licenseStatus: RagLicenseStatus;
  licenseSource: string;
  publishedAt?: Date | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  removedAt?: Date | null;
  metadata: RagMetadata;
};

export type RagHit = {
  chunkId: string;
  documentId: string;
  title: string;
  content: string;
  source: string;
  sourceUrl?: string | null;
  licenseStatus: RagLicenseStatus;
  publishedAt?: Date | null;
  validUntil?: Date | null;
  removedAt?: Date | null;
  score: number;
  lexicalScore: number;
  vectorScore: number;
  metadata: RagMetadata;
};

export type RagSearchInput = {
  query: string;
  topK?: number;
  filters?: RagMetadata;
  includeRemoved?: boolean;
};

export type EmbeddingProvider = {
  dimensions: number;
  embedTexts(texts: string[]): Promise<number[][]>;
};

export type RagStore = {
  embeddingDimensions?: number;
  replaceDocument(
    input: Omit<RagDocumentRecord, "createdAt">,
    chunks: RagChunkRecord[]
  ): Promise<RagDocumentRecord>;
  listDocuments(): Promise<RagDocumentRecord[]>;
  listChunks(): Promise<RagChunkRecord[]>;
  searchChunks?(input: { query: string; queryEmbedding: number[]; topK: number; filters?: RagMetadata; includeRemoved?: boolean }): Promise<RagHit[]>;
  softRemoveDocument?(documentId: string, reason: string): Promise<void>;
};

export class LocalRagService {
  constructor(
    private readonly options: {
      store: RagStore;
      embeddingProvider: EmbeddingProvider;
    }
  ) {}

  async ingestDocument(input: RagDocumentInput): Promise<RagDocumentRecord> {
    const normalizedContent = normalizeChunkingText(input.content);
    const id = stableId(`${input.source ?? "local"}:${input.title}:${input.content.slice(0, 120)}`);
    const documentType = resolveDocumentType(input);
    const chunks = chunkDocument(normalizedContent, { documentType });
    const embeddingDimensions = resolveEmbeddingDimensions(
      this.options.embeddingProvider.dimensions,
      this.options.store.embeddingDimensions
    );
    const embeddings = await this.options.embeddingProvider.embedTexts(
      chunks.map((chunk) => [input.title, chunk.heading, chunk.content].filter(Boolean).join("\n"))
    );
    validateEmbeddings(embeddings, chunks.length, embeddingDimensions);
    const metadata = {
      ...(input.metadata ?? {}),
      ragDocumentType: documentType,
      ragContentNormalization: "whitespace-v1",
    };
    const licenseStatus = input.licenseStatus ?? "internal";
    const licenseSource = input.licenseSource ?? input.source ?? "local";
    const publishedAt = input.publishedAt ? new Date(input.publishedAt) : null;
    const validFrom = input.validFrom ? new Date(input.validFrom) : null;
    const validUntil = input.validUntil ? new Date(input.validUntil) : null;
    const document: Omit<RagDocumentRecord, "createdAt"> = {
      id,
      title: input.title,
      content: normalizedContent,
      source: input.source ?? "local",
      sourceUrl: input.sourceUrl ?? null,
      publishedAt,
      licenseStatus,
      licenseSource,
      validFrom,
      validUntil,
      removedAt: null,
      removalReason: null,
      metadata,
      chunkCount: chunks.length,
    };
    const chunkRecords = chunks.map((chunk, index) => ({
        id: stableId(`${id}:${index}:${chunk.content}`),
        documentId: id,
        title: input.title,
        content: chunk.content,
        source: input.source ?? "local",
        sourceUrl: input.sourceUrl ?? null,
        chunkIndex: index,
        embedding: embeddings[index],
        licenseStatus,
        licenseSource,
        publishedAt,
        validFrom,
        validUntil,
        removedAt: null,
        metadata: chunkMetadata(metadata, chunk),
      }));
    return this.options.store.replaceDocument(document, chunkRecords);
  }

  async search(input: RagSearchInput): Promise<RagHit[]> {
    const query = input.query.trim();
    if (!query) return [];
    const embeddingDimensions = resolveEmbeddingDimensions(
      this.options.embeddingProvider.dimensions,
      this.options.store.embeddingDimensions
    );
    const queryEmbeddings = await this.options.embeddingProvider.embedTexts([query]);
    validateEmbeddings(queryEmbeddings, 1, embeddingDimensions);
    const queryEmbedding = queryEmbeddings[0];
    if (this.options.store.searchChunks) {
      return this.options.store.searchChunks({
        query,
        queryEmbedding,
        topK: input.topK ?? 8,
        filters: input.filters,
        includeRemoved: input.includeRemoved,
      });
    }
    const chunks = (await this.options.store.listChunks()).filter((chunk) => chunkMatchesFilters(chunk, input.filters));
    return chunks
      .filter((chunk) => input.includeRemoved || !chunk.removedAt)
      .filter((chunk) => !chunk.validUntil || chunk.validUntil.getTime() >= Date.now())
      .map((chunk) => {
        const lexicalScore = lexicalSimilarity(query, chunkSearchText(chunk));
        const vectorScore = cosineSimilarity(queryEmbedding, chunk.embedding);
        const score = 0.55 * lexicalScore + 0.45 * vectorScore;
        return {
          chunkId: chunk.id,
          documentId: chunk.documentId,
          title: chunk.title,
          content: chunk.content,
          source: chunk.source,
          sourceUrl: chunk.sourceUrl,
          licenseStatus: chunk.licenseStatus,
          publishedAt: chunk.publishedAt,
          validUntil: chunk.validUntil,
          removedAt: chunk.removedAt,
          score: round(score),
          lexicalScore: round(lexicalScore),
          vectorScore: round(vectorScore),
          metadata: chunk.metadata,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, input.topK ?? 8);
  }

  async listDocuments() {
    return this.options.store.listDocuments();
  }

  async removeDocument(documentId: string, reason: string) {
    if (!this.options.store.softRemoveDocument) {
      throw new Error("RAG store does not support soft removal.");
    }
    await this.options.store.softRemoveDocument(documentId, reason);
  }
}

export class InMemoryRagStore implements RagStore {
  private readonly documents = new Map<string, RagDocumentRecord>();
  private readonly chunks = new Map<string, RagChunkRecord>();

  async replaceDocument(input: Omit<RagDocumentRecord, "createdAt">, chunks: RagChunkRecord[]) {
    assertChunkDocumentIds(input.id, chunks);
    const existing = this.documents.get(input.id);
    const record = { ...existing, ...input, createdAt: existing?.createdAt ?? new Date() };
    this.documents.set(input.id, record);
    for (const [id, chunk] of this.chunks) {
      if (chunk.documentId === input.id) this.chunks.delete(id);
    }
    for (const chunk of chunks) this.chunks.set(chunk.id, { ...this.chunks.get(chunk.id), ...chunk });
    return record;
  }

  async listDocuments() {
    return [...this.documents.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listChunks() {
    return [...this.chunks.values()];
  }

  async softRemoveDocument(documentId: string, reason: string) {
    const removedAt = new Date();
    const document = this.documents.get(documentId);
    if (document) this.documents.set(documentId, { ...document, removedAt, removalReason: reason });
    for (const [id, chunk] of this.chunks) {
      if (chunk.documentId === documentId) this.chunks.set(id, { ...chunk, removedAt });
    }
  }
}

export class PrismaRagStore implements RagStore {
  readonly embeddingDimensions = 1536;

  async replaceDocument(input: Omit<RagDocumentRecord, "createdAt">, chunks: RagChunkRecord[]) {
    assertChunkDocumentIds(input.id, chunks);
    validateEmbeddings(
      chunks.map((chunk) => chunk.embedding),
      chunks.length,
      this.embeddingDimensions
    );
    type TransactionClient = {
      ragDocument: {
        upsert(args: unknown): Promise<Record<string, unknown>>;
      };
      ragChunk: {
        deleteMany(args: unknown): Promise<unknown>;
        upsert(args: unknown): Promise<Record<string, unknown>>;
      };
      $executeRawUnsafe(query: string, ...values: unknown[]): Promise<unknown>;
    };
    const client = prisma as unknown as {
      $transaction<T>(operation: (transaction: TransactionClient) => Promise<T>): Promise<T>;
    };
    const record = await client.$transaction(async (transaction) => {
      const document = await transaction.ragDocument.upsert({
        where: { id: input.id },
        create: documentWriteData(input),
        update: documentUpdateData(input),
      });
      await transaction.ragChunk.deleteMany({ where: { documentId: input.id } });
      for (const chunk of chunks) {
        await transaction.ragChunk.upsert({
          where: { id: chunk.id },
          create: chunkWriteData(chunk),
          update: chunkUpdateData(chunk),
        });
        await writePgVector(transaction, chunk.id, chunk.embedding);
      }
      return document;
    });
    return shapeDocumentRecord(record);
  }

  async listDocuments() {
    const client = prisma as unknown as {
      ragDocument: { findMany(args?: unknown): Promise<Array<Record<string, unknown>>> };
    };
    const records = await client.ragDocument.findMany({ orderBy: { createdAt: "desc" } });
    return records.map(shapeDocumentRecord);
  }

  async listChunks() {
    const client = prisma as unknown as {
      ragChunk: { findMany(args?: unknown): Promise<Array<Record<string, unknown>>> };
    };
    const records = await client.ragChunk.findMany({ orderBy: [{ documentId: "asc" }, { chunkIndex: "asc" }] });
    return records.map(shapeChunkRecord);
  }

  async searchChunks(input: { query: string; queryEmbedding: number[]; topK: number; filters?: RagMetadata; includeRemoved?: boolean }) {
    validateEmbeddings([input.queryEmbedding], 1, this.embeddingDimensions);
    const client = prisma as unknown as {
      $queryRawUnsafe(query: string, ...values: unknown[]): Promise<Array<Record<string, unknown>>>;
    };
    try {
      const rows = await queryPgVectorCandidates(client, input);
      return rankRagRows(input.query, input.queryEmbedding, rows, input.topK, input.filters);
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(`pgvector RAG search failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      const chunks = (await this.listChunks())
        .filter((chunk) => input.includeRemoved || !chunk.removedAt)
        .filter((chunk) => !chunk.validUntil || chunk.validUntil.getTime() >= Date.now())
        .filter((chunk) => chunkMatchesFilters(chunk, input.filters));
      return rankChunks(input.query, input.queryEmbedding, chunks, input.topK);
    }
  }

  async softRemoveDocument(documentId: string, reason: string) {
    const client = prisma as unknown as {
      ragDocument: { update(args: unknown): Promise<unknown> };
      ragChunk: { updateMany(args: unknown): Promise<unknown> };
    };
    const removedAt = new Date();
    await client.ragDocument.update({ where: { id: documentId }, data: { removedAt, removalReason: reason } });
    await client.ragChunk.updateMany({ where: { documentId }, data: { removedAt } });
  }
}

export class DeterministicEmbeddingProvider implements EmbeddingProvider {
  constructor(readonly dimensions = 64) {}

  async embedTexts(texts: string[]) {
    return texts.map((text) => deterministicVector(text, this.dimensions));
  }
}

export class OpenAICompatibleEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions: number;

  constructor(
    private readonly config = {
      apiKey: process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || "",
      baseUrl: process.env.EMBEDDING_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
      dimensions: Number(process.env.EMBEDDING_DIMENSIONS ?? 1536),
    }
  ) {
    this.dimensions = Number.isFinite(config.dimensions) ? config.dimensions : 1536;
  }

  async embedTexts(texts: string[]) {
    if (!this.config.apiKey) {
      throw new Error("Embedding API key is not configured. Set EMBEDDING_API_KEY.");
    }
    const response = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: this.config.model, input: texts }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      data?: Array<{ embedding?: number[] }>;
      error?: { message?: string };
    };
    if (!response.ok) throw new Error(payload.error?.message ?? `Embedding request failed: ${response.status}`);
    const embeddings = payload.data?.map((item) => item.embedding ?? []) ?? [];
    if (embeddings.length !== texts.length || embeddings.some((item) => item.length === 0)) {
      throw new Error("Embedding provider returned incomplete embeddings.");
    }
    return embeddings;
  }
}

export function getDefaultRagService(options: { store?: RagStore } = {}) {
  const deterministicDimensions = Number(process.env.EMBEDDING_DIMENSIONS ?? 1536);
  const provider = process.env.NODE_ENV === "test" ? "deterministic" : process.env.RAG_EMBEDDING_PROVIDER;
  if (!provider) {
    throw new Error(
      "RAG_EMBEDDING_PROVIDER is required outside tests; production should use openai-compatible."
    );
  }
  if (provider !== "deterministic" && provider !== "openai-compatible") {
    throw new Error(`Unsupported RAG_EMBEDDING_PROVIDER: ${provider}`);
  }
  defaultRagService ??= new LocalRagService({
    store: options.store ?? (process.env.NODE_ENV === "test" ? new InMemoryRagStore() : new PrismaRagStore()),
    embeddingProvider:
      provider === "deterministic"
        ? new DeterministicEmbeddingProvider(
            Number.isInteger(deterministicDimensions) && deterministicDimensions > 0 ? deterministicDimensions : 1536
          )
        : new OpenAICompatibleEmbeddingProvider(),
  });
  return defaultRagService;
}

let defaultRagService: LocalRagService | null = null;

function shapeDocumentRecord(record: Record<string, unknown>): RagDocumentRecord {
  return {
    id: String(record.id),
    title: String(record.title ?? ""),
    content: String(record.content ?? ""),
    source: String(record.source ?? "local"),
    sourceUrl: stringOrNull(record.sourceUrl),
    publishedAt: dateOrNull(record.publishedAt),
    licenseStatus: parseLicenseStatus(record.licenseStatus),
    licenseSource: String(record.licenseSource ?? ""),
    validFrom: dateOrNull(record.validFrom),
    validUntil: dateOrNull(record.validUntil),
    removedAt: dateOrNull(record.removedAt),
    removalReason: stringOrNull(record.removalReason),
    metadata: parseMetadata(record.metadata),
    chunkCount: Number(record.chunkCount ?? 0),
    createdAt: record.createdAt instanceof Date ? record.createdAt : new Date(),
  };
}

function shapeChunkRecord(record: Record<string, unknown>): RagChunkRecord {
  return {
    id: String(record.id),
    documentId: String(record.documentId),
    title: String(record.title ?? ""),
    content: String(record.content ?? ""),
    source: String(record.source ?? "local"),
    sourceUrl: stringOrNull(record.sourceUrl),
    chunkIndex: Number(record.chunkIndex ?? 0),
    embedding: parseEmbedding(record.embeddingJson),
    licenseStatus: parseLicenseStatus(record.licenseStatus),
    licenseSource: String(record.licenseSource ?? ""),
    publishedAt: dateOrNull(record.publishedAt),
    validFrom: dateOrNull(record.validFrom),
    validUntil: dateOrNull(record.validUntil),
    removedAt: dateOrNull(record.removedAt),
    metadata: parseMetadata(record.metadata),
  };
}

function resolveDocumentType(input: RagDocumentInput) {
  if (input.documentType !== undefined) {
    const explicit = parseRagDocumentType(input.documentType);
    if (!explicit) throw new Error(`Unsupported RAG document type: ${String(input.documentType)}`);
    return explicit;
  }
  const metadata = input.metadata ?? {};
  return (
    parseRagDocumentType(metadata.ragDocumentType) ??
    parseRagDocumentType(metadata.documentType) ??
    parseRagDocumentType(metadata.sourceType) ??
    "generic"
  );
}

function chunkMetadata(metadata: RagMetadata, chunk: StructuredChunk): RagMetadata {
  return {
    ...metadata,
    ragDocumentType: chunk.documentType,
    ragChunkStrategy: chunk.strategy,
    ragChunkSectionIndex: chunk.sectionIndex,
    ragChunkHeading: chunk.heading ?? null,
    ragChunkOffsetBasis: "document.content",
    ragChunkCharStart: chunk.charStart,
    ragChunkCharEnd: chunk.charEnd,
    ragChunkCharacterCount: chunk.characterCount,
    ragChunkContentHash: chunk.contentHash,
  };
}

function chunkWriteData(chunk: RagChunkRecord) {
  return {
    id: chunk.id,
    documentId: chunk.documentId,
    title: chunk.title,
    content: chunk.content,
    source: chunk.source,
    sourceUrl: chunk.sourceUrl,
    chunkIndex: chunk.chunkIndex,
    licenseStatus: chunk.licenseStatus,
    licenseSource: chunk.licenseSource,
    publishedAt: chunk.publishedAt,
    validFrom: chunk.validFrom,
    validUntil: chunk.validUntil,
    removedAt: chunk.removedAt,
    metadata: chunk.metadata ?? {},
    embeddingJson: JSON.stringify(chunk.embedding),
  };
}

function chunkUpdateData(chunk: RagChunkRecord) {
  return {
    title: chunk.title,
    content: chunk.content,
    source: chunk.source,
    sourceUrl: chunk.sourceUrl,
    chunkIndex: chunk.chunkIndex,
    licenseStatus: chunk.licenseStatus,
    licenseSource: chunk.licenseSource,
    publishedAt: chunk.publishedAt,
    validFrom: chunk.validFrom,
    validUntil: chunk.validUntil,
    removedAt: chunk.removedAt,
    metadata: chunk.metadata ?? {},
    embeddingJson: JSON.stringify(chunk.embedding),
  };
}

function documentWriteData(input: Omit<RagDocumentRecord, "createdAt">) {
  return {
    id: input.id,
    title: input.title,
    content: input.content,
    source: input.source,
    sourceUrl: input.sourceUrl,
    publishedAt: input.publishedAt,
    licenseStatus: input.licenseStatus,
    licenseSource: input.licenseSource,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    removedAt: input.removedAt,
    removalReason: input.removalReason,
    metadata: input.metadata ?? {},
    chunkCount: input.chunkCount,
  };
}

function documentUpdateData(input: Omit<RagDocumentRecord, "createdAt">) {
  return {
    title: input.title,
    content: input.content,
    source: input.source,
    sourceUrl: input.sourceUrl,
    publishedAt: input.publishedAt,
    licenseStatus: input.licenseStatus,
    licenseSource: input.licenseSource,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    removedAt: input.removedAt,
    removalReason: input.removalReason,
    metadata: input.metadata ?? {},
    chunkCount: input.chunkCount,
  };
}

function validateEmbeddings(embeddings: number[][], expectedCount: number, dimensions: number) {
  if (!Number.isInteger(dimensions) || dimensions <= 0) {
    throw new Error(`Embedding provider dimensions must be a positive integer; received ${dimensions}.`);
  }
  if (embeddings.length !== expectedCount) {
    throw new Error(`Embedding provider returned ${embeddings.length} vectors for ${expectedCount} chunks.`);
  }
  embeddings.forEach((embedding, index) => {
    if (embedding.length !== dimensions) {
      throw new Error(`Embedding ${index} has ${embedding.length} dimensions; expected ${dimensions}.`);
    }
    if (embedding.some((value) => !Number.isFinite(value))) {
      throw new Error(`Embedding ${index} contains a non-finite value.`);
    }
  });
}

function resolveEmbeddingDimensions(providerDimensions: number, storeDimensions?: number) {
  if (!Number.isInteger(providerDimensions) || providerDimensions <= 0) {
    throw new Error(`Embedding provider dimensions must be a positive integer; received ${providerDimensions}.`);
  }
  if (storeDimensions !== undefined) {
    if (!Number.isInteger(storeDimensions) || storeDimensions <= 0) {
      throw new Error(`RAG store dimensions must be a positive integer; received ${storeDimensions}.`);
    }
    if (providerDimensions !== storeDimensions) {
      throw new Error(
        `Embedding provider declares ${providerDimensions} dimensions, but the RAG store requires ${storeDimensions}.`
      );
    }
  }
  return storeDimensions ?? providerDimensions;
}

function assertChunkDocumentIds(documentId: string, chunks: RagChunkRecord[]) {
  const mismatched = chunks.find((chunk) => chunk.documentId !== documentId);
  if (mismatched) {
    throw new Error(`Chunk ${mismatched.id} belongs to ${mismatched.documentId}, not ${documentId}.`);
  }
}

function chunkSearchText(chunk: RagChunkRecord) {
  const heading = typeof chunk.metadata.ragChunkHeading === "string" ? chunk.metadata.ragChunkHeading : "";
  return [chunk.title, heading, chunk.content].filter(Boolean).join("\n");
}

async function queryPgVectorCandidates(
  client: { $queryRawUnsafe(query: string, ...values: unknown[]): Promise<Array<Record<string, unknown>>> },
  input: { queryEmbedding: number[]; topK: number; filters?: RagMetadata; includeRemoved?: boolean }
) {
  const where = ['c."embedding" IS NOT NULL'];
  const values: unknown[] = [vectorLiteral(input.queryEmbedding)];
  const filters = input.filters ?? {};
  if (!input.includeRemoved) {
    where.push('c."removedAt" IS NULL');
    where.push('(c."validUntil" IS NULL OR c."validUntil" >= NOW())');
  }
  if (filters.source) {
    values.push(String(filters.source));
    where.push(`c."source" = $${values.length}`);
  }
  if (filters.licenseStatus) {
    values.push(String(filters.licenseStatus));
    where.push(`c."licenseStatus" = $${values.length}`);
  }
  values.push(Math.max(input.topK * 8, input.topK, 24));
  const limitPlaceholder = `$${values.length}`;
  return client.$queryRawUnsafe(
    `
      SELECT
        c."id", c."documentId", c."title", c."content", c."source", c."sourceUrl",
        c."chunkIndex", c."metadata", c."embeddingJson", c."licenseStatus", c."licenseSource",
        c."publishedAt", c."validFrom", c."validUntil", c."removedAt",
        (c."embedding" <=> $1::vector) AS "distance"
      FROM "RagChunk" c
      WHERE ${where.join(" AND ")}
      ORDER BY c."embedding" <=> $1::vector ASC
      LIMIT ${limitPlaceholder}
    `,
    ...values
  );
}

function rankRagRows(query: string, queryEmbedding: number[], rows: Array<Record<string, unknown>>, topK: number, filters?: RagMetadata): RagHit[] {
  const chunks = rows.map(shapeChunkRecord).filter((chunk) => metadataMatches(chunk.metadata, metadataOnlyFilters(filters)));
  return rankChunks(query, queryEmbedding, chunks, topK, rows);
}

function rankChunks(query: string, queryEmbedding: number[], chunks: RagChunkRecord[], topK: number, rawRows: Array<Record<string, unknown>> = []): RagHit[] {
  const distanceById = new Map(rawRows.map((row) => [String(row.id), Number(row.distance)]));
  return chunks
    .map((chunk) => {
      const lexicalScore = lexicalSimilarity(query, chunkSearchText(chunk));
      const vectorScore = distanceById.has(chunk.id) ? clamp(1 - Number(distanceById.get(chunk.id)), 0, 1) : cosineSimilarity(queryEmbedding, chunk.embedding);
      const score = 0.55 * lexicalScore + 0.45 * vectorScore;
      return {
        chunkId: chunk.id,
        documentId: chunk.documentId,
        title: chunk.title,
        content: chunk.content,
        source: chunk.source,
        sourceUrl: chunk.sourceUrl,
        licenseStatus: chunk.licenseStatus,
        publishedAt: chunk.publishedAt,
        validUntil: chunk.validUntil,
        removedAt: chunk.removedAt,
        score: round(score),
        lexicalScore: round(lexicalScore),
        vectorScore: round(vectorScore),
        metadata: chunk.metadata,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

async function writePgVector(
  client: { $executeRawUnsafe(query: string, ...values: unknown[]): Promise<unknown> },
  chunkId: string,
  embedding: number[]
) {
  const literal = vectorLiteral(embedding);
  await client.$executeRawUnsafe('UPDATE "RagChunk" SET "embedding" = $1::vector WHERE "id" = $2', literal, chunkId);
}

function parseMetadata(value: unknown): RagMetadata {
  if (!value) return {};
  if (typeof value === "object") return value as RagMetadata;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function parseEmbedding(value: unknown) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(Number);
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map(Number) : [];
  } catch {
    return [];
  }
}

function parseLicenseStatus(value: unknown): RagLicenseStatus {
  return value === "authorized" || value === "internal" || value === "public" ? value : "internal";
}

function dateOrNull(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function metadataMatches(metadata: RagMetadata, filters?: RagMetadata) {
  if (!filters) return true;
  return Object.entries(filters).every(([key, value]) => value === undefined || value === null || String(metadata[key] ?? "") === String(value));
}

function chunkMatchesFilters(chunk: RagChunkRecord, filters?: RagMetadata) {
  if (!filters) return true;
  if (filters.source && String(chunk.source) !== String(filters.source)) return false;
  if (filters.licenseStatus && String(chunk.licenseStatus) !== String(filters.licenseStatus)) return false;
  return metadataMatches(chunk.metadata, metadataOnlyFilters(filters));
}

function metadataOnlyFilters(filters?: RagMetadata): RagMetadata | undefined {
  if (!filters) return undefined;
  return Object.fromEntries(
    Object.entries(filters).filter(([key]) => key !== "source" && key !== "licenseStatus")
  ) as RagMetadata;
}

function lexicalSimilarity(query: string, text: string) {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return 0;
  const textTerms = new Set(tokenize(text));
  const hits = queryTerms.filter((term) => textTerms.has(term) || text.includes(term)).length;
  return hits / queryTerms.length;
}

function tokenize(text: string) {
  const latin = text.toLowerCase().match(/[a-z0-9]{2,}/g) ?? [];
  const chinese = text.match(/[\u4e00-\u9fa5]{1,2}/g) ?? [];
  return [...latin, ...chinese];
}

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }
  if (normA === 0 || normB === 0) return 0;
  return (dot / (Math.sqrt(normA) * Math.sqrt(normB)) + 1) / 2;
}

function vectorLiteral(embedding: number[]) {
  return `[${embedding.map((value) => Number(value.toFixed(8))).join(",")}]`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function deterministicVector(text: string, dimensions: number) {
  const vector = Array.from({ length: dimensions }, () => 0);
  const terms = tokenize(text);
  for (const term of terms) {
    const hash = createHash("sha256").update(term).digest();
    const index = hash[0] % dimensions;
    vector[index] += 1;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / norm);
}

function stableId(input: string) {
  return createHash("sha256").update(input).digest("hex").slice(0, 24);
}

function round(value: number) {
  return Number(value.toFixed(4));
}
