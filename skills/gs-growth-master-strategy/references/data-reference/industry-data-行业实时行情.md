# 行情与排名 / 行业行情汇总

---

## 市场行情汇总

接口路径：`market/quote-summaries`
请求方式：**`POST`**
tool_id：`get_market_quote_summaries`

接口说明：输入行业代码、细分行业代码或概念代码列表，获取对应板块的行情汇总信息。适用于行业行情快照、涨跌幅、成交和热度辅助；不提供旧版行业实时行情接口的成分股明细。

**输入参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|---|:---:|---|---|---|
| `industryCodes` | — | array | 行业代码列表 | `["640000"]` |
| `industrySubCodes` | — | array | 细分行业代码列表 | `["641500"]` |
| `conceptCodes` | — | array | 概念代码列表 | `[]` |

**使用说明**

- 至少提供一个非空代码列表。
- 仅作为行情快照和板块热度辅助，不替代 `index/valuation` 的行业指数估值日期，也不替代 `industry/market-stats` 的历史涨跌幅和估值分位。

**接口示例**

```bash
node scripts/gs-api.js market/quote-summaries --method POST --body-json '{"industryCodes":["640000"],"industrySubCodes":[],"conceptCodes":[]}'
```
