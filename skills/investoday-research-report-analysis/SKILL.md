---
name: investoday-research-report-analysis
title: "研报解读"
version: "2.0.0"
description: "面向今日投资研报库的纯研报数据多 Skill 解读包，主 Skill 负责入口识别、研报查询调度、原子 Skill 编排、Markdown/HTML 输出模板和最终报告整合。Use when: 用户要解读个股研报、行业/主题研报、指定研报、多篇研报对比、研报证据片段、机构评级/目标价/EPS/净利润预测或评级变动。Do not use when: 用户要求直接买卖建议、目标仓位、交易执行、非研报数据查询、外部事实核验，或要求在无研报样本时编造机构观点。"
tags:
  - investoday
  - research-report
  - report-analysis
  - multi-skill
  - finance
  - a-share
metadata:
  clawdbot:
    emoji: "研"
    category: "finance"
    requires:
      skills:
        - investoday-research-report-query
        - investoday-stock-report-interpretation
        - investoday-industry-report-interpretation
        - investoday-selected-report-interpretation
        - investoday-multi-report-comparison
        - investoday-report-evidence-extraction
        - investoday-forecast-rating-interpretation
        - investoday-report-interpretation
      cli:
        - investoday-api
requirements:
  skills:
    - name: investoday-research-report-query
    - name: investoday-stock-report-interpretation
    - name: investoday-industry-report-interpretation
    - name: investoday-selected-report-interpretation
    - name: investoday-multi-report-comparison
    - name: investoday-report-evidence-extraction
    - name: investoday-forecast-rating-interpretation
    - name: investoday-report-interpretation
  cli:
    - name: investoday-api
  network_access: true
---

# 研报解读

本 Skill 是纯研报数据版多 Skill 嵌套业务包。主 Skill 负责入口识别、最小输入校验、研报查询调度、原子 Skill 编排、Markdown/HTML 模板引用和最终报告整合。

数据边界固定为：只有 `investoday-research-report-query[skills/investoday-research-report-query/SKILL.md]` 可以通过主包公共脚本调用 `investoday-api` 取数；其他原子 Skill 只能消费研报查询原子 Skill 的标准输出，不直接取数。

默认输出为对话内 Markdown 研报解读报告。只有用户明确要求 HTML、H5、Demo、页面、看板、研究报告页，或在 Markdown 结果后确认需要继续生成 HTML 时，才使用 [output-html-report-template.md](assets/templates/output-html-report-template.md) 生成同源 HTML。

## 多 Skill 职责边界

| 对象 | 负责内容 | 不应包含 |
|---|---|---|
| 主 Skill | 统一入口、路由调度、研报查询编排、公共数据契约、API Key 配置说明、公共请求脚本、Markdown/HTML 模板、最终报告整合。 | 不直接实现研报查询接口，不维护非研报数据验证链路。 |
| 研报查询原子 Skill | 研报列表、机构、研报舆情、研报向量片段、预测评级和评级变动取数。 | 不生成完整解读报告，不输出交易建议。 |
| 解读类原子 Skill | 消费研报查询标准输出，完成单一场景的解读、对比、证据抽取或写作。 | 不调用底层接口，不引用非研报数据。 |
| 输出模板 | 约束 Markdown/HTML 报告的章节、同源关系、舆情位置、观点风险合并、预测评级与盈利预测单表、来源附录和验收规则。 | 不散落在主 `SKILL.md` 正文中长期维护大段样式。 |

公共数据契约见 `references/data-reference/`，API Key 配置见 [setup-api-key.md](references/setup-api-key.md)，公共请求脚本见 [investoday-api.js](scripts/investoday-api.js)，Markdown 报告模板见 [output-markdown-report-template.md](assets/templates/output-markdown-report-template.md)，HTML 报告模板见 [output-html-report-template.md](assets/templates/output-html-report-template.md)。

## 原子 Skill

