# 公司研究数据请求契约

> 适用 Skill：`investoday-stock-research-interpretation`
> 数据契约文件：`references/investoday-stock-research-interpretation-data.md`
> 本文件只记录已经通过 `investoday-api search-api` 确认的数据接口。当前 Skill 只使用本文件列出的 endpoint 和字段。

## 适用范围

本契约服务于“公司研究”单业务 Skill，用于通过股票名称或代码识别 A 股标的，获取股票基础信息，查询近 90 天研报舆情，并默认尝试研报向量片段补证，生成非操作性宏观研究报告和图表数据。

## API 搜索确认记录

| 搜索轮次 | search-api 命令 | 业务数据项 | 候选 endpoint | Method | 关键入参 | 返回字段摘要 | 采用结论 | 原因 |
|---|---|---|---|---|---|---|---|---|
| 1 | `investoday-api search-api query=综合标的搜索` | 标的识别 | `search` | GET | `key`, `type`, `pageNum`, `pageSize` | `code`, `shortName`, `fullName`, `type`, `mkt` | 采用 | 用于股票名称到代码的识别 |
| 2 | `investoday-api search-api query=股票基本信息` | 股票基础信息 | `stock/basic-info` | POST | `stockCode`, `stockCodes`, `pageNum`, `pageSize` | `stockCode`, `stockName`, `boardName`, `mainBusiness`, `reportDate` | 采用 | 用于补充行业、主营业务和基础资料 |
| 3 | `investoday-api search-api query=研报舆情` | 研报舆情 | `research/sentiment` | POST | `stockCode`, `beginTime`, `endTime`, `pageNum`, `pageSize` | `date`, `title`, `coreContent`, `analysisViewpoint`, `investmentRisk`, `comScore`, `sentiment`, `keyReason`, `sentimentAnalysis` | 采用 | 核心研报证据来源 |
| 4 | `investoday-api search-api query=股票行情` | 行情/资金流 | `stock-quote/realtime`, `stock/daily-fund-flows` 等 | GET/POST | `stockCode` 等 | 价格、涨跌幅、成交额、资金流 | 不采用 | 本 Skill 只做研报宏观研究，避免图表产生交易信号含义 |
| 5 | `investoday-api search-api query=股票研报预测评级` | 业绩预期汇总 | `report/stock-forecast-ratings` | GET | `stockCode`, `beginDate`, `endDate`, `pageNum`, `pageSize` | 未来 1-3 年主营收入预测、净利润预测、机构评级、目标价等 | 限定采用 | 仅用于业绩预期汇总；评级和目标价只作为机构研报口径展示，不作为本 Skill 建议 |
| 6 | `investoday-api search-api tool_ids='list_report_vector-search'` | 研报向量片段补证 | `report/vector-search` | POST | query `stockCode`, `beginDate`, `endDate`, `topK`; body `query` | `reportId`, `pubDate`, `chunk`, `page`, `blockStart`, `blockEnd`, `position` | 条件采用 | 默认尝试查询原文片段；仅在返回非空且与公司/主题相关的 `chunk` 时纳入分析，空返回或超时静默降级 |

## 已确认数据请求总览

