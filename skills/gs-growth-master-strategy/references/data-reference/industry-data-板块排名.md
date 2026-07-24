# 行情与排名 / 板块行情汇总

---

## 市场行情汇总

接口路径：`market/quote-summaries`
请求方式：**`POST`**
tool_id：`get_market_quote_summaries`

接口说明：按行业代码、细分行业代码或概念代码批量获取行情汇总。适用于已知板块代码集合的行情对比和强弱观察；当前 API 不提供旧版全市场自动排序参数，不能继续使用 `sortColumn`、`order`、`industryLevel` 或空数组代表全市场排行。

**输入参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|---|:---:|---|---|---|
| `industryCodes` | — | array | 行业代码列表 | `["640000"]` |
| `industrySubCodes` | — | array | 细分行业代码列表 | `["641500"]` |
| `conceptCodes` | — | array | 概念代码列表 | `["CLS81936"]` |

**使用说明**

- 至少提供一个非空代码列表。
- 若用户要求“全市场板块排名”，应先通过 `industries` 或业务侧候选范围确认代码集合，再调用本接口做汇总对比。
- 排名只能基于本次返回的候选集合计算，不得写成全市场排名。

**接口示例**

```bash
node scripts/gs-api.js market/quote-summaries --method POST --body-json '{"industryCodes":["640000"],"industrySubCodes":[],"conceptCodes":[]}'
```
