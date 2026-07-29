import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type RagMetadata = Record<string, string | number | boolean | null | undefined>;

export type RagDocumentInput = {
  title: string;
  content: string;
  source?: string;
  publishedAt?: Date | string | null;
  metadata?: RagMetadata;
};

export type RagDocumentRecord = {
  id: string;
  title: string;
  content: string;
  source: string;
  publishedAt?: Date | null;
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
  chunkIndex: number;
  embedding: number[];
  metadata: RagMetadata;
};

export type RagHit = {
  chunkId: string;
  documentId: string;
  title: string;
  content: string;
  source: string;
  score: number;
  lexicalScore: number;
  vectorScore: number;
  metadata: RagMetadata;
};

export type RagSearchInput = {
  query: string;
  topK?: number;
  filters?: RagMetadata;
};

export type EmbeddingProvider = {
  dimensions: number;
  embedTexts(texts: string[]): Promise<number[][]>;
};

export type RagStore = {
  upsertDocument(input: Omit<RagDocumentRecord, "createdAt">): Promise<RagDocumentRecord>;
  upsertChunks(chunks: RagChunkRecord[]): Promise<void>;
  listDocuments(): Promise<RagDocumentRecord[]>;
  listChunks(): Promise<RagChunkRecord[]>;
};

export class LocalRagService {
  constructor(
    private readonly options: {
      store: RagStore;
      embeddingProvider: EmbeddingProvider;
    }
  ) {}

  async ingestDocument(input: RagDocumentInput): Promise<RagDocumentRecord> {
    const id = stableId(`${input.source ?? "local"}:${input.title}:${input.content.slice(0, 120)}`);
    const chunks = chunkDocument(input.content);
    const embeddings = await this.options.embeddingProvider.embedTexts(chunks.map((chunk) => `${input.title}\n${chunk.content}`));
    const metadata = input.metadata ?? {};
    const document = await this.options.store.upsertDocument({
      id,
      title: input.title,
      content: input.content,
      source: input.source ?? "local",
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
      metadata,
      chunkCount: chunks.length,
    });
    await this.options.store.upsertChunks(
      chunks.map((chunk, index) => ({
        id: stableId(`${id}:${index}:${chunk.content}`),
        documentId: id,
        title: input.title,
        content: chunk.content,
        source: input.source ?? "local",
        chunkIndex: index,
        embedding: embeddings[index],
        metadata,
      }))
    );
    return document;
  }

