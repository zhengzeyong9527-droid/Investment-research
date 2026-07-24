# 研报特色数据

---

## 研报向量搜索

接口路径：`report/vector-search`
请求方式：**`POST`**
tool_id：`list_report_vector-search`

接口说明：使用必填查询文本，结合股票代码、行业代码、机构代码或分类代码过滤范围进行研报语义搜索，返回研报 ID、发布时间、文本片段、页码、文本块起止位置和片段位置。适用于从研报中定位行业渗透率、市场份额、CR3/CR5、ASP、产能、库存、开工率、供需缺口、TAM/SAM、技术路线、渠道动销等文本证据。

**Query 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|---|:---:|---|---|---|
| `stockCode` | — | string | 股票代码；与行业、机构、分类参数至少传一个 | `002594` |
| `industryCode` | — | string | 行业代码 | `740000` |
| `institutionCode` | — | string | 机构代码 | `37` |
| `categoryCode` | — | string | 分类代码 | `000100` |
| `beginDate` | — | string | 开始日期，格式 `yyyy-MM-dd` | `2025-01-01` |
| `endDate` | — | string | 结束日期，格式 `yyyy-MM-dd` | `2026-06-16` |
| `topK` | — | integer | 返回条数 | `5` |

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|---|:---:|---|---|---|
| `query` | ✅ | string | 查询文本 | `新能源汽车` |

**输出参数**

| 字段名 | 说明 |
|---|---|
| `reportId` | 研报 ID |
| `pubDate` | 发布时间 |
| `chunk` | 文本片段 |
| `page` | 页码 |
| `blockStart` | 文本块起始位置 |
| `blockEnd` | 文本块结束位置 |
| `position` | 片段位置 |

**使用说明**

- 必须同时具备 `query` 和至少一个过滤范围；只传 `query` 会返回过滤条件为空。
- Query 文本建议使用中文逗号连接多个概念，例如 `渗透率，市场空间，份额`。
- 返回片段是文本证据，不是已清洗结构化字段。
- 片段缺少对象、时间、数值或口径时，只能作为弱证据。
- 上层 Skill 使用时，应保留 `reportId`、`pubDate`、`page` 和 `position` 以便溯源，但用户可见输出不得展示这些内部定位字段。

**接口示例**

```bash
node scripts/gs-api.js report/vector-search --method POST stockCode=002594 topK=5 --body-json '{"query":"销量，ASP，产能，市场份额"}'
node scripts/gs-api.js report/vector-search --method POST industryCode=740000 topK=5 --body-json '{"query":"渗透率，市场空间，竞争格局"}'
```

PowerShell 环境中如果 JSON 引号被拆分，可使用：

```powershell
node scripts/gs-api.js report/vector-search --method POST stockCode=002594 topK=5 --body-json '{\"query\":\"销量，ASP，产能，市场份额\"}'
```
