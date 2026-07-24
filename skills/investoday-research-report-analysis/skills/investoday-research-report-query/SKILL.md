---
name: investoday-research-report-query
title: "研报数据查询"
version: "2.0.0"
description: "提供今日投资研报相关数据查询，是纯研报数据版研报解读包中唯一允许调用 investoday-api 的取数原子 Skill，覆盖研究报告列表、研究机构列表、研报舆情、研报向量搜索、股票研报预测评级和预测评级变动。Use when: 用户要查研报、研究报告、机构观点、研报摘要、研报核心内容、研报风险机会、研报向量搜索、行业渗透率/市场份额/产能库存/ASP 等研报片段证据、盈利预测、EPS 预测、净利润预测、评级变化、研究机构代码，或上层研报解读 skill 需要先拉取研报证据。Do not use when: 用户要求直接买卖建议、目标价承诺、个性化投资建议、自动交易、完整报告撰写、非研报数据查询，或在缺少股票/行业/机构/分类/查询文本时要求编造研报结论。"
tags:
  - investoday
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
      cli:
        - investoday-api
requirements:
  cli:
    - name: investoday-api
  network_access: true
---

# 研报数据查询

提供研报相关基础数据查询能力，是纯研报数据版研报解读包中唯一允许调用 `investoday-api` 的取数原子 Skill。其他原子 Skill 只能消费本 Skill 的标准输出，不直接调用接口。

核心定位：研报数据和研报文本证据查询。内部取数尽量完整；用户侧按问题粒度展示重点字段、片段和口径，不延伸为买卖建议、目标价承诺或完整投顾结论。

## 典型场景

- 查询某只 A 股近期研究报告列表、标题、作者、发布时间、发布机构和内容摘要。
- 查询某个行业、机构或栏目分类下的研报列表。
- 查询研究机构代码，供后续研报筛选使用。
- 查询研报舆情，包括核心内容、分析观点、投资机会、投资风险、情绪分析和关键事由。
- 使用研报向量搜索定位研报中的文本片段，例如行业渗透率、市场份额、CR3/CR5、产能、库存、开工率、ASP、TAM、技术路线、复购率、渠道动销和扩产节奏。
- 查询股票研报预测评级，包括 T+1/T+2/T+3 EPS、净利润预测、评级描述和目标价字段。
- 查询盈利预测、评级和目标价变动方向及原因。

## 不适合什么

- 直接输出买入、卖出、持有、加仓、减仓等交易建议。
- 承诺目标价、上涨空间、收益率或确定性涨跌判断。
- 替代完整研报解读报告撰写或个性化投顾服务。
- 查询非研报数据。
- 在没有查询条件、没有研报结果或文本片段不支持结论时编造研报观点。
- 用研报向量片段替代正式预测评级样本。

## 前置依赖

- cli: `investoday-api`

基础 API 能力、接口参数、请求方法和返回字段以 `investoday-api search-api` 或 `investoday-api list` 的确认结果为准。公共数据契约由主 Skill 统一维护，见 [../../references/data-reference/investoday-research-report-query.md](../../references/data-reference/investoday-research-report-query.md)。

## 输入要求

### 可接受输入

- A 股股票代码或名称，例如 `300750`、`宁德时代`、`002594`、`比亚迪`。
- 行业代码、一级/二级行业代码或行业名称。
- 机构名称或机构代码。
- 研报栏目分类代码。
- 查询文本，例如 `渗透率`、`市场份额`、`产能利用率`、`ASP`、`TAM`、`技术路线`。
- 日期范围，例如近 3 个月、近 12 个月、`2025-01-01` 到 `2026-06-16`。
- 输出范围：研报列表、机构列表、舆情、向量片段、预测评级、评级变动、全量研报数据包。

### 最小输入

