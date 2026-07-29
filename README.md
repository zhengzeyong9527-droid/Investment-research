# Investoday Investment Research Agent

这是一个面向 A 股投研场景的 Agent 工程作品。它不是普通聊天壳：系统会记录 `AgentRun`、`AgentStep`、`ToolCall`、`ModelCall`、`EvidenceRecord`、`MemoryItem`、`SkillRun` 和 `UserFeedback`，让每次回答背后的实体识别、工具取数、证据、模型调用、记忆和验证过程可追踪。

> 本项目只用于信息整理、研究辅助和工程作品展示，不构成投资建议、交易建议、收益承诺或风险兜底。

## 架构

```mermaid
flowchart LR
  UI["Next.js Web UI"] --> API["Next.js API"]
  API --> Queue["BullMQ / Redis"]
  Queue --> Worker["Agent Worker"]
  Worker --> Graph["LangGraph Runtime"]
  Graph --> Tools["Tool Registry / MCP / Investoday"]
  Graph --> RAG["Local RAG / pgvector"]
  Graph --> Skills["Skill Registry"]
  Graph --> Model["DeepSeek / OpenAI-compatible LLM"]
  Graph --> DB["Postgres / Prisma"]
  Graph --> Eval["Eval Runner"]
```

当前真实执行图：

```text
resolve_entity -> plan_intent -> retrieve_memory -> fetch_tools -> local_rag_retrieve -> grade_evidence -> generate -> verify -> persist
```

## 能力边界

- 今日投资外部工具：负责实时行情、研报、新闻、行业、概念、个股等数据接口。
- 本地 RAG：负责你自己上传或 seed 的研报、公告、研究笔记等文档，支持 chunk、embedding、pgvector 存储、hybrid search 和 rerank 的工程入口。
- Skill：负责把投研方法论和输出模板落地，例如盘面播报、公司研究、行业研究、研报解读、成长分析、解套顾问。
- LangGraph：负责节点编排、状态记录、可恢复入口和后续 interrupt/resume 扩展。

## 快速启动

本地开发（推荐，包含真实 pgvector）：

```bash
pnpm install
docker compose up -d postgres redis
pnpm db:push
pnpm demo:seed
pnpm worker:agent
pnpm dev
```

Docker demo：

```bash
pnpm demo:start
```

访问：

```text
http://localhost:3000
```

说明：`pnpm services:start` 仍可用于快速启动嵌入式 Postgres/Redis，但嵌入式 Postgres 不一定包含 pgvector。要完整验证本地 RAG，请使用 Docker Compose 的 `pgvector/pgvector:pg16`。

## 常用命令

```bash
pnpm rag:ingest ./docs/sample-report.md
pnpm eval --smoke
pnpm eval
pnpm test
pnpm build
```

`pnpm eval` 会生成：

```text
eval-report.md
eval-report.json
```

评测指标包括 completion、tool_success、citation_precision、rag_recall_at_k、hallucination_rate、latency 和 cost。

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

- 本地 RAG 第一版使用应用层 rerank，pgvector 字段已落库，后续可升级为数据库侧向量相似度查询。
- Eval runner 当前以规则评测为主，LLM-as-judge 可作为后续增强。
- 鉴权是最小 token 方案，不是完整租户、组织、RBAC 系统。
- 本项目依赖今日投资外部接口做实时投研数据，接口不可用时会记录 evidence gap。
