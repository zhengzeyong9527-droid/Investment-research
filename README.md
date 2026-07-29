# Personal Investment Research Workbench

一个面向 A 股投研场景的个人研究工作台。项目将市场概览、热点线索、研报解读、公司研究、行业分析和 Agent 执行链路整合到一个 Next.js 全栈应用中，目标是让使用者可以围绕股票、行业或市场事件快速形成结构化研究视图。

> 本项目仅用于信息整理、研究辅助和作品集展示，不构成任何投资建议。

## 核心功能

- **市场概览**：聚合指数、行业、主题、资讯等维度，生成可浏览的市场环境视图。
- **热点追踪**：支持按市场热点、行业主题和个股线索进入详情页。
- **投研 Agent**：基于本地 `SKILL.md` 方法论、数据证据和大模型输出研究结论。
- **研报与公司研究**：围绕个股、行业和研报材料生成结构化解读。
- **任务过程可见**：记录 Agent run、skill run、工具调用、证据、模型调用和用户反馈。
- **本地与部署兼容**：支持本地嵌入式 Postgres/Redis，也可连接云端 Postgres/Redis 部署。

## 技术栈

- **框架**：Next.js 15、React 19、TypeScript
- **样式与 UI**：Tailwind CSS、Lucide React、ECharts
- **数据层**：Prisma、PostgreSQL
- **后台任务**：BullMQ、Redis
- **Agent Runtime**：LangGraph.js、本地 Skill Registry、Tool Registry
- **模型接入**：DeepSeek / OpenAI 兼容 Chat Completions API
- **测试**：Vitest、Testing Library

## 项目结构

```text
src/
  app/          Next.js 页面与 API Routes
  components/   工作台 UI 组件
  lib/          数据适配、仓储、业务逻辑与通用工具
  agents/       Agent 执行器、队列、记忆、模型提供方与运行状态
  skills/       应用内 Skill 适配器与注册表
  tools/        投研工具注册表
  mcp/          MCP 服务入口
skills/         本地投研 Skill.md 方法论与模板
prisma/         Prisma schema
scripts/        本地 Postgres/Redis 辅助启动脚本
```

## 本地运行

要求：

- Node.js 20+
- pnpm 11+

安装依赖：

```bash
pnpm install
```

复制环境变量模板：

```bash
cp .env.example .env
```

在 `.env` 中填写至少一个模型供应商的 API Key，例如：

```env
LLM_PROVIDER="deepseek"
DEEPSEEK_API_KEY="your_api_key"
```

启动本地 Postgres 与 Redis：

```bash
pnpm services:start
```

在另一个终端初始化数据库结构：

```bash
pnpm db:push
```

启动开发服务：

```bash
pnpm dev
```

如需体验 Agent 后台任务，再打开一个终端启动 worker：

```bash
pnpm worker:agent
```

默认访问地址：

```text
http://localhost:3000
```

## 环境变量

主要环境变量见 `.env.example`：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/investoday_agent"
REDIS_URL="redis://localhost:6379"
LLM_PROVIDER="deepseek"
DEEPSEEK_API_KEY=""
DEEPSEEK_MODEL="deepseek-v4-flash"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4.1-mini"
OPENAI_BASE_URL="https://api.openai.com/v1"
OTEL_SERVICE_NAME="investoday-agent"
```

注意：不要将 `.env`、真实 API Key、数据库密码或 token 提交到公开仓库。

## 测试与构建

运行测试：

```bash
pnpm test
```

生产构建：

```bash
pnpm build
```

生产启动：

```bash
pnpm start
```

## 部署提示

这是一个全栈 Next.js 应用，不是纯静态网站。部署时需要同时准备：

- Next.js Web 服务
- PostgreSQL 数据库
- Redis 服务
- Agent Worker 服务
- 服务器环境变量中的模型 API Key

推荐先使用 Railway 这类一站式平台部署 Web、Postgres、Redis 和 Worker。后续也可以拆分为 Vercel + Neon/Supabase Postgres + Upstash Redis + Railway/Render Worker。

## 免责声明

本项目输出仅用于学习、研究辅助和信息整理。所有市场数据、研报观点、模型生成内容和分析结论都不构成投资建议、交易建议、收益承诺或风险兜底。投资决策应由使用者自行判断并承担风险。
