# 子 Skill 参考：gs-research-report-query

- 原路径：`skills/gs-research-report-query/SKILL.md`
- 转换说明：券商交付简化模式已移除 `skills/` 嵌套目录；本文件保留原子 Skill 的执行口径供主 Skill 按需引用。

## 原 Skill Frontmatter

```yaml
name: gs-research-report-query
title: "研报数据查询"
version: "1.0.0"
description: "提供国信证券研报相关数据查询，覆盖研究报告列表、研报向量搜索、股票研报预测评级和预测评级变动。Use when: 用户要查研报、研究报告、机构观点、研报摘要、研报正文片段、研报风险线索、研报向量搜索、行业渗透率/市场份额/产能库存/ASP 等研报片段证据、盈利预测、EPS预测、净利润预测、评级变化，或上层投研 skill 需要先拉取研报证据。Do not use when: 用户要求直接买卖建议、目标价承诺、个性化投资建议、自动交易、完整投研报告撰写、非研报数据查询，或在缺少股票/行业/分类/查询文本时要求编造研报结论。"
tags:
  - gs
  - research-report
  - report-query
  - report-vector-search
  - forecast-rating
  - investment-research
  - a-share
metadata:
  clawdbot:
    emoji: "📄"
    category: "finance"
    requires:
      skills:
        - gs-finance-data
      cli:
        - node scripts/gs-api.js
requirements:
  skills:
    - name: gs-finance-data
  cli:
    - name: node scripts/gs-api.js
  node: ">=18"
  packages:
    - name: "@gs/node scripts/gs-api.js"
      manager: "npm"
  network_access: true
```

## 原 Skill 正文

# 研报数据查询

提供研报相关基础数据查询能力，适合作为上层投研分析、成长大师成长股分析、估值分析、行业分析、盈利预测和文本证据补充的子 skill。

**核心定位：研报数据和研报文本证据查询。内部取数尽量完整；用户侧按问题粒度展示重点字段、片段和口径，不延伸为买卖建议、目标价承诺或完整投研结论。**

## 典型场景

- 查询某只 A 股近期研究报告列表、标题、作者、发布时间、发布机构和内容摘要。
- 查询某个行业、机构或栏目分类下的研报列表。
- 使用研报向量搜索定位研报中的文本片段，例如行业渗透率、市场份额、CR3/CR5、产能、库存、开工率、ASP、原材料价格、TAM/SAM、技术路线、复购率、渠道动销和扩产节奏。
- 查询股票研报预测评级，包括 T+1/T+2/T+3 EPS、净利润预测、评级描述和目标价字段。
- 查询盈利预测、评级和目标价变动方向及原因。

## 何时使用

| 意图 | 用户话术 |
|---|---|
| 研报列表 | "查一下宁德时代最近研报" "有哪些关于半导体的研究报告" |
| 研报向量搜索 | "从研报里找渗透率" "查市场份额/CR5/ASP/产能库存的研报片段" |
| 盈利预测 | "查研报里的未来三年净利润预测" "EPS预测样本" |
| 评级变动 | "盈利预测有没有上调" "评级变化原因是什么" |
| 全量研报数据包 | "给我拉一份研报数据包" "研报、舆情、预测评级都查一下" |

## 不适合什么

- 直接输出买入、卖出、持有、加仓、减仓等交易建议。
- 承诺目标价、上涨空间、收益率或确定性涨跌判断。
- 替代完整投研报告撰写、估值建模或个性化投顾服务。
- 在没有查询条件、没有研报结果或文本片段不支持结论时编造研报观点。
- 用研报向量片段替代结构化财务数据、公告事实或正式预测样本。

## 前置依赖

- skill: `gs-finance-data`
- cli: `node scripts/gs-api.js`
- package: `@gs/node scripts/gs-api.js`
- node: `>=18`

基础 API 能力、接口参数、请求方法、示例命令和返回字段以当前 CLI 的接口检索结果为准。

## 输入要求

### 可接受输入

- A 股股票代码或名称，例如 `300750`、`宁德时代`、`002594`、`比亚迪`。
- 行业代码、一级/二级行业代码或行业名称。
- 机构名称或机构代码。
- 研报栏目分类代码。
- 查询文本，例如 `渗透率`、`市场份额`、`产能利用率`、`ASP`、`TAM`、`技术路线`。
- 日期范围，例如近 3 个月、近 12 个月、`2025-01-01` 到 `2026-06-16`。
- 输出范围：研报列表、向量片段、预测评级、评级变动、全量研报数据包。