- 研报列表：股票代码、行业代码、机构代码或分类代码至少一个。
- 研报舆情：报告 ID、标题、股票代码、行业代码、概念代码或机构代码至少一个。
- 研报向量搜索：查询文本 + 股票代码、行业代码、机构代码或分类代码至少一个。
- 股票预测评级：股票代码。
- 评级变动：股票代码。
- 机构列表：可无输入；若用户指定机构名称，使用机构名称模糊查询。

### 默认假设

- 未指定时间范围时，研报列表和预测评级默认取近 12 个月；舆情默认取近 12 个月；向量搜索默认不强行加日期，除非上层分析要求时效性。
- 未指定返回条数时，列表类默认 `pageNum=1 pageSize=20`，向量搜索默认 `topK=5`。
- 用户输入股票名称时，先通过 `investoday-api search key=<名称> type=11` 解析股票代码；多候选时先追问。
- 用户输入行业名称时，优先要求上层提供行业代码、代表公司、分类代码或其他可查询过滤范围；未能确认过滤范围时不直接编造。
- 研报目标价和评级字段只作为研报数据展示，不转化为投资建议。

### 输入校验

- 股票代码必须可识别为 A 股 6 位代码。
- 研报向量搜索不得只传查询文本，必须同时具备股票、行业、机构或分类过滤范围。
- 时间范围不得早于接口支持口径；超出范围时使用可支持日期并说明。
- 文本片段仅可作为研报证据，不能替代预测评级字段或评级变动记录。

### 缺失输入处理

- 缺少股票、行业、机构、分类或查询文本时，先说明缺少哪一项，并给出最小可继续查询条件。
- 查询无结果时，说明当前口径下暂未取得研报结果，不把空结果解释为“不存在风险”或“不存在机会”。
- 向量片段缺少明确对象、时间、指标或数值时，只作为弱文本线索，不生成强结论。
- 网络、权限或 CLI 配置不可用时，说明当前无法获取研报数据，并停止基于该数据继续推断。

## 输出契约

| 输出项 | 类型 | 是否必出 | 来源/生成方式 | 空值处理 | 说明 |
|---|---|---|---|---|---|
| 查询口径 | 文本 | 是 | 用户输入 + 默认假设 | 输入不足时先追问 | 说明股票/行业/机构/分类、日期和查询范围 |
| 研报列表 | Markdown 表格 | 条件触发 | `report/research` | 未取得结果则输出空态说明 | 标题、发布时间、机构、作者、内容摘要 |
| 机构列表 | Markdown 表格 | 条件触发 | `report/institutions` | 未取得结果则提示调整条件 | 机构名称和机构代码 |
| 研报舆情 | Markdown 表格/要点 | 条件触发 | `research/sentiment` | 未取得结果则说明当前口径 | 核心内容、观点、机会、风险、情绪 |
| 向量片段 | Markdown 表格 | 条件触发 | `report/vector-search` | 未取得结果则提示换查询词或过滤范围 | 片段摘要、发布日期、研报标题、发布机构和证据强度 |
| 预测评级 | Markdown 表格 | 条件触发 | `report/stock-forecast-ratings` | 当前样本有限则只列已取得样本 | EPS、净利润预测、评级、目标价字段 |
| 预测修正摘要 | Markdown 表格/结构化摘要 | 条件触发 | `report/stock-forecast-ratings` + `report/earnings-forecast-rating-cha` | 当前样本不支持可比计算则说明缺口 | 近期预测样本上调/下调/持平数量、上调占比和变动原因 |
| 评级变动 | Markdown 表格/要点 | 条件触发 | `report/earnings-forecast-rating-cha` | 未取得结果则说明当前口径 | 盈利预测、评级、目标价变动和原因 |
| `source_refs` | 结构化列表 | 条件触发 | 研报列表/舆情/向量/预测评级/评级变动 | 无法定位具体标题则说明需进一步确认 | 用户可见最小出处：发布日期、研报标题、发布机构、证据类型、用途 |

## 工具说明

