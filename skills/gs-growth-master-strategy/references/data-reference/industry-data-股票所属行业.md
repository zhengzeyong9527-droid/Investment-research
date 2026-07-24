# 行业基础 / 股票所属行业

---

## 股票所属行业

接口路径：`stock/industries`  
请求方式：**`POST`**  
tool_id：`get_stock_industries`

接口说明：根据股票代码查询其所属申万行业分类信息，返回股票代码、股票名称以及一级、二级、三级行业代码和名称。适合在用户给出股票而非行业时，先反查行业口径。

**输入参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `stockCode` | — | string | 股票代码，与 `stockCodes` 二选一 | `000001` |
| `stockCodes` | — | array | 股票代码列表，与 `stockCode` 二选一 | `['000001', '600519']` |

**核心输出字段**

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `stockCode` | 股票代码 | `601012` |
| `stockName` | 股票名称 | `隆基绿能` |
| `industryCodeSwL1` | 申万一级行业代码 | `640000` |
| `industryNameSwL1` | 申万一级行业名称 | `电力设备` |
| `industryCodeSwL2` | 申万二级行业代码 | `641500` |
| `industryNameSwL2` | 申万二级行业名称 | `光伏设备` |
| `industryCodeSwL3` | 申万三级行业代码 | `641501` |
| `industryNameSwL3` | 申万三级行业名称 | `光伏电池组件` |

**接口示例**

```bash
node scripts/gs-api.js stock/industries --method POST stockCode=601012
```
