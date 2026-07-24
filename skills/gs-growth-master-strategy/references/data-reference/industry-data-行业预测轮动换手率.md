# 预测与活跃度 / 行业预测轮动换手率

---

## 行业预测

接口路径：`industry/forecasts`  
请求方式：`GET`  
tool_id：`list_industry_forecasts`

接口说明：通过行业代码获取行业预测数据，包括当前及未来几年的净利润增长率、业务收入增长率、市场排名，以及历史净利润和业务收入增长数据。

**核心字段**

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `industryCode` | 行业代码 | `640000` |
| `industryName` | 行业名称 | `能源` |
| `TYear` | T年 | `2024` |
| `future12MonthsNetProfitGrowthRate` | 未来12个月净利润增长率(%) | `17.3` |
| `future12MonthsNetProfitGrowthRateMarketRank` | 未来12个月净利润增长率市场排名 | `20` |
| `growthRateNext12Months` | 未来12个月业务收入增长率(%) | `24.1` |
| `tPlus1YNetProfitGrowthRate` | T+1年净利润增长率(%) | `18.2` |
| `tPlus1YBusinessIncomeGrowthRatePct` | T+1年业务收入增长率(%) | `25.8` |

**接口示例**

```bash
node scripts/gs-api.js industry/forecasts industryCode=640000
```

## 行业轮动因子

接口路径：`industry/rotation`  
请求方式：`GET`  
tool_id：`list_industry_rotation`

接口说明：通过行业代码和日期范围查询行业轮动因子，包括市场情绪温度和高低价风格相关性动量。

**核心字段**

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `industryCode` | 行业代码 | `801010` |
| `industryName` | 行业名称 | `申万农林牧渔` |
| `date` | 发布日期 | `2000-01-17 00:00:00` |
| `marketSentiment` | 市场温度计温度 | `0.93333333` |
| `hlStyleCorrXMomentum` | 高低价风格相关性X动量 | `0.85` |

**接口示例**

```bash
node scripts/gs-api.js industry/rotation industryCode=801010 beginDate=2025-01-01
```

## 行业换手率

接口路径：`industry/turnover-rates`  
请求方式：**`POST`**  
tool_id：`list_idu_turnover_rates`

接口说明：通过行业代码和日期范围查询行业历史换手率，返回行业换手率及近一年换手率百分位，用于判断行业活跃度。

**核心字段**

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `industryCode` | 行业代码 | `640000` |
| `industryName` | 行业名称 | `能源` |
| `date` | 发布日期 | `1993-12-29 00:00:00` |
| `turnover` | 换手率(%) | `0.2489` |
| `turnoverAvg10d` | 近一年换手率百分位 | `0.1` |

**接口示例**

```bash
node scripts/gs-api.js industry/turnover-rates --method POST industryCode=640000
```

**输出边界**

- 预测数据是市场预期或模型预测口径，不等同于确定性未来结果。
- 轮动和换手率用于描述市场活跃度和风格变化，不直接推出买卖建议。
