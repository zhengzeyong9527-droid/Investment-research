# 子 Skill 参考：gs-financial-data-query

- 原路径：`skills/gs-company-financial-analysis/skills/gs-financial-data-query/SKILL.md`
- 转换说明：券商交付简化模式已移除 `skills/` 嵌套目录；本文件保留原子 Skill 的执行口径供主 Skill 按需引用。

## 原 Skill Frontmatter

```yaml
name: gs-financial-data-query
title: "国信证券股票财务数据查询"
version: "2.0.0"
description: "L1 股票财务数据查询 Skill，把用户或 L2 的上市公司财务需求转成标准化 data_pack：三大报表、财务指标、现金流、分红回购和行业对比。Use when: 用户说查财报、查利润表/资产负债表/现金流量表、生成 full_financial_pack，或 L2 需要财务 data_pack。Do not use when: 用户要买卖建议、目标价、仓位、收益预测、短线策略，或要求直接写财务分析结论。"
tags:
  - gs
  - company-finance
  - finance-data
  - financial-statement
metadata:
  clawdbot:
    emoji: "股"
    category: "finance"
requirements:
  node: ">=18"
  packages:
    - name: "@gs/node scripts/gs-api.js"
      manager: npm
      global: true
  network_access: true
```

## 原 Skill 正文

# 国信证券股票财务数据查询

这是 L1 数据查询 Skill。它不再携带非标准 Python workflow、MCP 适配器或本机脚本链路，而是通过已安装的 `node scripts/gs-api.js` npm 包直接调用底层接口获取真实金融数据，生成 L2 可消费的标准化财务 data_pack。

## 前置依赖

- package: `@gs/node scripts/gs-api.js (npm)` — 所有底层数据接口均通过该 npm 包直接调用
- node: `>=18`

> 说明：`gs-finance-data` 作为底层数据 Skill 已不再维护，当前版本直接通过 `node scripts/gs-api.js` npm 包调用底层接口。如果 `node scripts/gs-api.js` 未初始化或权限不足，进入 `unavailable` 路由并返回 `blocked_dependency_missing`。

## PFA Scale 目录定位

- 层级：L1 查询层。
- 目录：`skills/gs-company-financial-analysis/skills/gs-financial-data-query/`。
- 入口：`SKILL.md`。
- 规则归属：触发、调用、降级和输出契约只写在 `SKILL.md`；字段细节、模板和检查项放入 `references/`；不使用额外 workflow/outflow 文件。
- 运行依赖：使用 `node scripts/gs-api.js` npm 包调用底层接口，不手写 HTTP 请求。

## 输入要求

### 可接受输入

- 公司对象：公司名称、股票代码、市场、交易所或行业口径。
- 查询范围：年度、季度、起止报告期、单季/累计、合并报表或母公司报表。
- 查询任务：查三大报表、查财务指标、生成数据包、生成 Owner Earnings 输入字段、查询分红回购或现金流质量字段。
- 输出模式：`report_mode`、`data_pack_mode`、`single_field_lookup`，或明确的 `query_mode`。
- 上层调用：L2 传入的公司、期间、字段清单或需要补齐的 missing_fields。

### 最小输入

- 查询对象：至少给出公司名称或股票代码。
- 查询任务：至少说明查财务数据、查字段、生成报告，还是生成 L2 数据包。
- 时间范围：如未提供，默认最近 5 个完整年度，并尽量补充最近一期季度数据。

### 推荐输入

- 公司名称 + 股票代码 + 市场，例如“比亚迪 002594 A股”。
- 起止期间，例如 `2020-2025` 或 `2019-2023`。
- 输出模式和查询模式，例如 `data_pack_mode` + `full_financial_pack`。
- 是否需要行业对比、分红回购、Owner Earnings 输入字段和 source_trace。

### 可选输入

- 输出语言、表格详细程度、是否只返回 JSON、是否需要 Markdown 报告。
- 是否记录缺失字段、异常值、数据源追踪、fallback_trace 和计算说明。
- 是否只查询单一字段，例如 CFO、CapEx、自由现金流、营运资本变化、分红派现。

### 默认假设

- 未指定语言时，使用中文。
- 未指定输出模式时，普通用户使用 `report_mode`，上层 L2 调用使用 `data_pack_mode`。
- 未指定时间范围时，使用最近 5 个完整年度，并尽量补充最近一期季度数据。
- 未指定市场时，根据股票代码或公司名称识别；无法唯一识别时先追问。
- 缺少真实数据或字段时，返回缺失说明和数据质量检查，不使用模拟数据补齐。

### 输入校验

- 校验公司名称、股票代码和市场是否能唯一定位。
- 校验报告期、年度/季度、币种、单位和报表口径是否明确。
- 校验 `output_mode` 与 `query_mode` 是否匹配。
- 校验 `node scripts/gs-api.js` 是否已初始化且可用；如不可用，返回 `blocked_dependency_missing` 及初始化指引。
- 校验 L2 所需字段是否包含 `data_status`、`data_quality_check`、`source_trace`、`fallback_trace` 和字段级来源说明。

