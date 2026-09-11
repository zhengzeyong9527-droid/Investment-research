import { createHash } from "node:crypto";

export const RAG_DOCUMENT_TYPES = ["generic", "news", "announcement", "research-report"] as const;

export type RagDocumentType = (typeof RAG_DOCUMENT_TYPES)[number];

export type StructuredChunk = {
  content: string;
  documentType: RagDocumentType;
  strategy: "structure-aware-v1";
  sectionIndex: number;
  heading?: string;
  charStart: number;
  charEnd: number;
  characterCount: number;
  contentHash: string;
};

export type ChunkDocumentOptions = {
  documentType?: RagDocumentType;
  maxChars?: number;
  minChars?: number;
  overlapChars?: number;
};

type ChunkingProfile = {
  maxChars: number;
  minChars: number;
  overlapChars: number;
};

type TextSection = {
  heading?: string;
  headingStart?: number;
  headingEnd?: number;
  body: string;
  bodyStart: number;
  sectionIndex: number;
};

const CHUNKING_PROFILES: Record<RagDocumentType, ChunkingProfile> = {
  news: { maxChars: 600, minChars: 120, overlapChars: 80 },
  announcement: { maxChars: 900, minChars: 180, overlapChars: 100 },
  "research-report": { maxChars: 1_200, minChars: 240, overlapChars: 120 },
  generic: { maxChars: 900, minChars: 180, overlapChars: 120 },
};

const COMMON_HEADINGS = new Set([
  "摘要",
  "核心摘要",
  "事件",
  "事件概述",
  "核心观点",
  "投资要点",
  "主要观点",
  "公司动态",
  "行业动态",
  "经营情况",
  "业务进展",
  "盈利预测",
  "盈利预测与投资评级",
  "投资建议",
  "估值与评级",
  "风险提示",
  "重要内容提示",
  "结论",
]);