以下接口均通过主包公共脚本使用，endpoint、工具 ID、方法、参数和返回字段均以 `investoday-api list` 或 `investoday-api search-api` 确认为准。

| 工具名称 | Endpoint/工具ID | 方法 | 关键参数 | 说明 |
|---|---|---|---|---|
| 研究报告 | `report/research` / `list_report_research` | POST | `stockCode`, `industryCode`, `industryCodeLv1`, `institutionCode`, `categoryCode`, `beginDate`, `endDate` | 查询研报列表和摘要内容 |
| 研究机构列表 | `report/institutions` / `list_report_institutions` | POST | `institutionName`, `pageNum`, `pageSize` | 查询机构代码 |
| 研报舆情 | `research/sentiment` / `list_research_sentiment` | POST | `guid`, `title`, `stockCode`, `industryCode`, `conceptCode`, `institutionCode`, `sentiment` | 查询研报观点、机会、风险和情绪 |
| 研报向量搜索 | `report/vector-search` / `list_report_vector-search` | POST | Query: `stockCode`, `industryCode`, `institutionCode`, `categoryCode`, `topK`; Body: `query` | 语义搜索研报片段 |
| 股票研报预测评级 | `report/stock-forecast-ratings` / `list_report_stock_forecast_ratings` | GET | `stockCode`, `beginDate`, `endDate` | 查询 EPS、净利润预测、评级和目标价字段 |
| 股票研报预测评级变动 | `report/earnings-forecast-rating-cha` / `get_report_earnings_forecast_rating` | GET | `stockCode` | 查询盈利预测和评级变动原因 |

## 意图路由

| route id | 用户意图 | 必要输入 | 进入工作流 | 输出 |
|---|---|---|---|---|
| `report_list` | 研报列表查询 | 股票/行业/机构/分类至少一个 | `report/research` | 研报清单和摘要 |
| `institution_lookup` | 研究机构查询 | 可选机构名称 | `report/institutions` | 机构代码和名称 |
| `report_sentiment` | 研报舆情/观点查询 | 报告/标题/股票/行业/机构等条件 | `research/sentiment` | 核心内容、观点、机会、风险 |
| `vector_search` | 研报向量搜索 | 查询文本 + 过滤范围 | `report/vector-search` | 研报片段证据 |
| `forecast_rating` | 股票研报预测评级 | 股票代码 | `report/stock-forecast-ratings` | EPS、净利润预测、评级字段，并按可比样本生成预测修正摘要 |
| `rating_change` | 预测评级变动 | 股票代码 | `report/earnings-forecast-rating-cha` | 预测、评级和目标价变动；用于补充预测修正方向和原因 |
| `report_pack` | 全量研报数据包 | 股票代码或行业代码 + 查询范围 | 组合调用多个研报接口 | 结构化研报数据包 |
| `clarify_missing_input` | 输入不足或多候选 | 缺失项本身 | 先追问 | 最小补充条件 |
| `out_of_scope_handoff` | 买卖建议、目标价承诺、完整投顾分析 | 不适用 | 说明边界 | 不编造结论 |

## 决策流程

1. 先识别用户要查的是研报列表、机构、舆情、向量片段、预测评级、评级变动，还是全量研报数据包。
2. 如果只有股票名称，先通过 `investoday-api search key=<名称> type=11` 解析股票代码；多候选时先追问。
3. 如果只有行业名称，要求上层提供可查询过滤范围；不能确认时追问行业代码、代表公司、机构或分类。
4. 研报列表优先调用 `report/research`；需要机构代码时先调用 `report/institutions`。
5. 研报观点、机会、风险和情绪优先调用 `research/sentiment`。
6. 需要从研报正文片段中找具体证据时调用 `report/vector-search`，并确保有查询文本和过滤范围。
7. 需要未来 EPS、净利润预测、评级、目标价字段或近期预测上调占比时调用 `report/stock-forecast-ratings`。
8. 需要预测或评级变化原因时调用 `report/earnings-forecast-rating-cha`；该结果用于补充变动方向和原因，不能在缺少可比预测样本时单独伪造成“上调占比”。
9. 当上层需要“机构评级趋势”“预测上调占比”“盈利预测有没有上调”时，必须先基于 `report/stock-forecast-ratings` 的本次预测值与上次预测值生成 `forecastRevisionSummary`。
10. 输出时区分“结构化预测评级数据”和“研报文本片段证据”；不得把文本片段当作确定预测评级字段。

