# Investoday Investment Research Agent

这是一个面向 A 股投研场景的 Agent 工程作品。项目目标不是做一个普通聊天壳，而是把投研问答拆成可追踪的工程链路：会话、任务、图节点、工具调用、证据、模型调用、记忆、RAG 召回、输出验证和用户反馈都可落库查看。

> 本项目仅用于信息整理、研究辅助和工程作品展示，不构成投资建议、交易建议、收益承诺或风险兜底。

## 当前状态

- Agent Runtime：Next.js API + BullMQ/Redis Worker + LangGraph.js。
- 数据库：Postgres + Prisma，目标环境使用 pgvector。
- 模型：DeepSeek / OpenAI-compatible Chat Completions。
- 工具：今日投资数据工具 + 本地 Tool Registry + MCP 入口。
- RAG：本地文档摄取、chunk、embedding、pgvector 字段、hybrid search、rerank 入口。
- 评测：`pnpm eval` 内置 50 个投研 case，可输出 Markdown/JSON 报告。
- 安全：HTML artifact 加 CSP / `nosniff`，写接口支持 `APP_AUTH_TOKEN` 最小鉴权开关。

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
  Graph --> Eval["Eval Runner"]
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
- Eval：用于验证完成率、工具成功率、证据覆盖、引用准确率、RAG recall、幻觉风险、延迟和成本。

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
pnpm eval
pnpm rag:ingest ./docs/sample-report.md
pnpm demo:seed
```

`pnpm eval` 会生成：

```text
eval-report.md
eval-report.json
```

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

## 已知限制

- 本地 RAG 第一版使用应用层 hybrid search + rerank，pgvector 字段已落库，后续可升级为数据库侧向量相似度查询。
- Eval runner 当前以规则评测为主，LLM-as-judge 可作为后续增强。
- 鉴权是最小 token 方案，不是完整租户、组织、RBAC 系统。
- 项目依赖今日投资外部接口做实时投研数据，接口不可用时会记录 evidence gap。