| 原子 Skill | 文件 | 职责 | 主 Skill 消费的标准输出 |
|---|---|---|---|
| 研报数据查询 | `investoday-research-report-query[skills/investoday-research-report-query/SKILL.md]` | 研报列表、机构列表、研报舆情、研报语义证据、预测评级和评级变动。 | 可追溯研报样本、机构观点、证据片段、评级、目标价、EPS、净利润预测、预测修正摘要、引用来源。 |
| 个股研报解读 | `investoday-stock-report-interpretation[skills/investoday-stock-report-interpretation/SKILL.md]` | 个股机构覆盖、评级/目标价/盈利预测、核心逻辑、风险和分歧。 | 个股研报解读摘要、近期研报舆情、核心共识、主要分歧、关注重点/跟踪指标、主要风险、预测评级与盈利预测明细。 |
| 行业/主题研报解读 | `investoday-industry-report-interpretation[skills/investoday-industry-report-interpretation/SKILL.md]` | 从行业/主题研报中归纳产业链、竞争格局、政策、空间、催化剂和风险。 | 行业研报共识、关键证据、分歧与样本局限。 |
| 指定研报解读 | `investoday-selected-report-interpretation[skills/investoday-selected-report-interpretation/SKILL.md]` | 解读用户指定的单篇研报。 | 研报摘要、核心假设、关键证据、风险和跟踪指标。 |
| 多篇研报对比 | `investoday-multi-report-comparison[skills/investoday-multi-report-comparison/SKILL.md]` | 对比多篇研报的共识、分歧、预测差异和风险差异。 | 共识表、分歧表、机构级预测明细差异、证据强弱、样本局限。 |
| 研报证据抽取 | `investoday-report-evidence-extraction[skills/investoday-report-evidence-extraction/SKILL.md]` | 抽取渗透率、市场份额、产能、库存、ASP、价格、技术路线、催化剂、风险等研报片段。 | 证据片段表、来源、支持判断、证据强度和缺口。 |
| 预测评级解读 | `investoday-forecast-rating-interpretation[skills/investoday-forecast-rating-interpretation/SKILL.md]` | 解读评级、目标价、EPS、净利润预测、预测修正和评级变动。 | 预测数据总结、最近 5 家机构预测明细单表、评级分布、目标价有效样本统计、预测变化方向、样本口径和缺口。 |
| 研报报告生成 | `investoday-report-interpretation[skills/investoday-report-interpretation/SKILL.md]` | 整合研报类原子 Skill 标准输出，生成 Markdown 报告和 HTML 同源映射建议。 | Markdown 报告正文、HTML 同源映射建议、来源说明和输出自检结果。 |

## 适用场景

- 个股研报解读：机构覆盖摘要、近期研报舆情、核心共识、主要分歧、关注重点/跟踪指标、主要风险、最近 5 家机构评级/目标价/EPS/净利润预测合并明细表。
- 行业/板块/主题研报解读：研报覆盖热度、机构共识、产业链表述、竞争格局、政策线索、空间假设和风险因素。
- 指定研报解读：用户从检索结果中指定一篇研报后，输出结构化摘要、核心假设、证据和风险。
- 多篇研报对比：比较同一标的、行业、主题或用户指定研报的共识、分歧、预测差异和风险差异。
- 研报搜索与证据检索：按关键词、机构、行业、标的、时间范围检索研报和证据片段。
- 预测评级解读：查看机构评级、目标价、EPS、净利润预测、预测修正和评级变化。

## 不适用场景

- 直接买入、卖出、持有、仓位、交易时机、止盈止损或自动下单。
- 处理非今日投资研报库内容、外部网页内容或用户未授权材料。
- 查询或核验非研报数据。
- 在没有研报样本、研报字段或用户显式材料支撑时编造机构观点。
- 输出内部 Skill 名称、接口名称、字段名、技术命令、原始响应、调试状态或文件路径给终端用户。

## 输入要求

### 可接受输入

