# gs-company-financial-analysis finance-data 接口文档

本文件记录当前 Skill 调用 finance-data 数据能力时的接口口径、参数示例和回归检查方式。所有示例均使用券商交付包的数据入口，不使用标准版 CLI。

## 券商数据入口

```bash
node scripts/gs-api.js status
node scripts/gs-api.js list
node scripts/gs-api.js search key=贵州茅台 type=11
node scripts/gs-api.js search query=股票,基本面分析
node scripts/gs-api.js <endpoint> [key=value ...]
node scripts/gs-api.js <endpoint> --method POST [queryKey=value ...] --body-json '{"bodyKey":[]}'
```

## 使用策略

1. 未明确接口时，先用 `list` 浏览分组，或用 `search query=<关键词>` 搜索接口。
2. 明确接口但不明确参数时，先用 `search query=<接口关键词>` 查看参数和示例。
3. 明确接口和参数后，再调用 `node scripts/gs-api.js <endpoint> ...`。
4. POST 接口如果区分 Query 参数与 Body JSON 参数，Query 使用 `key=value`，Body 使用 `--body-json`；数组或对象不要写成普通字符串参数。
5. 查询结果为空、受限或接口不可用时，只说明查询口径、权限或覆盖限制，不编造数据结论。

## 当前 Skill 已识别接口

| endpoint | 请求方式 | 用途 | 调用示例 |
|---|---|---|---|
| `partial/degraded/blocked` | `GET/POST` | 待按当前 Skill 业务口径补充 | `node scripts/gs-api.js partial/degraded/blocked stockCode=600519` |
| `workflow/outflow` | `GET/POST` | 待按当前 Skill 业务口径补充 | `node scripts/gs-api.js workflow/outflow stockCode=600519` |

## 已识别接口详情

### `partial/degraded/blocked`

- 请求方式：`GET/POST`
- 文档来源：当前 Skill 自动识别，待人工补充参数和字段口径

#### 调用示例

```bash
node scripts/gs-api.js partial/degraded/blocked stockCode=600519
```

#### 待补充

- Query 参数：待通过 `search` 确认。
- Body JSON 参数：待通过 `search` 确认；POST Body 必须使用 `--body-json`。
- 输出字段：待按当前 Skill 实际消费字段补充。

### `workflow/outflow`

- 请求方式：`GET/POST`
- 文档来源：当前 Skill 自动识别，待人工补充参数和字段口径

#### 调用示例

```bash
node scripts/gs-api.js workflow/outflow stockCode=600519
```

#### 待补充

- Query 参数：待通过 `search` 确认。
- Body JSON 参数：待通过 `search` 确认；POST Body 必须使用 `--body-json`。
- 输出字段：待按当前 Skill 实际消费字段补充。

## 常用示例

```bash
# 初始化或检查券商数据入口
node scripts/gs-api.js status

# 查询证券代码
node scripts/gs-api.js search key=贵州茅台 type=11

# 查看可用接口
node scripts/gs-api.js list
node scripts/gs-api.js search query=股票,行情,财务

# GET 或默认请求示例
node scripts/gs-api.js stock/basic-info stockCode=600519

# POST + Body JSON 示例
node scripts/gs-api.js stock/adjusted-quotes --method POST --body-json '{"stockCode":"600519","beginDate":"2024-01-01","endDate":"2024-12-31"}'
```

## 接口文档补全要求

当当前 Skill 使用新的 finance-data 接口时，必须在本文件补充：

| 字段 | 要求 |
|---|---|
| 接口名称 | 用业务可读名称描述用途。 |
| endpoint | 写成 `<group>/<name>` 格式，例如 `stock/basic-info`。 |
| 请求方式 | 明确 `GET` 或 `POST`。 |
| tool_id | 如可通过 `search` 查到，必须记录。 |
| Query 参数 | 列出参数名、必填、类型、说明、示例。 |
| Body JSON 参数 | POST Body 字段必须单独列出，不得混写成普通 `key=value`。 |
| 输出字段 | 列出当前 Skill 实际消费的字段、含义、空值处理。 |
| 调用示例 | 使用 `node scripts/gs-api.js`，不得使用标准版 CLI。 |

## 回归检查

- [ ] 当前 Skill 的 `SKILL.md` 或参考文件已链接本接口文档。
- [ ] 当前 Skill 中所有 API 示例均使用 `node scripts/gs-api.js`。
- [ ] 每个被当前 Skill 消费的 endpoint 均能在本文件找到参数示例。
- [ ] POST 接口的 Body JSON 使用 `--body-json`。
- [ ] 未把真实 APIKey、Token、密钥或本机私密路径写入文档。
- [ ] 缺数据时写“数据不足 / 待接入 / 权限受限”，不编造字段或结论。
