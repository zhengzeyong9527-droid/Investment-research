# gs-valuation-data finance-data 接口文档

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
| `economic/gover-bond-yield` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js economic/gover-bond-yield --method POST --body-json '{"beginDate":"2026-06-01","endDate":"2026-06-10","pageNum":1,"pageSize":20}'` |
| `gs/node` | `GET/POST` | 待按当前 Skill 业务口径补充 | `node scripts/gs-api.js gs/node stockCode=600519` |
| `index/valuation` | `GET/POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js index/valuation indexCode=801081` |
| `industry/forecasts` | `GET/POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js industry/forecasts industryCode=640000` |
| `industry/market-stats` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js industry/market-stats --method POST industryCode=640000` |
| `market/quote-summaries` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js market/quote-summaries --method POST --body-json '{"industryCodes":["640000"],"industrySubCodes":[],"conceptCodes":[]}'` |
| `stock-quote/core` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js stock-quote/core --method POST --body-json '{"codes":["002594"]}'` |
| `stock/cash-flows` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js stock/cash-flows --method POST --body-json '{"stockCode":"600519","beginDate":"2025-01-01","endDate":"2026-06-09","pageNum":1,"pageSize":20}'` |
| `stock/cash-flows-ttm` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js stock/cash-flows-ttm --method POST --body-json '{"stockCode":"600519","beginDate":"2025-01-01","endDate":"2026-06-09","pageNum":1,"pageSize":20}'` |
| `stock/dividends` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js stock/dividends --method POST --body-json '{"stockCode":"600519","beginDate":"2023-01-01","endDate":"2026-06-09","pageNum":1,"pageSize":50}'` |
| `stock/finance/growth-ability` | `GET/POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js stock/finance/growth-ability stockCode=600519` |
| `stock/financial-indicators-cash-col` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js stock/financial-indicators-cash-col --method POST --body-json '{"stockCode":"600519","beginDate":"2025-01-01","endDate":"2026-06-09","pageNum":1,"pageSize":20}'` |
| `stock/financial-indicators-growth` | `GET/POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js stock/financial-indicators-growth stockCode=600519 beginDate=2025-01-01 endDate=2026-06-09 pageNum=1 pageSize=20` |
| `stock/per-share-indicators` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js stock/per-share-indicators --method POST --body-json '{"stockCode":"600519","beginDate":"2025-01-01","endDate":"2026-06-09","pageNum":1,"pageSize":20}'` |
| `stock/repurchase-plans` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js stock/repurchase-plans --method POST --body-json '{"stockCode":"600519","beginDate":"2023-01-01","endDate":"2026-06-09","pageNum":1,"pageSize":50}'` |
| `stock/val-indicators` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js stock/val-indicators --method POST --body-json '{"stockCode":"600519","pageSize":1}'` |

## 已识别接口详情

### `economic/gover-bond-yield`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js economic/gover-bond-yield --method POST --body-json '{"beginDate":"2026-06-01","endDate":"2026-06-10","pageNum":1,"pageSize":20}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 12 \| `economic/gover-bond-yield` \| `list_gover_bond_yield` \| 3个月、6个月、2年、10年、30年国债收益率，无风险利率辅助 \| `references/估值辅助/估值辅助数据.md` \| |
| \| 查DCF辅助利率 \| `economic/gover-bond-yield` \| 货币市场利率接口 \| 10年期/30年期国债收益率、日期 \| |

#### finance-data 参考文档摘录

## 国债收益率

接口路径：`economic/gover-bond-yield`
请求方式：**`POST`**
tool_id：`list_gover_bond_yield`

接口说明：查询中国国债收益率曲线数据，支持按起止日期（格式为yyyy-MM-dd）筛选，返回指定日期范围内各关键期限（3个月、6个月、2年、10年、30年）的国债收益率，用于宏观经济分析、利率走势研判和固定收益投资决策。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `beginDate` | — | string | 开始日期（格式yyyy-MM-dd）。 最小值:2020-01-01; | `2020-01-01` |
| `endDate` | — | string | 结束日期（格式yyyy-MM-dd） | `2025-01-01` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `date` | 发布时间 | `2025-01-01` |
| `bnd3m` | 三月期债券收益率(%) | `1.5475` |
| `bnd6m` | 六月期债券收益率(%) | `1.5475` |
| `bnd2y` | 两年期债券收益率(%) | `1.5475` |
| `bnd10y` | 十年期债券收益率(%) | `1.5475` |
| `bnd30y` | 三十年期债券收益率(%) | `1.5475` |

### 接口示例

```bash
# Body JSON 可选参数: beginDate, endDate, pageNum, pageSize
node scripts/gs-api.js economic/gover-bond-yield --method POST --body-json '{"beginDate":"2020-01-01","endDate":"2025-01-01","pageNum":1}'
```

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

### `index/valuation`

- 请求方式：`GET/POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js index/valuation indexCode=801081
```
```bash
node scripts/gs-api.js index/valuation indexCode=399300 pageNum=1 pageSize=20
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 3 \| `index/valuation` \| `get_index_valuation` \| 查询行业对应指数的总市值、当前 PE/PB、换手率、股息率与 5 年分位 \| `references/行业估值/指数估值数据.md` \| |
| \| 查行业估值 \| `index/valuation` + `industry/market-stats` \| `industries` \| 总市值、当前 PE/PB、换手率、股息率、PE/PB 五年分位、PS 五年分位、阶段涨跌幅、主力资金净流 \| |
| \| 查行业全量概览 \| `index/valuation` + `industry/market-stats` + `industry/financial-overview` + `industry/prosperity-index` + `market/quote-summaries` \| `industries` \| 行业估值、财务、盈利、景气度、行情、竞争结构摘要综合表 \| |
| \| 估值背景 \| 指数总市值 \| `311.04亿` \| `index/valuation`, `2026-06-03` \| |
| \| 估值 \| 当前PE \| `189.44x` \| `index/valuation`, `2026-06-03` \| |
| \| 估值 \| 当前PB \| `10.10x` \| `index/valuation`, `2026-06-03` \| |
| \| 估值背景 \| 换手率 \| `6.42%` \| `index/valuation`, `2026-06-03` \| |
| \| 估值背景 \| 股息率 \| `0.13%` \| `index/valuation`, `2026-06-03` \| |

#### finance-data 参考文档摘录

## 指数估值信息

接口路径：`index/valuation`
请求方式：`GET`
tool_id：`get_index_valuation`

接口说明：通过指数代码和时间范围查询指数的估值信息，包括指数名称、发布机构、市场类型、行情时间、总市值、市盈率、市净率、换手率和股息率等核心数据，适用于金融分析和市场研究。

### 输入参数