### 最小输入

- 研报列表：股票代码、行业代码、机构代码或分类代码至少一个。
- 研报向量搜索：查询文本 + 股票代码、行业代码、机构代码或分类代码至少一个。
- 股票预测评级：股票代码。
- 评级变动：股票代码。

### 推荐输入

- 股票代码 + 查询范围 + 日期范围。
- 向量搜索建议同时提供查询主题和过滤范围，例如 `300750 + 渗透率/市场份额/产能库存`。
- 行业研报查询建议提供标准行业代码；只有行业名称时先由上层行业查询能力确认行业代码。
- 全量研报数据包建议指定近 6 个月或近 12 个月，避免结果过宽。

### 可选输入

- `beginDate` / `endDate` 或 `beginTime` / `endTime`。
- `pageNum` / `pageSize`。
- `topK`。
- `institutionCode`、`categoryCode`、`conceptCode`、`sentiment`、`minRelevance`。

### 默认假设

- 未指定时间范围时，研报列表和预测评级默认取近 12 个月；舆情默认取近 12 个月；向量搜索默认不强行加日期，除非上层分析要求时效性。
- 未指定返回条数时，列表类默认 `pageNum=1 pageSize=20`，预测评级默认 `pageNum=1 pageSize=20`，向量搜索默认 `topK=5`。
- 用户输入股票名称时，先由 `$gs-finance-data` 的搜索或基础数据能力解析股票代码；多候选时先追问。
- 用户输入行业名称时，优先由行业查询能力确认行业代码；未能确认行业代码时不直接编造。
- 研报目标价和评级字段只作为研报数据展示，不转化为投资建议。

### 输入校验

- 股票代码必须可识别为 A 股 6 位代码。
- 研报向量搜索不得只传查询文本，必须同时具备股票、行业、机构或分类过滤范围。
- 时间范围不得早于接口支持口径；超出范围时使用可支持日期并说明。
- 文本片段仅可作为研报证据，不能直接替代结构化财务字段或公司公告原文。

### 缺失输入处理

- 缺少股票、行业、机构、分类或查询文本时，先说明缺少哪一项，并给出最小可继续查询条件。
- 查询无结果时，说明当前口径下未取得研报结果，不把空结果解释为“没有风险”或“没有机会”。
- 向量片段缺少明确对象、时间、指标或数值时，只作为弱文本线索，不生成强结论。
- 网络、权限或 CLI 配置不可用时，说明当前无法获取研报数据，并停止基于该数据继续推断。

### 示例输入

```text
查一下 300750 最近 12 个月的研报列表和预测评级。
```

```text
从比亚迪研报里搜索“海外销量、ASP、产能释放、市场份额”的相关片段。
```

```text
查一下半导体行业最近有哪些研究报告。
```

```text
帮我查高盛的研究机构代码。
```

### 反例输入

```text
根据研报告诉我这只股票能买吗？
```

原因：这是交易建议请求，本 skill 只能查询研报数据和证据，不输出买卖结论。

```text
随便找研报证明行业渗透率一定会提升。
```

原因：这是预设结论并要求找证据背书；本 skill 必须如实返回结果和缺口，不能选择性编造证据。

## 输出契约

| 输出项 | 类型 | 是否必出 | 来源/生成方式 | 空值处理 | 说明 |
|---|---|---|---|---|---|
| 查询口径 | 文本 | 是 | 用户输入 + 默认假设 | 输入不足时先追问 | 说明股票/行业/机构/分类、日期和查询范围 |
| 研报列表 | Markdown 表格 | 条件触发 | `report/research` | 无结果则输出空态说明 | 标题、发布时间、机构、作者、内容摘要 |
| 向量片段 | Markdown 表格 | 条件触发 | `report/vector-search` | 无结果则提示换查询词或过滤范围 | 片段摘要、发布日期、研报标题、发布机构和证据强度；内部可保留 reportId、页码和位置用于溯源 |
| 预测评级 | Markdown 表格 | 条件触发 | `report/stock-forecast-ratings` | 样本不足则标注 | EPS、净利润预测、评级、目标价字段 |
| 预测修正摘要 | Markdown 表格/结构化摘要 | 条件触发 | `report/stock-forecast-ratings` | 可比样本不足则说明缺口 | 近期预测样本上调/下调/持平数量、上调占比；评级变动原因仅在用户明确询问时补充 |
| 评级变动 | Markdown 表格/要点 | 条件触发 | `report/earnings-forecast-rating-cha` | 无结果则标注 | 盈利预测、评级、目标价变动和原因 |
| `source_refs` | 结构化列表 | 条件触发 | 研报列表/舆情/向量/预测评级/评级变动 | 无法定位具体标题则标注 | 用户可见最小出处：发布日期、研报标题、发布机构、证据类型、用途 |
| 引用来源 | 列表 | 是 | 实际使用的接口或研报记录 | 未使用研报不列入 | 用于上层报告证据链 |