| 数据项 | endpoint | Method | CLI 命令模板 | 必填入参 | 可选入参 | 返回字段 | 使用方 | 是否必需 |
|---|---|---|---|---|---|---|---|---|
| 标的识别 | `search` | GET | `investoday-api search key=<股票名称> type=11 pageNum=1 pageSize=10` | `type` | `key`, `pageNum`, `pageSize` | `code`, `shortName`, `fullName`, `mkt` | 标的识别 | 名称输入时必需 |
| 股票基础信息 | `stock/basic-info` | POST | `investoday-api stock/basic-info --method POST --body-json '{"stockCode":"<股票代码>","pageNum":1,"pageSize":10}'` | `stockCode` 或 `stockCodes` | `pageNum`, `pageSize` | `stockCode`, `stockName`, `boardName`, `mainBusiness`, `reportDate` | 基础信息章节 | 是 |
| 研报舆情 | `research/sentiment` | POST | `investoday-api research/sentiment --method POST --body-json '{"stockCode":"<股票代码>","beginTime":"<开始时间>","endTime":"<结束时间>","pageNum":1,"pageSize":10}'` | 至少 `stockCode` | `beginTime`, `endTime`, `pageNum`, `pageSize`, `minRelevance` | `date`, `title`, `coreContent`, `analysisViewpoint`, `investmentRisk`, `comScore`, `sentiment`, `keyReason`, `sentimentAnalysis` | 报告正文与图表 | 是 |
| 研报向量片段补证 | `report/vector-search` | POST | `investoday-api report/vector-search --method POST stockCode=<股票代码> beginDate=<开始日期> endDate=<结束日期> topK=8 --body-json '{"query":"<查询文本>"}'` | body `query`；query 至少 `stockCode` | `beginDate`, `endDate`, `industryCode`, `institutionCode`, `categoryCode`, `topK` | `pubDate`, `chunk`；内部可保留 `reportId`, `page`, `blockStart`, `blockEnd`, `position` 用于去重溯源 | 成长逻辑、竞争位置、研报片段补证、证据表和 HTML 片段模块 | 否 |
| 业绩预期汇总 | `report/stock-forecast-ratings` | GET | `investoday-api report/stock-forecast-ratings stockCode=<股票代码> beginDate=<开始日期> endDate=<结束日期> pageNum=1 pageSize=20` | `stockCode` | `beginDate`, `endDate`, `pageNum`, `pageSize` | `date`, `institutionName`, `reportTitle`, `tYear`, `epsForecastT1/T2/T3`, `epsForecastT1Prev/T2Prev/T3Prev`, `netProfitForecastT1/T2/T3`, `netProfitForecastT1Prev/T2Prev/T3Prev`, `revenueMainForecastT1/T2/T3`, `revenueMainForecastT1Prev/T2Prev/T3Prev`, `ratingDescription`, `ratingDescriptionPrev`, `targetPrice`, `targetPriceEx`, `targetPriceExPrev` | 业绩预期汇总章节与 HTML 业绩表 | 否 |

## 请求定义

### 请求 1：标的识别

- endpoint：`search`
- Method：GET
- CLI 命令模板：

```bash
investoday-api search key=<股票名称> type=11 pageNum=1 pageSize=10
```

| 参数 | 含义 | 类型 | 来源 | 是否允许默认 | 默认值 | 缺失处理 |
|---|---|---|---|---|---|---|
| `key` | 股票名称或公司线索 | string | 用户输入 | 否 | 无 | 缺失时追问 |
| `type` | 搜索类型 | string | 固定枚举 | 是 | `11` | 不允许替换 |
| `pageNum` | 页码 | integer | 固定默认 | 是 | `1` | 使用默认 |
| `pageSize` | 页长 | integer | 固定默认 | 是 | `10` | 使用默认 |

| 字段 | 含义 | 类型 | 使用位置 | 空值处理 |
|---|---|---|---|---|
| `code` | 股票代码 | string | 后续请求入参 | 无代码时追问或结束 |
| `shortName` | 股票简称 | string | 报告标题 | 缺失时用用户输入 |
| `fullName` | 股票全称 | string | 基础信息说明 | 可省略 |
| `mkt` | 市场类型 | string | 标的识别 | 非 A 股范围时提示 |

- 失败处理：无法识别标的时，请用户补充股票代码；不得输出内部接口名称或底层错误信息。
- 禁止替代：不得用未经确认的搜索接口或模型猜测股票代码替代。

### 请求 2：股票基础信息

- endpoint：`stock/basic-info`
- Method：POST
- CLI 命令模板：

```bash
investoday-api stock/basic-info --method POST --body-json '{"stockCode":"<股票代码>","pageNum":1,"pageSize":10}'
```

| 参数 | 含义 | 类型 | 来源 | 是否允许默认 | 默认值 | 缺失处理 |
|---|---|---|---|---|---|---|
| `stockCode` | 股票代码 | string | 用户输入或 `search.code` | 否 | 无 | 缺失时追问 |
| `stockCodes` | 股票代码列表 | array | 用户输入 | 否 | 无 | 单标的优先用 `stockCode` |
| `pageNum` | 页码 | integer | 固定默认 | 是 | `1` | 使用默认 |
| `pageSize` | 页长 | integer | 固定默认 | 是 | `10` | 使用默认 |