const END_BOUNDARIES = [
  () => /\n[ \t]*\n+/g,
  () => /[。！？；!?;]+[”’"'）》】）\]]*/g,
  () => /\.(?:[”’"'）》】）\]]*)?(?=\s|$)/g,
  () => /\n+/g,
  () => /[，,、：:]+/g,
] as const;

const STRONG_END_BOUNDARIES = END_BOUNDARIES.slice(0, 4);
const CLAUSE_END_BOUNDARIES = END_BOUNDARIES.slice(4);
const OVERLAP_BOUNDARIES = END_BOUNDARIES;

export function parseRagDocumentType(value: unknown): RagDocumentType | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (RAG_DOCUMENT_TYPES.includes(normalized as RagDocumentType)) return normalized as RagDocumentType;
  if (normalized === "report" || normalized === "research" || normalized === "研报") return "research-report";
  if (normalized === "新闻") return "news";
  if (normalized === "公告") return "announcement";
  if (normalized === "通用") return "generic";
  return null;
}

export function normalizeChunkingText(content: string) {
  return content
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0\u3000]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n[ \t]+\n/g, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function chunkDocument(content: string, options: ChunkDocumentOptions = {}): StructuredChunk[] {
  const normalized = normalizeChunkingText(content);
  if (!normalized) return [];

  const documentType = options.documentType ?? "generic";
  const profile = CHUNKING_PROFILES[documentType];
  const maxChars = positiveInteger(options.maxChars ?? profile.maxChars, "maxChars");
  const minChars = Math.min(
    positiveInteger(options.minChars ?? profile.minChars, "minChars"),
    Math.max(1, Math.floor(maxChars * 0.6))
  );
  const overlapChars = Math.min(
    nonNegativeInteger(options.overlapChars ?? profile.overlapChars, "overlapChars"),
    Math.max(0, maxChars - 1)
  );

  return splitIntoSections(normalized).flatMap((section) =>
    chunkSection(normalized, section, { documentType, maxChars, minChars, overlapChars })
  );
}

function chunkSection(
  document: string,
  section: TextSection,
  options: ChunkingProfile & { documentType: RagDocumentType }
): StructuredChunk[] {
  if (!section.body) {
    if (!section.heading || section.headingStart === undefined || section.headingEnd === undefined) return [];
    return [
      buildChunk({
        content: section.heading,
        documentType: options.documentType,
        sectionIndex: section.sectionIndex,
        heading: section.heading,
        charStart: section.headingStart,
        charEnd: section.headingEnd,
      }),
    ];
  }

  const bodyBudget = options.maxChars;
  const bodyMin = Math.min(options.minChars, Math.max(1, Math.floor(bodyBudget * 0.6)));
  const chunks: StructuredChunk[] = [];
  let start = 0;

  while (start < section.body.length) {
    const hardEnd = Math.min(start + bodyBudget, section.body.length);
    const end = hardEnd === section.body.length
      ? hardEnd
      : chooseNaturalEnd(section.body, start, hardEnd, bodyMin);
    const range = trimRange(section.body, start, Math.max(end, start + 1));

    if (range.start < range.end) {
      const bodyContent = section.body.slice(range.start, range.end);
      chunks.push(
        buildChunk({
          content: bodyContent,
          documentType: options.documentType,
          sectionIndex: section.sectionIndex,
          heading: section.heading,
          charStart: section.bodyStart + range.start,
          charEnd: section.bodyStart + range.end,
        })
      );
    }

    if (end >= section.body.length) break;
    const overlapStart = chooseNextStart(section.body, start, end, options.overlapChars);
    const nextStart = rebalanceShortTail(section.body, start, overlapStart, bodyMin, bodyBudget);
    start = nextStart > start ? nextStart : end;
  }

  return chunks;
}

function chooseNaturalEnd(text: string, start: number, hardEnd: number, minChars: number) {
  const preferredMin = Math.min(hardEnd, start + Math.max(minChars, Math.floor((hardEnd - start) * 0.6)));
  for (const createBoundary of STRONG_END_BOUNDARIES) {
    const candidate = findLastBoundary(text, createBoundary(), preferredMin, hardEnd);
    if (candidate !== null) return candidate;
  }

  const fallbackMin = Math.min(hardEnd, start + Math.min(minChars, Math.max(1, Math.floor((hardEnd - start) * 0.25))));
  for (const createBoundary of STRONG_END_BOUNDARIES) {
    const candidate = findLastBoundary(text, createBoundary(), fallbackMin, hardEnd);
    if (candidate !== null) return candidate;
  }
  for (const createBoundary of CLAUSE_END_BOUNDARIES) {
    const preferred = findLastBoundary(text, createBoundary(), preferredMin, hardEnd);
    if (preferred !== null) return preferred;
    const fallback = findLastBoundary(text, createBoundary(), fallbackMin, hardEnd);
    if (fallback !== null) return fallback;
  }
  return hardEnd;
}

function chooseNextStart(text: string, currentStart: number, end: number, overlapChars: number) {
  if (overlapChars === 0) return end;
  const desiredStart = Math.max(currentStart + 1, end - overlapChars);
  const strongBoundaries = collectBoundaries(text, currentStart + 1, end, STRONG_END_BOUNDARIES);
  const boundaries = strongBoundaries.includes(end)
    ? strongBoundaries
    : collectBoundaries(text, currentStart + 1, end, OVERLAP_BOUNDARIES);
  const afterDesired = boundaries.find((boundary) => boundary >= desiredStart && boundary < end);
  if (afterDesired !== undefined) return skipWhitespace(text, afterDesired, end);

  const beforeDesired = boundaries.filter((boundary) => boundary < desiredStart).at(-1);
  if (beforeDesired !== undefined && end - beforeDesired <= overlapChars * 2) {
    return skipWhitespace(text, beforeDesired, end);
  }

  if (boundaries.includes(end)) return end;
  return desiredStart;
}

function rebalanceShortTail(
  text: string,
  currentStart: number,
  proposedStart: number,
  minChars: number,
  maxChars: number
) {
  const tailLength = countNonWhitespace(text, proposedStart, text.length);
  if (tailLength <= 0 || tailLength >= minChars) return proposedStart;

  const earliestStart = Math.max(currentStart + 1, text.length - maxChars);
  const latestStart = startForMinimumContent(text, earliestStart, text.length, minChars);
  const boundaries = collectBoundaries(text, earliestStart, latestStart, OVERLAP_BOUNDARIES);
  return boundaries.at(-1) ?? latestStart;
}

function startForMinimumContent(text: string, earliestStart: number, end: number, minChars: number) {
  let count = 0;
  for (let index = end - 1; index >= earliestStart; index -= 1) {
    if (!/\s/.test(text[index])) count += 1;
    if (count >= minChars) return index;
  }
  return earliestStart;
}

function countNonWhitespace(text: string, start: number, end: number) {
  let count = 0;
  for (let index = start; index < end; index += 1) {
    if (!/\s/.test(text[index])) count += 1;
  }
  return count;
}

function collectBoundaries(
  text: string,
  start: number,
  end: number,
  boundaryFactories: ReadonlyArray<() => RegExp>
) {
  const boundaries = new Set<number>();
  for (const createBoundary of boundaryFactories) {
    const boundary = createBoundary();
    boundary.lastIndex = Math.max(0, start - 1);
    for (let match = boundary.exec(text); match && match.index < end; match = boundary.exec(text)) {
      const position = match.index + match[0].length;
      if (position >= start && position <= end) boundaries.add(position);
      if (match[0].length === 0) boundary.lastIndex += 1;
    }
  }
  return [...boundaries].sort((left, right) => left - right);
}

function findLastBoundary(text: string, boundary: RegExp, min: number, max: number) {
  let result: number | null = null;
  boundary.lastIndex = Math.max(0, min - 2);
  for (let match = boundary.exec(text); match && match.index < max; match = boundary.exec(text)) {
    const position = match.index + match[0].length;
    if (position >= min && position <= max) result = position;
    if (match[0].length === 0) boundary.lastIndex += 1;
  }
  return result;
}

function splitIntoSections(text: string): TextSection[] {
  const lines = text.split("\n");
  const headings: Array<{ text: string; start: number; end: number }> = [];
  let offset = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    const trimmedOffset = line.indexOf(trimmed);
    if (trimmed && isHeadingLine(trimmed)) {
      headings.push({ text: trimmed, start: offset + Math.max(0, trimmedOffset), end: offset + Math.max(0, trimmedOffset) + trimmed.length });
    }
    offset += line.length + 1;
  }

  if (headings.length === 0) {
    return [{ body: text, bodyStart: 0, sectionIndex: 0 }];
  }

  const sections: TextSection[] = [];
  const preamble = trimRange(text, 0, headings[0].start);
  if (preamble.start < preamble.end) {
    sections.push({ body: text.slice(preamble.start, preamble.end), bodyStart: preamble.start, sectionIndex: sections.length });
  }

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const nextHeading = headings[index + 1];
    const bodyRange = trimRange(text, Math.min(text.length, heading.end + 1), nextHeading?.start ?? text.length);
    sections.push({
      heading: heading.text,
      headingStart: heading.start,
      headingEnd: heading.end,
      body: text.slice(bodyRange.start, bodyRange.end),
      bodyStart: bodyRange.start,
      sectionIndex: sections.length,
    });
  }

  return sections;
}

