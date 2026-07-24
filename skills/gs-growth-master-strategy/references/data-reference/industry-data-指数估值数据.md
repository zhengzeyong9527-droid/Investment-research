# 行业估值 / 指数估值数据

---

## 指数估值信息

接口路径：`index/valuation`  
请求方式：`GET`  
tool_id：`get_index_valuation`

接口说明：通过行业对应的指数代码查询指数估值信息，返回当前 `PE`、`PB`、近五年 `PE/PB` 分位、总市值、换手率和股息率等核心字段。适用于输出行业估值背景表，并与行业统计口径组合展示更直观的估值状态。

**输入参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `indexCode` | ✅ | string | 行业对应指数代码 | `801081` |
| `beginDate` | — | string | 开始日期，格式 `yyyy-MM-dd` | `2026-06-03` |
| `endDate` | — | string | 结束日期，格式 `yyyy-MM-dd` | `2026-06-03` |
| `pageNum` | — | integer | 页码 | `1` |
| `pageSize` | — | integer | 页长 | `10` |

**输出参数**

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `indexCode` | 指数代码 | `801081` |
| `indexName` | 指数名称 | `申万半导体` |
| `progFullName` | 发布机构全称 | `上海申银万国证券研究所有限公司` |
| `date` | 数据日期 | `2026-06-03 00:00:00` |
| `indexMarketValue` | 指数总市值 | `31104343984.3817` |
| `PE` | 当前市盈率 | `189.4434` |
| `PB` | 当前市净率 | `10.1037` |
| `peRank5y` | PE近五年历史百分位 | `0.9942` |
| `pbRank5y` | PB近五年历史百分位 | `0.9413` |
| `turnoverRate` | 换手率 | `0.0642` |
| `divYield` | 股息率 | `0.0013` |

**行业估值背景推荐输出**

| 展示指标 | 对应字段 | 输出说明 |
|----------|----------|----------|
| 总市值 | `indexMarketValue` | 建议按亿元或万亿元格式化展示，并标注为指数口径 |
| 市盈率 | `PE` | 当前 PE 绝对倍数 |
| 市净率 | `PB` | 当前 PB 绝对倍数 |
| 换手率 | `turnoverRate` | 建议转为百分比展示 |
| 股息率 | `divYield` | 建议转为百分比展示 |
| PE/PB 五年分位 | `peRank5y` / `pbRank5y` | 用于判断当前估值所处历史位置 |

**口径说明**

- 本接口用于输出行业“估值背景”，包括总市值、当前 `PE/PB` 绝对倍数、换手率、股息率和 `PE/PB` 五年分位。
- 使用前应先通过 `industries` 获取行业对应的 `indexCode`。
- 若与 `industry/market-stats` 组合输出，需要明确说明：
  - `总市值`、`当前PE/当前PB`、`换手率`、`股息率`、`PE/PB五年分位` 来自 `index/valuation`
  - `PS五年分位`、阶段涨跌幅、主力资金净流来自 `industry/market-stats`

**接口示例**

```bash
node scripts/gs-api.js index/valuation indexCode=801081
```