## 字段口径与数据源

| 字段 | 含义 | 类型 | 是否必填 | 数据来源 | 更新频率/日期口径 | 空值含义 | 示例 |
|---|---|---|---|---|---|---|---|
| `stockCode` | 股票代码 | string | 条件必填 | 用户输入或标的解析 | 查询时点 | 未识别股票 | `300750` |
| `industryCode` / `industryCodeLv1` | 行业代码 | string | 条件必填 | 用户输入或行业查询 | 查询时点 | 未识别行业 | `640000` |
| `institutionCode` | 研究机构代码 | string/integer | 否 | 机构查询或用户输入 | 查询时点 | 未限定机构 | `37` |
| `categoryCode` | 栏目分类代码 | string | 否 | 用户输入或上层传入 | 查询时点 | 未限定分类 | `000100` |
| `query` | 向量搜索文本 | string | 向量搜索必填 | 用户输入 | 查询时点 | 不能执行向量搜索 | `渗透率，市场空间` |
| `guid` / `reportId` | 研报标识 | string | 否 | 研报列表/舆情/向量搜索 | 研报发布日期 | 无法追溯具体报告 | `A3E...` |
| `chunk` | 向量搜索片段 | string | 否 | 研报向量搜索 | 研报发布时间 | 无片段证据 | `...海外销量...` |
| `source_refs.title` | 研报标题 | string | 条件必填 | 研报标准输出 | 研报发布时间 | 无法定位具体标题 | `宁德时代深度报告...` |
| `source_refs.publish_date` | 发布日期 | date/string | 条件必填 | 研报标准输出 | 研报发布时间 | 无法定位发布日期 | `2026-02-02` |
| `source_refs.institution` | 发布机构 | string | 条件必填 | 研报标准输出 | 研报发布时间 | 无法定位发布机构 | `XX证券` |
| `source_refs.evidence_type` | 证据类型 | string | 条件必填 | 研报标准输出 | 查询时点 | 未分类 | `forecast_rating/vector_search/report_list` |
| `source_refs.used_for` | 上层用途 | string | 条件必填 | 调用方或本 skill 标注 | 查询时点 | 未标注用途 | `盈利预测/风险提示/渗透率证据` |
| `netProfitForecastT1/T2/T3` | T+1/T+2/T+3 净利润预测 | number | 否 | 股票研报预测评级 | 报告完成时间 | 无有效预测样本 | `45800000000` |
| `forecastRevisionSummary.validSampleCount` | 可比预测修正样本数 | number | 否 | 股票研报预测评级 | 报告完成时间 | 可比样本不足 | `12` |
| `forecastRevisionSummary.upRevisionCount` | 预测上调样本数 | number | 否 | 股票研报预测评级 | 报告完成时间 | 可比样本不足 | `7` |
| `forecastRevisionSummary.downRevisionCount` | 预测下调样本数 | number | 否 | 股票研报预测评级 | 报告完成时间 | 可比样本不足 | `3` |
| `forecastRevisionSummary.flatRevisionCount` | 预测持平样本数 | number | 否 | 股票研报预测评级 | 报告完成时间 | 可比样本不足 | `2` |
| `forecastRevisionSummary.upRevisionRatio` | 预测上调占比 | number | 否 | 股票研报预测评级 | 报告完成时间 | 可比样本不足 | `0.5833` |
| `forecastRevisionSummary.basis` | 预测修正计算口径 | string | 否 | 股票研报预测评级/预测评级变动 | 查询时点 | 未能形成口径 | `近3个月T+1净利润预测本次值与上次值对比` |
| `ratingDescription` | 研报评级描述 | string | 否 | 股票研报预测评级 | 报告完成时间 | 未给评级 | `买入` |
| `tPlus1YProfitForecastChg` | T+1 盈利预测变动 | integer | 否 | 预测评级变动 | 最新可得 | 无变动记录 | `1` |

## 工具说明

以下接口均通过 `node scripts/gs-api.js` CLI 使用，endpoint、工具 ID、方法、参数和返回字段均已通过当前接口清单确认；详细字段、示例命令和使用边界见后续分组参考文档。