## 数据获取流程

- Step 0：输入识别。确认股票代码、行业代码、机构代码、分类代码、查询文本和日期范围。
- Step 1：研报列表。命令 `node ../../scripts/investoday-api.js report/research --method POST --body-json '{"stockCode":"{股票代码}","beginDate":"{开始日期}","endDate":"{结束日期}","pageNum":1,"pageSize":20}'`
- Step 2：研究机构。命令 `node ../../scripts/investoday-api.js report/institutions --method POST --body-json '{"institutionName":"{机构名称}","pageNum":1,"pageSize":20}'`
- Step 3：研报舆情。命令 `node ../../scripts/investoday-api.js research/sentiment --method POST --body-json '{"stockCode":"{股票代码}","beginTime":"{开始时间}","endTime":"{结束时间}","pageNum":1,"pageSize":20}'`
- Step 4：研报向量搜索。命令 `node ../../scripts/investoday-api.js report/vector-search --method POST stockCode={股票代码} topK=5 --body-json '{"query":"{查询文本}"}'`
- Step 5：预测评级。命令 `node ../../scripts/investoday-api.js report/stock-forecast-ratings stockCode={股票代码} beginDate={开始日期} endDate={结束日期} pageNum=1 pageSize=100`
- Step 6：预测评级变动。命令 `node ../../scripts/investoday-api.js report/earnings-forecast-rating-cha stockCode={股票代码}`

> PowerShell 环境中如果 JSON 引号被拆分，可将 body JSON 内部双引号转义，例如 `--body-json '{\"query\":\"渗透率，市场空间\"}'`。

## 业务规则与分支逻辑

| 规则ID | 规则名称 | 触发条件 | 判断逻辑 | 输出影响 | 优先级 |
|---|---|---|---|---|---|
| R-001 | 向量搜索过滤范围必需 | 用户要求语义搜索研报片段 | `query` 必填，且 `stockCode/industryCode/institutionCode/categoryCode` 至少一个 | 缺失时先追问 | P0 |
| R-002 | 研报文本证据弱于预测评级字段 | 输出涉及评级、目标价或预测样本 | 预测评级字段优先；向量片段只作文本线索 | 避免把片段当确定字段 | P0 |
| R-003 | 目标价和评级不转投资建议 | 返回评级、目标价字段 | 只展示字段和口径，不生成买卖建议 | 输出边界说明 | P0 |
| R-004 | 空结果不等于无风险 | 接口返回空列表 | 说明当前口径无结果，不推导确定结论 | 输出缺口 | P0 |
| R-005 | 时间范围优先最近可用 | 用户说最近但未指定日期 | 默认近 12 个月；向量搜索可按任务决定是否加日期 | 保证时效性 | P1 |
| R-006 | 预测修正摘要必须可比 | 输出涉及上调占比、机构评级趋势或预测修正方向 | 优先比较同一研报样本的当前预测值与上次预测值 | 避免把预测样本缺口误写成结论 | P0 |

## 输出规则

