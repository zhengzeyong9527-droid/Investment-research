import { loadDotEnv } from "@/lib/load-env";

loadDotEnv();
if (!process.env.RAG_EMBEDDING_PROVIDER && !process.env.EMBEDDING_API_KEY) {
  process.env.RAG_EMBEDDING_PROVIDER = "deterministic";
}
type RealEvalMode = "smoke" | "real" | "stress";
const mode = parseMode(process.argv);

try {
  const { runRealEval } = await import("@/eval/runner");
  const report = await runRealEval({
    mode,
    onCaseStart(evalCase) {
      console.log(`[eval] start ${evalCase.id} ${evalCase.name}`);
    },
    onCaseResult(result) {
      console.log(`[eval] done ${result.caseId} run=${result.runId} status=${result.finalStatus} pass=${result.passed}`);
    },
  });
  console.log(
    `Real eval complete: ${report.summary.passed}/${report.summary.total} passed, terminal_rate ${report.summary.terminal_rate}, completion_rate ${report.summary.completion_rate}`
  );
  console.log("Wrote eval-report.md and eval-report.json");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function parseMode(argv: string[]): RealEvalMode {
  if (argv.includes("--real")) return "real";
  if (argv.includes("--stress")) return "stress";
  return "smoke";
}