| 工具名称 | Endpoint/工具ID | 方法 | 关键参数 | 说明 |
|---|---|---|---|---|
| 研究报告 | `report/research` / `list_report_research` | POST | `stockCode`, `industryCode`, `industryCodeLv1`, `institutionCode`, `categoryCode`, `beginDate`, `endDate` | 查询研报列表和摘要内容 |
| 研报向量搜索 | `report/vector-search` / `list_report_vector-search` | POST | Query: `stockCode`, `industryCode`, `institutionCode`, `categoryCode`, `topK`; Body: `query` | 语义搜索研报片段 |
| 股票研报预测评级 | `report/stock-forecast-ratings` / `list_report_stock_forecast_ratings` | GET | `stockCode`, `beginDate`, `endDate` | 查询 EPS、净利润预测、评级和目标价字段 |
| 股票研报预测评级变动 | `report/earnings-forecast-rating-cha` / `get_report_earnings_forecast_rating` | GET | `stockCode` | 查询盈利预测和评级变动原因 |

## 意图路由

本节只在 skill 已由 frontmatter `description` 触发后使用，用于把研报数据请求分派到具体查询工作流。

| route id | 用户意图 | 必要输入 | 进入工作流 | 输出 |
|---|---|---|---|---|
| `report_list` | 研报列表查询 | 股票/行业/机构/分类至少一个 | `report/research` | 研报清单和摘要 |
| `vector_search` | 研报向量搜索 | 查询文本 + 过滤范围 | `report/vector-search` | 研报片段证据 |
| `forecast_rating` | 股票研报预测评级 | 股票代码 | `report/stock-forecast-ratings` | EPS、净利润预测、评级字段，并按可比样本生成预测修正摘要 |
| `rating_change` | 预测评级变动 | 股票代码 | `report/earnings-forecast-rating-cha` | 预测、评级和目标价变动；仅在用户明确询问预测或评级变化原因时调用 |
| `report_pack` | 全量研报数据包 | 股票代码或行业代码 + 查询范围 | 组合调用多个研报接口 | 结构化研报数据包 |
| `clarify_missing_input` | 输入不足或多候选 | 缺失项本身 | 先追问 | 最小补充条件 |
| `out_of_scope_handoff` | 买卖建议、目标价承诺、完整投顾分析 | 不适用 | 转交或说明边界 | 不编造结论 |

## 决策流程

1. 先识别用户要查的是研报列表、机构、向量片段、预测评级、评级变动，还是全量研报数据包。
2. 如果只有股票名称，先通过 `$gs-finance-data` 的搜索能力解析股票代码；多候选时先追问。
3. 如果只有行业名称，优先由行业查询能力确认行业代码；不能确认时追问标准行业或代表性公司。
4. 研报列表优先调用 `report/research`；若需要按机构过滤，用户或上层必须提供已知 `institutionCode`，当前 API 清单未提供机构名称查询接口。
5. 研报观点、机会和风险优先从 `report/research` 返回的摘要/正文或 `report/vector-search` 片段中抽取，不再调用独立舆情接口。
6. 需要从研报正文片段中找具体证据时调用 `report/vector-search`，并确保有查询文本和过滤范围。
7. 需要未来 EPS、净利润预测、评级、目标价字段或近期预测上调占比时调用 `report/stock-forecast-ratings`。
8. 只有用户明确询问预测变化原因、评级变化原因或上层完整/单维度报告显式要求变化原因时，才调用 `report/earnings-forecast-rating-cha`；该结果用于补充变动方向和原因，不能在缺少可比预测样本时单独伪造成“上调占比”，不得作为轻量版默认调用。
9. 当上层需要“机构评级趋势”“预测上调占比”“盈利预测有没有上调”时，必须先基于 `report/stock-forecast-ratings` 的本次预测值与上次预测值生成 `forecastRevisionSummary`：默认使用近 3 个月样本，优先比较 T+1 净利润预测；T+1 不可比时依次使用 T+2、T+3，同一条研报样本只计入一次。若净利润预测不可比但 EPS 当前值和上次值可比，可用同期限 EPS 作为补充，并在 `basis` 中说明。上调占比 = 上调样本数 / 可比预测修正样本数。
10. 输出时区分“结构化预测评级数据”和“研报文本片段证据”；不得把文本片段当作确定结构化字段。

## 数据获取流程

