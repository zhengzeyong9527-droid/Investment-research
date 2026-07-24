# gs-research-report-query finance-data 接口文档

本文件记录当前 Skill 调用 finance-data 数据能力时的接口口径、参数示例和回归检查方式。所有示例均使用券商交付包的数据入口，不使用标准版 CLI。

## 券商数据入口

```bash
node scripts/gs-api.js status
node scripts/gs-api.js list
node scripts/gs-api.js search key=贵州茅台 type=11
node scripts/gs-api.js search query=股票,基本面分析
node scripts/gs-api.js <endpoint> [key=value ...]
node scripts/gs-api.js <endpoint> --method POST [queryKey=value ...] --body-json '{"bodyKey":[]}'
```

## 使用策略

1. 未明确接口时，先用 `list` 浏览分组，或用 `search query=<关键词>` 搜索接口。
2. 明确接口但不明确参数时，先用 `search query=<接口关键词>` 查看参数和示例。
3. 明确接口和参数后，再调用 `node scripts/gs-api.js <endpoint> ...`。
4. POST 接口如果区分 Query 参数与 Body JSON 参数，Query 使用 `key=value`，Body 使用 `--body-json`；数组或对象不要写成普通字符串参数。
5. 查询结果为空、受限或接口不可用时，只说明查询口径、权限或覆盖限制，不编造数据结论。

## 当前 Skill 已识别接口

| endpoint | 请求方式 | 用途 | 调用示例 |
|---|---|---|---|
| `chunk/page/position` | `GET/POST` | 待按当前 Skill 业务口径补充 | `node scripts/gs-api.js chunk/page/position stockCode=600519` |
| `gs/node` | `GET/POST` | 待按当前 Skill 业务口径补充 | `node scripts/gs-api.js gs/node stockCode=600519` |
| `report/earnings-forecast-rating-cha` | `GET/POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js report/earnings-forecast-rating-cha stockCode={股票代码}` |
| `report/research` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js report/research --method POST --body-json '{"stockCode":"{股票代码}","beginDate":"{开始日期}","endDate":"{结束日期}","pageNum":1,"pageSize":20}'` |
| `report/stock-forecast-ratings` | `GET/POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js report/stock-forecast-ratings stockCode={股票代码} beginDate={开始日期} endDate={结束日期} pageNum=1 pageSize=20` |
| `report/vector-search` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js report/vector-search --method POST stockCode={股票代码} topK=5 --body-json '{"query":"{查询文本}"}'` |

## 已识别接口详情

### `chunk/page/position`

- 请求方式：`GET/POST`
- 文档来源：当前 Skill 自动识别，待人工补充参数和字段口径

#### 调用示例

```bash
node scripts/gs-api.js chunk/page/position stockCode=600519
```

#### 待补充

- Query 参数：待通过 `search` 确认。
- Body JSON 参数：待通过 `search` 确认；POST Body 必须使用 `--body-json`。
- 输出字段：待按当前 Skill 实际消费字段补充。

### `gs/node`

- 请求方式：`GET/POST`
- 文档来源：当前 Skill 自动识别，待人工补充参数和字段口径

#### 调用示例

```bash
node scripts/gs-api.js gs/node stockCode=600519
```

#### 待补充

- Query 参数：待通过 `search` 确认。
- Body JSON 参数：待通过 `search` 确认；POST Body 必须使用 `--body-json`。
- 输出字段：待按当前 Skill 实际消费字段补充。

### `report/earnings-forecast-rating-cha`