**Query 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `indexCode` | ✅ | string |  | `399300` |
| `beginDate` | — | string |  | `2025-11-04` |
| `endDate` | — | string |  | `2025-11-04` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `indexCode` | 指数代码 | `000300` |
| `indexName` | 指数的证券简称 | `沪深300` |
| `progFullName` | 发布机构全称 | `中证指数有限公司` |
| `marketType` | 交易市场代码 | `S` |
| `date` | 行情时间 | `2025-11-06 00:00:00` |
| `indexMarketValue` | 指数的总市值 | `122081713834.268` |
| `pe` | 市盈率 | `14.3326` |
| `pb` | 市净率 | `1.376` |
| `peRank5y` | 近五年PE百分位 | `0.8399` |
| `pbRank5y` | 近五年PB百分位 | `0.6399` |
| `turnoverRate` | 换手率 | `0.0068` |
| `divYield` | 股息率 | `0.0269` |

### 接口示例

```bash
# Query 可选参数: beginDate, endDate, pageNum, pageSize
node scripts/gs-api.js index/valuation indexCode=399300
```

---

### `industry/forecasts`

- 请求方式：`GET/POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js industry/forecasts industryCode=640000
```
```bash
node scripts/gs-api.js industry/forecasts industryCode=630000
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 7 \| `industry/forecasts` + `industry/rotation` + `industry/turnover-rates` \| `list_industry_forecasts` / `list_industry_rotation` / `list_idu_turnover_rates` \| 查询行业预测、轮动因子、换手率 \| `references/预测与活跃度/行业预测轮动换手率.md` \| |
| \| 14 \| `industry/forecasts` + `industry/prosperity-index` + `industry/financial-overview` + `industry/market-stats` + `market/quote-summaries` \| 多个行业数据接口 \| 为生命周期、周期属性和需求特征提供预测、景气、财务、估值行情辅助依据 \| `references/文本增强/行业结构化标签.md` \| |
| \| 查行业预测/轮动/换手率 \| `industry/forecasts` + `industry/rotation` + `industry/turnover-rates` \| `industry/market-stats` \| 收入利润预测、市场排名、轮动因子、换手率百分位 \| |
| \| 查行业生命周期/周期属性/需求特征 \| `report/research` + `news/entity-related` + `announcements` \| `industry/forecasts` + `industry/prosperity-index` + `industry/financial-overview` + `industry/market-stats` + `market/quote-summaries` \| 生命周期标签、周期属性标签、需求刚性、需求频率、价格弹性、抗周期能力、替代风险；必须标注文本口径和辅助数据 \| |
| \| 预测 \| 未来12个月净利润增长率 \| `17.3%` \| `industry/forecasts` \| |
| \| 4 \| `industry/forecasts` \| `get_industry_forecasts` \| 行业未来营收、净利润或 EPS 预测增速，供行业 PEG 分母使用 \| `references/指数与行业估值/指数行业估值数据.md` \| |

#### finance-data 参考文档摘录

## 行业预测

接口路径：`industry/forecasts`
请求方式：`GET`
tool_id：`list_industry_forecasts`

接口说明：通过行业代码获取行业预测数据，包括当前及未来几年的净利润增长率、业务收入增长率及其市场排名，以及历史净利润和业务收入数据，适用于行业趋势分析和投资决策支持。

### 输入参数

**Query 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `industryCode` | ✅ | string | 行业代码 | `640000` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `industryCode` | 行业代码 | `640000` |
| `industryName` | 行业名称 | `能源` |
| `tYear` | T年 | `2024` |
| `tYearNetProfitGrowthRate` | T年净利润增长率(%) | `15.5` |
| `tPlus1YNetProfitGrowthRate` | T+1年净利润增长率(%) | `18.2` |
| `tPlus2YNetProfitGrowthRate` | T+2年净利润增长率(%) | `16.8` |
| `tPlus3YNetProfitGrowthRate` | T+3年净利润增长率(%) | `14.3` |
| `t1YNetProfitGrowthRate` | T-1年净利润增长率(%) | `12.1` |
| `tMinus2YNetProfitGrowthRate` | T-2年净利润增长率(%) | `8.7` |
| `future12MonthsNetProfitGrowthRate` | 未来12个月净利润增长率(%) | `17.3` |
| `t3yNetIncomeGrowthRate` | T-3年净利润增长率(%) | `6.4` |
| `t4YNetProfitGrowthRate` | T-4年净利润增长率(%) | `4.2` |
| `tYearNetProfitGrowthRateMarketRanking` | T年净利润增长率在市场中排名 | `25` |
| `tPlus1YNetProfitGrowthRateMarketRanking` | T+1年净利润增长率在市场中排名 | `18` |
| `tPlus2YNetProfitGrowthRateMarketRanking` | T+2年净利润增长率在市场中排名 | `22` |
| `tPlus3YNetProfitGrowthRateMarketRanking` | T+3年净利润增长率在市场中排名 | `28` |
| `t1YNetProfitGrowthRateRankInMarket` | T-1年净利润增长率在市场中排名 | `35` |
| `t2yNetProfitGrowthRateMarketRank` | T-2年净利润增长率在市场中排名 | `45` |
| `future12MonthsNetProfitGrowthRateMarketRank` | 未来12个月净利润增长率在市场中排名 | `20` |
| `t3yNetProfitGrowthRateMarketRanking` | T-3年净利润增长率在市场中排名 | `58` |
| `profitGrowthRankInMarketT4Y` | T-4年净利润增长率在市场中排名 | `72` |
| `tYearBizIncomeGrowthRatePct` | T年业务收入增长率(%) | `22.5` |
| `tPlus1YBusinessIncomeGrowthRatePct` | T+1年业务收入增长率(%) | `25.8` |
| `tPlus2YBusinessIncomeGrowthRatePct` | T+2年业务收入增长率(%) | `23.2` |
| `tPlus3YBusinessIncomeGrowthRatePct` | T+3年业务收入增长率(%) | `20.6` |
| `t1YBusinessIncomeGrowthRatePct` | T-1年业务收入增长率(%) | `18.3` |
| `t2YBusinessIncomeGrowthRatePct` | T-2年业务收入增长率(%) | `15.7` |
| `growthRateNext12Months` | 未来12个月业务收入增长率(%) | `24.1` |
| `t3YBusinessIncomeGrowthRatePct` | T-3年业务收入增长率(%) | `12.4` |
| `t4YBusinessIncomeGrowthRatePct` | T-4年业务收入增长率(%) | `9.8` |

### 接口示例

```bash
node scripts/gs-api.js industry/forecasts industryCode=640000
```

### `industry/market-stats`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js industry/market-stats --method POST industryCode=640000
```
```bash
node scripts/gs-api.js industry/market-stats --method POST --body-json '{"industryCode":"640000"}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 4 \| `industry/market-stats` \| `get_industry_market_stats` \| 查询行业 PS 分位、阶段涨跌幅与主力资金净流 \| `references/行业估值/行业估值数据.md` \| |
| \| 14 \| `industry/forecasts` + `industry/prosperity-index` + `industry/financial-overview` + `industry/market-stats` + `market/quote-summaries` \| 多个行业数据接口 \| 为生命周期、周期属性和需求特征提供预测、景气、财务、估值行情辅助依据 \| `references/文本增强/行业结构化标签.md` \| |
| \| 查行业估值 \| `index/valuation` + `industry/market-stats` \| `industries` \| 总市值、当前 PE/PB、换手率、股息率、PE/PB 五年分位、PS 五年分位、阶段涨跌幅、主力资金净流 \| |
| \| 查行业预测/轮动/换手率 \| `industry/forecasts` + `industry/rotation` + `industry/turnover-rates` \| `industry/market-stats` \| 收入利润预测、市场排名、轮动因子、换手率百分位 \| |
| \| 查行业行情 \| `market/quote-summaries` \| `industry/market-stats` \| 行业指数、涨跌幅、成交量、总市值、涨跌家数、领涨股 \| |
| \| 查行业生命周期/周期属性/需求特征 \| `report/research` + `news/entity-related` + `announcements` \| `industry/forecasts` + `industry/prosperity-index` + `industry/financial-overview` + `industry/market-stats` + `market/quote-summaries` \| 生命周期标签、周期属性标签、需求刚性、需求频率、价格弹性、抗周期能力、替代风险；必须标注文本口径和辅助数据 \| |
| \| 查竞争格局文本线索 \| `report/research` + `announcements` + `news/entity-related` \| `chain/com-main-pro` + `industry/financial-overview` + `industry/prosperity-index` + `industry/market-stats` + `stock/fin-ind-sw-rnk-q` + `market/quote-summaries` \| CR3/CR5、市场份额、利润池分布、价格战强度；只有 P0 直接披露可作主结论，其余必须标注估算/样本观察和估算方式 \| |
| \| 查行业全量概览 \| `index/valuation` + `industry/market-stats` + `industry/financial-overview` + `industry/prosperity-index` + `market/quote-summaries` \| `industries` \| 行业估值、财务、盈利、景气度、行情、竞争结构摘要综合表 \| |

#### finance-data 参考文档摘录

## 行业行情统计

接口路径：`industry/market-stats`
请求方式：**`POST`**
tool_id：`get_industry_market_stats`

接口说明：通过行业代码查询指定行业的行情统计数据，包含行业代码、名称、近一日至近五年等多个时间维度的涨跌幅、近一日至近二十日的主力资金净流入（万元），以及PE、PB、PS的近五年历史百分位，用于行业表现分析和资金流向监控。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `industryCode` | ✅ | string | 行业代码 | `640000` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `industryCode` | 行业代码 | `64000` |
| `industryName` | 行业名称 | `机械设备` |
| `return1d` | 近一日涨跌幅(%) | `10` |
| `return1w` | 近一周涨跌幅(%) | `10` |
| `return1m` | 近一月涨跌幅(%) | `10` |
| `return3m` | 近三月涨跌幅(%) | `10` |
| `return6m` | 近半年涨跌幅(%) | `10` |
| `return1y` | 近一年涨跌幅(%) | `10` |
| `return3y` | 近三年涨跌幅(%) | `10` |
| `return5y` | 近五年涨跌幅(%) | `10` |
| `returnYtd` | 今年以来涨跌幅(%) | `10` |
| `pbPct5y` | PB近五年历史百分位 | `0.9983` |
| `pePct5y` | PE近五年历史百分位 | `0.9942` |
| `psPct5y` | PS近五年历史百分位 | `0.9975` |
| `netMainInflow1dMn` | 近1日主力净流(万元) | `1243416.7117` |
| `netMainInflow3dMn` | 近3日主力净流(万元) | `1439349.7327` |
| `netMainInflow5dMn` | 近5日主力净流(万元) | `2745604.8824` |
| `netMainInflow10dMn` | 近10日主力净流(万元) | `3698071.1197` |
| `netMainInflow20dMn` | 近20日主力净流(万元) | `3698071.1197` |

### 接口示例

```bash
node scripts/gs-api.js industry/market-stats --method POST --body-json '{"industryCode":"640000"}'
```

---

### `market/quote-summaries`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js market/quote-summaries --method POST --body-json '{"industryCodes":["640000"],"industrySubCodes":[],"conceptCodes":[]}'
```
```bash
node scripts/gs-api.js market/quote-summaries --method POST --body-json '{"industryCodes":[],"industrySubCodes":[],"conceptCodes":["CLS81936"]}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 8 \| `market/quote-summaries` \| `get_market_quote_summaries` \| 查询行业或概念板块行情汇总 \| `references/行情与排名/行业实时行情.md` \| |
| \| 14 \| `industry/forecasts` + `industry/prosperity-index` + `industry/financial-overview` + `industry/market-stats` + `market/quote-summaries` \| 多个行业数据接口 \| 为生命周期、周期属性和需求特征提供预测、景气、财务、估值行情辅助依据 \| `references/文本增强/行业结构化标签.md` \| |
| \| 15 \| `market/quote-summaries` \| `get_market_quote_summaries` \| 查询指定行业或概念代码的板块表现汇总 \| `references/行情与排名/板块排名.md` \| |
| \| 查行业行情 \| `market/quote-summaries` \| `industry/market-stats` \| 行业指数、涨跌幅、成交量、总市值、涨跌家数、领涨股 \| |
| \| 查竞争结构摘要 \| `report/research` + `announcements` + `chain/com-main-pro` \| `stock/fin-ind-sw-rnk-q` + `market/quote-summaries` + `stock/insti_holding` + `industry/financial-overview` \| P0 直接披露的竞争结论、A股上市样本产品收入CR、产品收入样本份额、样本产品毛利池分布、排序线索、竞争方式、进入壁垒、A 股补充视角、风险提示 \| |
| \| 查行业生命周期/周期属性/需求特征 \| `report/research` + `news/entity-related` + `announcements` \| `industry/forecasts` + `industry/prosperity-index` + `industry/financial-overview` + `industry/market-stats` + `market/quote-summaries` \| 生命周期标签、周期属性标签、需求刚性、需求频率、价格弹性、抗周期能力、替代风险；必须标注文本口径和辅助数据 \| |
| \| 查竞争格局文本线索 \| `report/research` + `announcements` + `news/entity-related` \| `chain/com-main-pro` + `industry/financial-overview` + `industry/prosperity-index` + `industry/market-stats` + `stock/fin-ind-sw-rnk-q` + `market/quote-summaries` \| CR3/CR5、市场份额、利润池分布、价格战强度；只有 P0 直接披露可作主结论，其余必须标注估算/样本观察和估算方式 \| |
| \| 查板块排名 \| `market/quote-summaries` \| — \| 指定行业或概念代码的板块表现汇总；全市场排行需上游提供代码集合或改用其他可用数据源 \| |

#### finance-data 参考文档摘录

## 市场行情汇总

接口路径：`market/quote-summaries`
请求方式：**`POST`**
tool_id：`get_market_quote_summary`

接口说明：通过申万一级行业代码、申万二级行业代码、概念代码，获取市场行情汇总数据，涵盖整体市场的有效样本数、涨跌家数、涨跌幅、赚钱效应、情绪温度等核心指标，同时提供一级行业、细分行业、概念板块的详细汇总信息，包括成分股涨跌情况、龙头股及领跌股、资金净流入、成交集中度等，可用于市场整体行情分析、行业及概念板块的监测与投研分析

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `industryCodes` | — | array | 申万一级行业代码【与industrySubCodes、conceptCodes组成多选多参数，必须传递其中一个至多个】 | `['410000']` |
| `industrySubCodes` | — | array | 申万二级行业代码【与industryCodes、conceptCodes组成多选多参数，必须传递其中一个至多个】 | `['410100']` |
| `conceptCodes` | — | array | 概念代码【与industryCodes、industrySubCodes组成多选多参数，必须传递其中一个至多个】 | `['CLS80201']` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `data` | 业务数据 | `{}` |

### 接口示例

```bash
# Body JSON 可选参数: industryCodes, industrySubCodes, conceptCodes
node scripts/gs-api.js market/quote-summaries --method POST --body-json '{"industryCodes":["410000"],"industrySubCodes":["410100"],"conceptCodes":["CLS80201"]}'
```

---

### `stock-quote/core`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js stock-quote/core --method POST --body-json '{"codes":["002594"]}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 7 \| `stock-quote/core` \| `get_stock_quote_core` \| 最新价格、市值、换手率、行业口径辅助 \| `references/估值辅助/估值辅助数据.md` \| |
| \| 查 A 股当前核心估值 \| `stock/val-indicators` \| `stock-quote/core` \| PE、扣非 PE、PB、PS、总市值、流通市值、日期 \| |
| \| 查 A 股历史估值 \| `stock/val-indicators` \| `stock-quote/core` \| 历史交易日估值序列、样本窗口和可计算分位 \| |
| \| 查股息/分红 \| `stock/dividends` \| `stock-quote/core` \| 每股派现、除权除息日、股息率估算、分红稳定性数据 \| |
| \| 查回购收益率 \| `stock/repurchase-plans` \| `stock-quote/core` \| 回购金额、回购股数、进展、回购金额/市值 \| |
| \| 市值 \| 总市值 \| `xxxx亿元` \| `stock/val-indicators` 或 `stock-quote/core` \| |

#### finance-data 参考文档摘录

## 沪深京核心实时行情

接口路径：`stock-quote/core`
请求方式：**`POST`**
tool_id：`get_stock_quote_core`

接口说明：通过股票代码查询沪深京市场的核心实时行情数据，返回包括最新价、涨跌幅、成交量、成交额、买卖五档盘口、资金流向、涨跌停状态及行业概念标签等关键指标，所有时间字段统一格式为 yyyy-MM-dd HH:mm:ss，适用于大模型进行即时市场监测、个股异动分析和投资策略辅助。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `codes` | ✅ | array | 股票代码 | `['000001', '600519']` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `data` | 业务数据 | `{}` |

### 接口示例

```bash
node scripts/gs-api.js stock-quote/core --method POST --body-json '{"codes":["000001","600519"]}'
```

### `stock/cash-flows`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js stock/cash-flows --method POST --body-json '{"stockCode":"600519","beginDate":"2025-01-01","endDate":"2026-06-09","pageNum":1,"pageSize":20}'
```
```bash
node scripts/gs-api.js stock/cash-flows-ttm --method POST --body-json '{"stockCode":"600519","beginDate":"2025-01-01","endDate":"2026-06-09","pageNum":1,"pageSize":20}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 10 \| `stock/cash-flows` + `stock/cash-flows-ttm` \| `list_stock_cash_flows` / `list_stock_cash_flows_ttm` \| 经营现金流、自由现金流代理和 P/OCF 辅助 \| `references/估值辅助/估值辅助数据.md` \| |
| \| 查现金流估值辅助 \| `stock/cash-flows` + `stock/per-share-indicators` \| `stock/cash-flows-ttm` + `stock/financial-indicators-cash-col` \| CFO、每股经营现金流、每股自由现金流、现金流质量 \| |

#### finance-data 参考文档摘录

## 现金流表

接口路径：`stock/cash-flows`
请求方式：**`POST`**
tool_id：`list_stock_cash_flows`

接口说明：通过股票代码查询沪深京股票的现金流量数据，包括母公司期初/期末金额、合并期初/期末金额等核心财务指标，支持按报告日期范围筛选，适用于财务分析和投资决策。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `stockCode` | — | string | 股票代码【与stockCodes组成多选一参数，必须且只能传递其中一个】 | `002594` |
| `stockCodes` | — | array | 股票代码列表【与stockCode组成多选一参数，必须且只能传递其中一个】 | `['000001', '600519']` |
| `beginDate` | — | string | 开始日期（格式yyyy-MM-dd）。 最小值:2020-01-01; | `2020-01-01` |
| `endDate` | — | string | 结束日期（格式yyyy-MM-dd） | `2022-01-01` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `stockCode` | 股票代码 | `000001` |
| `stockName` | 股票名称 | `贵州茅台` |
| `publishDate` | 发布日期 | `2023-08-15` |
| `reportDate` | 报告期 | `2025-09-30` |
| `reportType` | 报告类型 | `Q1` |
| `fiscalPeriod` | 会计期间 | `9` |
| `cfo` | 经营活动产生的现金流量净额（元） | `1234567.89` |
| `cashInflowOperating` | 经营活动现金流入小计（元） | `1234567.89` |
| `cashRecvDepositIncrease` | 客户存款和同业存放款项净增加额（元） | `1234567.89` |
| `cashRecvBorrowingCb` | 向中央银行借款净增加额（元） | `1234567.89` |
| `cashRecvPolicyFundsNet` | 保户储金及投资款净增加额（元） | `1234567.89` |
| `cashRecvInterestFee` | 收取利息、手续费及佣金的现金（元） | `1234567.89` |
| `cashRecvPremiumInsurance` | 收到原保险合同保费取得的现金（元） | `1234567.89` |
| `cashRecvTradingAssetsNet` | 收到交易性金融资产现金净额（元） | `1234567.89` |
| `cashRecvSales` | 销售商品、提供劳务收到的现金（元） | `1234567.89` |
| `cashRecvTaxRefund` | 收到的税费返还（元） | `1234567.89` |
| `cashRecvOtherOperating` | 收到其它与经营活动有关的现金（元） | `1234567.89` |
| `cashOutflowOperating` | 经营活动现金流出小计（元） | `1234567.89` |
| `cashPaidLoansAdvancesNet` | 客户贷款及垫款净增加额（元） | `1234567.89` |
| `cashPaidDepositsFiNet` | 存放央行和同业款项净增加额（元） | `1234567.89` |
| `cashPaidInsuranceClaims` | 支付原保险合同赔付款项的现金（元） | `1234567.89` |
| `cashPaidInterestFee` | 支付利息、手续费及佣金的现金（元） | `1234567.89` |
| `cashPaidPolicyDividend` | 支付保单红利的现金（元） | `1234567.89` |
| `cashPaidGoodsServices` | 购买商品、接受劳务支付的现金（元） | `1234567.89` |
| `cashPaidEmployees` | 支付给职工以及为职工支付的现金（元） | `1234567.89` |
| `cashPaidTax` | 支付的各项税费（元） | `1234567.89` |
| `cashPaidOtherOperating` | 支付其他与经营活动有关的现金（元） | `1234567.89` |
| `cfi` | 投资活动产生的现金流量净额（元） | `1234567.89` |
| `cashInflowInvesting` | 投资活动产生的现金流入小计（元） | `1234567.89` |
| `cashRecvDisposalInvestments` | 收回投资所收到的现金（元） | `1234567.89` |

### 接口示例

```bash
# Body JSON 可选参数: stockCode, stockCodes, beginDate, endDate, pageNum, pageSize
node scripts/gs-api.js stock/cash-flows --method POST --body-json '{"stockCode":"002594","stockCodes":["000001","600519"],"beginDate":"2020-01-01"}'
```

### `stock/cash-flows-ttm`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js stock/cash-flows-ttm --method POST --body-json '{"stockCode":"600519","beginDate":"2025-01-01","endDate":"2026-06-09","pageNum":1,"pageSize":20}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 10 \| `stock/cash-flows` + `stock/cash-flows-ttm` \| `list_stock_cash_flows` / `list_stock_cash_flows_ttm` \| 经营现金流、自由现金流代理和 P/OCF 辅助 \| `references/估值辅助/估值辅助数据.md` \| |
| \| 查现金流估值辅助 \| `stock/cash-flows` + `stock/per-share-indicators` \| `stock/cash-flows-ttm` + `stock/financial-indicators-cash-col` \| CFO、每股经营现金流、每股自由现金流、现金流质量 \| |

#### finance-data 参考文档摘录

## 现金流表（ttm）

接口路径：`stock/cash-flows-ttm`
请求方式：**`POST`**
tool_id：`list_stock_cash_flows_ttm`

接口说明：通过股票代码、报告期起止日期（格式为yyyy-MM-dd）及分页参数，查询指定沪深京股票的季度现金流量表数据，包含经营活动、投资活动和筹资活动产生的现金流入流出明细、净额以及期初期末现金余额等核心财务指标，用于分析公司的现金创造能力、资金运用效率和财务健康状况。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `stockCode` | — | string | 股票代码【与stockCodes组成多选一参数，必须且只能传递其中一个】 | `002594` |
| `stockCodes` | — | array | 股票代码列表【与stockCode组成多选一参数，必须且只能传递其中一个】 | `['000001', '600519']` |
| `beginDate` | — | string | 开始日期（格式yyyy-MM-dd）。 最小值:2020-01-01; | `2020-01-01` |
| `endDate` | — | string | 结束日期（格式yyyy-MM-dd） | `2025-01-01` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `stockCode` | 股票代码 | `000001` |
| `stockName` | 股票名称 | `贵州茅台` |
| `publishDate` | 发布日期 | `2023-08-15` |
| `reportDate` | 报告期 | `2025-09-30` |
| `reportType` | 报告类型 | `Q1` |
| `fiscalPeriod` | 会计期间 | `9` |
| `cashReceivedSales` | 销售商品提供劳务现金流入（元） | `12450000` |
| `cashReceivedDepositIncrease` | 客户存款同业存放净增加额（元） | `123456789` |
| `cashReceivedBorrowingCb` | 央行借款净增加额（元） | `1250000000` |
| `cashReceivedBorrowingOtherFi` | 金融机构拆入资金净增加额（元） | `1250000000` |
| `cashReceivedPremiumInsurance` | 原保险合同保费现金流入（元） | `1234567.89` |
| `cashReceivedReinsuranceNet` | 再保险业务现金净流入（元） | `1234.56` |
| `cashReceivedPolicyDepositNet` | 保户储金投资款净增加额（元） | `12345678.9` |
| `cashReceivedDisposalTradingAssetsNet` | 处置交易性金融资产净增加额（元） | `-1250000` |
| `cashReceivedInterestFee` | 利息手续费佣金现金流入（元） | `12345.67` |
| `cashReceivedBorrowingNet` | 拆入资金净增加额（元） | `123456789` |
| `cashReceivedRepurchaseNet` | 回购业务资金净增加额（元） | `1234567.89` |
| `cashReceivedTaxRefund` | 税费返还现金流入（元） | `123456.78` |
| `cashReceivedOtherOperating` | 其他经营活动现金流入（元） | `500000` |
| `cashInflowOperating` | 经营活动现金流入小计（元） | `1234567.89` |
| `cashPaidGoodsServices` | 购买商品接受劳务现金流出（元） | `1234567.89` |
| `cashPaidLoansAdvancesNet` | 客户贷款垫款净增加额（元） | `1234567.89` |
| `cashPaidDepositsFiNet` | 存放央行同业款项净增加额（元） | `1234567890.12` |
| `cashPaidInsuranceClaims` | 原保险合同赔付现金流出（元） | `1234567.89` |
| `cashPaidInterestFee` | 利息手续费佣金现金流出（元） | `1234567.89` |
| `cashPaidPolicyDividend` | 保单红利现金流出（元） | `12345.67` |
| `cashPaidEmployees` | 职工薪酬现金流出（元） | `1234567.89` |
| `cashPaidTax` | 税费现金流出（元） | `12500` |
| `cashPaidOtherOperating` | 其他经营活动现金流出（元） | `1234567` |
| `cashOutflowOperating` | 经营活动现金流出小计（元） | `1234567.89` |

### 接口示例

```bash
# Body JSON 可选参数: stockCode, stockCodes, beginDate, endDate, pageNum, pageSize
node scripts/gs-api.js stock/cash-flows-ttm --method POST --body-json '{"stockCode":"002594","stockCodes":["000001","600519"],"beginDate":"2020-01-01"}'
```

### `stock/dividends`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js stock/dividends --method POST --body-json '{"stockCode":"600519","beginDate":"2023-01-01","endDate":"2026-06-09","pageNum":1,"pageSize":50}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 8 \| `stock/dividends` \| `list_stocks_dividends` \| 分红派息、每股派现、股息率估算辅助 \| `references/估值辅助/估值辅助数据.md` \| |
| \| 查股息/分红 \| `stock/dividends` \| `stock-quote/core` \| 每股派现、除权除息日、股息率估算、分红稳定性数据 \| |

#### finance-data 参考文档摘录

## 公司分红派息信息

接口路径：`stock/dividends`
请求方式：**`POST`**
tool_id：`list_stocks_dividends`

接口说明：通过股票代码和分红年度截止日期范围，查询沪深京A股和B股上市公司的分红派息详细信息，包括股票名称、代码、分红年度、每股派现（税前/税后/外币）、送股转增比例、除权除息日、股权登记日、派现日、红股上市日等关键事件日期和财务数据，支持分页查询。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `stockCode` | — | string | 股票代码【与stockCodes组成多选一参数，必须且只能传递其中一个】 | `002594` |
| `stockCodes` | — | array | 股票代码列表【与stockCode组成多选一参数，必须且只能传递其中一个】 | `['000001', '600519']` |
| `beginDate` | — | string | 开始日期。 最小值:2020-01-01; | `2025-01-01` |
| `endDate` | — | string | 结束日期 | `2025-01-31` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `latestAnnounceDate` | 最新公告日 | `2022-08-11 00:00:00` |
| `stockCode` | 股票代码 | `001289` |
| `stockName` | 股票名称 | `龙源电力` |
| `fiscalYearEnd` | 分红年度截止日 | `2021-12-31 00:00:00` |
| `eventTypeCode` | 方案类别 | `3` |
| `planAnnounceDate` | 预案公告日 | `2022-08-11 00:00:00` |
| `cashDividendPerShare` | 每股税前派现 | `1.47` |
| `cashDividendPerShareAfterTax` | 每股税后派现 | `1.47` |
| `cashDividendPerShareForeign` | 每股税前外币派现 | `0.75` |
| `currencyCode` | 货币代码 | `CNY` |
| `stockDividendRatio` | 每股送股比例 | `0.5` |
| `stockTransferRatio` | 每股转增股比例 | `0.5` |
| `recordDate` | 股权登记日 | `2022-08-17 00:00:00` |
| `exDate` | 除权除息日 | `2022-08-18 00:00:00` |
| `bShareLastTradeDate` | B股最后交易日 | `2024-12-05` |
| `cashPayDate` | 派现日 | `2022-08-18 00:00:00` |
| `bonusShareListDate` | 红股上市日 | `2024-06-20` |
| `baseShares` | 分红股本基数 | `8381963164` |

### 接口示例

```bash
# Body JSON 可选参数: stockCode, stockCodes, beginDate, endDate, pageNum, pageSize
node scripts/gs-api.js stock/dividends --method POST --body-json '{"stockCode":"002594","stockCodes":["000001","600519"],"beginDate":"2025-01-01"}'
```

### `stock/finance/growth-ability`

- 请求方式：`GET/POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js stock/finance/growth-ability stockCode=600519
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 查成长能力辅助 \| `stock/financial-indicators-growth` \| `stock/finance/growth-ability` \| 营收增长、净利润增长、EPS 增长、CFO 增长 \| |

