# 景气与结构 / 行业竞争结构快照

---

## 个股财务指标申万行业排名

接口路径：`stock/fin-ind-sw-rnk-q`
请求方式：`GET` 或 **`POST`**
tool_id：`list_stock_fin_ind_sw_rank_q`

接口说明：按股票代码或行业代码查询申万行业内公司财务指标排名。适用于头部企业排序、收入/利润排名线索和竞争结构辅助判断；当前 API 不提供旧版行业成分股实时行情明细，不能据此计算成分股市值 CR3/CR5。

**输入参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|---|:---:|---|---|---|
| `stockCode` / `stockCodes` | — | string / array | 股票代码或股票代码列表 | `600519` |
| `industryCode` | — | string | 申万行业代码 | `640000` |
| `beginDate` / `endDate` | — | string | 日期范围 | `2025-01-01` |
| `pageNum` / `pageSize` | — | integer | 分页参数 | `1` / `20` |

**使用建议**

- 若接口只返回排名而不返回收入、利润绝对值，只能作为头部企业排序线索。
- 不得直接计算全行业收入 CR、利润 CR、亏损公司收入占比或市值集中度。
- 竞争方式仍必须围绕价格、品牌、渠道、技术、政策准入等业务证据展开。

**接口示例**

```bash
node scripts/gs-api.js stock/fin-ind-sw-rnk-q --method POST --body-json '{"industryCode":"640000","pageNum":1,"pageSize":20}'
```