### 缺失输入处理

- 缺少公司对象、市场无法唯一识别、报告期冲突或输出模式不明确时，先追问 1-3 个阻塞问题。
- 只缺少偏好类信息时，不追问，使用默认假设继续执行。
- 底层接口无结果、权限不足或字段缺失时，不编造数据；返回 `missing_fields`、`fallback_trace` 和可继续补查的接口方向。
- 用户要求投资建议时，不追问买卖偏好，直接说明本 Skill 只做数据查询并转交 L2 或合规投研流程。

### 示例输入

```text
请用 data_pack_mode 查询比亚迪 002594 A股 2020-2025 的 full_financial_pack，输出给 L2 使用，并列出 missing_fields、source_trace 和 fallback_trace。
```

### 反例输入

```text
比亚迪现在能买吗？给我目标价和仓位建议。
```

原因：这是投资建议、目标价和仓位请求，不应由 L1 数据查询 Skill 处理，应转交合规的上层分析或人工投研流程。

## 意图路由

意图路由只在本技能已经被 frontmatter `description` 触发后使用；`description` 决定是否触发本 Skill，意图路由决定触发后进入哪条工作流。

| route id | 用户意图 | 用户信号 | 必要输入 | 进入工作流 | 输出 |
|---|---|---|---|---|---|
| `single_field_lookup` | 查询单一财务字段 | "查 CFO""查 CapEx""查自由现金流" | 公司对象、字段名、期间 | 使用 `node scripts/gs-api.js` 搜索并调用最小接口 | 一句话摘要 + 字段表 |
| `report_mode` | 普通用户财务数据速查 | “查财报”“看三大报表”“财务数据报告” | 公司对象，期间可默认 | 查询报表和关键指标，输出 Markdown | 财务数据速查报告 |
| `data_pack_mode` | 给 L2 生成结构化数据包 | “给 L2”“data_pack_mode”“full_financial_pack” | 公司对象、query_mode、期间 | 按 query_mode 生成标准 JSON | L2 data_pack |
| `clarify` | 关键信息不足 | 公司重名、市场不清、期间冲突、query_mode 不明 | 缺失项 | 追问 1-3 个阻塞问题 | 待补充清单 |
| `handoff_analysis` | 用户要财务分析或投资判断 | “财务质量怎么样”“能不能买”“目标价” | 用户原始问题 | 转交 `$gs-company-financial-analysis` 或合规投研流程 | 转交建议 + 可先生成的数据包 |
| `unavailable` | 底层数据不可用 | `node scripts/gs-api.js` 未初始化、权限不足、接口无结果 | 公司对象和查询任务 | 输出 `blocked_dependency_missing` 或 `data_unavailable` + 原因 + 修复指引 |

## 调用关系

1. L1 只通过 `node scripts/gs-api.js` npm 包获取底层数据。
2. 不调用 L2，不做财务质量结论。
3. 不使用额外 workflow 文件；如果上层需要串联，串联逻辑写在 L2 `SKILL.md`。
4. 调用底层数据时遵循：接口不明确先使用当前 CLI 的接口检索能力确认，接口明确再调用真实 endpoint。
5. 输出必须记录 `source_trace`；如果发生补查或降级，必须记录 `fallback_trace`。
6. `gs-finance-data` 作为历史依赖名已不再使用；所有原由其提供的搜索、补查能力均直接通过 `node scripts/gs-api.js` 实现。

## 支持的 query_mode 速查表

以下 9 种 query_mode 与 `references/query_modes.md` 完全一致：

| query_mode | 核心返回字段（示例） | 典型用途 |
|---|---|---|
| `full_financial_pack` | 利润表、资产负债表、现金流量表、财务指标、分红回购、公司基础信息 | 完整公司财务分析 |
| `cash_conversion_pack` | 经营现金流(CFO)、净利润、应收账款、存货、应付账款、现金转换周期 | 现金流质量与利润兑现分析 |
| `single_field_lookup` | 指定单一字段值 + 期间 + 单位 + 来源 | 快速查询某个财务字段 |
| `profitability_pack` | 营业收入、毛利率、净利率、ROE、ROA、ROIC、费用率 | 盈利能力分析 |
| `growth_pack` | 营业收入同比、净利润同比、扣非归母净利润同比、CAGR | 成长持续性分析 |
| `shareholder_return_pack` | 现金分红金额、每股分红 DPS、股息率、分红率、回购数据 | 股东回报分析 |
| `balance_sheet_health_pack` | 资产负债率、流动比率、速动比率、有息负债率、营运资本 | 资产负债表稳健性分析 |
| `financial_risk_pack` | 审计意见、商誉减值、资产减值、关联交易、应收/存货异常 | 财务风险字段识别 |
| `owner_earnings_input_pack` | 净利润、CFO、折旧摊销、CapEx、营运资本变化、FCF | Owner Earnings 输入字段（供 L3 调用） |