#### finance-data 参考文档摘录

## 股票成长能力的最新指标

接口路径：`stock/finance/growth-ability`
请求方式：`GET`
tool_id：`get_stock_finance_growth_ability`

接口说明：通过股票代码获取指定股票的成长能力最新指标数据，包括3年每股收入增长率(TTM)、每股收益增长率(TTM)、总收入增长率(TTM)、3年每股资本公积及未分配利润增长率(TTM)、3年扣非每股收益增长率(TTM)、3年每股自由现金流增长率(TTM)、3年每股账面价值增长率(TTM)等多项成长类指标的当前值，以及各指标的行业排名、历史行业排名，还有成长能力综合得分，同时返回股票代码和名称，可用于股票基本面分析、成长能力评估及投资决策参考。

### 输入参数

**Query 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `stockCode` | ✅ | string | 股票代码 | — |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `f2120` | 3年每股收入增长率(TTM) | — |
| `f2120Rk` | 3年每股收入增长率行业排名【0-100】 | — |
| `f2120RkHist` | 3年每股收入增长率历史行业排名【0-100】 | — |
| `f2130` | 每股收益增长率当前值(TTM) | — |
| `f2130Rk` | 每股收益增长率行业排名【0-100】 | — |
| `f2130RkHist` | 每股收益增长率历史行业排名【0-100】 | — |
| `f2140` | 总收入增长率当前值(TTM) | — |
| `f2140Rk` | 总收入增长率行业排名【0-100】 | — |
| `f2140RkHist` | 总收入增长率历史行业排名【0-100】 | — |
| `f2150` | 3年每股股息折旧及摊销增长率当前值(TTM) | — |
| `f2150Rk` | 3年每股股息折旧及摊销增长率行业排名 | — |
| `f2150RkHist` | 3年每股股息折旧及摊销增长率历史行业排名 | — |
| `f2160` | 3年扣非每股收益增长率当前值(TTM) | — |
| `f2160Rk` | 3年扣非每股收益增长率行业排名 | — |
| `f2160RkHist` | 3年扣非每股收益增长率历史行业排名 | — |
| `f2170` | 3年每股自由现金流增长率当前值(TTM) | — |
| `f2170Rk` | 3年每股自由现金流增长率行业排名 | — |
| `f2170RkHist` | 3年每股自由现金流增长率历史行业排名 | — |
| `f2180` | 3年每股账面价值增长率当前值(TTM) | — |
| `f2180Rk` | 3年每股账面价值增长率行业排名 | — |
| `f2180RkHist` | 3年每股账面价值增长率历史行业排名 | — |
| `f2510` | 成长能力综合得分 | — |
| `stockCode` | 股票代码 | — |
| `stockName` | 股票名称 | — |

