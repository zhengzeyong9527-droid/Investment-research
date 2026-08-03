# Batch 2-3 Traceability

Status values: `open`, `fixed`, `deferred`, `superseded`.

| Issue | Status | Batch | Verification | Notes |
| --- | --- | --- | --- | --- |
| P12-claim-verification | fixed | 2 | `pnpm test -- src/agents/claim-verifier.test.ts` | Rule-based claim extraction and evidence matching. |
| P13-output-hallucination-metric | fixed | 2 | `pnpm test -- src/eval/runner.test.ts` | Real eval reads claim hallucination from graph verification. |
| P14-blocking-unsupported-claims | fixed | 2 | `pnpm test -- src/agents/langgraph-runtime.test.ts` | Blocking unsupported claims retry then degrade. |
| P15-evidence-completeness-refactor | fixed | 2 | `pnpm test -- src/agents/claim-verifier.test.ts` | `gradeEvidence()` remains compatible; completeness evaluator is explicit. |
| P7-pgvector-rag-search | fixed | 3 | `pnpm test -- src/rag/local-rag.test.ts` | Store-level `searchChunks()` avoids mandatory full chunk listing. |
| P17-rag-license-audit | fixed | 3 | `pnpm test -- src/rag/local-rag.test.ts` | RAG document/chunk hits include license/source validity metadata. |
| P18-rag-removal-lifecycle | fixed | 3 | `pnpm test -- src/rag/local-rag.test.ts` | Removed and expired chunks are excluded by default. |
