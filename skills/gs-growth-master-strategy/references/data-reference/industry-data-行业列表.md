# 行业基础 / 行业列表

---

## 行业列表

接口路径：`industries`  
请求方式：`GET`  
tool_id：`list_industries`

接口说明：通过行业名称、行业代码或行业体系查询行业列表，返回行业代码、行业名称、行业体系、行业等级及对应指数代码，用于行业名称与行业代码的解析。

**输入参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `industryCode` | — | string | 行业代码 | `740000` |
| `industryName` | — | string | 行业名称，支持模糊匹配 | `煤炭` |
| `industryType` | — | string | 行业类型/行业体系 | `INDUS4_CL` |
| `pageNum` | — | integer | 页码 | `1` |
| `pageSize` | — | integer | 页长 | `10` |

**输出参数**

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `industryCode` | 行业代码 | `10` |
| `industryName` | 行业名称 | `能源` |
| `industryType` | 行业类型 | `INDUS1_CL` |
| `industryLevel` | 行业等级 | `1` |
| `indexCode` | 行业指数代码 | `399001` |

**接口示例**

```bash
node scripts/gs-api.js industries industryName=煤炭
```
