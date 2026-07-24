# 行业估值 / 行业估值数据

---

## 行业行情统计

接口路径：`industry/market-stats`  
请求方式：**`POST`**  
tool_id：`get_industry_market_stats`

接口说明：通过行业代码查询行业行情统计数据，返回多个时间维度的涨跌幅、PE/PB/PS 近五年历史百分位，以及主力资金净流入数据，适用于行业估值位置、阶段表现和资金流向查询。

**输入参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `industryCode` | ✅ | string | 行业代码 | `640000` |

**输出参数**

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `industryCode` | 行业代码 | `64000` |
| `industryName` | 行业名称 | `机械设备` |
| `return1d` | 近一日涨跌幅(%) | `10.0` |
| `return1w` | 近一周涨跌幅(%) | `10.0` |
| `return1m` | 近一月涨跌幅(%) | `10.0` |
| `return3m` | 近三月涨跌幅(%) | `10.0` |
| `return6m` | 近半年涨跌幅(%) | `10.0` |
| `return1y` | 近一年涨跌幅(%) | `10.0` |
| `return3y` | 近三年涨跌幅(%) | `10.0` |
| `return5y` | 近五年涨跌幅(%) | `10.0` |
| `returnYtd` | 今年以来涨跌幅(%) | `10.0` |
| `pbPct5y` | PB近五年历史百分位 | `0.9983` |
| `pePct5y` | PE近五年历史百分位 | `0.9942` |
| `psPct5y` | PS近五年历史百分位 | `0.9975` |
| `netMainInflow1dMn` | 近1日主力净流(万元) | `1243416.7117` |
| `netMainInflow3dMn` | 近3日主力净流(万元) | `1439349.7327` |
| `netMainInflow5dMn` | 近5日主力净流(万元) | `2745604.8824` |
| `netMainInflow10dMn` | 近10日主力净流(万元) | `3698071.1197` |
| `netMainInflow20dMn` | 近20日主力净流(万元) | `3698071.1197` |

**使用说明**

- 本接口更适合输出 `PS` 五年分位、阶段涨跌幅和主力资金净流。
- 若用户要求“当前 PE 绝对倍数”或“当前 PB 绝对倍数”，应先通过 `industries` 获取 `indexCode`，再使用 `index/valuation` 补充绝对估值。
- 若与 `index/valuation` 组合输出，需明确区分：
  - `index/valuation`：当前 `PE/PB` 绝对值、`PE/PB` 五年分位
  - `industry/market-stats`：`PS` 五年分位、阶段涨跌幅、主力资金净流

**接口示例**

```bash
node scripts/gs-api.js industry/market-stats --method POST industryCode=640000
```
