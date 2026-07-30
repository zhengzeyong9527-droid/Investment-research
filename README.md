# Investoday Investment Research Agent

这是一个面向 A 股投研场景的 Agent 工程作品。项目目标不是做一个普通聊天壳，而是把投研问答拆成可追踪的工程链路：会话、任务、LangGraph 节点、工具调用、证据、模型调用、记忆、RAG 召回、输出验证和用户反馈都能落库查看。

> 本项目仅用于信息整理、研究辅助和工程作品展示，不构成投资建议、交易建议、收益承诺或风险兜底。

## 当前状态

- Agent Runtime：Next.js API + BullMQ/Redis Worker + LangGraph.js。
- 数据库：Postgres + Prisma，目标环境使用 pgvector。
- 模型：DeepSeek / OpenAI-compatible Chat Completions。
- 工具：今日投资数据工具 + 本地 Tool Registry + MCP 入口。
- RAG：本地文档摄取、chunk、embedding、pgvector 字段、hybrid search、rerank 入口。
- 评测：`pnpm eval` 已改为真实 Agent 评测入口，会真实创建 AgentSession/AgentRun、入队、等待 Worker、读取 ToolCall/EvidenceRecord/ModelCall/Memory/RAG 结果后评分。
- 安全：HTML artifact 加 CSP / `nosniff`，写接口支持 `APP_AUTH_TOKEN` 最小鉴权开关。

## 产品截图

自选速览：围绕自选股、行业、新闻、研报和公告做每日信息聚合，支持范围筛选、情绪筛选和行业滚动观察。

<p align="center">
  <img src="docs/screenshots/workbench-watchlist-digest.png" alt="自选速览" width="100%" />
</p>

当日大盘：展示核心指数、分时/日周月 K、区间表现、赚钱效应、行业轮动，并可触发盘面播报 Agent。

<p align="center">
  <img src="docs/screenshots/workbench-market-overview.png" alt="当日大盘" width="100%" />
</p>

投研 Agent 多轮对话：默认智能调度，也可以选择具体能力。每轮问题会生成一个可追踪的 `AgentRun`，回答以 Markdown 渲染。

<p align="center">
  <img src="docs/screenshots/workbench-agent-chat-report.png" alt="投研 Agent 多轮对话" width="100%" />
</p>

Agent 研究报告正文：支持结构化结论、核心依据、主要风险、表格和长文阅读，执行过程与证据链可在“查看过程”中展开。

<p align="center">
  <img src="docs/screenshots/workbench-agent-report-detail.png" alt="Agent 研究报告正文" width="100%" />
</p>

## 核心功能

- 自选速览：对自选标的生成新闻、研报、公告和市场线索摘要。
- 当日大盘：聚合指数行情、赚钱效应、行业表现、板块热度和市场新闻。
- 盘面播报 Agent：调用 `investoday-stock-market-broadcast` skill，对市场环境进行自动解读。
- 研究问答 Agent：支持公司研究、研报解读、行业研究、成长分析、解套顾问等 skill。
- 多轮对话：同一会话内继承标的、时间窗口、输出偏好和上下文约束。
- 证据链：每次回答保留 ToolCall、EvidenceRecord、ModelCall、SkillRun 和 verification。
- 本地 RAG：支持把自有文档摄取为 RagDocument/RagChunk，用于回答时召回。
- 真实评测：`pnpm eval` 通过真实运行链路验证完成率、工具成功率、证据覆盖、引用准确率、RAG recall、记忆、幻觉风险、延迟和成本。

## 总体架构

```mermaid
flowchart LR
  UI["Next.js Web UI"] --> API["Next.js API Routes"]
  API --> Queue["BullMQ / Redis"]
  Queue --> Worker["Agent Worker"]
  Worker --> Graph["LangGraph Runtime"]
  Graph --> Memory["Agent Memory"]
  Graph --> Tools["Tool Registry / MCP / Investoday"]
  Graph --> RAG["Local RAG / pgvector"]
  Graph --> Skills["Skill Registry"]
  Graph --> Model["DeepSeek / OpenAI-compatible LLM"]
  Graph --> DB["Postgres / Prisma"]
  Graph --> Eval["Real Eval Runner"]
```