  async search(input: RagSearchInput): Promise<RagHit[]> {
    const query = input.query.trim();
    if (!query) return [];
    const [queryEmbedding] = await this.options.embeddingProvider.embedTexts([query]);
    const chunks = (await this.options.store.listChunks()).filter((chunk) => metadataMatches(chunk.metadata, input.filters));
    return chunks
      .map((chunk) => {
        const lexicalScore = lexicalSimilarity(query, `${chunk.title}\n${chunk.content}`);
        const vectorScore = cosineSimilarity(queryEmbedding, chunk.embedding);
        const score = 0.55 * lexicalScore + 0.45 * vectorScore;
        return {
          chunkId: chunk.id,
          documentId: chunk.documentId,
          title: chunk.title,
          content: chunk.content,
          source: chunk.source,
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
}

export class InMemoryRagStore implements RagStore {
  private readonly documents = new Map<string, RagDocumentRecord>();
  private readonly chunks = new Map<string, RagChunkRecord>();

  async upsertDocument(input: Omit<RagDocumentRecord, "createdAt">) {
    const existing = this.documents.get(input.id);
    const record = { ...input, createdAt: existing?.createdAt ?? new Date() };
    this.documents.set(input.id, record);
    return record;
  }

  async upsertChunks(chunks: RagChunkRecord[]) {
    for (const chunk of chunks) this.chunks.set(chunk.id, chunk);
  }

  async listDocuments() {
    return [...this.documents.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listChunks() {
    return [...this.chunks.values()];
  }
}

export class PrismaRagStore implements RagStore {
  async upsertDocument(input: Omit<RagDocumentRecord, "createdAt">) {
    const client = prisma as unknown as {
      ragDocument: {
        upsert(args: unknown): Promise<Record<string, unknown>>;
        findMany(args?: unknown): Promise<Array<Record<string, unknown>>>;
      };
    };
    const record = await client.ragDocument.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        title: input.title,
        content: input.content,
        source: input.source,
        publishedAt: input.publishedAt,
        metadata: JSON.stringify(input.metadata ?? {}),
        chunkCount: input.chunkCount,
      },
      update: {
        title: input.title,
        content: input.content,
        source: input.source,
        publishedAt: input.publishedAt,
        metadata: JSON.stringify(input.metadata ?? {}),
        chunkCount: input.chunkCount,
      },
    });
    return shapeDocumentRecord(record);
  }

  async upsertChunks(chunks: RagChunkRecord[]) {
    const client = prisma as unknown as {
      ragChunk: {
        upsert(args: unknown): Promise<Record<string, unknown>>;
      };
      $executeRawUnsafe(query: string, ...values: unknown[]): Promise<unknown>;
    };
    for (const chunk of chunks) {
      await client.ragChunk.upsert({
        where: { id: chunk.id },
        create: {
          id: chunk.id,
          documentId: chunk.documentId,
          title: chunk.title,
          content: chunk.content,
          source: chunk.source,
          chunkIndex: chunk.chunkIndex,
          metadata: JSON.stringify(chunk.metadata ?? {}),
          embeddingJson: JSON.stringify(chunk.embedding),
        },
        update: {
          title: chunk.title,
          content: chunk.content,
          source: chunk.source,
          chunkIndex: chunk.chunkIndex,
          metadata: JSON.stringify(chunk.metadata ?? {}),
          embeddingJson: JSON.stringify(chunk.embedding),
        },
      });
      await writePgVector(client, chunk.id, chunk.embedding);
    }
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

export function chunkDocument(content: string, options: { maxChars?: number; overlapChars?: number } = {}) {
  const maxChars = options.maxChars ?? 900;
  const overlapChars = Math.min(options.overlapChars ?? 120, maxChars - 1);
  const normalized = content.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) return [];
  const chunks: Array<{ content: string }> = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(start + maxChars, normalized.length);
    chunks.push({ content: normalized.slice(start, end).trim() });
    if (end === normalized.length) break;
    start = Math.max(0, end - overlapChars);
  }
  return chunks.filter((chunk) => chunk.content.length > 0);
}

export function getDefaultRagService() {
  return defaultRagService;
}

const defaultRagService = new LocalRagService({
  store: process.env.NODE_ENV === "test" ? new InMemoryRagStore() : new PrismaRagStore(),
  embeddingProvider:
    process.env.NODE_ENV === "test" || process.env.RAG_EMBEDDING_PROVIDER === "deterministic"
      ? new DeterministicEmbeddingProvider()
      : new OpenAICompatibleEmbeddingProvider(),
});

function shapeDocumentRecord(record: Record<string, unknown>): RagDocumentRecord {
  return {
    id: String(record.id),
    title: String(record.title ?? ""),
    content: String(record.content ?? ""),
    source: String(record.source ?? "local"),
    publishedAt: record.publishedAt instanceof Date ? record.publishedAt : null,
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
    chunkIndex: Number(record.chunkIndex ?? 0),
    embedding: parseEmbedding(record.embeddingJson),
    metadata: parseMetadata(record.metadata),
  };
}

async function writePgVector(
  client: { $executeRawUnsafe(query: string, ...values: unknown[]): Promise<unknown> },
  chunkId: string,
  embedding: number[]
) {
  const literal = `[${embedding.map((value) => Number(value.toFixed(8))).join(",")}]`;
  try {
    await client.$executeRawUnsafe('UPDATE "RagChunk" SET "embedding" = $1::vector WHERE "id" = $2', literal, chunkId);
  } catch {
    // The JSON copy remains usable in local/dev; Docker Compose enables true pgvector for production-like runs.
  }
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

function metadataMatches(metadata: RagMetadata, filters?: RagMetadata) {
  if (!filters) return true;
  return Object.entries(filters).every(([key, value]) => value === undefined || value === null || String(metadata[key] ?? "") === String(value));
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
