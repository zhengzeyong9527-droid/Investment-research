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
pnpm db:bootstrap
pnpm demo:seed
pnpm worker:agent
pnpm dev
```

`db:bootstrap` 会按顺序执行已提交的 Prisma migration，并初始化 LangGraph 的 PostgreSQL checkpoint 表；它可以重复执行。若目标数据库非空但没有 `_prisma_migrations`，它会在调用 Prisma 前拒绝，避免给旧库留下失败 migration。启动 web 与 worker 前先运行一次：

```bash
pnpm db:bootstrap
pnpm infra:verify
```

也可以直接执行 `docker compose up --build`。Compose 中的一次性 `db-init` 会等待 Postgres 健康、完成 bootstrap，随后才放行 web 和 worker；应用容器不再用 `db push` 临时修改数据库。

如果数据库来自旧版本，已经有业务表但没有 `_prisma_migrations`，不要直接 bootstrap 或手工标记 migration。先完成并验证备份，再检查当前结构满足 adoption guard，最后显式执行：

```bash
pnpm db:adopt -- --confirm-backup
pnpm infra:verify
```

`db:adopt` 只接受确认过备份、核心表/字段与 JSONB 类型齐全、pgvector 已安装，而且所有已有 `RagChunk.embedding` 都是 1536 维的数据库；不满足任一条件都会在修改 migration 历史前拒绝执行，也不会自动清空或强制转换旧向量。合格旧库只会把前三条已存在的结构 migration 标为基线，随后真实执行最终的 `vector(1536)` migration、重建索引并初始化 Checkpointer。正常由 migrations 管理的数据库不需要此命令。

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

`pnpm services:start` 使用的 embedded Postgres/Redis 也只面向本地开发或 mock 验证。它可能不带 pgvector，因此不能替代 Docker/生产基础设施的 migration、向量检索和 checkpoint 联调。

## 环境变量

最小配置见 `.env.example`：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/investoday_agent"
REDIS_URL="redis://localhost:6379"
LLM_PROVIDER="deepseek"
DEEPSEEK_API_KEY=""
DEEPSEEK_MODEL="deepseek-v4-flash"
EMBEDDING_DIMENSIONS="1536"
RAG_EMBEDDING_PROVIDER="openai-compatible"
WORKER_HEARTBEAT_KEY="investoday:agent-worker:heartbeat"
WORKER_HEARTBEAT_TTL_SECONDS="30"
AGENT_MOCK_MODE="0"
APP_AUTH_TOKEN=""
```

生产或共享网络环境应配置 `APP_AUTH_TOKEN`，并避免把未鉴权服务暴露到公网。生产 RAG 使用 OpenAI-compatible embedding，并固定为 1536 维；`deterministic` 仅用于 test/mock 和 Compose 本地演示。替换 embedding 模型时，必须先验证维度兼容并在后续步骤设计重嵌入流程。

## 常用命令

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify
pnpm db:migrate
pnpm db:bootstrap
pnpm infra:verify
pnpm test:integration:infra
pnpm eval
pnpm eval:real
pnpm rag:ingest ./docs/sample-report.md --document-type=research-report --license-status=internal --license-source=internal-research
```

`pnpm verify` 是统一质量门禁，依次执行类型检查、lint、测试和构建。

`pnpm test:integration:infra` 当前运行数据库脚本、migration 和 adoption 的无服务契约测试；需要真实 Postgres/pgvector/Redis 的完整联调由 `pnpm db:bootstrap` 与 `pnpm infra:verify` 完成。

`GET /api/agent-health` 是 readiness 检查：数据库、已应用 migrations、pgvector、LangGraph checkpoint、Redis 与 worker heartbeat 全部就绪才返回 HTTP 200，否则返回 HTTP 503。它不是仅证明 Web 进程存活的 liveness 探针。

## 数据与迁移

- 空库由 `prisma/migrations` 完整重建；运行时部署使用 `pnpm db:migrate`，首次初始化使用 `pnpm db:bootstrap`。`db:push` 仅保留给临时本地原型，不是部署路径。
- 结构化字段使用 Prisma `Json` / Postgres `jsonb`，仓储层通过 `jsonValue()`、`jsonObject()`、`jsonArray()` 兼容读取旧字符串 JSON。
- `AgentRun.inputPayload/outputJson`、`SkillRun.inputPayload`、`ToolCall.inputJson`、`EvidenceRecord.rawPayload`、`RagDocument.metadata`、`RagChunk.metadata`、`AgentEvalCase.inputJson`、`WatchTarget.tags`、`UserFeedback.tags` 已迁为 Json。
- `BriefItem.rawPayload/normalizedPayload` 和 `RagChunk.embeddingJson` 暂保持字符串；其中 `embeddingJson` 是 test/local fallback，pgvector 可用时生产检索应走数据库侧向量候选。
- 高频查询补充组合索引：`ToolCall(agentRunId, toolKey, status)`、`EvidenceRecord(agentRunId, kind, source)`、`ModelCall(agentRunId, status)`、`AgentRun(sessionId, status, updatedAt)`、`AgentRun(status, updatedAt)`。

## 已知限制

- 输出校验采用规则优先的 claim-level 检查，可识别部分研报标题、机构、日期、数字、评级和强结论是否被证据支持；这不是完整事实核查或合规审查。
- RAG ingest 需要声明授权状态和授权来源；下架或过期文档默认不会进入检索结果。
- RAG ingest 支持 `generic`、`news`、`announcement`、`research-report` 四种文档类型，未指定时使用 `generic`。正文先做确定性的空白与换行规范化，再优先按章节组织，并在段落/完整句子边界结束；只有无法找到自然边界的超长文本才按字符兜底切分。不同文档类型使用不同长度与重叠配置，章节标题同时进入向量和关键词检索文本。
- 合规闸门还需要继续加强，尤其是个股和解套顾问场景。
- 项目依赖外部 Investoday 数据接口；接口不可用时应记录 evidence gap 并降级输出。
