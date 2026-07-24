# 估值辅助 / 估值辅助数据

---

## 沪深京核心实时行情

接口路径：`stock-quote/core`  
请求方式：**`POST`**  
tool_id：`get_stock_quote_core`

接口说明：按股票代码列表获取沪深京股票核心实时行情。适用于估值查询中的最新价格、市值、换手率和行情口径辅助。

**关键字段**

| 字段名 | 说明 |
|--------|------|
| `currentPrice` | 当前价格 |
| `dataTime` / `sysTime` | 数据时间和系统时间 |
| `circulationValue` | 流通市值 |
| `totalValue` | 总市值 |
| `turnOverRate` | 换手率 |
| `industryCode` / `industryName` | 所属行业 |
| `industryLV1Code` / `industryLV1Name` | 一级行业 |

**接口示例**

```bash
node scripts/gs-api.js stock-quote/core --method POST --body-json '{"codes":["002594"]}'
```

---

## 公司分红派息信息

接口路径：`stock/dividends`  
请求方式：**`POST`**  
tool_id：`list_stocks_dividends`

接口说明：通过股票代码和分红年度截止日期范围查询分红派息信息，包括每股派现、送股转增比例、除权除息日、股权登记日、派现日和分红股本基数。适用于股息率、派现稳定性、慢增长公司估值辅助。

**关键字段**

| 字段名 | 说明 |
|--------|------|
| `fiscalYearEnd` | 分红年度截止日 |
| `cashDividendPerShare` | 每股税前派现 |
| `cashDividendPerShareAfterTax` | 每股税后派现 |
| `stockDividendRatio` | 每股送股比例 |
| `stockTransferRatio` | 每股转增股比例 |
| `recordDate` / `exDate` / `cashPayDate` | 股权登记日、除权除息日、派现日 |
| `baseShares` | 分红股本基数 |

**接口示例**

```bash
node scripts/gs-api.js stock/dividends --method POST --body-json '{"stockCode":"600519","beginDate":"2023-01-01","endDate":"2026-06-09","pageNum":1,"pageSize":50}'
```

---

## 股份回购

接口路径：`stock/repurchase-plans`  
请求方式：**`POST`**  
tool_id：`list_stock_repurchase_plans`

接口说明：查询股份回购计划及调整信息，包括回购类型、计划与实际回购金额、回购股数、价格区间、回购进展和起止日期。适用于估算回购收益率、判断股东回报和每股价值摊薄/增厚线索。

**关键字段**

| 字段名 | 说明 |
|--------|------|
| `buybackProgress` | 回购进展 |
| `buybackType` | 回购类别 |
| `buybackAmountPlanUpper` / `buybackAmountPlanLower` | 回购金额计划上下限 |
| `buybackAmountActual` | 实际回购金额 |
| `buybackSharesPlanUpper` / `buybackSharesPlanLower` | 回购数量计划上下限 |
| `buybackSharesActual` | 实际回购数量 |
| `buybackPriceUpper` / `buybackPriceLower` | 回购价格上下限 |
| `buybackStartDate` / `buybackEndDate` | 回购开始日和到期日 |

**接口示例**

```bash
node scripts/gs-api.js stock/repurchase-plans --method POST --body-json '{"stockCode":"600519","beginDate":"2023-01-01","endDate":"2026-06-09","pageNum":1,"pageSize":50}'
```

---

## 现金流表与自由现金流辅助

接口路径：`stock/cash-flows`、`stock/cash-flows-ttm`  
请求方式：**`POST`**  
tool_id：`list_stock_cash_flows`、`list_stock_cash_flows_ttm`

接口说明：查询现金流量表当期或 TTM 数据，适用于经营现金流、市现率、自由现金流收益率和现金流质量辅助。

**关键字段**

| 字段名 | 说明 |
|--------|------|
| `cfo` | 经营活动产生的现金流量净额 |
| `cashInflowOperating` / `cashOutflowOperating` | 经营活动现金流入/流出小计 |
| `cfi` | 投资活动产生的现金流量净额 |
| `cashInflowInvesting` | 投资活动现金流入小计 |

**接口示例**

```bash
node scripts/gs-api.js stock/cash-flows --method POST --body-json '{"stockCode":"600519","beginDate":"2025-01-01","endDate":"2026-06-09","pageNum":1,"pageSize":20}'
node scripts/gs-api.js stock/cash-flows-ttm --method POST --body-json '{"stockCode":"600519","beginDate":"2025-01-01","endDate":"2026-06-09","pageNum":1,"pageSize":20}'
```

---

## 每股财务与现金回收指标

接口路径：`stock/per-share-indicators`、`stock/financial-indicators-cash-col`  
请求方式：**`POST`**  
tool_id：`list_per_share_indicators`、`list_fin_ind_cash_collect`

接口说明：查询每股经营现金流、每股股东自由现金流、经营现金流营收占比、经营现金流与归母净利润比率等指标。适用于解释 P/OCF、P/FCF、现金流支撑和盈利质量。

**关键字段**

