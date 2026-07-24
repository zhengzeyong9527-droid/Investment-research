# 指数与行业估值 / 指数行业估值数据

---

## 指数估值信息

接口路径：`index/valuation`  
请求方式：`GET`  
tool_id：`get_index_valuation`

接口说明：通过指数代码和可选时间范围查询指数估值信息，包括指数总市值、市盈率、市净率、近五年 PE/PB 百分位、换手率和股息率。适用于宽基指数、行业指数、行业平均 PE/PB 和行业估值背景查询。

**输入参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `indexCode` | ✅ | string | 指数代码 | `399300` |
| `beginDate` | — | string | 开始日期，格式 `yyyy-MM-dd` | `2026-06-01` |
| `endDate` | — | string | 结束日期，格式 `yyyy-MM-dd` | `2026-06-09` |
| `pageNum` | — | integer | 页码 | `1` |
| `pageSize` | — | integer | 页长，最大值 `500` | `20` |

**输出参数**

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `indexCode` | 指数代码 | `000300` |
| `indexName` | 指数简称 | `沪深300` |
| `progFullName` | 发布机构全称 | `中证指数有限公司` |
| `marketType` | 交易市场代码 | `S` |
| `date` | 行情时间 | `2025-11-06 00:00:00` |
| `indexMarketValue` | 指数总市值 | `122081713834.268` |
| `PE` | 市盈率 | `14.3326` |
| `PB` | 市净率 | `1.376` |
| `peRank5y` | 近五年 PE 百分位 | `0.8399` |
| `pbRank5y` | 近五年 PB 百分位 | `0.6399` |
| `turnoverRate` | 换手率 | `0.0068` |
| `divYield` | 股息率 | `0.0269` |

**接口示例**

```bash
node scripts/gs-api.js index/valuation indexCode=399300 pageNum=1 pageSize=20
```

---

## 行业列表与行业指数解析

接口路径：`industries`  
请求方式：`GET`  
tool_id：`list_industries`

接口说明：通过行业代码、行业名称或分页条件查询行业列表，返回行业代码、行业名称、行业体系、行业层级和关联行业指数代码。涉及行业当前 PE/PB 或行业 PEG 时，必须先用该接口把行业代码解析为行业指数代码，再调用 `index/valuation`。个股行业 PEG 场景必须优先使用上游返回的稳定对比行业精确查询，并固定解析到同体系二级行业；行业名称模糊查询只在没有行业代码时使用。

**关键输出字段**

| 字段名 | 说明 |
|--------|------|
| `industryCode` / `industryName` | 行业代码和行业名称 |
| `indexCode` | 行业指数代码，用于查询行业指数估值 |
| `industryType` / `industryLevel` | 行业体系和层级 |

**接口示例**

```bash
node scripts/gs-api.js industries industryCode=630000 pageNum=1 pageSize=5
```

---

## 行业预测

接口路径：`industry/forecasts`  
请求方式：`GET`  
tool_id：`get_industry_forecasts`

接口说明：通过行业代码查询行业未来营收、净利润、EPS 等预测增速。适用于行业 PEG 的增长率分母，也可作为个股 PEG 行业对照的预测背景。

**关键输出字段**

| 字段名 | 说明 |
|--------|------|
| `industryCode` / `industryName` | 行业代码和行业名称 |
| `future12MonthsNetProfitGrowthRatePct` | 未来 12 个月净利润预测增速百分数；不得单独作为行业情景 PEG 分母 |
| `tYearNetProfitGrowthRatePct` | 当年净利润预测增速百分数；不得单独作为行业情景 PEG 分母 |
| `tPlus1YNetProfitGrowthRatePct` / `tPlus2YNetProfitGrowthRatePct` / `tPlus3YNetProfitGrowthRatePct` | 后续年度净利润预测增速；三年字段同时可得时，可用几何复合计算行业基准增速 |
| `t3yNetIncomeGrowthRatePct` | 三年净利润预测增速或复合增速口径；单独使用前必须确认其为未来三年复合预测口径且不存在明显口径冲突 |
| `future12MonthsEpsGrowthRatePct` / `t3yEpsGrowthRatePct` | EPS 预测增速辅助口径 |

**接口示例**

```bash
node scripts/gs-api.js industry/forecasts industryCode=630000
```

---

## 行业行情统计

接口路径：`industry/market-stats`  
请求方式：**`POST`**  
tool_id：`get_industry_market_stats`

接口说明：通过行业代码查询行业行情统计数据，包含近一日至近五年的阶段涨跌幅、主力资金净流入，以及 PE/PB/PS 近五年历史百分位。适用于行业估值位置、PS 分位、阶段表现和资金流向辅助。

**输入参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `industryCode` | ✅ | string | 行业代码 | `640000` |

**关键输出字段**

| 字段名 | 说明 |
|--------|------|
| `industryCode` / `industryName` | 行业代码和名称 |
| `return1d` / `return1w` / `return1m` / `return3m` / `return6m` / `return1y` / `return3y` / `return5y` / `returnYtd` | 不同时间维度涨跌幅 |
| `pbPct5y` | PB 近五年历史百分位 |
| `pePct5y` | PE 近五年历史百分位 |
| `psPct5y` | PS 近五年历史百分位 |
| `netMainInflow1dMn` / `3dMn` / `5dMn` / `10dMn` / `20dMn` | 主力净流入，单位万元 |

