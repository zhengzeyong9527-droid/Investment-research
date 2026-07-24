# 个股估值 / A股核心估值指标

---

## 股票估值指标

接口路径：`stock/val-indicators`  
请求方式：**`POST`**  
tool_id：`get_stock_val_indicators`

接口说明：通过单只或批量股票代码查询沪深京股票在特定交易日的核心估值指标，包括总市值、流通市值、自由流通换手率、市盈率、市盈率扣非、市净率和市销率。适用于个股当前估值、历史估值序列、同一日期多股票估值对比。

**输入参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `stockCode` | — | string | 股票代码；与 `stockCodes` 二选一且只能传一个 | `002594` |
| `stockCodes` | — | array | 股票代码列表；与 `stockCode` 二选一且只能传一个 | `["000001","600519"]` |
| `beginDate` | — | string | 开始日期，格式 `yyyy-MM-dd`；最小值 `2020-01-01` | `2025-01-01` |
| `endDate` | — | string | 结束日期，格式 `yyyy-MM-dd` | `2025-01-31` |
| `pageNum` | — | integer | 页码，最小值 `1` | `1` |
| `pageSize` | — | integer | 页长，最大值 `500` | `20` |

**输出参数**

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `date` | 交易日期 | `2023-10-26` |
| `stockCode` | 股票代码 | `000001` |
| `stockName` | 股票名称 | `贵州茅台` |
| `marketCap` | 总市值（元） | `1234567890.12` |
| `marketCapFloat` | 流通市值（元） | `1234567890.50` |
| `turnoverFree` | 自由流通换手率 | `0.045` |
| `pe` | 市盈率 | `15.73` |
| `peDeducted` | 扣非市盈率 | `15.73` |
| `pb` | 市净率 | `1.85` |
| `ps` | 市销率 | `3.75` |

**使用说明**

- 查询“当前估值”时，若用户未给日期，优先不传 `beginDate/endDate`，取最近可得交易日，并在输出中标注 `date`。
- 查询“历史估值区间”时，必须传 `beginDate/endDate`；如果要算分位，只能基于实际返回样本计算，并写明样本窗口。
- 批量对比时使用 `stockCodes`，不要循环多次单只调用，除非接口返回受限。
- `pe`、`peDeducted`、`pb`、`ps` 是交易日估值倍数，不等同于诊断接口的行业排名或历史排名。
- `marketCap` 和 `marketCapFloat` 以元为单位，用户侧通常换算成亿元或万亿元。

**接口示例**

```bash
node scripts/gs-api.js stock/val-indicators --method POST --body-json '{"stockCode":"002594","pageNum":1,"pageSize":20}'
node scripts/gs-api.js stock/val-indicators --method POST --body-json '{"stockCode":"002594","beginDate":"2025-01-01","endDate":"2025-01-31","pageNum":1,"pageSize":100}'
```