| 字段名 | 说明 |
|--------|------|
| `cfoPs` / `cfps` | 每股经营现金流净额 |
| `fcfToEquityPs` | 每股股东自由现金流 |
| `netOperatingCashFlow` | 经营活动产生的现金流量净额 |
| `cashReceivedSalesToRevenuePct` | 销售收现营收占比 |
| `cfoToOperatingRevenuePct` | 经营现金流营收占比 |
| `operatingCashToParentProfit` | 经营现金流/归母净利润 |
| `operatingCashToOperatingProfit` | 经营现金流/营业利润 |

**接口示例**

```bash
node scripts/gs-api.js stock/per-share-indicators --method POST --body-json '{"stockCode":"600519","beginDate":"2025-01-01","endDate":"2026-06-09","pageNum":1,"pageSize":20}'
node scripts/gs-api.js stock/financial-indicators-cash-col --method POST --body-json '{"stockCode":"600519","beginDate":"2025-01-01","endDate":"2026-06-09","pageNum":1,"pageSize":20}'
```

---

## 财务成长能力指标

接口路径：`stock/financial-indicators-growth`  
请求方式：`GET` 或 **`POST`**  
tool_id：`get_stock_fin_ind_growth`、`list_stock_fin_ind_growth`

接口说明：查询沪深京股票的财务成长能力指标，包括营业收入、净利润、每股收益、总资产、经常性净利润、营业利润、经营活动现金流量净额、净资产等一年的平均增长率，以及营业收入和净利润同比增长率。适用于 PEG 和安全边际分析中的成长质量验证、低基数识别和估值溢价解释。

**关键字段**

| 字段名 | 说明 |
|--------|------|
| `publishDate` | 披露日期 |
| `reportPeriodEnd` | 报告期截止日 |
| `revenueYoy` | 营业收入同比增长率 |
| `netProfitYoy` | 净利润同比增长率 |
| `revGrowth1y` | 业务收入 1 年平均增长率 |
| `npGrowth1y` | 净利润 1 年平均增长率 |
| `epsGrowth1y` | 每股收益 1 年平均增长率 |
| `npRecurringGrowth1y` | 经常性业务产生的净利润 1 年平均增长率 |
| `opProfitGrowth1y` | 营业利润 1 年平均增长率 |
| `cfoGrowth1y` | 经营活动现金流量净额 1 年平均增长率 |
| `equityGrowth1y` | 净资产 1 年平均增长率 |

**接口示例**

```bash
node scripts/gs-api.js stock/financial-indicators-growth stockCode=600519 beginDate=2025-01-01 endDate=2026-06-09 pageNum=1 pageSize=20
node scripts/gs-api.js stock/financial-indicators-growth --method POST --body-json '{"stockCode":"600519","beginDate":"2025-01-01","endDate":"2026-06-09","pageNum":1,"pageSize":20}'
```

**口径说明**

- 该接口是报告期历史成长能力指标，不提供未来盈利预测。
- PEG 分母需要有效的未来 1-3 年盈利预测；本 skill 不主动获取该数据，历史成长能力只能用于解释成长质量和低基数风险，不能直接替代未来 CAGR。
- `npGrowth1y`、`epsGrowth1y`、`cfoGrowth1y` 同向改善时，可说明成长与现金流质量更一致；若利润高增但 `cfoGrowth1y` 弱，应降低成长估值结论强度。

---

## 国债收益率与无风险利率辅助

接口路径：`economic/gover-bond-yield`  
请求方式：**`POST`**  
tool_id：`list_gover_bond_yield`

接口说明：查询中国国债收益率曲线，包含 3 个月、6 个月、2 年、10 年和 30 年期限。适用于安全边际估值、DCF、贴现率和市场利率环境的辅助输入。

**关键字段**

| 字段名 | 说明 |
|--------|------|
| `date` | 发布日期 |
| `bnd3m` | 3 个月国债收益率，单位 `%` |
| `bnd6m` | 6 个月国债收益率，单位 `%` |
| `bnd2y` | 2 年期国债收益率，单位 `%` |
| `bnd10y` | 10 年期国债收益率，单位 `%` |
| `bnd30y` | 30 年期国债收益率，单位 `%` |

**接口示例**

```bash
node scripts/gs-api.js economic/gover-bond-yield --method POST --body-json '{"beginDate":"2026-06-01","endDate":"2026-06-10","pageNum":1,"pageSize":20}'
```

**口径说明**

- 股息率可由最新每股派现 / 当前股价估算，也可优先使用指数估值接口已有股息率字段；必须标注计算口径。
- 回购收益率通常用近 12 个月实际回购金额 / 当前总市值估算；若回购尚未实施完成，应标注计划口径。
- 自由现金流收益率若使用 `fcfToEquityPs / currentPrice`，应写明是每股股东自由现金流口径；若使用现金流表自行估算，必须说明资本开支口径是否可得。
- DCF 中的无风险利率可优先使用 `bnd10y` 或按分析期限选择 `bnd30y`；但股权风险溢价、Beta、永续增长率和分阶段增长假设仍属于估值模型假设，不是接口直接给出的公司事实。
- 成长能力指标可辅助判断估值溢价是否有基本面支撑，但历史成长不能直接替代未来预测。
- 这些接口只作为估值辅助，不应覆盖核心 PE/PB/PS/PEG 倍数结论。