- Step 0：输入识别。确认股票代码、行业代码、机构代码、分类代码、查询文本和日期范围。
- Step 1：研报列表。命令 `node scripts/gs-api.js report/research --method POST --body-json '{"stockCode":"{股票代码}","beginDate":"{开始日期}","endDate":"{结束日期}","pageNum":1,"pageSize":20}'`
- Step 2：研报向量搜索。命令 `node scripts/gs-api.js report/vector-search --method POST stockCode={股票代码} topK=5 --body-json '{"query":"{查询文本}"}'`
- Step 3：预测评级。命令 `node scripts/gs-api.js report/stock-forecast-ratings stockCode={股票代码} beginDate={开始日期} endDate={结束日期} pageNum=1 pageSize=20`
- Step 4：预测评级变动。仅在明确需要变化原因时调用，命令 `node scripts/gs-api.js report/earnings-forecast-rating-cha stockCode={股票代码}`

> PowerShell 环境中如果 JSON 引号被拆分，可将 body JSON 内部双引号转义，例如 `--body-json '{\"query\":\"渗透率，市场空间\"}'`。

## 业务规则与分支逻辑

| 规则ID | 规则名称 | 触发条件 | 判断逻辑 | 输出影响 | 数据来源 | 优先级 |
|---|---|---|---|---|---|---|
| R-001 | 向量搜索过滤范围必需 | 用户要求语义搜索研报片段 | `query` 必填，且 `stockCode/industryCode/institutionCode/categoryCode` 至少一个 | 缺失时先追问 | `report/vector-search` | P0 |
| R-002 | 研报文本证据弱于结构化数据 | 输出涉及数值字段或预测样本 | 预测评级字段优先；向量片段只作文本线索 | 避免把片段当确定值 | 全部研报接口 | P0 |
| R-003 | 目标价和评级不转投资建议 | 返回评级、目标价字段 | 只展示字段和口径，不生成买卖建议 | 输出边界说明 | `report/stock-forecast-ratings` | P0 |
| R-004 | 空结果不等于无风险 | 接口返回空列表 | 说明当前口径无结果，不推导确定结论 | 输出缺口 | 全部接口 | P0 |
| R-005 | 时间范围优先最近可用 | 用户说最近但未指定日期 | 默认近 12 个月；向量搜索可按任务决定是否加日期 | 保证时效性 | 用户输入 | P1 |
| R-006 | 预测修正摘要必须可比 | 输出涉及上调占比、机构评级趋势或预测修正方向 | 优先比较同一研报样本的当前预测值与上次预测值；可比样本不足时只说明缺口，不写成已确认未上调；评级变动接口只在明确问原因时补充 | 避免把预测样本缺口误写成结论 | `report/stock-forecast-ratings`，必要时 `report/earnings-forecast-rating-cha` | P0 |

| 分支 | 条件 | 处理方式 | 输出要求 | 不适用边界 |
|---|---|---|---|---|
| 简单查询 | 用户只问一个接口范围 | 只查对应接口 | 摘要 + 表格 + 口径 | 不扩展为分析报告 |
| 全量数据包 | 用户要求研报全量或上层 skill 取数 | 按列表、舆情、向量、预测评级组合查询 | 按模块输出缺口和结果 | 不承诺每个模块都有数据 |
| 向量证据补充 | 用户要渗透率、份额、产能等研报证据 | 使用向量搜索并生成 `source_refs` | 标注发布日期、研报标题、发布机构和不确定性 | 不替代正式结构化字段 |
| 输入不足 | 缺少过滤范围或查询文本 | 追问最小输入 | 给出可继续查询的字段 | 不猜测标的和行业 |
| 高风险请求 | 买卖建议、目标价承诺 | 拒绝交易化结论，保留数据查询能力 | 说明只能查询研报数据 | 不输出投资建议 |

## 输出规则

- 简短查询输出 `查询口径 + 结果表 + 数据缺口`。
- 研报向量搜索必须输出片段摘要、证据强度和 `source_refs`；内部可保留 `reportId/pubDate/chunk/page/position` 用于 L1 溯源，但用户可见和上层输出不得展示报告 ID、页码或片段位置。
- `forecast_rating`、`rating_change` 和 `vector_search` 被上层使用时，必须传递对应 `source_refs`。若无法定位具体研报标题，输出“公开研报来源未能定位到具体标题，待后续数据复核”。
- `forecast_rating` 被上层用于机构评级趋势、预测修正或上调占比时，必须同时返回 `forecastRevisionSummary`。若近 3 个月存在有效预测样本但缺少上次预测值或可比期限，缺口写成“近3个月预测样本可得，但可比预测修正样本不足，无法计算上调占比”；不得只写“无法确认上调占比超过50%”。
- 预测评级输出 EPS、净利润预测、评级和目标价字段时，要说明这些是研报样本数据，不是收益承诺。
- 从研报列表摘要或向量片段提取观点、机会和风险时，不把“机会”写成投资建议。
- 若结果用于上层 skill，优先输出结构化字段表和可传递字段，而不是长篇解释。
- 字段为空时保留字段并写“数据不足”或“未返回”，不得删除造成误导。