- 股票名称或代码，例如 `贵州茅台`、`600519`。
- 行业、板块、主题或概念名称，例如 `半导体`、`液冷散热`。
- 研报关键词、机构名称、时间范围、评级范围。
- 用户从搜索结果中指定的研报标题、序号或明确描述。
- 解读目标：摘要、投资要点、目标价、盈利预测、预测评级变化、多篇对比、证据抽取。
- 输出偏好：默认 Markdown；用户明确要求 HTML、H5、Demo、页面、看板或研究报告页时，才进入 HTML 输出。

### 最小输入

| 任务 | 最小输入 | 缺失处理 |
|---|---|---|
| 个股研报解读 | 股票名称或代码 | 追问股票对象，不直接生成报告。 |
| 行业研报解读 | 行业、板块或主题名称 | 追问行业/主题对象，必要时要求代表公司或研报过滤条件。 |
| 研报搜索 | 搜索词或筛选条件 | 追问关键词、标的、行业、机构或时间范围。 |
| 证据检索 | 查询文本 + 股票/行业/机构/分类过滤范围 | 缺过滤范围时先追问，不裸搜全库。 |
| 指定研报解读 | 检索结果中的明确研报 | 追问可定位标题、序号、机构或发布日期。 |
| 多篇研报对比 | 至少两篇可定位研报，或股票/行业加时间范围 | 样本有限时先补检索或说明无法对比。 |
| 预测评级解读 | 股票代码或可解析股票名称 | 样本有限时只输出当前样本口径，不计算比例。 |

### 默认假设

- 未指定输出载体时，只在对话中输出 Markdown，不生成 `.md` 或 `.html` 文件。
- Markdown 报告必须遵守 `assets/templates/output-markdown-report-template.md`。
- 回复末尾必须询问用户是否需要继续生成同源 HTML 报告页。
- HTML 默认不生成；用户确认后才读取并使用 `assets/templates/output-html-report-template.md`。
- HTML 与 Markdown 必须同源，HTML 只能重排、可视化和压缩表达已有内容，不新增未经证据支持的结论。
- 未指定时间范围时，研报和预测样本优先使用近期可得样本，并在报告中说明时间口径。
- 结果为空或样本有限时，只输出已取得事实和缺口影响，不补造数值、样本或结论。

### 输入校验

- 股票名称匹配多个标的时，列出候选并请用户确认。
- 行业、主题或概念无法映射到可查询范围时，追问代表公司、机构、分类或其他过滤条件。
- 研报证据检索必须同时具备查询文本和过滤范围。
- 用户指定研报时，必须能定位标题、机构、发布日期或检索序号。
- 涉及真实数据时，只通过研报查询原子 Skill 标准输出获取，不临场编造 endpoint 或字段。

### 缺失输入处理

- 缺股票、行业、关键词或指定研报时先追问，不直接生成报告。
- 研报样本为空时，说明当前查询范围暂未取得可用研报，并询问是否扩大时间范围或更换检索条件。
- 预测样本有限时，只输出已取得样本和当前样本口径，不计算上调占比。
- 高风险交易化请求必须转为机构观点、预测评级、核心风险和研报分歧归纳。

## 意图路由

