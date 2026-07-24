import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sourceFiles = [
  "src/components/workbench-app.tsx",
  "src/components/workbench/brief-view.tsx",
  "src/components/workbench/constants.ts",
  "src/components/workbench/settings-view.tsx",
  "src/app/brief-items/[id]/page.tsx",
  "src/lib/display.ts",
  "src/lib/investoday.ts",
  "src/lib/briefs.ts",
  "src/lib/agent.ts",
  "src/lib/skill-runner.ts",
  "src/lib/workbench.test.ts",
  "src/components/workbench-app.test.tsx",
];

describe("source encoding guard", () => {
  it("keeps editor and git text handling pinned to UTF-8", () => {
    expect(readFileSync(".editorconfig", "utf8")).toContain("charset = utf-8");
    expect(readFileSync(".gitattributes", "utf8")).toContain("working-tree-encoding=UTF-8");
  });

  it("keeps Chinese UI text readable when source files are read as UTF-8", () => {
    const combined = sourceFiles.map((file) => readFileSync(file, "utf8")).join("\n");

    expect(combined).toContain("自选速览");
    expect(combined).toContain("自选");
    expect(combined).toContain("风险提示");
    expect(combined).not.toContain("�");
    expect(combined).not.toMatch(/鏅|鑷|鐮|涓|鍙|鍏|浠|椋|鏈|鎯/);
  });
});