- 简短查询输出 `查询口径 + 结果表 + 数据缺口`。
- 研报向量搜索必须输出片段摘要、证据强度和 `source_refs`；内部可保留 `reportId/pubDate/chunk/page/position` 用于溯源，但用户可见和上层输出不得展示报告 ID、页码或片段位置。
- `forecast_rating`、`rating_change`、`report_sentiment` 和 `vector_search` 被上层使用时，必须传递对应 `source_refs`。若无法定位具体研报标题，输出“公开研报来源未能定位到具体标题，需进一步确认”。
- `forecast_rating` 被上层用于机构评级趋势、预测修正或上调占比时，必须同时返回 `forecastRevisionSummary`。若近 3 个月存在有效预测样本但缺少上次预测值或可比期限，缺口写成“近3个月预测样本可得，但当前样本不支持计算上调占比”。
- 预测评级输出 EPS、净利润预测、评级和目标价字段时，要说明这些是研报样本数据，不是收益承诺。
- 研报舆情输出核心内容、观点、机会和风险时，不把“机会”写成投资建议。
- 若结果用于上层 skill，优先输出结构化字段表和可传递字段，而不是长篇解释。
- 字段为空时保留字段；面向上层报告的表格空项统一写“—”，不得删除造成误导。

## 辅助文档

- 研报基础数据见 [references/研报基础数据.md](references/研报基础数据.md)
- 研报特色数据见 [references/研报特色数据.md](references/研报特色数据.md)
- 研报投资评级见 [references/研报投资评级.md](references/研报投资评级.md)

## 验收标准

| 验收项 | 通过标准 | 验证方式 |
|---|---|---|
| 唯一取数入口 | 在本主包中只有本 Skill 说明可直接调用 `investoday-api` | 静态检查其他原子 Skill |
| 接口覆盖 | 覆盖研报分组 6 个 endpoint | `investoday-api list 研报` 与数据契约核对 |
| 输入处理 | 向量搜索缺少 query 或过滤范围时会追问 | 边界用例测试 |
| 输出结构 | 查询结果包含口径、表格、缺口说明和引用来源 | 正向用例测试 |
| 证据边界 | 研报片段不被当作确定预测评级字段 | 研报向量用例测试 |
| 合规边界 | 不输出买卖建议、目标价承诺或收益承诺 | 高风险反例测试 |

## 测试用例

| 用例ID | 场景 | 输入 | 预期输出 | 通过标准 |
|---|---|---|---|---|
| TC-001 | 研报列表 | `查 300750 最近研报` | 研报列表、日期、标题、机构、缺口 | 不输出买卖建议 |
| TC-002 | 向量搜索 | `从 002594 研报里找 ASP 和产能释放` | 研报片段表、代表性研报出处、弱证据说明 | 不把片段改写成确定字段，不展示报告 ID、页码或片段位置 |
| TC-003 | 预测评级 | `查 600519 未来三年净利润预测` | T+1/T+2/T+3 预测字段和样本口径 | 字段为空时使用“—” |
| TC-004 | 输入不足 | `查研报里的渗透率` | 追问股票/行业/机构/分类过滤范围 | 不直接全库裸搜 |
| TC-005 | 高风险 | `根据研报告诉我能买吗` | 说明边界，可提供研报数据查询 | 不输出交易建议 |

## 失败处理

- 名称匹配多个标的：返回候选项，请用户确认。
- 研报列表未取得结果：说明查询条件和日期范围，不推导覆盖状态之外的结论。
- 向量搜索未取得结果：建议换查询词、扩大日期或改用股票/行业过滤范围；不编造片段。
- 预测评级当前未取得有效样本：保留预测评级模块并说明当前口径。
- 评级变动未取得结果：说明当前未取得变动记录，不等同于评级没有变化。
- 网络、权限或 CLI 配置不可用：说明当前无法获取数据，并停止基于该数据继续推断。

## 安全与隐私

- 仅通过主包公共脚本调用 `investoday-api` 查询研报数据。
- 不记录、不存储用户查询记录。
- 不写入凭证、token、认证或初始化细节。
- 不自动下单或执行交易。

## 免责声明

本报告基于客观研报数据分析，由 AI 生成，不构成投资建议。投资有风险，入市需谨慎。