| 字段 | 含义 | 类型 | 使用位置 | 空值处理 |
|---|---|---|---|---|
| `stockCode` | 股票代码 | string | 报告元信息 | 缺失时用入参 |
| `stockName` | 股票名称 | string | 报告标题 | 缺失时用搜索结果 |
| `boardName` | 上市板块 | string | 基础信息 | 可省略 |
| `mainBusiness` | 主营业务 | string | 行业/主题识别 | 缺失时不推断 |
| `reportDate` | 财务报告日期 | datetime | 基础信息口径 | 可省略 |

- 失败处理：保留股票代码并继续处理可用研报内容；最终报告不得输出底层错误、接口名称或字段名称。
- 禁止替代：不得用其他公司资料或未确认字段补全主营业务。

### 请求 3：研报舆情

- endpoint：`research/sentiment`
- Method：POST
- CLI 命令模板：

```bash
investoday-api research/sentiment --method POST --body-json '{"stockCode":"<股票代码>","beginTime":"<90天前 00:00:00>","endTime":"<当前日期 23:59:59>","pageNum":1,"pageSize":10}'
```

| 参数 | 含义 | 类型 | 来源 | 是否允许默认 | 默认值 | 缺失处理 |
|---|---|---|---|---|---|---|
| `stockCode` | 股票代码 | string | 用户输入或标的识别 | 否 | 无 | 缺失时追问 |
| `beginTime` | 发布开始时间 | string | 当前日期向前 90 天或用户指定 | 是 | 近 90 天 | 使用默认 |
| `endTime` | 发布截止时间 | string | 当前日期或用户指定 | 是 | 当前日期 | 使用默认 |
| `pageNum` | 页码 | integer | 固定默认 | 是 | `1` | 使用默认 |
| `pageSize` | 页长 | integer | 固定默认 | 是 | `10` | 使用默认 |
| `minRelevance` | 相关度下限 | integer | 可选 | 是 | 不设置 | 不强制 |

| 字段 | 含义 | 类型 | 使用位置 | 空值处理 |
|---|---|---|---|---|
| `date` | 研报发布时间 | datetime | 时间线、引用来源 | 缺失时不进入时间线 |
| `title` | 研报标题 | string | 证据表、引用来源 | 缺失时写“标题未返回” |
| `coreContent` | 核心内容 | string | 宏观线索、成长逻辑和竞争位置 | 缺失时降级 |
| `analysisViewpoint` | 分析观点 | string | 主题、成长逻辑和竞争位置分歧 | 缺失时降级 |
| `investmentRisk` | 风险提示 | string | 风险矩阵 | 缺失时说明未获取 |
| `comScore` | 综合得分 | number | 情绪分布辅助 | 缺失时不绘制分值 |
| `sentiment` | 情绪偏向 | integer | 情绪分布 | 缺失时不绘制情绪 |
| `keyReason` | 关键事由 | string | 主题 TopN、成长逻辑和竞争位置辅助 | 缺失时用观点文本辅助 |
| `sentimentAnalysis` | 情绪分析 | string | 研究线索辅助 | 缺失时不输出 |
| `stockName` | 股票名称 | string | 报告元信息 | 缺失时用基础信息 |
| `stockCode` | 股票代码 | string | 报告元信息 | 缺失时用入参 |

- 失败处理：内部记录研报内容不可用；最终报告省略依赖研报内容的维度，不输出“数据获取失败”“暂无法判断”等占位说明。
- 禁止替代：不得用行情、新闻、公告、模型常识或业绩预期字段替代研报舆情；评级和目标价只可在业绩预期汇总或证据表中按机构研报原始口径展示。

### 请求 4：研报向量片段补证

- endpoint：`report/vector-search`
- Method：POST
- CLI 命令模板：

```bash
investoday-api report/vector-search --method POST stockCode=<股票代码> beginDate=<开始日期> endDate=<结束日期> topK=8 --body-json '{"query":"<查询文本>"}'
```

