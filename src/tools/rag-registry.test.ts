import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultRagService } from "@/rag/local-rag";
import { createToolRegistry } from "@/tools/registry";
import type { ToolRuntimeContext } from "@/tools/types";

vi.mock("@/rag/local-rag", () => ({
  getDefaultRagService: vi.fn(),
}));

const ingestDocument = vi.fn();

describe("rag.ingestDocument tool contract", () => {
  beforeEach(() => {
    ingestDocument.mockReset();
    vi.mocked(getDefaultRagService).mockReturnValue({ ingestDocument } as never);
  });

  it("normalizes a document type before calling the RAG service", async () => {
    ingestDocument.mockResolvedValue({ id: "doc-1", title: "研报样例", chunkCount: 1 });
    const recordToolCall = vi.fn(async () => ({ id: "tool-1" }));
    const registry = createToolRegistry({ run: vi.fn() });

    const result = await registry.call("rag.ingestDocument", {
      title: "研报样例",
      content: "核心观点\n收入增长。",
      documentType: "research_report",
    }, context(recordToolCall));

    expect(result.ok).toBe(true);
    expect(ingestDocument).toHaveBeenCalledWith(
      expect.objectContaining({ documentType: "research-report" })
    );
    expect(recordToolCall).toHaveBeenCalledWith(expect.objectContaining({ status: "completed" }));
  });

  it("rejects and audits an unsupported document type", async () => {
    const recordToolCall = vi.fn(async () => ({ id: "tool-2" }));
    const registry = createToolRegistry({ run: vi.fn() });

    await expect(
      registry.call("rag.ingestDocument", {
        title: "错误样例",
        content: "有效正文。",
        documentType: "pdf",
      }, context(recordToolCall))
    ).rejects.toThrow(/documentType/);
    expect(ingestDocument).not.toHaveBeenCalled();
    expect(recordToolCall).toHaveBeenCalledWith(expect.objectContaining({ status: "failed" }));
  });
});

function context(recordToolCall: ToolRuntimeContext["recordToolCall"]): ToolRuntimeContext {
  return {
    agentRunId: "run-1",
    sessionId: "session-1",
    agentKey: "research-router-agent",
    recordToolCall,
  };
}
