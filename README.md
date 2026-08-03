# Investoday Investment Research Agent

这是一个面向 A 股投研场景的 Agent 工程工作台。项目目标不是普通聊天，而是把投研问答拆成可追踪、可恢复、可评测的工程链路：会话、任务、LangGraph 节点、工具调用、证据、模型调用、记忆、RAG、输出校验和用户反馈都会落库。

> 本项目仅用于信息整理、研究辅助和工程作品展示，不构成投资建议、交易建议、收益承诺或风险兜底。

## 核心能力

- 自选速览：围绕自选股票和行业聚合新闻、研报、公告和市场线索。
- 当日大盘：聚合指数行情、赚钱效应、行业表现、板块热度和市场新闻。
- 投研 Agent：支持公司研究、研报解读、行业研究、成长分析、解套顾问等能力。
- 过程追踪：保留 `AgentRun`、`AgentStep`、`ToolCall`、`EvidenceRecord`、`ModelCall`、`SkillRun`、`MemoryItem`。
- 本地 RAG：支持自有文档 ingest、chunk、embedding、pgvector 检索和授权审计字段。
- 真实评测：`pnpm eval` 通过真实 Agent 链路创建 run、等待 worker、读取证据和模型调用后评分。

## 当前架构

```mermaid
flowchart LR
  UI["Next.js Web UI"] --> API["Next.js API Routes"]
  API --> Queue["BullMQ / Redis"]
  Queue --> Worker["Agent Worker"]
  Worker --> Graph["LangGraph Runtime"]
  Graph --> Tools["Tool Registry / Investoday"]
  Graph --> RAG["Local RAG"]
  Graph --> Model["OpenAI-compatible LLM"]
  Graph --> DB["Postgres / Prisma"]
```

Agent 主控制流由真实 LangGraph 节点承载：节点负责实体解析、意图规划、输入归一化、缺参中断、记忆检索、工具取证、RAG、证据分级、生成、校验、记忆写回和最终持久化。旧 `AnalysisRun` 表保留历史兼容，但新增 `/api/analysis-runs` 占位写入会转到 `AgentRun`，并使用 `triggerType = "legacy-analysis-placeholder"` 标记。

## 快速启动

推荐使用 Docker 提供 Postgres、pgvector 和 Redis：

```bash
pnpm install
docker compose up -d postgres redis
pnpm db:push
pnpm demo:seed
pnpm worker:agent
pnpm dev
```

访问：

```text
http://localhost:3000
```

Windows PowerShell 如果阻止 `pnpm.ps1`，请使用 `pnpm.cmd`。

## Mock 模式

没有 Redis、Postgres、真实 LLM key 或外部行情接口时，可以打开 mock 模式跑核心流程和定向测试：

```env
AGENT_MOCK_MODE="1"
MOCK_MODEL_OUTPUT=""
MOCK_TOOL_EMPTY_EVIDENCE="0"
```

mock 模式会提供稳定的本地模型输出、mock ToolRegistry、InMemory/local 队列路径。`MOCK_TOOL_EMPTY_EVIDENCE=1` 用于测试证据不足降级路径。mock 模式只验证工程链路，不代表真实投研质量，也不替代生产健康检查。

## 环境变量

最小配置见 `.env.example`：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/investoday_agent"
REDIS_URL="redis://localhost:6379"
LLM_PROVIDER="deepseek"
DEEPSEEK_API_KEY=""
DEEPSEEK_MODEL="deepseek-v4-flash"
RAG_EMBEDDING_PROVIDER="deterministic"
AGENT_MOCK_MODE="0"
APP_AUTH_TOKEN=""
```

生产或共享网络环境应配置 `APP_AUTH_TOKEN`，并避免把未鉴权服务暴露到公网。

## 常用命令

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify
pnpm eval
pnpm eval:real
pnpm rag:ingest ./docs/sample-report.md --license-status=internal --license-source=internal-research
```

`pnpm verify` 是统一质量门禁，依次执行类型检查、lint、测试和构建。

## 数据与迁移

- 结构化字段使用 Prisma `Json` / Postgres `jsonb`，仓储层通过 `jsonValue()`、`jsonObject()`、`jsonArray()` 兼容读取旧字符串 JSON。
- `AgentRun.inputPayload/outputJson`、`SkillRun.inputPayload`、`ToolCall.inputJson`、`EvidenceRecord.rawPayload`、`RagDocument.metadata`、`RagChunk.metadata`、`AgentEvalCase.inputJson`、`WatchTarget.tags`、`UserFeedback.tags` 已迁为 Json。
- `BriefItem.rawPayload/normalizedPayload` 和 `RagChunk.embeddingJson` 暂保持字符串；其中 `embeddingJson` 是 test/local fallback，pgvector 可用时生产检索应走数据库侧向量候选。
- 高频查询补充组合索引：`ToolCall(agentRunId, toolKey, status)`、`EvidenceRecord(agentRunId, kind, source)`、`ModelCall(agentRunId, status)`、`AgentRun(sessionId, status, updatedAt)`、`AgentRun(status, updatedAt)`。

## 已知限制

- 输出校验采用规则优先的 claim-level 检查，可识别部分研报标题、机构、日期、数字、评级和强结论是否被证据支持；这不是完整事实核查或合规审查。
- RAG ingest 需要声明授权状态和授权来源；下架或过期文档默认不会进入检索结果。
- 合规闸门还需要继续加强，尤其是个股和解套顾问场景。
- 项目依赖外部 Investoday 数据接口；接口不可用时应记录 evidence gap 并降级输出。