- 请求方式：`GET/POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js report/earnings-forecast-rating-cha stockCode={股票代码}
```
```bash
node scripts/gs-api.js report/earnings-forecast-rating-cha stockCode=000001
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 评级变动 \| Markdown 表格/要点 \| 条件触发 \| `report/earnings-forecast-rating-cha` \| 无结果则标注 \| 盈利预测、评级、目标价变动和原因 \| |
| \| 股票研报预测评级变动 \| `report/earnings-forecast-rating-cha` / `get_report_earnings_forecast_rating` \| GET \| `stockCode` \| 查询盈利预测和评级变动原因 \| |
| \| `rating_change` \| 预测评级变动 \| 股票代码 \| `report/earnings-forecast-rating-cha` \| 预测、评级和目标价变动；仅在用户明确询问预测或评级变化原因时调用 \| |
| \| R-006 \| 预测修正摘要必须可比 \| 输出涉及上调占比、机构评级趋势或预测修正方向 \| 优先比较同一研报样本的当前预测值与上次预测值；可比样本不足时只说明缺口，不写成已确认未上调；评级变动接口只在明确问原因时补充 \| 避免把预测样本缺口误写成结论 \| `report/stock-forecast-ratings`，必要时 `report/earnings-forecast-rating-cha` \| P0 \| |
| \| 评级变动 \| T+1 预测变动原因 \| `...` \| 最新可得 \| `report/earnings-forecast-rating-cha` \| |

#### finance-data 参考文档摘录

## 股票研报预测评级变动

接口路径：`report/earnings-forecast-rating-cha`
请求方式：`GET`
tool_id：`get_report_earnings_forecast_rating`

接口说明：通过股票代码、证券类型、市场类型或报告ID查询股票的盈利预测和投资评级变动数据，包括T+1、T+2、T+3年的盈利预测变动、投资评级变动、目标价格变动及其原因，适用于股票分析和投资决策支持。

### 输入参数

**Query 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `stockCode` | ✅ | string | 股票代码 | `000001` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `stockCode` | 股票代码 | `000001` |
| `stockName` | 股票名称 | `平安银行` |
| `guid` | 报告编号 | `00596208-E35A-11ED-994A-0242AC110003` |
| `securityType` | 证券类型 | `股票` |
| `marketType` | 市场类型 | `深交所` |
| `reportId` | 报告ID | `00596208-E35A-11ED-994A-0242AC110003` |
| `tPlus1YProfitForecastChg` | T+1年盈利预测变动 | `1` |
| `investRatingChg` | 投资评级变动 | `1` |
| `targetPriceChg` | 目标价变动 | `1` |
| `tPlus1YChangeReason` | T+1年变动原因 | `业绩超预期增长` |
| `tPlus2YProfitForecastChg` | T+2年盈利预测变动 | `1` |
| `changeReasonT2Y` | T+2年变动原因 | `市场环境改善` |
| `tPlus3YProfitForecastChg` | T+3年盈利预测变动 | `1` |
| `tPlus3YChangeReason` | T+3年变动原因 | `长期战略布局` |

### 接口示例

```bash
node scripts/gs-api.js report/earnings-forecast-rating-cha stockCode=000001
```

---

### `report/research`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js report/research --method POST --body-json '{"stockCode":"{股票代码}","beginDate":"{开始日期}","endDate":"{结束日期}","pageNum":1,"pageSize":20}'
```
```bash
node scripts/gs-api.js report/research --method POST --body-json '{"industryCodeLv1":"640000","beginDate":"2025-01-01","endDate":"2025-12-31","pageNum":1,"pageSize":10}'
```
```bash
node scripts/gs-api.js report/research --method POST --body-json '{"stockCode":"600519","beginDate":"2025-01-01","endDate":"2026-06-16","pageNum":1,"pageSize":20}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 13 \| `report/research` + `news` + `news/entity-related` + `announcements` \| 多个文本接口 \| 查询市场空间、渗透率、替代空间、政策监管、生命周期、周期属性、需求特征和竞争格局文本线索 \| `references/文本增强/市场空间与政策监管.md`、`references/文本增强/行业结构化标签.md` \| |
| \| 查竞争结构摘要 \| `report/research` + `announcements` + `chain/com-main-pro` \| `stock/fin-ind-sw-rnk-q` + `market/quote-summaries` + `stock/insti_holding` + `industry/financial-overview` \| P0 直接披露的竞争结论、A股上市样本产品收入CR、产品收入样本份额、样本产品毛利池分布、排序线索、竞争方式、进入壁垒、A 股补充视角、风险提示 \| |
| \| 查行业生命周期/周期属性/需求特征 \| `report/research` + `news/entity-related` + `announcements` \| `industry/forecasts` + `industry/prosperity-index` + `industry/financial-overview` + `industry/market-stats` + `market/quote-summaries` \| 生命周期标签、周期属性标签、需求刚性、需求频率、价格弹性、抗周期能力、替代风险；必须标注文本口径和辅助数据 \| |
| \| 查竞争格局文本线索 \| `report/research` + `announcements` + `news/entity-related` \| `chain/com-main-pro` + `industry/financial-overview` + `industry/prosperity-index` + `industry/market-stats` + `stock/fin-ind-sw-rnk-q` + `market/quote-summaries` \| CR3/CR5、市场份额、利润池分布、价格战强度；只有 P0 直接披露可作主结论，其余必须标注估算/样本观察和估算方式 \| |
| \| 查市场空间与政策监管 \| `report/research` + `news/entity-related` \| `news` + `announcements` \| 市场规模、渗透率、替代空间、政策事件、监管线索；必须标注文本来源 \| |
| \| 标签 \| 生命周期 \| `成长 / 成熟 / 反转` \| `report/research` 文本抽取 + 行业预测/景气辅助 \| |
| \| 标签 \| 周期属性 \| `强周期 / 弱周期 / 政策驱动 / 技术迭代` \| `news/entity-related`、`report/research` + 行情/财务波动辅助 \| |
| \| 文本 \| 市场空间/渗透率 \| `研报摘要，非统一结构化口径` \| `report/research` \| |

#### finance-data 参考文档摘录

## 研究报告

接口路径：`report/research`
请求方式：**`POST`**
tool_id：`list_report_research`

接口说明：支持通过股票代码、行业代码、栏目分类代码以及发布日期范围（格式为yyyy-MM-dd）等条件，灵活筛选并获取详细的证券研究报告列表，返回内容包括报告标题、作者、发布时间、发布机构、核心观点、投资要点、主要投资逻辑、报告类型及语言等关键信息，适用于投资研究、市场分析和信息检索等场景。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `stockCode` | — | string | 股票代码【与industryCode、industryCodeLv1、institutionCode、categoryCode组成多选多参数，必须传递其中一个至多个】 | `600519` |
| `industryCode` | — | string | 行业代码（申万二级）【与stockCode、industryCodeLv1、institutionCode、categoryCode组成多选多参数，必须传递其中一个至多个】 | `740100` |
| `industryCodeLv1` | — | string | 行业代码（申万一级）【与stockCode、industryCode、institutionCode、categoryCode组成多选多参数，必须传递其中一个至多个】 | `640000` |
| `institutionCode` | — | integer | 机构代码【与stockCode、industryCode、industryCodeLv1、categoryCode组成多选多参数，必须传递其中一个至多个】 | `37` |
| `categoryCode` | — | string | 栏目分类代码【与stockCode、industryCode、industryCodeLv1、institutionCode组成多选多参数，必须传递其中一个至多个】 | `000100` |
| `beginDate` | — | string | 开始日期（格式yyyy-MM-dd） | `2020-01-01` |
| `endDate` | — | string | 结束日期（格式yyyy-MM-dd） | `2020-01-01` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |
| `key` | — | string | 关键字 | `光模块` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `guid` | 报告编号 | `B761EA4B-7146-436E-9C4E-03CE948A6DD4` |
| `reportId` | 报告id | `795857` |
| `title` | 标题 | `PICC Property and Casualty(02328.HK):PICC P&C to acquire 19.99% of Hua Xia Bank` |
| `author` | 作者 | `孙梦曦,王欢` |
| `date` | 发布时间 | `2016-01-04 09:54:27` |
| `institutionName` | 机构名称 | `Morgan Stanley` |
| `keyword` | 关键字 | `岭南控股作为广州市属文` |
| `content` | 内容 | `    我们将未来12个月美` |
| `categoryCode` | 栏目分类代码 | `000100` |
| `reportLanguage` | 报告语种 | — |
| `categoryCodeLv2` | 栏目二级分类代码 | `000111` |

### 接口示例

```bash
# Body JSON 可选参数: stockCode, industryCode, industryCodeLv1, institutionCode, categoryCode, beginDate, endDate, pageNum, pageSize, key
node scripts/gs-api.js report/research --method POST --body-json '{"stockCode":"600519","industryCode":"740100","industryCodeLv1":"640000"}'
```

### `report/stock-forecast-ratings`

- 请求方式：`GET/POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js report/stock-forecast-ratings stockCode={股票代码} beginDate={开始日期} endDate={结束日期} pageNum=1 pageSize=20
```
```bash
node scripts/gs-api.js report/stock-forecast-ratings stockCode=000001 beginDate=2025-01-01 endDate=2026-06-16 pageNum=1 pageSize=20
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 预测评级 \| Markdown 表格 \| 条件触发 \| `report/stock-forecast-ratings` \| 样本不足则标注 \| EPS、净利润预测、评级、目标价字段 \| |
| \| 预测修正摘要 \| Markdown 表格/结构化摘要 \| 条件触发 \| `report/stock-forecast-ratings` \| 可比样本不足则说明缺口 \| 近期预测样本上调/下调/持平数量、上调占比；评级变动原因仅在用户明确询问时补充 \| |
| \| 股票研报预测评级 \| `report/stock-forecast-ratings` / `list_report_stock_forecast_ratings` \| GET \| `stockCode`, `beginDate`, `endDate` \| 查询 EPS、净利润预测、评级和目标价字段 \| |
| \| `forecast_rating` \| 股票研报预测评级 \| 股票代码 \| `report/stock-forecast-ratings` \| EPS、净利润预测、评级字段，并按可比样本生成预测修正摘要 \| |
| \| R-003 \| 目标价和评级不转投资建议 \| 返回评级、目标价字段 \| 只展示字段和口径，不生成买卖建议 \| 输出边界说明 \| `report/stock-forecast-ratings` \| P0 \| |
| \| R-006 \| 预测修正摘要必须可比 \| 输出涉及上调占比、机构评级趋势或预测修正方向 \| 优先比较同一研报样本的当前预测值与上次预测值；可比样本不足时只说明缺口，不写成已确认未上调；评级变动接口只在明确问原因时补充 \| 避免把预测样本缺口误写成结论 \| `report/stock-forecast-ratings`，必要时 `report/earnings-forecast-rating-cha` \| P0 \| |
| \| 预测评级 \| T+1 净利润预测 \| `xx亿元` \| `2026-02-02，《研报标题》，发布机构` \| `report/stock-forecast-ratings` \| |

