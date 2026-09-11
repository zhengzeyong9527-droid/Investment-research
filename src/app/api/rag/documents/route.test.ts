import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/rag/documents/route";
import { getDefaultRagService } from "@/rag/local-rag";

vi.mock("@/rag/local-rag", () => ({
  getDefaultRagService: vi.fn(),
}));

const ingestDocument = vi.fn();

describe("POST /api/rag/documents", () => {
  beforeEach(() => {
    ingestDocument.mockReset();
    vi.mocked(getDefaultRagService).mockReturnValue({ ingestDocument } as never);
  });

  it("normalizes and forwards the requested document type", async () => {
    ingestDocument.mockResolvedValue({ id: "doc-1", title: "研报样例", chunkCount: 2 });
    const response = await POST(
      new Request("http://localhost/api/rag/documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "研报样例", content: "核心观点\n收入增长。", documentType: "研报" }),
      })
    );

    expect(response.status).toBe(200);
    expect(ingestDocument).toHaveBeenCalledWith(
      expect.objectContaining({ title: "研报样例", documentType: "research-report" })
    );
  });

  it("rejects an unsupported document type before ingestion", async () => {
    const response = await POST(
      new Request("http://localhost/api/rag/documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "错误样例", content: "有效正文。", documentType: "pdf" }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "BAD_REQUEST" });
    expect(ingestDocument).not.toHaveBeenCalled();
  });
});