> 完整字段定义和字段对象规范见 `references/field_schema.md`。如果 `single_field_lookup` 在 `query_modes.md` 中作为 output_mode 定义，本表仍保留以保持一致：该模式既可作为 query_mode 也可作为 output_mode。

## 输出契约

L1 `data_pack_mode` 必须包含：

```text
skill_name, skill_level, output_mode, query_mode, query_target, query_scope,
request_options, data_package, data_status, data_quality_check, source_trace,
fallback_trace, generated_at, limitations
```

字段要求：

| 字段 | 必填 | 说明 |
|---|---|---|
| `skill_name` | 是 | 固定为 `gs-financial-data-query` |
| `skill_level` | 是 | 固定为 `L1` |
| `output_mode` | 是 | `data_pack_mode` / `report_mode` / `single_field_lookup` |
| `query_mode` | 是 | 见上方速查表 |
| `query_target` | 是 | 公司名称、代码、市场 |
| `query_scope` | 是 | 起止期间、报告期列表 |
| `request_options` | 否 | 用户指定的额外选项 |
| `data_package` | 是 | 实际数据内容；不完整时仍须返回已获取部分 |
| `data_status` | 是 | `complete` / `partial` / `data_unavailable` / `blocked_dependency_missing` |
| `data_quality_check` | 是 | 包含 missing_fields、abnormal_values 等检查结果 |
| `source_trace` | 是 | 每个字段的数据来源 |
| `fallback_trace` | 否 | 发生补查或降级时必须记录 |
| `generated_at` | 是 | 生成时间戳 |
| `limitations` | 是 | 数据缺失、口径限制、方法局限 |

- 所有数值字段必须带 `value`、`period`、`unit`、`currency`、`source` 或 `source_note`。
- 所有计算字段必须标注 `calculated_by_skill: true` 和计算口径。
- 数据源直接返回字段标注 `source_returned: true`。
- 不允许输出 `{value}`、连续数字占位符、乱码替代符或无法解释的占位字段到正式结果。
- 数据不完整时可以输出 `partial`，但必须列出 `missing_fields`、`method_limitations` 和下一步可补查方向。

## 合规边界

不能输出买卖建议、目标价、收益预测、交易策略、持仓建议或确定性投资判断。遇到这类问题时，说明本 Skill 仅做财务数据查询和标准化，并转交合规分析流程。

## report_mode 输出规范

当 L1 以 `report_mode` 输出"财务数据速查报告"时，必须遵守以下规则：

### 输出内容

仅为财务数据表格和简要数据说明，**不得包含以下内容**：

1. ❌ 财务质量分析、盈利能力判断、利润质量结论
2. ❌ 成长持续性评估、现金流质量分析、资产负债表稳健性结论
3. ❌ 股东回报质量判断、风险因素分析、后续跟踪指标
4. ❌ "核心财务质量摘要""盈利能力与利润质量""成长持续性"等 L2 分析章节标题
5. ❌ "附录"、"数据完整性说明"、"A.1"、"A.2"、"A.3"、"数据质量评估"等内部分析内容
6. ❌ 买卖建议、目标价、仓位建议、交易策略

### report_mode 输出格式

```markdown
# [公司名称] 财务数据速查

> 查询日期：YYYY-MM-DD | 数据来源：国信证券 | 本报告仅为财务数据罗列，不构成投资建议

## 一、公司基本信息

（公司名称、代码、市场、行业、主营业务）

## 二、利润表数据

（按期间排列的利润表核心数据表格）

## 三、资产负债表数据

（按期间排列的资产负债表核心数据表格）

## 四、现金流量表数据

（按期间排列的现金流量表核心数据表格）

## 五、分红数据

（按年度排列的分红派息数据表格）

```

### report_mode vs handoff_analysis 判断规则

| 用户请求 | 进入模式 | 说明 |
|---|---|---|
| "查财报""看三大报表""财务数据报告""给我一份XX的财务数据" 等纯数据查询 | `report_mode` | 只输出数据表格，不做分析 |
| "财务质量怎么样""财务分析""利润质量""现金流质量""资产负债表稳健性" 等分析请求 | `handoff_analysis` | 转交 L2 分析 Skill |
| 模糊请求（如"看看比亚迪"） | 追问 | 确认用户需要数据还是分析 |

## 参考文件

- [references/query_modes.md](references/query_modes.md)：查询模式定义。
- [references/field_schema.md](references/field_schema.md)：字段清单与字段对象规范。
- [references/output_contract.md](references/output_contract.md)：L2 结构化输出契约。
- [references/data_quality_rules.md](references/data_quality_rules.md)：缺失、异常、冲突和口径校验规则。
- [references/calculation_rules.md](references/calculation_rules.md)：L1 允许的轻量计算。

## finance-data 接口文档

当前 Skill 的数据接口口径、参数示例、POST Body 写法和回归检查见 [`gs-financial-data-query-finance-data-interface.md`](gs-financial-data-query-finance-data-interface.md)。