## Agent 执行图

研究类 Agent 当前执行图：

```text
resolve_entity
-> plan_intent
-> retrieve_memory
-> fetch_tools
-> local_rag_retrieve
-> grade_evidence
-> generate
-> verify
-> persist
```

盘面播报 Agent 当前执行图：

```text
load_market_data
-> retrieve_memory
-> build_evidence
-> local_rag_retrieve
-> grade_evidence
-> run_broadcast_skill
-> verify_output
-> persist
```

Worker 统一执行 graph，并使用 `thread_id = sessionId` 作为 LangGraph checkpoint 的会话维度。每个节点会写入 `AgentStep`，最终 `AgentRun.outputJson.graphState` 会保留节点、RAG 命中、工具结果和证据缺口。

## 数据与过程实体

系统会记录这些核心实体：

- `AgentSession`：一个多轮对话。
- `AgentMessage`：用户/助手消息。
- `AgentRun`：每一轮用户提问背后的执行任务。
- `AgentStep`：LangGraph 节点执行步骤。
- `ToolCall`：每次工具调用、耗时、状态、错误和 source endpoint。
- `EvidenceRecord`：用于回答的证据。
- `ModelCall`：模型调用、token、耗时、成本。
- `SkillRun`：具体 skill 的 prompt package、Markdown/HTML 输出。
- `MemoryItem`：跨轮/跨会话长期记忆。
- `RagDocument` / `RagChunk`：本地 RAG 文档和 chunk。
- `AgentEvalCase` / `AgentEvalResult`：评测用例和结果。

## 能力边界

- 今日投资外部工具：负责实时行情、研报、新闻、行业、概念、个股等数据接口。
- 本地 RAG：负责自有研报、公告、研究笔记等文档的摄取和召回。
- Skill：负责投研方法论和输出模板，例如盘面播报、公司研究、研报解读、行业研究、成长分析、解套顾问。
- Eval：用于验证真实 Agent 链路，不再用脚本构造假答案、假证据或假 RAG 命中。

## 快速启动

推荐使用 Docker 的 Postgres + pgvector 和 Redis：

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

一键 Docker demo：

```bash
pnpm demo:start
```

说明：`pnpm services:start` 仍可用于快速启动嵌入式 Postgres/Redis，但嵌入式 Postgres 不一定包含 pgvector。完整验证本地 RAG 时，建议使用 `docker compose up -d postgres redis`。

## 常用命令

```bash
pnpm test
pnpm build
pnpm eval --smoke
pnpm eval --real
pnpm eval --stress
pnpm eval:synthetic
pnpm rag:ingest ./docs/sample-report.md
pnpm demo:seed
```

`pnpm eval` 默认执行真实 smoke 评测，生成：

```text
eval-report.md
eval-report.json
```

`pnpm eval --real` 执行完整 50 个真实 case。`pnpm eval --stress` 执行多会话并发、重复问题稳定性和隔离检查。旧的模拟评测已移动到 `pnpm eval:synthetic`，只用于规则评分函数自检，不能作为 Agent 稳定性证明。

真实评测会失败而不是降级造假，如果缺少以下任一条件：

- `DATABASE_URL` 指向可连接的 Postgres。
- `REDIS_URL` 指向可连接的 Redis。
- `pnpm worker:agent` 已启动并注册 BullMQ worker。
- `DEEPSEEK_API_KEY` / `OPENAI_API_KEY` / `LLM_API_KEY` 已配置。
- 今日投资数据源和本地 RAG 可用。

## 真实评测指标

`eval-report.json` 会包含每个真实 run 的：

