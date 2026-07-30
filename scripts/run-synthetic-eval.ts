import { writeFileSync } from "node:fs";
import { buildEvalReport, evaluateRunSnapshot, smokeEvalCases } from "@/eval/runner";
import { loadDotEnv } from "@/lib/load-env";

loadDotEnv();
const smokeOnly = process.argv.includes("--smoke");
const cases = smokeOnly ? smokeEvalCases().filter((item) => item.tags.includes("smoke")) : smokeEvalCases();

const results = cases.map((item, index) =>
  evaluateRunSnapshot({
    caseId: item.id,
    outputMarkdown: `Synthetic answer cites [1]. ${item.prompt}`,
    expectedCitations: item.expectedCitations ?? ["[1]"],
    evidence: [{ title: `${item.name} synthetic evidence` }],
    toolResults: [{ toolKey: item.tags.includes("rag") ? "rag.search" : "stock.briefItems", ok: true, latencyMs: 20 + index }],
    ragHits: item.tags.includes("rag") ? [{ chunkId: `chunk-${index}`, documentId: `doc-${index}`, score: 0.8 }] : [],
    latencyMs: 500 + index * 10,
    costCents: 0,
  })
);

const report = buildEvalReport(results);
writeFileSync("eval-report.synthetic.md", report.markdown, "utf8");
writeFileSync("eval-report.synthetic.json", report.json, "utf8");

const parsed = JSON.parse(report.json) as { summary: { total: number; passed: number; averageScore: number } };
console.log(`Synthetic eval complete: ${parsed.summary.passed}/${parsed.summary.total} passed, average score ${parsed.summary.averageScore}`);
console.log("Wrote eval-report.synthetic.md and eval-report.synthetic.json");