#### finance-data 参考文档摘录

## 股票研报预测评级

接口路径：`report/stock-forecast-ratings`
请求方式：`GET`
tool_id：`list_report_stock_forecast_ratings`

接口说明：通过股票代码、研究报告标识、研究机构代码、报告标题、投资评级及时间范围等条件，查询个股研究报告的预测评级数据，包括未来1-3年的每股收益预测、净利润预测、目标价调整、投资评级描述等核心指标，适用于股票投资分析和研究报告筛选。

### 输入参数

**Query 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `stockCode` | ✅ | string | 股票代码 | `000001` |
| `beginDate` | — | string | 起始日期。 最小值:2020-01-01; | `2020-01-01` |
| `endDate` | — | string | 截止日期 | `2025-05-01` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `date` | 报告完成时间 | `2025-01-15` |
| `stockCode` | 股票代码 | `000001` |
| `stockName` | 股票名称 | `平安银行` |
| `guid` | 报告编号 | `A3EEC164-1127-4A78-8AAA-03C1F1139CED` |
| `reportId` | 分析报告标识 | `12345` |
| `institutionCode` | 研究机构代码 | `2` |
| `institutionName` | 机构简称 | `中信证券` |
| `reportTitle` | 报告标题 | `贵州茅台投资研究报告` |
| `tYear` | T年 | `2024` |
| `epsForecastT1` | 报告中T+1年预测EPS | `2.35` |
| `epsForecastT2` | 报告中T+2年预测EPS | `2.68` |
| `epsForecastT3` | 报告中T+3年预测EPS | `3.12` |
| `epsForecastT1Prev` | 上次T+1年预测EPS | `2.28` |
| `epsForecastT2Prev` | 上次T+2年预测EPS | `2.55` |
| `epsForecastT3Prev` | 上次T+3年预测EPS | `2.98` |
| `ratingCurrent` | 报告中投资评级 | `4` |
| `reportDatePrev` | 上次报告完成时间 | `2024-12-15` |
| `ratingDescription` | 报告中评级描述 | `买入` |
| `ratingDescriptionPrev` | 上次评级描述 | `增持` |
| `ratingPrev` | 上次投资评级 | `3` |
| `targetPriceEx` | 目标价(除权) | `125.5` |
| `targetPriceExPrev` | 上次目标价(除权) | `118.8` |
| `netProfitForecastT1` | 报告中T+1年预测净利润 | `45800000000` |
| `netProfitForecastT2` | 报告中T+2年预测净利润 | `52300000000` |
| `netProfitForecastT3` | 报告中T+3年预测净利润 | `60800000000` |
| `netProfitForecastT1Prev` | 上次T+1年预测净利润 | `44500000000` |
| `netProfitForecastT2Prev` | 上次T+2年预测净利润 | `49800000000` |
| `netProfitForecastT3Prev` | 上次T+3年预测净利润 | `58200000000` |
| `targetPrice` | 报告中目标价 | `128.5` |