| route id | 用户意图 | 用户信号 | 必要输入 | 调度 | 输出 |
|---|---|---|---|---|---|
| `stock_report_analysis` | 个股研报解读 | “机构怎么看”“研报怎么看”“评级变化”“目标价” | 股票名称或代码 | 研报查询 -> 个股研报解读 -> 报告生成 | Markdown 个股研报解读；末尾询问 HTML |
| `industry_report_analysis` | 行业/板块/主题研报解读 | “行业怎么看”“券商怎么看”“主题研报” | 行业、板块或主题 | 研报查询 -> 行业研报解读 -> 报告生成 | Markdown 行业研报解读；末尾询问 HTML |
| `selected_report_interpretation` | 指定研报解读 | “解读第 2 篇”“分析这篇研报” | 可定位研报 | 研报查询定位 -> 指定研报解读 -> 报告生成 | 指定研报结构化解读 |
| `multi_report_compare` | 多篇研报对比 | “对比几篇”“观点差异” | 多篇研报或明确范围 | 研报查询 -> 多篇研报对比 -> 报告生成 | 共识、分歧、预测差异和风险差异 |
| `evidence_search` | 研报证据检索 | “找证据”“渗透率”“市场份额”“产能”“价格” | 查询文本 + 过滤范围 | 研报查询/向量搜索 -> 证据抽取 | 证据片段、来源、证据强弱和缺口 |
| `forecast_rating_analysis` | 预测评级解读 | “评级变化”“目标价区间”“盈利预测有没有上调” | 股票名称或代码 | 预测评级/评级变动查询 -> 预测评级解读 | 评级、目标价、EPS、净利润预测和变化方向 |
| `report_search` | 研报搜索 | “搜索研报”“有哪些研报”“找研报” | 搜索词或筛选条件 | 研报查询 | 研报列表、样本范围、可继续分析方向 |
| `html_report_generation` | HTML 后续生成 | “需要 HTML”“生成页面”“做看板”“研究报告页” | 已有或同步生成的 Markdown 报告内容 | 读取 HTML 模板 -> 同源转换 | 单文件 HTML 或页面契约 |
| `clarify` | 信息不足 | “帮我看看研报” | 缺失项 | 追问最小输入 | 待补充条件 |
| `out_of_scope` | 交易化或非研报任务 | “该不该买”“仓位”“下单”“查非研报数据” | 用户原始问题 | 说明边界并转为研报视角归纳 | 合规边界说明 |

## 调用流程

1. 识别用户意图和最小输入。
2. 需要任何真实数据时，先调用 `investoday-research-report-query[skills/investoday-research-report-query/SKILL.md]`。
3. 按任务类型调用一个或多个解读类原子 Skill。
4. 将解读类原子 Skill 的标准输出交给 `investoday-report-interpretation[skills/investoday-report-interpretation/SKILL.md]` 生成结构化 Markdown 用户报告。
5. 主 Skill 执行输出自检：新章节顺序、舆情位置、观点风险合并、预测单表、来源附录下沉、日期、缺失说明、合规表达、内部口径清理和 HTML 后续询问。
6. 用户确认需要 HTML 时，使用 [output-html-report-template.md](assets/templates/output-html-report-template.md) 将同一份 Markdown 内容转换为 HTML，不新增无证据结论。

## 输出契约

| 输出项 | 类型 | 是否必出 | 来源/生成方式 | 空值处理 | 说明 |
|---|---|---|---|---|---|
| 查询口径 | 文本/表格 | 是 | 用户输入 + 默认假设 | 输入不足时先追问 | 说明标的、行业、关键词、时间范围和任务类型。 |
| 样本口径摘要 | Markdown 段落 | 条件必出 | 研报查询标准输出 | 仅说明当前取得样本口径 | 只在前部用一句话说明时间范围、研报数量、覆盖机构和最近研报日期；不展示代表性研报大表。 |
| 结论卡片 | Markdown 表格 | 报告类必出 | 解读类原子 Skill | 证据有限时降低结论强度 | 一句话结论、共识方向、主要分歧、证据强度、核心风险。 |
| 近期研报舆情 | Markdown 段落/表格 | 条件必出 | 研报舆情标准输出 | 舆情为空时写明当前样本未取得可用研报舆情 | 放在样本口径摘要之后、观点风险之前，概括核心内容、机会、风险、情绪倾向和关键事由。 |
| 研报观点、分歧与风险 | Markdown 段落/表格 | 报告类必出 | 研报查询 + 解读类原子 Skill | 无研报观点时不生成强结论 | 合并核心共识、主要分歧、关注重点/跟踪指标和主要风险；分歧必须说明各方观点，未发现实质分歧时不强行列分歧。 |
| 预测评级与盈利预测 | Markdown 段落 + 单一明细表 | 个股/预测评级场景条件必出 | 研报查询标准输出 | 样本有限时说明当前样本口径 | 表前说明样本范围、机构数、样本数、目标价有效样本统计、评级分布、预测修正方向和可比性；明细表包含预测/评级变化列。 |
| 数据来源与代表性研报 | Markdown 表格/清单 | 报告类必出 | `source_refs`、研报列表和预测评级样本 | 无法定位来源时标注需进一步验证 | 置于报告末尾；承载研报标题、机构、日期、评级、目标价和用途，不在页面前部展开。 |
| Markdown 报告 | Markdown | 默认必出 | `assets/templates/output-markdown-report-template.md` | 不生成空表格或占位符 | 默认只在对话中输出；用户明确要求 `.md` 文件时才生成文件。 |
| HTML 报告 | 单文件 HTML/页面契约 | 用户确认后输出 | `assets/templates/output-html-report-template.md` | 缺少可展示样本时用“—”或样本口径说明 | 必须与 Markdown 同源，不新增未经证据支持的判断。 |