| 参数 | 含义 | 类型 | 来源 | 是否允许默认 | 默认值 | 缺失处理 |
|---|---|---|---|---|---|---|
| `query` | 向量搜索文本 | string | 用户关注点、公司主营关键词、研报高频主题和风险词合成 | 否 | 无 | 无法形成有效查询文本时跳过向量补证 |
| `stockCode` | 股票代码 | string | 用户输入或标的识别 | 否 | 无 | 缺失时不执行向量搜索 |
| `beginDate` | 研报起始日期 | string | 当前日期向前 90 天或用户指定 | 是 | 近 90 天 | 使用默认 |
| `endDate` | 研报截止日期 | string | 当前日期或用户指定 | 是 | 当前日期 | 使用默认 |
| `topK` | 返回片段数 | integer | 固定默认 | 是 | `8` | 使用默认 |
| `industryCode` / `institutionCode` / `categoryCode` | 附加过滤项 | string | 已可靠解析时使用 | 是 | 不设置 | 不强制 |

| 字段 | 含义 | 类型 | 使用位置 | 空值处理 |
|---|---|---|---|---|
| `pubDate` | 研报发布时间 | datetime | 片段证据时间口径、引用来源辅助 | 缺失时不进入时间统计 |
| `chunk` | 研报文本片段 | string | 研报主线、成长逻辑、竞争位置、产业变量、业务映射、风险和片段证据表 | 空值、弱相关或过短时丢弃 |
| `reportId` | 研报标识 | string | 内部去重和溯源 | 不向用户展示 |
| `page` / `blockStart` / `blockEnd` / `position` | 片段位置 | number/string | 内部溯源 | 不向用户展示 |

- 查询策略：先执行研报舆情，再用用户关注点、公司主营关键词、研报高频主题、关键事由和风险词合成查询文本；用户明确指定主题时，优先使用用户主题并补充公司简称或主营关键词。
- 采用规则：仅采用非空、与公司或主题直接相关、能补充具体事实或风险路径的 `chunk`；相近片段按语义去重；不得机械搬运整段原文，必须提炼为片段摘要。
- 失败处理：向量搜索为空、超时或返回片段弱相关时，静默降级为 `research/sentiment` 和基础资料，不在最终报告中展示接口缺口。
- 禁止替代：向量片段只作研报原文线索补证，不替代结构化业绩预测、公告事实、财务数据或交易类数据；片段中出现评级、目标价、买入/推荐等措辞时，只能按机构研报口径处理。

### 请求 5：业绩预期汇总

- endpoint：`report/stock-forecast-ratings`
- Method：GET
- CLI 命令模板：

```bash
investoday-api report/stock-forecast-ratings stockCode=<股票代码> beginDate=<开始日期> endDate=<结束日期> pageNum=1 pageSize=20
```

| 参数 | 含义 | 类型 | 来源 | 是否允许默认 | 默认值 | 缺失处理 |
|---|---|---|---|---|---|---|
| `stockCode` | 股票代码 | string | 用户输入或标的识别 | 否 | 无 | 缺失时追问 |
| `beginDate` | 报告起始日期 | string | 当前日期向前 90 天或用户指定 | 是 | 近 90 天 | 使用默认 |
| `endDate` | 报告截止日期 | string | 当前日期或用户指定 | 是 | 当前日期 | 使用默认 |
| `pageNum` | 页码 | integer | 固定默认 | 是 | `1` | 使用默认 |
| `pageSize` | 页长 | integer | 固定默认 | 是 | `20` | 使用默认 |

