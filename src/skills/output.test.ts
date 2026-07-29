import { describe, expect, it } from "vitest";
import { normalizeSkillOutput, stripHtmlFromMarkdown } from "@/skills/output";

describe("skill output normalization", () => {
  it("extracts a fenced HTML document and leaves clean markdown", () => {
    const result = normalizeSkillOutput([
      "# Report",
      "",
      "Final markdown body.",
      "",
      "```html",
      "<!DOCTYPE html>",
      "<html><body><h1>HTML Report</h1></body></html>",
      "```",
    ].join("\n"));

    expect(result.finalMarkdown).toBe("# Report\n\nFinal markdown body.");
    expect(result.outputHtml).toContain("<!DOCTYPE html>");
    expect(result.outputHtml).toContain("<h1>HTML Report</h1>");
  });

  it("strips complete and partial HTML from markdown previews", () => {
    expect(stripHtmlFromMarkdown("Visible\n\n```html\n<html><body>hidden</body></html>\n```")).toBe("Visible");
    expect(stripHtmlFromMarkdown("Visible\n\n```html\n<html><body>still streaming")).toBe("Visible");
  });
});
