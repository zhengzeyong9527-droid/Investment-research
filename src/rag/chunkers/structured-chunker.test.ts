import { describe, expect, it } from "vitest";
import {
  chunkDocument,
  normalizeChunkingText,
  parseRagDocumentType,
} from "@/rag/chunkers/structured-chunker";

describe("structure-aware RAG chunker", () => {
  it("normalizes line endings and keeps a short news item intact", () => {
    const content = "  工信部部署人工智能专项行动。\r\n\r\n推动智能家居互联互通。  ";

    const chunks = chunkDocument(content, { documentType: "news" });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      content: "工信部部署人工智能专项行动。\n\n推动智能家居互联互通。",
      documentType: "news",
      strategy: "structure-aware-v1",
      charStart: 0,
      charEnd: normalizeChunkingText(content).length,
    });
  });

  it("keeps research-report sections separate and carries their headings", () => {
    const content = [
      "摘要",
      "公司上半年收入承压，但毛利率有所改善。CDMO业务延续增长，项目储备继续增加。",
      "",
      "盈利预测与投资评级",
      "预计未来三年归母净利润保持增长。基于当前业务进展，维持原有评级。",
      "",
      "风险提示",
      "项目进展不及预期；汇率和原材料价格波动。",
    ].join("\n");

    const chunks = chunkDocument(content, {
      documentType: "research-report",
      maxChars: 52,
      minChars: 12,
      overlapChars: 8,
    });

    expect(chunks.some((chunk) => chunk.heading === "摘要")).toBe(true);
    expect(chunks.some((chunk) => chunk.heading === "盈利预测与投资评级")).toBe(true);
    expect(chunks.some((chunk) => chunk.heading === "风险提示")).toBe(true);
    expect(chunks.every((chunk) => chunk.content.length <= 52)).toBe(true);
    expect(chunks.every((chunk) => !(chunk.content.includes("摘要") && chunk.content.includes("风险提示")))).toBe(true);
    expect(chunks.filter((chunk) => chunk.heading).every((chunk) => chunk.content !== chunk.heading && !chunk.content.startsWith(`${chunk.heading}\n`))).toBe(true);
  });

  it("prefers complete Chinese sentence boundaries before hard limits", () => {
    const content = "第一句说明营业收入有所增长。第二句说明毛利率继续改善。第三句说明项目储备持续增加。第四句提示订单落地风险。";

    const chunks = chunkDocument(content, { maxChars: 34, minChars: 10, overlapChars: 0 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.content.length <= 34)).toBe(true);
    expect(chunks.slice(0, -1).every((chunk) => /[。！？；]$/.test(chunk.content))).toBe(true);
    expect(chunks.map((chunk) => chunk.content).join("")).toBe(content);
  });

  it("ends at the previous sentence instead of taking a clause from the next sentence", () => {
    const firstSentence = "第一句说明收入增长。";
    const secondSentence = "第二句先说明毛利率改善，再说明费用率下降。";

    const chunks = chunkDocument(`${firstSentence}${secondSentence}`, {
      maxChars: 28,
      minChars: 6,
      overlapChars: 0,
    });

    expect(chunks[0].content).toBe(firstSentence);
    expect(chunks[1].content).toBe(secondSentence);
  });

  it("does not create a partial-clause overlap after a complete sentence", () => {
    const firstSentence = "公司收入同比下降，毛利率改善。";
    const secondSentence = "CDMO业务保持增长，项目储备增加。";

    const chunks = chunkDocument(`${firstSentence}${secondSentence}`, {
      maxChars: 32,
      minChars: 8,
      overlapChars: 6,
    });

    expect(chunks[0].content).toBe(firstSentence);
    expect(chunks[1].content).toBe(secondSentence);
  });

  it("does not treat a soft line wrap as stronger than a sentence ending", () => {
    const firstSentence = "第一句因为排版产生\n换行，但句子到这里才结束。";
    const secondSentence = "第二句保持完整。";

    const chunks = chunkDocument(`${firstSentence}${secondSentence}`, {
      maxChars: firstSentence.length + 2,
      minChars: 6,
      overlapChars: 0,
    });

    expect(chunks[0].content).toBe(firstSentence);
    expect(chunks[1].content).toBe(secondSentence);
  });

  it("uses a complete trailing sentence as overlap when one fits the budget", () => {
    const sentences = [
      "第一句讨论收入。",
      "第二句讨论利润。",
      "第三句讨论订单。",
      "第四句讨论风险。",
      "第五句讨论估值。",
      "第六句给出结论。",
    ];
    const chunks = chunkDocument(sentences.join(""), { maxChars: 30, minChars: 8, overlapChars: 10 });
    const overlap = longestEdgeOverlap(chunks[0].content, chunks[1].content);

    expect(overlap.length).toBeGreaterThan(0);
    expect(overlap).toMatch(/^[^。！？；]+[。！？；]$/);
    expect(overlap.length).toBeLessThanOrEqual(20);
  });

  it("falls back to a fixed overlap only for text without natural boundaries", () => {
    const content = "甲".repeat(125);

    const chunks = chunkDocument(content, { maxChars: 50, minChars: 10, overlapChars: 10 });

    expect(chunks).toHaveLength(3);
    expect(chunks.every((chunk) => chunk.content.length <= 50)).toBe(true);
    expect(chunks[1].content.startsWith(chunks[0].content.slice(-10))).toBe(true);
    expect(chunks[2].content.startsWith(chunks[1].content.slice(-10))).toBe(true);
  });

  it("expands the final overlap instead of leaving a tiny tail chunk", () => {
    const content = `${"甲".repeat(49)}。${"乙".repeat(10)}`;

    const chunks = chunkDocument(content, { maxChars: 50, minChars: 20, overlapChars: 5 });

    expect(chunks).toHaveLength(2);
    expect(chunks.every((chunk) => chunk.content.length <= 50)).toBe(true);
    expect(chunks.at(-1)?.content.length).toBeGreaterThanOrEqual(20);
    expect(chunks.at(-1)?.content.endsWith("乙".repeat(10))).toBe(true);
  });

  it("does not count formatting whitespace as meaningful tail content", () => {
    const content = `${"甲".repeat(49)}。${" ".repeat(80)}${"乙".repeat(10)}`;

    const chunks = chunkDocument(content, { maxChars: 50, minChars: 20, overlapChars: 5 });
    const last = chunks.at(-1)?.content ?? "";

    expect(chunks).toHaveLength(2);
    expect(last.replace(/\s/g, "").length).toBeGreaterThanOrEqual(20);
    expect(last.endsWith("乙".repeat(10))).toBe(true);
  });

  it("does not treat decimal points as English sentence boundaries", () => {
    const content = "CDMO收入为14.17亿元，同比增长12.5%。下一阶段重点关注订单转化。";

    const chunks = chunkDocument(content, { maxChars: 30, minChars: 8, overlapChars: 0 });

    expect(chunks.some((chunk) => chunk.content.includes("14.17亿元"))).toBe(true);
    expect(chunks.some((chunk) => chunk.content.includes("12.5%"))).toBe(true);
  });

  it("applies smaller defaults to news than research reports", () => {
    const content = "长".repeat(750);

    expect(chunkDocument(content, { documentType: "news" }).length).toBeGreaterThan(1);
    expect(chunkDocument(content, { documentType: "research-report" })).toHaveLength(1);
  });

  it("is deterministic and exposes stable source positions and hashes", () => {
    const content = "核心观点\n收入增长保持稳定。利润率同比改善。\n\n风险提示\n需求恢复不及预期。";
    const options = { documentType: "research-report" as const, maxChars: 28, minChars: 8, overlapChars: 6 };

    const first = chunkDocument(content, options);
    const second = chunkDocument(content, options);

    expect(second).toEqual(first);
    expect(first.every((chunk) => chunk.charStart >= 0 && chunk.charEnd > chunk.charStart)).toBe(true);
    expect(first.every((chunk) => /^[a-f0-9]{64}$/.test(chunk.contentHash))).toBe(true);
  });

  it("accepts documented aliases and rejects invalid budgets", () => {
    expect(parseRagDocumentType("研报")).toBe("research-report");
    expect(parseRagDocumentType("research_report")).toBe("research-report");
    expect(parseRagDocumentType("unknown")).toBeNull();
    expect(() => chunkDocument("有效内容。", { maxChars: 0 })).toThrow(/maxChars/);
    expect(() => chunkDocument("有效内容。", { overlapChars: -1 })).toThrow(/overlapChars/);
  });
});

function longestEdgeOverlap(left: string, right: string) {
  const limit = Math.min(left.length, right.length);
  for (let length = limit; length > 0; length -= 1) {
    if (left.slice(-length) === right.slice(0, length)) return right.slice(0, length);
  }
  return "";
}