### 接口示例

```bash
node scripts/gs-api.js stock/finance/growth-ability stockCode=<stockCode>
```

### `stock/financial-indicators-cash-col`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js stock/financial-indicators-cash-col --method POST --body-json '{"stockCode":"600519","beginDate":"2025-01-01","endDate":"2026-06-09","pageNum":1,"pageSize":20}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 11 \| `stock/per-share-indicators` + `stock/financial-indicators-cash-col` \| `list_per_share_indicators` / `list_fin_ind_cash_collect` \| 每股经营现金流、每股股东自由现金流、现金流质量 \| `references/估值辅助/估值辅助数据.md` \| |
| \| 查现金流估值辅助 \| `stock/cash-flows` + `stock/per-share-indicators` \| `stock/cash-flows-ttm` + `stock/financial-indicators-cash-col` \| CFO、每股经营现金流、每股自由现金流、现金流质量 \| |

#### finance-data 参考文档摘录

## 财务指标（收现能力）

接口路径：`stock/financial-indicators-cash-col`
请求方式：**`POST`**
tool_id：`list_fin_ind_cash_collect`

接口说明：通过股票代码（单个或批量）和可选的报告期起止日期（格式为yyyy-MM-dd），查询沪深京A股或B股公司的财务现金回收能力指标，包括预收款项营收占比、销售收现营收占比、经营现金流营收占比、经营现金流与资产总额比率、经营现金流与归母净利润比率、经营现金流与营业利润比率等核心数据，同时返回股票信息、报告期截止日期和发布日期（格式为yyyy-MM-dd HH:mm:ss），用于分析企业现金流质量和营收实现效率。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `stockCode` | — | string | 股票代码【与stockCodes组成多选一参数，必须且只能传递其中一个】 | `002594` |
| `stockCodes` | — | array | 股票代码列表【与stockCode组成多选一参数，必须且只能传递其中一个】 | `['000001', '600519']` |
| `beginDate` | — | string | 开始日期（格式yyyy-MM-dd）。 最小值:2020-01-01; | `2020-01-01` |
| `endDate` | — | string | 结束日期（格式yyyy-MM-dd） | `2025-01-01` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `stockCode` | 股票代码 | `600118` |
| `stockName` | 股票名称 | `中国卫星` |
| `reportPeriodEnd` | 报告期截止日 | `1994-12-31 00:00:00` |
| `publishDate` | 发布日期 | `1997-07-18 00:00:00` |
| `advanceReceiptsToRevenuePct` | 预收款项营收占比 | `32.04` |
| `cashReceivedSalesToRevenuePct` | 销售收现营收占比 | `0.856` |
| `cfoToOperatingRevenuePct` | 经营现金流营收占比 | `0.185` |
| `operatingCashToAssets` | 经营活动现金流量净额/资产总额 | `0.17036175` |
| `operatingCashToParentProfit` | 经营活动产生的现金流量净额/归母净利润 | `3.31526621` |
| `operatingCashToOperatingProfit` | 经营活动产生的现金流量净额/营业利润 | `2.64338131` |