推荐输出表：

| 模块 | 字段 | 最新值/内容 | 研报出处 | 口径 |
|---|---|---|---|---|
| 研报列表 | 标题 | `...` | `2026-02-02` | `report/research` |
| 研报片段 | 文本片段 | `...渗透率...` | `2026-02-02，《研报标题》，发布机构` | `report/vector-search` |
| 预测评级 | T+1 净利润预测 | `xx亿元` | `2026-02-02，《研报标题》，发布机构` | `report/stock-forecast-ratings` |
| 评级变动 | T+1 预测变动原因 | `...` | 最新可得 | `report/earnings-forecast-rating-cha` |

## 辅助文档

- 接口索引见 [docs/references-index.md](docs/references-index.md)
- 数据请求契约见 [../../references/data-reference/gs-research-report-query.md](../../references/data-reference/gs-research-report-query.md)
- 研报基础数据见 [references/研报基础数据.md](references/研报基础数据.md)
- 研报特色数据见 [references/研报特色数据.md](references/研报特色数据.md)
- 研报投资评级见 [references/研报投资评级.md](references/研报投资评级.md)

## 验收标准

| 验收项 | 通过标准 | 验证方式 |
|---|---|---|
| 接口覆盖 | 覆盖当前实际调用链保留的研报 endpoint | 当前接口清单与数据契约核对 |
| 输入处理 | 向量搜索缺少 query 或过滤范围时会追问 | 边界用例测试 |
| 输出结构 | 查询结果包含口径、表格、缺口说明和引用来源 | 正向用例测试 |
| 证据边界 | 研报片段不被当作确定结构化数据 | 研报向量用例测试 |
| 合规边界 | 不输出买卖建议、目标价承诺或收益承诺 | 高风险反例测试 |

## 测试用例

| 用例ID | 场景 | 输入 | 预期输出 | 通过标准 |
|---|---|---|---|---|
| TC-001 | 研报列表 | `查 300750 最近研报` | 研报列表、日期、标题、机构、缺口 | 不输出买卖建议 |
| TC-002 | 向量搜索 | `从 002594 研报里找 ASP 和产能释放` | 研报片段表、代表性研报出处、弱证据说明 | 不把片段改写成确定字段，不展示报告 ID、页码或片段位置 |
| TC-003 | 预测评级 | `查 600519 未来三年净利润预测` | T+1/T+2/T+3 预测字段和样本口径 | 字段为空时标注缺失 |
| TC-004 | 输入不足 | `查研报里的渗透率` | 追问股票/行业/机构/分类过滤范围 | 不直接全库裸搜 |
| TC-005 | 高风险 | `根据研报告诉我能买吗` | 说明边界，可提供研报数据查询 | 不输出交易建议 |

## 失败处理

- 名称匹配多个标的：返回候选项，请用户确认。
- 研报列表无返回：说明查询条件和日期范围，不推导“没有研报覆盖”之外的结论。
- 向量搜索无结果：建议换查询词、扩大日期或改用股票/行业过滤范围；不编造片段。
- 预测评级无有效样本：保留预测评级模块并标注“数据不足，无法判断”。
- 评级变动无返回：说明当前未取得变动记录，不等同于评级没有变化。
- 网络、权限或 CLI 配置不可用：说明当前无法获取数据，并停止基于该数据继续推断。

## 安全与隐私

- 仅通过 `node scripts/gs-api.js` CLI 查询国信证券金融数据。
- 不记录、不存储用户查询记录。
- 不写入凭证、token、认证或初始化细节。
- 不自动下单或执行交易。

## 免责声明

本报告基于客观数据分析，由AI生成，不构成投资建议。投资有风险，入市需谨慎。

## finance-data 接口文档

当前 Skill 的数据接口口径、参数示例、POST Body 写法和回归检查见 [`gs-research-report-query-finance-data-interface.md`](gs-research-report-query-finance-data-interface.md)。