## 数据来源边界

- 主 Skill 只消费研报查询原子 Skill 的标准输出和 `references/data-reference/investoday-research-report-query.md` 中定义的数据口径。
- 解读类原子 Skill 不直接调用接口，不读取或混用原始响应、临时变量、未定义字段、调试信息或凭证。
- 所有事实性输出必须来自研报查询结果、研报字段、研报片段、预测评级样本、评级变动记录或用户显式提供材料。
- 研报观点必须来自可追溯研报记录。
- 研报内预测评级字段必须展示样本范围和时间范围，不能包装成收益承诺。
- 个股和预测评级场景默认列出最近 5 家机构预测明细；按研报发布日期倒序、同一机构只保留最新一篇，少于 5 家则如实展示已取得样本。
- 预测明细表空字段统一写“—”，不得补估或编造；预测年度不能可靠映射时保留 T+1/T+2/T+3。
- 面向用户的最终报告不得出现中文缺失占位词；表格空项统一使用“—”，正文使用当前样本口径说明。
- “支持的判断”必须来自同一篇研报的标题、摘要、正文片段、核心观点或预测评级样本；只有标题和评级字段时使用保守表述并标注“标题/预测样本支持”。
- 文本片段只能作为研报观点或趋势线索；证据不足时降低结论强度。
- 今日投资只能作为数据通道，文本来源展示原始署名机构。

## 输出格式

### Markdown 报告

- 默认先在对话中输出 Markdown 研报解读报告。
- Markdown 必须遵守 [output-markdown-report-template.md](assets/templates/output-markdown-report-template.md)。
- 报告包含 H1 标题、结论卡片、样本口径摘要、近期研报舆情、研报观点/分歧/风险、预测评级与盈利预测或任务对应证据、综合结论、数据来源与代表性研报和免责声明。
- 每个核心结论必须能追溯到研报、研报字段、证据片段、原子 Skill 标准输出、用户材料或明确的当前样本口径说明。
- 不输出空表格、无意义占位符、内部字段、接口名、技术命令或调试状态。
- 报告末尾必须询问：`是否需要我继续基于内容生成HTML研究报告页？`

### HTML 报告

- HTML 仅在用户明确要求或 Markdown 后确认需要时生成。
- HTML 必须遵守 [output-html-report-template.md](assets/templates/output-html-report-template.md)。
- HTML 与 Markdown 必须同源：Markdown 承载结论、预测明细、任务对应证据和来源；HTML 只做页面化、可视化和压缩表达。
- HTML 不得写入本机绝对路径、API Key、token、内部接口报错、生成过程、模型提示词或调试信息。
- 缺少可展示样本时使用“—”或说明“当前结论仅基于已取得研报样本”，不得填入看似真实的数值。

## 业务规则与分支逻辑