**接口示例**

```bash
node scripts/gs-api.js industry/market-stats --method POST --body-json '{"industryCode":"640000"}'
```

---

## 板块行情汇总

接口路径：`market/quote-summaries`  
请求方式：**`POST`**  
tool_id：`get_market_quote_summaries`

接口说明：按行业代码、细分行业代码或概念代码列表获取板块行情汇总。适用于补充行业或主题热度、阶段观察和板块对比，但不是行业 PE/PB/PS 的主接口，也不返回旧版成分股实时行情明细。

**关键输出字段**

| 字段名 | 说明 |
|--------|------|
| `industryCodes` | 行业代码列表 |
| `industrySubCodes` | 细分行业代码列表 |
| `conceptCodes` | 概念代码列表 |

**接口示例**

```bash
node scripts/gs-api.js market/quote-summaries --method POST --body-json '{"industryCodes":["640000"],"industrySubCodes":[],"conceptCodes":[]}'
```

---

## 概念板块行情汇总

接口路径：`market/quote-summaries`  
请求方式：**`POST`**  
tool_id：`get_market_quote_summaries`

接口说明：按概念代码获取概念板块行情汇总。适用于主题或概念板块热度辅助，不能替代行业估值百分位。

**接口示例**

```bash
node scripts/gs-api.js market/quote-summaries --method POST --body-json '{"industryCodes":[],"industrySubCodes":[],"conceptCodes":["CLS81936"]}'
```

**口径说明**

- 行业估值查询优先顺序：先用稳定对比行业精确调用 `industries` 解析行业代码、行业名称、行业层级和 `indexCode`，再用 `index/valuation` 取当前 PE/PB、股息率和 PE/PB 五年分位，最后用 `industry/market-stats` 补 PS 五年分位、阶段涨跌幅和资金流。
- 行业 PEG 查询固定二级行业优先：稳定对比行业若为二级行业则直接使用；若为三级或更细行业，先解析到同体系二级行业；只有二级行业无法形成有效行业基准 PEG 时才回退同体系一级行业。
- `industry/market-stats` 的 `pePct5y/pbPct5y/psPct5y` 是分位，不是当前 PE/PB/PS 倍数。
- 行业实时行情中的 `totalValue` 可作总市值背景，但不能由此反推出行业 PE/PB/PS。
- 概念板块通常不是稳定行业分类，输出时必须标注概念体系和概念代码来源。

**行业 PEG 原料链路**

1. 个股所属行业或行业输入先落到稳定行业代码。个股场景优先使用估值数据、财务评分或行业归属标准输出中的稳定对比行业；不得优先用行业名称模糊搜索。
2. 用 `industries` 精确解析行业名称、行业体系、行业层级和行业指数代码；行业代码不是行业指数代码。
3. 若稳定对比行业为二级行业，直接使用该二级行业；若为三级或更细行业，解析到同体系二级行业；若只取得一级行业，先作为一级回退候选，不得覆盖可用二级行业。
4. 用二级行业的行业指数代码调用 `index/valuation`，取行业指数 PE 作为行业平均 PE，同时保留 PB、股息率和估值日期。PE/PB/PS 五年分位不得替代当前 PE。
5. 用同一二级行业代码调用 `industry/forecasts` 或消费上游行业数据标准输出取得行业自身基准预测增速。行业基准增速优先使用未来 1-3 年净利润预测的同口径复合增速；若 T+1、T+2、T+3 年度净利润预测增速同时可得，则用几何复合计算。不同期限字段不得分别拼成行业侧三档情景。
6. 若二级行业无法解析、二级行业指数估值无 PE，或二级行业无有效基准预测增速，才允许回退同体系一级行业；回退后行业指数 PE 和行业基准预测增速必须同时使用一级行业口径，并在标准输出中标记“一级回退口径”。
7. 行业基准 PEG = 行业指数 PE / 行业基准预测净利润增速百分数。基准增速为负、接近零、缺失或口径冲突时不计算，写“暂无足够数据”。只有底层明确返回同一预测期限下的高 / 中 / 低预测情景，才允许额外计算行业侧三档 PEG。
8. `industry/market-stats` 只能补行业估值分位和 PS 分位，不能替代行业当前 PE，也不能单独支撑行业 PEG。

示例：电力设备行业作为一级回退口径时，可用行业代码 `630000` 解析到行业指数代码 `801730`，再用 `801730` 查询行业指数 PE；行业基准 PEG 分母必须来自同一 `630000` 的行业基准预测增速。

个股示例：若某公司标准输出返回稳定对比行业为 `270200`，且该行业为二级行业“元件”，应先用 `270200` 解析到行业指数并取得二级行业 PE，再用同一 `270200` 取得行业基准预测增速；不得因为上级行业可用就默认切换。若二级行业 PE 为 `103.05`，T+1/T+2/T+3 年度净利润预测增速分别为 `39.75% / 28.26% / 21.13%`，则行业基准复合增速约 `29.49%`，行业基准 PEG 约 `3.49`。同一返回中的 `future12Months=30.14%`、`t3y=-7.48%`、`tYear=26.12%` 不得拼接为行业侧三档 PEG。