### 接口示例

```bash
# Query 可选参数: beginDate, endDate, pageNum, pageSize
node scripts/gs-api.js report/stock-forecast-ratings stockCode=000001
```

### `report/vector-search`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js report/vector-search --method POST stockCode={股票代码} topK=5 --body-json '{"query":"{查询文本}"}'
```
```bash
node scripts/gs-api.js report/vector-search --method POST stockCode=002594 topK=5 --body-json '{"query":"销量，ASP，产能，市场份额"}'
```
```bash
node scripts/gs-api.js report/vector-search --method POST industryCode=740000 topK=5 --body-json '{"query":"渗透率，市场空间，竞争格局"}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 向量片段 \| Markdown 表格 \| 条件触发 \| `report/vector-search` \| 无结果则提示换查询词或过滤范围 \| 片段摘要、发布日期、研报标题、发布机构和证据强度；内部可保留 reportId、页码和位置用于溯源 \| |
| \| 研报向量搜索 \| `report/vector-search` / `list_report_vector-search` \| POST \| Query: `stockCode`, `industryCode`, `institutionCode`, `categoryCode`, `topK`; Body: `query` \| 语义搜索研报片段 \| |
| \| `vector_search` \| 研报向量搜索 \| 查询文本 + 过滤范围 \| `report/vector-search` \| 研报片段证据 \| |
| \| R-001 \| 向量搜索过滤范围必需 \| 用户要求语义搜索研报片段 \| `query` 必填，且 `stockCode/industryCode/institutionCode/categoryCode` 至少一个 \| 缺失时先追问 \| `report/vector-search` \| P0 \| |
| \| 研报片段 \| 文本片段 \| `...渗透率...` \| `2026-02-02，《研报标题》，发布机构` \| `report/vector-search` \| |