| 字段 | 含义 | 类型 | 使用位置 | 空值处理 |
|---|---|---|---|---|
| `date` | 报告完成时间 | datetime | 业绩预期表、引用来源 | 缺失时不进入日期统计 |
| `institutionName` | 研究机构名称 | string | 业绩预期表 | 缺失时写“机构未返回” |
| `reportTitle` | 报告标题 | string | 业绩预期表、引用来源 | 缺失时写“标题未返回” |
| `tYear` | 预测基准年份 | string | 业绩预期表口径说明 | 缺失时保留空值说明 |
| `revenueMainForecastT1/T2/T3` | T+1/T+2/T+3 主营收入预测 | number | 业绩预期表 | 缺失时不输出对应单元或整章 |
| `revenueMainForecastT1Prev/T2Prev/T3Prev` | 前次主营收入预测 | number | 前次变化说明 | 缺失时不判断变化 |
| `netProfitForecastT1/T2/T3` | T+1/T+2/T+3 净利润预测 | number | 业绩预期表 | 缺失时不输出对应单元或整章 |
| `netProfitForecastT1Prev/T2Prev/T3Prev` | 前次净利润预测 | number | 前次变化说明 | 缺失时不判断变化 |
| `epsForecastT1/T2/T3` | EPS 预测 | number | 内部校验与变化判断 | 默认不在业绩预期汇总表中展示 |
| `epsForecastT1Prev/T2Prev/T3Prev` | 前次 EPS 预测 | number | 前次变化说明 | 缺失时不判断变化 |
| `ratingDescription` | 当前机构评级描述 | string | 业绩预期表机构口径列 | 仅作为研报口径展示，缺失时不输出 |
| `ratingDescriptionPrev` | 前次机构评级描述 | string | 前次变化说明 | 仅作为研报口径展示，缺失时不输出 |
| `targetPrice` / `targetPriceEx` | 机构目标价字段 | number | 业绩预期表机构口径列 | 仅作为研报口径展示，缺失时不输出 |
| `targetPriceExPrev` | 前次机构目标价字段 | number | 前次变化说明 | 仅作为研报口径展示，缺失时不输出 |

- 失败处理：内部记录业绩预期不可用；最终报告省略业绩预期维度，不输出“数据获取失败”“数据不足”“暂无法汇总”等占位说明。
- 合规边界：评级、目标价、买入/推荐等字段只可标注为“机构研报口径”，不得作为本 Skill 的建议、标题、小结、按钮文案或操作提示。
- 禁止替代：不得用行情、资金流、模型估算或未获取的研报预测替代业绩预期字段。

## 数据隔离规则

- 本文件只允许 `investoday-stock-research-interpretation` 使用。
- 当前 Skill 必须使用自己的数据契约，不得直接复用其他 Skill 的原始接口响应、临时变量或未定义字段。
- 当前 Skill 不消费外部已有 Skill 标准输出。
- 需要主子 Skill 协同、`skills/` 目录或多 Skill 数据交接时，应转交多 Skill 创建流程。

## 缺口与兜底

| 缺口 | 影响 | 处理方式 | 输出提示 |
|---|---|---|---|
| 股票名称无法识别 | 无法查询研报 | 追问股票代码 | “未能唯一识别标的，请补充股票代码。” |
| 基础信息为空 | 主营业务和板块缺失 | 保留可确认的代码和名称，继续处理可用研报内容 | 最终报告不输出内部错误说明 |
| 近 90 天研报为空 | 无法形成研报结论 | 省略依赖研报内容的维度 | 不输出“研报覆盖有限”“数据不足”等占位说明 |
| 业绩预期为空 | 无法汇总机构业绩预测口径 | 省略业绩预期章节 | 不输出空表或“暂无法汇总”等占位说明 |
| `sentiment`/`comScore` 缺失 | 情绪图不可生成 | 跳过对应图表 | 不输出字段缺失说明 |
| 风险字段为空 | 风险矩阵不完整 | 省略风险矩阵或风险章节 | 不输出字段缺失说明 |
| 研报向量片段为空或弱相关 | 无法获得原文片段补证 | 降级使用研报舆情与基础资料 | 不输出向量为空、超时、无返回或接口缺口说明 |
| 用户要求目标价/交易建议 | 超出边界 | 拒绝操作性内容 | 使用合规拒答模板 |

## 验收标准

- 所有 endpoint、Method、入参和返回字段都来自 `investoday-api search-api` 的确认结果。
- 已采用接口限定为 `search`、`stock/basic-info`、`research/sentiment`、`report/vector-search`、`report/stock-forecast-ratings`。
- Skill 执行时只允许使用本文件列出的接口和字段。
- 缺失数据、空值、接口失败和无数据场景均有明确内部处理方式；最终报告通过省略维度处理，不暴露内部接口、字段或空值状态。
- 未采用行情、资金流等交易类接口；预测评级接口只用于业绩预期汇总，评级和目标价只作为机构研报口径展示。
