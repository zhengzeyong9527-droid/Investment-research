import { writeFileSync } from "node:fs";
import { buildEvalReport, evaluateRunSnapshot, smokeEvalCases } from "@/eval/runner";

const smokeOnly = process.argv.includes("--smoke");
const cases = smokeOnly ? smokeEvalCases().filter((item) => item.tags.includes("smoke")) : smokeEvalCases();

const results = cases.map((item, index) =>
  evaluateRunSnapshot({
    caseId: item.id,
    outputMarkdown: `结论基于证据 [1]。${item.prompt}`,
    expectedCitations: item.expectedCitations ?? ["[1]"],
    evidence: [{ title: `${item.name} evidence` }],
    toolResults: [{ toolKey: item.tags.includes("rag") ? "rag.search" : "stock.briefItems", ok: true, latencyMs: 20 + index }],
    ragHits: item.tags.includes("rag") ? [{ chunkId: `chunk-${index}`, documentId: `doc-${index}`, score: 0.8 }] : [],
    latencyMs: 500 + index * 10,
    costCents: 0,
  })
);

const report = buildEvalReport(results);
writeFileSync("eval-report.md", report.markdown, "utf8");
writeFileSync("eval-report.json", report.json, "utf8");

const parsed = JSON.parse(report.json) as { summary: { total: number; passed: number; averageScore: number } };
console.log(`Eval complete: ${parsed.summary.passed}/${parsed.summary.total} passed, average score ${parsed.summary.averageScore}`);
console.log("Wrote eval-report.md and eval-report.json");
