# 财务与盈利 / 行业盈利指标

---

## 行业景气度

接口路径：`industry/prosperity-index`  
请求方式：`GET`  
tool_id：`list_industry_prosperity_index`

接口说明：通过行业代码查询行业景气度数据，返回 ROE(TTM)、毛利率(TTM)、净利率(TTM) 及最近一季度收入、利润相关环比变化和标签，适用于行业盈利指标查询。

**输入参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `industryCode` | ✅ | string | 行业代码 | `740000` |
| `beginDate` | — | string | 开始日期，格式 `yyyy-MM-dd` | `2025-01-01` |
| `endDate` | — | string | 结束日期，格式 `yyyy-MM-dd` | `2025-01-01` |
| `pageNum` | — | integer | 页码 | `1` |
| `pageSize` | — | integer | 页长 | `10` |

**输出参数**

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `industryCode` | 行业代码 | — |
| `industryName` | 行业名称 | — |
| `reportYear` | 报告年度 | — |
| `reportPeriod` | 报告时段 | — |
| `roeTtmQoqGrowth` | ROE(TTM)环比增速 | — |
| `roeTtmQoqGrowthLabel` | ROE(TTM)环比增速标签 | — |
| `grossMarginTTMMoMGrowth` | 毛利率(TTM)环比增速 | — |
| `grossMarginTTMMoMGrowthLabel` | 毛利率(TTM)环比增速标签 | — |
| `ttmNetProfitMarginQoq` | 净利率(TTM)环比增速 | — |
| `ttmNetProfitMarginQoqLabel` | 净利率(TTM)环比增速标签 | — |
| `latestQtrNetProfitYoyQoq` | 最近一季度归母净利润同比增速的环比增速 | — |
| `latestQtrNetProfitYoyQoqLabel` | 最近一季度归母净利润同比增速的环比增速标签 | — |
| `latestQtrOpIncomeYoyQoq` | 最近一季度营业总收入同比增速的环比增速 | — |
| `latestQtrOpIncomeYoyQoqLabel` | 最近一季度营业总收入同比增速的环比增速标签 | — |
| `latestQtrAdjNetProfitYoyMom` | 最近一季度扣非净利润同比增速的环比增速 | — |
| `latestQtrAdjNetProfitYoyMomLabel` | 最近一季度扣非净利润同比增速的环比增速标签 | — |
| `totalTag` | 综合标签 | — |

**`totalTag` 输出口径**

- `totalTag` 必须带解释映射；若接口文档没有提供映射，只输出为“接口原始值，当前未定义数值含义映射”。
- 不得在缺少映射时，仅凭 `totalTag=5` 判断“高景气”“景气较高”或“景气标签偏积极”。
- 行业盈利或景气判断必须优先由营收增速、净利润增速、ROE(TTM)环比、毛利率(TTM)环比、净利率(TTM)环比及其标签支撑。

**接口示例**

```bash
node scripts/gs-api.js industry/prosperity-index industryCode=740000
```