function isHeadingLine(line: string) {
  if (line.length > 80 || /[。！？!?；;]$/.test(line) || /^\|.*\|$/.test(line)) return false;
  if (/^#{1,6}\s+\S+/.test(line)) return true;
  const plain = line.replace(/^#{1,6}\s+/, "").replace(/[：:]$/, "").trim();
  if (COMMON_HEADINGS.has(plain)) return true;
  if (/^第[一二三四五六七八九十百千万零〇0-9]+[章节部分篇]\s*\S*/.test(line)) return true;
  if (/^[一二三四五六七八九十百]+[、．.]\s*\S+/.test(line)) return true;
  if (/^[（(][一二三四五六七八九十百0-9]+[）)]\s*\S+/.test(line)) return true;
  if (/^\d+(?:\.\d+)*[、．.]\s*\S+/.test(line)) return true;
  return line.length <= 30 && /^[^\n。！？!?；;]+[：:]$/.test(line);
}

function trimRange(text: string, initialStart: number, initialEnd: number) {
  let start = Math.max(0, initialStart);
  let end = Math.min(text.length, initialEnd);
  while (start < end && /\s/.test(text[start])) start += 1;
  while (end > start && /\s/.test(text[end - 1])) end -= 1;
  return { start, end };
}

function skipWhitespace(text: string, initial: number, limit: number) {
  let index = initial;
  while (index < limit && /\s/.test(text[index])) index += 1;
  return index;
}

function buildChunk(input: Omit<StructuredChunk, "strategy" | "characterCount" | "contentHash">): StructuredChunk {
  return {
    ...input,
    strategy: "structure-aware-v1",
    characterCount: input.content.length,
    contentHash: createHash("sha256").update(input.content).digest("hex"),
  };
}

function positiveInteger(value: number, name: string) {
  if (!Number.isInteger(value) || value <= 0) throw new RangeError(`${name} must be a positive integer.`);
  return value;
}

function nonNegativeInteger(value: number, name: string) {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative integer.`);
  return value;
}