- caseId / prompt / agentKey / sessionId / runId / finalStatus。
- outputMarkdown。
- toolCalls / evidenceRecords / modelCalls。
- memoryHits / memoryWrites。
- ragHits / evidenceGaps。
- metrics / passed / failureReasons。

主要指标：

- `terminal_rate`：是否进入 completed / failed / interrupted 终态。
- `completion_rate`：是否完成。
- `tool_success_rate`：真实 ToolCall 成功率。
- `evidence_coverage_rate`：是否有真实 EvidenceRecord。
- `entity_match_rate`：证据和回答是否匹配当前股票、行业或主题。
- `citation_precision` / `citation_recall`：回答中的关键实体、日期、数字是否被证据支持。
- `rag_recall_at_k`：本地文档问题是否命中预期 chunk。
- `memory_write_rate` / `memory_recall_rate`：长期记忆写入和召回是否发生。
- `cross_session_leak_rate`：多会话是否串上下文。
- `stale_date_rate`：是否出现不符合当前日期窗口的旧日期。
- `hallucination_rate`：无证据事实、虚构研报、虚构机构、虚构数字风险。
- `latency_p50_ms` / `latency_p95_ms`：端到端耗时。
- `token_input` / `token_output` / `cost_cents`：成本指标。

## 环境变量

见 `.env.example`。最小配置：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/investoday_agent"
REDIS_URL="redis://localhost:6379"
LLM_PROVIDER="deepseek"
DEEPSEEK_API_KEY=""
DEEPSEEK_MODEL="deepseek-v4-flash"
RAG_EMBEDDING_PROVIDER="deterministic"
APP_AUTH_TOKEN=""
```

生产式 RAG 可配置 OpenAI-compatible embeddings：

```env
EMBEDDING_BASE_URL="https://api.openai.com/v1"
EMBEDDING_API_KEY=""
EMBEDDING_MODEL="text-embedding-3-small"
EMBEDDING_DIMENSIONS="1536"
```

## API 入口

Agent：

- `GET /api/agents`
- `POST /api/agents/[agentKey]/runs`
- `GET /api/agent-runs/[id]`
- `GET /api/agent-runs/[id]/events`
- `POST /api/agent-runs/[id]/resume`
- `POST /api/agent-sessions`
- `GET /api/agent-sessions/[id]`
- `POST /api/agent-sessions/[id]/messages`
- `GET /api/agent-sessions/[id]/events`

RAG：

- `GET /api/rag/documents`
- `POST /api/rag/documents`
- `POST /api/rag/search`

Eval：

- `GET /api/eval/runs/latest`

Artifact：

- `GET /api/skill-runs/[id]/html`

## 固定验收案例

1. `研究贵州茅台（600519）近30天研报怎么看？请引用证据。`
2. `我的永兴材料被套40%，请问还有解套空间吗？短期碳酸锂会涨吗？`
3. `引用本地文档回答茅台渠道风险，并给出后续关注指标。`

检查点：

- AgentRun 最终进入 `completed / failed / interrupted`。
- 查看过程里能看到 graph 节点、ToolCall、EvidenceRecord、ModelCall、memory hits、rag hits 和 verification。
- 工具失败会进入 `evidenceGaps`，不会被当成“没有数据”静默吞掉。
- HTML artifact 只通过链接打开，响应带 CSP 和 `nosniff`。
- 真实 eval 的每个 case 必须有真实 `runId`、`ToolCall`、`ModelCall`，否则失败。

## 已知限制

- 本地 RAG 第一版使用应用层 hybrid search + rerank，pgvector 字段已落库，后续可升级为数据库侧向量相似度查询。
- Eval 评分当前以规则评测为主，LLM-as-judge 可作为后续增强。
- 鉴权是最小 token 方案，不是完整租户、组织、RBAC 系统。
- 项目依赖今日投资外部接口做实时投研数据，接口不可用时会记录 evidence gap。