| 规则ID | 规则名称 | 触发条件 | 判断逻辑 | 输出影响 | 优先级 |
|---|---|---|---|---|---|
| R-001 | 默认 Markdown | 用户未明确要求 HTML 或文件 | 只在对话中输出 Markdown | 不生成 `.md` 或 `.html` 文件 | P0 |
| R-002 | HTML 确认后生成 | 用户明确要求 HTML/H5/Demo/页面/看板，或 Markdown 后确认 | 读取 HTML 模板并同源转换 | 生成 HTML 报告或页面契约 | P0 |
| R-003 | 研报证据优先 | 输出任何核心观点 | 必须绑定研报来源、研报字段、片段证据或当前样本口径说明 | 降低无证据结论强度 | P0 |
| R-004 | 交易化请求降级 | 用户问买卖、仓位、交易时机 | 不输出交易建议，转为研报观点和风险归纳 | 输出合规边界说明 | P0 |
| R-005 | 证据检索过滤范围必需 | 用户找研报片段证据 | 查询文本和过滤范围必须同时存在 | 缺范围时追问 | P0 |
| R-006 | 冲突显式保留 | 多篇研报观点或预测口径不一致 | 列出冲突来源、差异原因和暂定处理 | 不静默合并为单一结论 | P1 |
| R-007 | 代表性研报下沉 | 报告包含研报清单、代表性研报或来源样本 | 前部只保留样本口径摘要，具体研报清单放入末尾“数据来源与代表性研报” | 降低前部信息噪音 | P0 |
| R-008 | 预测数据单表 | 个股或预测评级报告包含目标价、评级、EPS 或净利润预测 | 表前写样本统计和趋势口径，只保留一个预测评级与盈利预测明细表 | 避免目标价和盈利预测重复拆表 | P0 |

## 验收标准

| 验收项 | 通过标准 | 验证方式 |
|---|---|---|
| 多 Skill 结构 | 主 Skill 保留根 `SKILL.md`，原子 Skill 保留 `skills/<name>/SKILL.md`。 | 静态检查目录和引用。 |
| 纯研报数据边界 | 只有 `investoday-research-report-query` 与主包公共脚本负责取数。 | 静态检查引用和原子 Skill 说明。 |
| 公共资源 | `references/data-reference/`、`references/setup-api-key.md`、`scripts/investoday-api.js`、Markdown/HTML 模板在主包维护。 | 静态检查路径存在。 |
| Markdown 默认输出 | 未要求 HTML 时只输出 Markdown，末尾询问是否需要 HTML。 | 场景用例检查。 |
| 新章节顺序 | 报告按结论卡片、样本口径摘要、近期研报舆情、研报观点/分歧/风险、预测评级与盈利预测、综合结论、数据来源与代表性研报、免责声明输出。 | 模板和场景用例检查。 |
| 代表性研报下沉 | 页面前部不出现大块代表性研报清单；具体研报标题、机构、日期、评级、目标价只在末尾来源附录展示。 | 输出自检。 |
| 舆情上调 | 近期研报舆情位于观点风险模块之前；舆情为空时说明当前样本未取得可用研报舆情。 | 输出自检。 |
| 观点风险合并 | 核心共识、主要分歧、关注重点/跟踪指标和主要风险位于同一顶层模块；没有实质分歧时不强行生成分歧。 | 输出自检。 |
| HTML 触发 | 只有用户明确要求或确认后才生成 HTML。 | 场景用例检查。 |
| 同源约束 | HTML 不新增 Markdown 中没有证据支持的判断。 | 对照 Markdown 和 HTML 内容。 |
| 预测评级明细 | 个股和预测评级场景包含预测数据总结和最近 5 家机构预测明细单表；目标价平均值只基于可解析数值样本计算，当前范围未取得样本时说明缺口。 | 输出自检。 |
| 来源与支持判断 | 关键观点包含研报标题、机构、发布日期、支持判断、证据片段或当前样本口径说明。 | 输出自检。 |
| 合规边界 | 不输出买卖建议、收益承诺、仓位或交易指令。 | 高风险反例测试。 |
| 内部口径清理 | 用户报告不展示内部 Skill 名、接口名、字段名、命令、调试状态或本地路径。 | 输出自检。 |

