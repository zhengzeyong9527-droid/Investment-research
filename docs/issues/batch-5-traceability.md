# Batch 5 Traceability

本文件追踪批次 5 的数据模型与工程债收敛。状态只允许：`open / fixed / deferred / superseded`。

| Issue | 状态 | 修复批次 | 落地内容 | 验收命令 | 关联测试 |
| --- | --- | --- | --- | --- | --- |
| P6 AnalysisRun / AgentRun 边界不清 | fixed | Batch 5 | 保留旧 `AnalysisRun` model；`PrismaAnalysisRepository.createRun()` 改为创建 `AgentRun`，使用 `triggerType = "legacy-analysis-placeholder"`，响应保持 `{ id, status, inputContext, output }` 兼容。 | `pnpm test src/lib/batch5-migration.test.ts` | `src/lib/batch5-migration.test.ts` |
| P8 结构化 JSON 以 String 存储 | fixed | Batch 5 | `AgentRun.inputPayload/outputJson`、`SkillRun.inputPayload`、`ToolCall.inputJson`、`EvidenceRecord.rawPayload`、`RagDocument.metadata`、`RagChunk.metadata`、`AgentEvalCase.inputJson`、`WatchTarget.tags`、`UserFeedback.tags` 改为 Prisma `Json`，并提供安全 SQL 迁移。 | `pnpm test src/lib/repositories-json.test.ts src/lib/batch5-migration.test.ts` | `src/lib/repositories-json.test.ts`, `src/lib/batch5-migration.test.ts` |
| P10 高频查询缺少组合索引 | fixed | Batch 5 | 新增 `ToolCall(agentRunId, toolKey, status)`、`EvidenceRecord(agentRunId, kind, source)`、`ModelCall(agentRunId, status)`、`AgentRun(sessionId, status, updatedAt)`、`AgentRun(status, updatedAt)` 索引。 | `pnpm test src/lib/batch5-migration.test.ts` | `src/lib/batch5-migration.test.ts` |
| P11 无统一 mock 模式 | fixed | Batch 5 | 新增 `src/agents/mock-runtime.ts`，提供 `AGENT_MOCK_MODE=1`、稳定模型输出、mock ToolRegistry、空证据开关和 local queue；LangGraph runtime 与 worker 入口接入。 | `pnpm test src/agents/mock-runtime.test.ts` | `src/agents/mock-runtime.test.ts` |

## 临时验证说明

当前环境缺少完整 top-level `node_modules` 链接时，`pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build` 可能被依赖解析阻断。依赖恢复后必须运行：

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