### 接口示例

```bash
# Body JSON 可选参数: stockCode, stockCodes, beginDate, endDate, pageNum, pageSize
node scripts/gs-api.js stock/financial-indicators-cash-col --method POST --body-json '{"stockCode":"002594","stockCodes":["000001","600519"],"beginDate":"2020-01-01"}'
```

### `stock/financial-indicators-growth`

- 请求方式：`GET/POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js stock/financial-indicators-growth stockCode=600519 beginDate=2025-01-01 endDate=2026-06-09 pageNum=1 pageSize=20
```
```bash
node scripts/gs-api.js stock/financial-indicators-growth --method POST --body-json '{"stockCode":"600519","beginDate":"2025-01-01","endDate":"2026-06-09","pageNum":1,"pageSize":20}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 13 \| `stock/financial-indicators-growth` \| `get_stock_fin_ind_growth` / `list_stock_fin_ind_growth` \| 营收、净利润、EPS、经营现金流等成长能力指标 \| `references/估值辅助/估值辅助数据.md` \| |
| \| 查 PEG 所需基础数据 \| `stock/val-indicators` \| `stock/financial-indicators-growth` + 研报预测评级标准输出 \| 当前 PE/PB/PS、历史成长辅助；PEG 分母必须来自上层研报预测样本或用户显式假设 \| |
| \| 查成长能力辅助 \| `stock/financial-indicators-growth` \| `stock/finance/growth-ability` \| 营收增长、净利润增长、EPS 增长、CFO 增长 \| |
| \| 成长能力 \| 净利润1年平均增长率 \| `x.xx%` \| `stock/financial-indicators-growth` \| |

#### finance-data 参考文档摘录

## 财务指标（成长能力）

接口路径：`stock/financial-indicators-growth`
请求方式：`GET`
tool_id：`get_stock_fin_ind_growth`

接口说明：通过股票代码和报告期截止日期范围（格式为yyyy-MM-dd），查询沪深京股票的财务成长能力指标，包括营业收入、净利润、每股收益、总资产、经营性净利润、营业利润、经营活动现金流量净额、净资产等关键财务指标的一年平均增长率以及营业收入和净利润的同比增长率，用于评估公司的成长潜力和财务健康状况。

### 输入参数

**Query 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `stockCode` | ✅ | string | 股票代码 | `002594` |
| `beginDate` | — | string | 开始日期（格式yyyy-MM-dd）。 最小值:2020-01-01; | `2020-01-01` |
| `endDate` | — | string | 结束日期（格式yyyy-MM-dd） | `2025-01-01` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `stockCode` | 股票代码 | `000001` |
| `stockName` | 股票名称 | `平安银行` |
| `publishDate` | 披露日期 | `2023-08-25` |
| `reportPeriodEnd` | 报告期截止日 | `2023-12-31` |
| `revenueYoy` | 营业收入同比 | `0.356` |
| `revGrowth1y` | 业务收入1年平均增长率 | `0.2` |
| `npGrowth1y` | 净利润1年平均增长率 | `0.1` |
| `epsGrowth1y` | 每股收益1年平均增长率 | `0.452` |
| `taGrowth1y` | 总资产1年平均增长率 | `0.11` |
| `npRecurringGrowth1y` | 经常性业务产生的净利润1年平均增长率 | `0.25` |
| `opProfitGrowth1y` | 业务利润1年平均增长率 | `0.33` |
| `cfoGrowth1y` | 经营活动产生的现金流量净额1年平均增长率 | `0.1` |
| `equityGrowth1y` | 净资产1年平均增长率 | `0.2` |
| `netProfitYoy` | 净利润同比增长率 | `0.3399886574` |

### 接口示例

```bash
# Query 可选参数: beginDate, endDate, pageNum, pageSize
node scripts/gs-api.js stock/financial-indicators-growth stockCode=002594
```

### `stock/per-share-indicators`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js stock/per-share-indicators --method POST --body-json '{"stockCode":"600519","beginDate":"2025-01-01","endDate":"2026-06-09","pageNum":1,"pageSize":20}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 11 \| `stock/per-share-indicators` + `stock/financial-indicators-cash-col` \| `list_per_share_indicators` / `list_fin_ind_cash_collect` \| 每股经营现金流、每股股东自由现金流、现金流质量 \| `references/估值辅助/估值辅助数据.md` \| |
| \| 查现金流估值辅助 \| `stock/cash-flows` + `stock/per-share-indicators` \| `stock/cash-flows-ttm` + `stock/financial-indicators-cash-col` \| CFO、每股经营现金流、每股自由现金流、现金流质量 \| |
| \| 现金流 \| 每股自由现金流 \| `x.xx` \| `stock/per-share-indicators` \| |

#### finance-data 参考文档摘录

## 财务指标（每股指标）

接口路径：`stock/per-share-indicators`
请求方式：**`POST`**
tool_id：`list_per_share_indicators`

接口说明：通过股票代码和日期范围查询指定股票的每股财务指标数据，包括每股收益、每股营业收入、每股经营现金流和每股股东自由现金流，同时返回报告期截止日期和发布时间，用于分析公司的每股盈利能力、收入质量、现金流状况和股东回报水平。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `stockCode` | — | string | 股票代码【与stockCodes组成多选一参数，必须且只能传递其中一个】 | `002594` |
| `stockCodes` | — | array | 股票代码列表【与stockCode组成多选一参数，必须且只能传递其中一个】 | `['000001', '600519']` |
| `beginDate` | — | string | 开始日期（格式yyyy-MM-dd）。 最小值:2020-01-01; | `2020-01-01` |
| `endDate` | — | string | 结束日期（格式yyyy-MM-dd） | `2025-01-01` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `stockCode` | 股票代码 | `302132` |
| `stockName` | 股票名称 | `中航成飞` |
| `reportPeriodEnd` | 截止日期 | `2020-12-31 00:00:00` |
| `publishDate` | 发布时间 | `2021-03-17 00:00:00` |
| `epsBasic` | 每股收益(摊薄) | `0.45` |
| `tRevPS` | 每股业务收入 | `2.9791` |
| `cfps` | 每股经营现金流净额 | `0.3655` |
| `fcfToEquityPs` | 每股股东自由现金流 | `0.0728` |

### 接口示例

```bash
# Body JSON 可选参数: stockCode, stockCodes, beginDate, endDate, pageNum, pageSize
node scripts/gs-api.js stock/per-share-indicators --method POST --body-json '{"stockCode":"002594","stockCodes":["000001","600519"],"beginDate":"2020-01-01"}'
```

### `stock/repurchase-plans`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js stock/repurchase-plans --method POST --body-json '{"stockCode":"600519","beginDate":"2023-01-01","endDate":"2026-06-09","pageNum":1,"pageSize":50}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 9 \| `stock/repurchase-plans` \| `list_stock_repurchase_plans` \| 股份回购金额、数量、进展，回购收益率辅助 \| `references/估值辅助/估值辅助数据.md` \| |
| \| 查回购收益率 \| `stock/repurchase-plans` \| `stock-quote/core` \| 回购金额、回购股数、进展、回购金额/市值 \| |

#### finance-data 参考文档摘录

## 股份回购

接口路径：`stock/repurchase-plans`
请求方式：**`POST`**
tool_id：`list_stock_repurchase_plans`

接口说明：通过股票名称或回购计划首次公告日期范围，查询沪深京A股和B股公司的股份回购计划及调整信息，包括股票代码、名称、计划公告日期、股东大会日期、回购类型、计划与实际回购金额/股数/价格区间、回购进度、起止日期等核心数据，用于分析公司回购行为和市场动态。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `stockCode` | — | string | 股票代码【与stockCodes组成多选一参数，必须且只能传递其中一个】 | `002594` |
| `stockCodes` | — | array | 股票代码列表【与stockCode组成多选一参数，必须且只能传递其中一个】 | `['000001', '600519']` |
| `beginDate` | — | string | 开始日期（格式yyyy-MM-dd）。 最小值:2020-01-01; | `2020-01-01` |
| `endDate` | — | string | 结束日期（格式yyyy-MM-dd） | `2025-01-01` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `stockCode` | 股票代码 | `600519` |
| `stockName` | 股票名称 | `贵州茅台` |
| `planAnnounceDate` | 预案日期 | `2022-03-01 00:00:00` |
| `shareholderMeetingDate` | 股东大会日期 | `2024-06-15` |
| `buybackProgress` | 回购进展 | `实施完成` |
| `buybackType` | 回购类别 | `集中竞价` |
| `buybackAmountPlanUpper` | 回购金额上限(元) | `50000000` |
| `buybackAmountPlanLower` | 回购金额下限(元) | `100000000` |
| `buybackAmountActual` | 回购实施后金额 | `59994911.92` |
| `buybackSharesPlanUpper` | 回购数量上限(股) | `833300` |
| `buybackSharesPlanLower` | 回购数量下限(股) | `1666700` |
| `buybackSharesActual` | 回购实施后数量(股) | `1451685` |
| `buybackPriceUpper` | 回购价格上限(元) | `123.45` |
| `buybackPriceLower` | 回购价格下限(元) | `60` |
| `buybackStartDate` | 回购开始日 | `2022-02-28 00:00:00` |
| `buybackEndDate` | 回购到期日 | `2023-02-28 00:00:00` |

### 接口示例

```bash
# Body JSON 可选参数: stockCode, stockCodes, beginDate, endDate, pageNum, pageSize
node scripts/gs-api.js stock/repurchase-plans --method POST --body-json '{"stockCode":"002594","stockCodes":["000001","600519"],"beginDate":"2020-01-01"}'
```

### `stock/val-indicators`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js stock/val-indicators --method POST --body-json '{"stockCode":"600519","pageSize":1}'
```
```bash
node scripts/gs-api.js stock/val-indicators --method POST --body-json '{"stockCode":"002594","pageNum":1,"pageSize":20}'
```
```bash
node scripts/gs-api.js stock/val-indicators --method POST --body-json '{"stockCode":"002594","beginDate":"2025-01-01","endDate":"2025-01-31","pageNum":1,"pageSize":100}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 1 \| `stock/val-indicators` \| `get_stock_val_indicators` \| A 股交易日核心 PE/PB/PS、市值、自由流通换手率 \| `references/个股估值/A股核心估值指标.md` \| |
| \| `a_share_core` \| A 股当前核心估值 \| 股票代码或可解析名称 \| 可 `Spawn valuation_data_executor to query valuation data`；无 subagent 时当前模型执行 \| `stock/val-indicators`，必要时补实时行情 \| PE/PB/PS、市值、日期 \| |
| \| `a_share_history` \| A 股历史估值样本和分位 \| 股票代码 + 时间范围 \| 可 `Spawn valuation_data_executor to query valuation data`；无 subagent 时当前模型执行 \| `stock/val-indicators` 历史区间 \| PE/PB/PS 历史序列、样本窗口和可计算分位 \| |
| \| 查 A 股当前核心估值 \| `stock/val-indicators` \| `stock-quote/core` \| PE、扣非 PE、PB、PS、总市值、流通市值、日期 \| |
| \| 查 A 股历史估值 \| `stock/val-indicators` \| `stock-quote/core` \| 历史交易日估值序列、样本窗口和可计算分位 \| |
| \| 查 PEG 所需基础数据 \| `stock/val-indicators` \| `stock/financial-indicators-growth` + 研报预测评级标准输出 \| 当前 PE/PB/PS、历史成长辅助；PEG 分母必须来自上层研报预测样本或用户显式假设 \| |
| \| 核心估值 \| PE \| `15.73x` \| `stock/val-indicators`, 最近交易日 \| |
| \| 核心估值 \| 扣非 PE \| `15.73x` \| `stock/val-indicators` \| |

#### finance-data 参考文档摘录

## 股票估值指标

接口路径：`stock/val-indicators`
请求方式：**`POST`**
tool_id：`get_stock_val_indicators`

接口说明：通过输入股票代码（单个或批量）和可选的日期范围（格式为 yyyy-MM-dd），查询指定沪深京股票在特定交易日的估值指标，包括股票名称、交易日期、总市值、流通市值、自由流通换手率、市盈率（TTM、扣非）、市净率、市销率等核心估值数据，用于股票估值分析和投资决策。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `stockCode` | — | string | 股票代码【与stockCodes组成多选一参数，必须且只能传递其中一个】 | `002594` |
| `stockCodes` | — | array | 股票代码列表【与stockCode组成多选一参数，必须且只能传递其中一个】 | `['000001', '600519']` |
| `beginDate` | — | string | 开始日期（格式yyyy-MM-dd）。 最小值:2020-01-01; | `2020-01-01` |
| `endDate` | — | string | 结束日期（格式yyyy-MM-dd） | `2025-01-01` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `date` | 交易日期 | `2023-10-26` |
| `stockCode` | 股票代码 | `000001` |
| `stockName` | 股票名称 | `贵州茅台` |
| `marketCap` | 总市值（元） | `1234567890.12` |
| `marketCapFloat` | 流通市值（元） | `1234567890.5` |
| `turnoverFree` | 自由流通换手率 | `0.045` |
| `pe` | 市盈率 | `15.73` |
| `peDeducted` | 市盈率扣非 | `15.73` |
| `pb` | 市净率 | `1.85` |
| `ps` | 市销率 | `3.75` |

### 接口示例

```bash
# Body JSON 可选参数: stockCode, stockCodes, beginDate, endDate, pageNum, pageSize
node scripts/gs-api.js stock/val-indicators --method POST --body-json '{"stockCode":"002594","stockCodes":["000001","600519"],"beginDate":"2020-01-01"}'
```

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