## 测试用例

| 用例ID | 场景 | 输入 | 预期输出 | 通过标准 |
|---|---|---|---|---|
| TC-001 | 个股基础解读 | `贵州茅台最近机构怎么看` | Markdown 报告，前部不出现大块代表性研报清单，近期研报舆情在观点风险之前，观点/分歧/关注重点/风险合并，预测评级与盈利预测只有一个明细表。 | 不输出买卖建议，不暴露内部口径，不生成独立证据链章节。 |
| TC-002 | 行业研报解读 | `液冷散热最近券商怎么看` | 行业/主题研报共识、关键证据、风险和样本局限。 | 只使用研报样本和片段证据。 |
| TC-003 | 指定研报解读 | `解读第 2 篇研报` | 指定研报摘要、核心假设、证据和风险。 | 能定位来源；不能定位时追问。 |
| TC-004 | 多篇对比 | `对比最近三篇比亚迪研报` | 共识、分歧、预测差异和风险差异。 | 样本有限时说明不能对比。 |
| TC-005 | 证据检索输入不足 | `查研报里的渗透率` | 追问股票、行业、机构或分类过滤范围。 | 不裸搜全库。 |
| TC-006 | 预测评级 | `查 600519 盈利预测有没有上调` | 表格前有样本范围、目标价有效样本平均值/中位数和趋势分析，最近 5 家机构预测明细只保留一个表。 | 可比样本有限时不计算比例，空字段写“—”。 |
| TC-007 | 交易化请求 | `这只股票该不该买` | 拒绝交易化结论，转为机构观点和风险归纳。 | 无买卖建议、收益承诺或仓位建议。 |
| TC-008 | HTML 后续生成 | `需要 HTML` | 按 HTML 模板生成同源研究报告页。 | HTML 不新增无证据结论。 |

## 输出自检

交付前逐项检查：

- 是否先给出结论卡片或核心摘要。
- 是否只在前部展示样本口径摘要、时间范围和最近研报日期，不前置大块代表性研报清单。
- 是否将近期研报舆情放在观点风险之前；舆情为空时是否说明缺口。
- 是否将核心共识、主要分歧、关注重点/跟踪指标和主要风险合并到同一模块。
- 是否没有强行生成不存在的分歧；若存在分歧，是否说明各方分别怎么看。
- 是否只输出一个预测评级与盈利预测明细表，并在表前说明样本范围、目标价统计、评级分布、趋势口径和可比性。
- 是否将具体研报标题、机构、发布日期、评级和目标价放在末尾“数据来源与代表性研报”。
- 是否每个关键观点绑定研报、研报字段、证据片段、原子 Skill 标准输出或当前样本口径说明。
- 是否保留机构观点冲突、样本限制和证据缺口。
- 是否删除内部 Skill 名、接口名、字段名、技术命令、数据包名称、调试信息和文件路径。
- 是否包含风险提示和非投资建议声明。
- 是否在默认 Markdown 报告末尾询问是否需要继续生成同源 HTML。

## 安全与隐私

- 只通过研报查询原子 Skill 和主包公共脚本获取研报数据。
- 不记录、不存储用户查询记录。
- 不写入或展示 API Key、Token、认证状态、本机私密路径或缓存信息。
- 不自动下单、不执行交易、不替代投资顾问。
- 不输出确定性买卖建议、收益承诺、目标仓位或交易时机。

## 合规声明

本报告基于公开研报样本生成，仅用于研究参考。研报观点、评级、目标价、EPS 和净利润预测均来自机构样本，不代表确定性判断，也不构成投资建议、交易指令或收益承诺。市场有风险，投资需谨慎。
