import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/skill-runs/[id]/html/route";
import { getSkillRun } from "@/lib/repositories";

vi.mock("@/lib/repositories", () => ({
  getSkillRun: vi.fn(),
}));

describe("skill run HTML output route", () => {
  beforeEach(() => {
    vi.mocked(getSkillRun).mockReset();
  });

  it("returns stored HTML output", async () => {
    vi.mocked(getSkillRun).mockResolvedValue({
      id: "skill-run-1",
      outputHtml: "<!DOCTYPE html><html><body>Stored</body></html>",
      outputMarkdown: null,
    } as Awaited<ReturnType<typeof getSkillRun>>);

    const response = await GET(new Request("http://localhost/api/skill-runs/skill-run-1/html"), {
      params: Promise.resolve({ id: "skill-run-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toContain("Stored");
  });

  it("extracts HTML from legacy markdown output", async () => {
    vi.mocked(getSkillRun).mockResolvedValue({
      id: "skill-run-legacy",
      outputHtml: null,
      outputMarkdown: "Legacy\n\n```html\n<!DOCTYPE html><html><body>Legacy</body></html>\n```",
    } as Awaited<ReturnType<typeof getSkillRun>>);

    const response = await GET(new Request("http://localhost/api/skill-runs/skill-run-legacy/html"), {
      params: Promise.resolve({ id: "skill-run-legacy" }),
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Legacy");
  });
});