#### finance-data 参考文档摘录

## 研报向量搜索

接口路径：`report/vector-search`
请求方式：**`POST`**
tool_id：`list_report_vector-search`

接口说明：使用必填的查询文本，搭配可选的股票代码、行业代码、机构代码、分类代码、研报发布时间范围（开始日期格式为yyyy-MM-dd、结束日期格式为yyyy-MM-dd）、返回结果条数topK，进行研报向量搜索，可返回研报ID、发布时间（格式为yyyy-MM-dd HH:mm:ss）、文本片段、页码、文本块起止位置、片段位置等核心数据，帮助用户快速定位研报中与查询内容相关的重点信息，高效获取深度投研资料。

### 输入参数

**Query 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `stockCode` | — | string | 股票代码 | `002594` |
| `industryCode` | — | string | 行业代码 | `740000` |
| `institutionCode` | — | string | 机构代码 | `37` |
| `categoryCode` | — | string | 分类代码 | `000100` |
| `beginDate` | — | string | 开始日期 | `2020-01-01` |
| `endDate` | — | string | 结束日期 | `2021-01-01` |
| `topK` | — | integer | 返回条数 | `3` |

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `query` | ✅ | string | 查询文本 | `新能源汽车` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `reportId` | 研报ID | — |
| `pubDate` | 发布时间 | — |
| `chunk` | 文本片段 | — |
| `page` | 页码 | — |
| `blockStart` | 文本块起始位置 | — |
| `blockEnd` | 文本块结束位置 | — |
| `position` | 片段位置 | — |

