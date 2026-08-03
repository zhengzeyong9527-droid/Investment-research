import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const mojibakePattern = /[�]|鏅|鑷|鐮|涓|鍙|鍏|浠|椋|鏈|鎯|杩|璇|鎴|閫|鐩|褰|琛|鍚|姘|纭|浠撲綅|琚/;

describe("source encoding guard", () => {
  it("keeps editor and git text handling pinned to UTF-8", () => {
    expect(readFileSync(".editorconfig", "utf8")).toContain("charset = utf-8");
    expect(readFileSync(".gitattributes", "utf8")).toContain("working-tree-encoding=UTF-8");
  });

  it("keeps Chinese source and docs readable when files are read as UTF-8", () => {
    const files = [...walkTextFiles("src"), "README.md"];
    const offenders = files.filter((file) => mojibakePattern.test(readFileSync(file, "utf8")));

    expect(offenders).toEqual([]);
    expect(readFileSync("src/agents/interrupted-resume.ts", "utf8")).toContain("确认");
  });
});

function walkTextFiles(root: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(root)) {
    const file = join(root, name);
    const stat = statSync(file);
    if (stat.isDirectory()) {
      files.push(...walkTextFiles(file));
    } else if (/\.(ts|tsx|md)$/.test(name) && !file.endsWith("encoding-guard.test.ts")) {
      files.push(file);
    }
  }
  return files;
}
