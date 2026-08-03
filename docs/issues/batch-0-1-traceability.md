# Batch 0-1 Traceability

Status values: `open`, `fixed`, `deferred`, `superseded`.

| Issue | Status | Batch | Verification | Notes |
| --- | --- | --- | --- | --- |
| P0-encoding-baseline | fixed | 0 | `pnpm test -- src/lib/encoding-guard.test.ts src/agents/interrupted-resume.test.ts` | Guard UTF-8 source text and resume parsing. |
| P0-verify-entrypoint | fixed | 0 | `pnpm verify` | Add typecheck, lint, test, build gate. |
| P0-frozen-install | fixed | 0 | Inspect `docker-compose.yml` | Docker install must honor lockfile. |
| P1-langgraph-real-nodes | fixed | 1 | `pnpm test -- src/agents/langgraph-runtime.test.ts` | Graph nodes execute business logic. |
| P1-native-interrupt-resume | fixed | 1 | Resume route and graph tests | Missing input uses LangGraph interrupt/resume. |
| P1-conditional-edges | fixed | 1 | Graph route tests | Evidence degrade and verify retry are graph-controlled. |
| P1-checkpoint-state | fixed | 1 | Graph state assertions | `outputJson.graphState` reflects real state. |