### 接口示例

```bash
# Query 可选参数: stockCode, industryCode, institutionCode, categoryCode, beginDate, endDate, topK
node scripts/gs-api.js report/vector-search --method POST --body-json '{"query":"新能源汽车"}'
```

---

## 常用示例

```bash
# 初始化或检查券商数据入口
node scripts/gs-api.js status

# 查询证券代码
node scripts/gs-api.js search key=贵州茅台 type=11

# 查看可用接口
node scripts/gs-api.js list
node scripts/gs-api.js search query=股票,行情,财务

# GET 或默认请求示例
node scripts/gs-api.js stock/basic-info stockCode=600519

# POST + Body JSON 示例
node scripts/gs-api.js stock/adjusted-quotes --method POST --body-json '{"stockCode":"600519","beginDate":"2024-01-01","endDate":"2024-12-31"}'
```

## 接口文档补全要求

当当前 Skill 使用新的 finance-data 接口时，必须在本文件补充：

| 字段 | 要求 |
|---|---|
| 接口名称 | 用业务可读名称描述用途。 |
| endpoint | 写成 `<group>/<name>` 格式，例如 `stock/basic-info`。 |
| 请求方式 | 明确 `GET` 或 `POST`。 |
| tool_id | 如可通过 `search` 查到，必须记录。 |
| Query 参数 | 列出参数名、必填、类型、说明、示例。 |
| Body JSON 参数 | POST Body 字段必须单独列出，不得混写成普通 `key=value`。 |
| 输出字段 | 列出当前 Skill 实际消费的字段、含义、空值处理。 |
| 调用示例 | 使用 `node scripts/gs-api.js`，不得使用标准版 CLI。 |

## 回归检查

- [ ] 当前 Skill 的 `SKILL.md` 或参考文件已链接本接口文档。
- [ ] 当前 Skill 中所有 API 示例均使用 `node scripts/gs-api.js`。
- [ ] 每个被当前 Skill 消费的 endpoint 均能在本文件找到参数示例。
- [ ] POST 接口的 Body JSON 使用 `--body-json`。
- [ ] 未把真实 APIKey、Token、密钥或本机私密路径写入文档。
- [ ] 缺数据时写“数据不足 / 待接入 / 权限受限”，不编造字段或结论。
