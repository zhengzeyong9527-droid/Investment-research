# gs-industry-data finance-data 接口文档

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
| `chain/com-main-pro` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js chain/com-main-pro --method POST --body-json '{"stockCode":"600519"}'` |
| `chain/industry-info` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js chain/industry-info --method POST --body-json '{"industryCode":"640000"}'` |
| `chain/pro-ind-maps` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js chain/pro-ind-maps --method POST --body-json '{"stockCodes":["600519"],"pageNum":1,"pageSize":20}'` |
| `chain/pro-relation` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js chain/pro-relation --method POST --body-json '{"productCode":"P0007786","pageNum":1,"pageSize":20}'` |
| `chain/product-info` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js chain/product-info --method POST --body-json '{"productCode":"P0007786","pageNum":1,"pageSize":20}'` |
| `gs/node` | `GET/POST` | 待按当前 Skill 业务口径补充 | `node scripts/gs-api.js gs/node stockCode=600519` |
| `index/valuation` | `GET/POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js index/valuation indexCode=801081` |
| `industry/financial-overview` | `GET/POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js industry/financial-overview industryCode=640000` |
| `industry/forecasts` | `GET/POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js industry/forecasts industryCode=640000` |
| `industry/market-stats` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js industry/market-stats --method POST industryCode=640000` |
| `industry/prosperity-index` | `GET/POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js industry/prosperity-index industryCode=740000` |
| `industry/rotation` | `GET/POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js industry/rotation industryCode=801010 beginDate=2025-01-01` |
| `industry/turnover-rates` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js industry/turnover-rates --method POST industryCode=640000` |
| `market/quote-summaries` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js market/quote-summaries --method POST --body-json '{"industryCodes":["640000"],"industrySubCodes":[],"conceptCodes":[]}'` |
| `news/entity-related` | `GET/POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js news/entity-related --method POST --body-json '{"beginTime":"2025-01-01","endTime":"2025-12-31","industryCode":"640000","title":"监管","pageNum":1,"pageSize":10}'` |
| `report/research` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js report/research --method POST --body-json '{"stockCode":"{股票代码}","beginDate":"{开始日期}","endDate":"{结束日期}","pageNum":1,"pageSize":20}'` |
| `stock/fin-ind-sw-rnk-q` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js stock/fin-ind-sw-rnk-q --method POST --body-json '{"industryCode":"640000","pageNum":1,"pageSize":20}'` |
| `stock/industries` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js stock/industries --method POST stockCode=601012` |
| `stock/insti_holding` | `POST` | 转换包已有数据契约；finance-data references | `node scripts/gs-api.js stock/insti_holding --method POST --body-json '{"stockCode":"600519"}'` |

## 已识别接口详情

### `chain/com-main-pro`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js chain/com-main-pro --method POST --body-json '{"stockCode":"600519"}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 查竞争结构摘要 \| `report/research` + `announcements` + `chain/com-main-pro` \| `stock/fin-ind-sw-rnk-q` + `market/quote-summaries` + `stock/insti_holding` + `industry/financial-overview` \| P0 直接披露的竞争结论、A股上市样本产品收入CR、产品收入样本份额、样本产品毛利池分布、排序线索、竞争方式、进入壁垒、A 股补充视角、风险提示 \| |
| \| 查竞争格局文本线索 \| `report/research` + `announcements` + `news/entity-related` \| `chain/com-main-pro` + `industry/financial-overview` + `industry/prosperity-index` + `industry/market-stats` + `stock/fin-ind-sw-rnk-q` + `market/quote-summaries` \| CR3/CR5、市场份额、利润池分布、价格战强度；只有 P0 直接披露可作主结论，其余必须标注估算/样本观察和估算方式 \| |
| \| 集中度 \| 头部企业 / CR3 / CR5 \| `P0披露可输出真实CR；否则输出样本集中度或头部线索` \| P0文本披露、`chain/com-main-pro`、行业内财务排名线索 \| |

#### finance-data 参考文档摘录

## 公司的主营产品

接口路径：`chain/com-main-pro`
请求方式：**`POST`**
tool_id：`list_chain_com_main_pro`

接口说明：通过股票代码、产品代码及报告发布日期范围，查询上市公司主营产品的财务数据，包括产品收入、收入占比、毛利及毛利占比等核心指标，用于分析公司业务构成和盈利能力。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `stockCodes` | — | array | 股票代码【与productCodes组成多选多参数，必须传递其中一个至多个】 | `['600519', '000001']` |
| `productCodes` | — | array | 产品代码【与stockCodes组成多选多参数，必须传递其中一个至多个】 | `['P0007786', 'P0007806']` |
| `beginDate` | — | string | 开始日期（格式yyyy-MM-dd）。 最小值:2020-01-01; | `2020-01-01` |
| `endDate` | — | string | 结束日期（格式yyyy-MM-dd） | `2025-01-01` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `stockOde` | 交易代码 | `000001` |
| `stockName` | 证券中文简称 | `平安银行` |
| `publishDate` | 公告日期 | `2018-08-16 00:00:00.000` |
| `reportDateEnd` | 报告日期 | `2018-06-30 00:00:00.000` |
| `productName` | 中文名称 | `综合性银行个人业务` |
| `productIncome` | 主营产业收入 | `29316000000` |
| `productIncomeRatio` | 主营产业收入占比 | `0.51215` |
| `productProfit` | 主营产业毛利 | `11794000000` |
| `productProfitRatio` | 主营产业毛利占比 | `0.677738` |

### 接口示例

```bash
# Body JSON 可选参数: stockCodes, productCodes, beginDate, endDate, pageNum, pageSize
node scripts/gs-api.js chain/com-main-pro --method POST --body-json '{"stockCodes":["600519","000001"],"productCodes":["P0007786","P0007806"],"beginDate":"2020-01-01"}'
```

---

### `chain/industry-info`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js chain/industry-info --method POST --body-json '{"industryCode":"640000"}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 12 \| `chain/industry-info` + `chain/product-info` + `chain/pro-relation` + `chain/pro-ind-maps` \| 多个产业链接口 \| 查询产业链行业信息、产品信息、上下游关系、公司相关产业链图谱 \| `references/产业链/行业产业链数据.md` \| |
| \| 查产业链 \| `chain/industry-info` + `chain/product-info` + `chain/pro-relation` \| `chain/pro-ind-maps` \| 产业信息、产品信息、上下游关系、公司相关产业链图谱 \| |
| \| 产业链 \| 产业信息/产品信息/上下游关系/公司图谱 \| `按可得数据输出` \| `chain/industry-info` 等 \| |
| \| 产业信息 \| 行业/产业链节点、行业代码、层级、父级/祖先分类 \| `chain/industry-info` \| |

#### finance-data 参考文档摘录

## 行业信息(产业链）

接口路径：`chain/industry-info`
请求方式：**`POST`**
tool_id：`get_chain_industry_info`

接口说明：通过行业代码或行业名称（支持模糊匹配）查询产业链行业分类信息，返回行业代码、名称、父级代码、所有祖先代码、分类体系（如CSF、CSRC等）及行业层级等核心数据，用于构建和分析产业链上下游关系及行业分类体系。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `industryName` | — | string | 行业名称【与industryCode组成多选多参数，必须传递其中一个至多个】 | `商品化工` |
| `industryCode` | — | string | 行业编码【与industryName组成多选多参数，必须传递其中一个至多个】 | `CSF_15101010` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `industryCode` | 行业编码 | `CSF_101010` |
| `industryName` | 行业中文名称 | `能源设备与服务` |
| `parentCode` | 行业父层级 | `CSF_1010` |
| `ancestorsCodes` | 行业所有父层级 | `CSF_10, CSF_1010` |
| `industrySystem` | 行业分类体系 | `CSF` |
| `industryLevel` | 行业层级 | `3` |

### 接口示例

```bash
# Body JSON 可选参数: industryName, industryCode
node scripts/gs-api.js chain/industry-info --method POST --body-json '{"industryName":"商品化工","industryCode":"CSF_15101010"}'
```

### `chain/pro-ind-maps`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js chain/pro-ind-maps --method POST --body-json '{"stockCodes":["600519"],"pageNum":1,"pageSize":20}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 12 \| `chain/industry-info` + `chain/product-info` + `chain/pro-relation` + `chain/pro-ind-maps` \| 多个产业链接口 \| 查询产业链行业信息、产品信息、上下游关系、公司相关产业链图谱 \| `references/产业链/行业产业链数据.md` \| |
| \| 查产业链 \| `chain/industry-info` + `chain/product-info` + `chain/pro-relation` \| `chain/pro-ind-maps` \| 产业信息、产品信息、上下游关系、公司相关产业链图谱 \| |
| \| 公司相关产业链图谱 \| 公司覆盖的产业链环节、相关产品/行业映射 \| `chain/pro-ind-maps` \| |

#### finance-data 参考文档摘录

## 公司相关产业链图谱

接口路径：`chain/pro-ind-maps`
请求方式：**`POST`**
tool_id：`list_chain_pro_ind_maps`

接口说明：通过股票代码、报告发布日期范围等条件，查询公司主营产品及其关联产业的上下游图谱信息，包括股票代码、名称、报告日期、主营产品信息以及关联产业的代码、名称、关系类型和层级关系，用于分析公司的产业链结构和产业关联性。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `stockCodes` | ✅ | array | 股票代码 | `['000001', '600519']` |
| `beginDate` | — | string | 开始日期（格式yyyy-MM-dd）。 最小值:2020-01-01; | `2020-01-01` |
| `endDate` | — | string | 结束日期（格式yyyy-MM-dd） | `2025-01-01` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `stockCode` | 股票代码 | `000001` |
| `stockName` | 股票名称 | `平安银行` |
| `publishDate` | 公告日期 | `2025-08-23 00:00:00.000` |
| `reportDateEnd` | 报告日期 | `2025-06-30 00:00:00.000` |
| `productCode` | 主营产业代码 | `FN001002` |
| `productName` | 主营产品名称 | `综合性银行个人业务` |
| `relatedCode` | 关联产业编码 | `P0007943` |
| `relatedName` | 关联产业名称 | `防火墙` |
| `relatedType` | 关联产业相对主产业的关系类型 | `T` |
| `relationship` | 关联产业和主产业的层级关系 | `-1` |

### 接口示例

```bash
# Body JSON 可选参数: beginDate, endDate, pageNum, pageSize
node scripts/gs-api.js chain/pro-ind-maps --method POST --body-json '{"stockCodes":["000001","600519"]}'
```

---

### `chain/pro-relation`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js chain/pro-relation --method POST --body-json '{"productCode":"P0007786","pageNum":1,"pageSize":20}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 12 \| `chain/industry-info` + `chain/product-info` + `chain/pro-relation` + `chain/pro-ind-maps` \| 多个产业链接口 \| 查询产业链行业信息、产品信息、上下游关系、公司相关产业链图谱 \| `references/产业链/行业产业链数据.md` \| |
| \| 查产业链 \| `chain/industry-info` + `chain/product-info` + `chain/pro-relation` \| `chain/pro-ind-maps` \| 产业信息、产品信息、上下游关系、公司相关产业链图谱 \| |
| \| 上下游关系 \| 产品之间的上游/下游关系，用于梳理链条 \| `chain/pro-relation` \| |

#### finance-data 参考文档摘录

## 产业链关系

接口路径：`chain/pro-relation`
请求方式：**`POST`**
tool_id：`get_chain_pro_relation`

接口说明：通过产品代码或产品名称（支持模糊查询）查询产业链中产品的上下游关联关系，返回包括关联产品代码、名称、类型、关联重要性及关系类型等核心信息，用于分析产业链结构和产品间的依赖关系。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `productCode` | — | string | 产品代码 | `P0007786` |
| `productName` | — | string | 产品名称 | `红茶` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `productCode` | 主产业科目代码 | `TR00600102` |
| `productName` | 产业名称 | `其他港口服务` |
| `relatedCode` | 关联产业代码 | `FA007048` |
| `relatedName` | 关联产业代码 | `港口机械` |
| `primaryType` |  主产业相对关联产业的关系类型 | `P` |
| `relatedType` | 关联产业相对主产业的关系类型 | `A` |
| `importance` | 重要性 | `4` |
| `relationship` | 关联产业和产业的层级关系 | `-1` |

### 接口示例

```bash
# Body JSON 可选参数: productCode, productName, pageNum, pageSize
node scripts/gs-api.js chain/pro-relation --method POST --body-json '{"productCode":"P0007786","productName":"红茶","pageNum":1}'
```

### `chain/product-info`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js chain/product-info --method POST --body-json '{"productCode":"P0007786","pageNum":1,"pageSize":20}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 12 \| `chain/industry-info` + `chain/product-info` + `chain/pro-relation` + `chain/pro-ind-maps` \| 多个产业链接口 \| 查询产业链行业信息、产品信息、上下游关系、公司相关产业链图谱 \| `references/产业链/行业产业链数据.md` \| |
| \| 查产业链 \| `chain/industry-info` + `chain/product-info` + `chain/pro-relation` \| `chain/pro-ind-maps` \| 产业信息、产品信息、上下游关系、公司相关产业链图谱 \| |
| \| 产品信息 \| 产品代码、产品名称、所属行业、产品层级、父级产品 \| `chain/product-info` \| |

#### finance-data 参考文档摘录

## 供应链产品信息

接口路径：`chain/product-info`
请求方式：**`POST`**
tool_id：`get_chain_product_info`

接口说明：通过产品代码或产品名称（支持模糊查询）查询供应链产品信息，返回产品代码、名称、所属行业代码、产品层级、直属父级产品代码以及所有祖先层级产品代码，用于构建和分析产品层级关系及行业归属。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `productCode` | — | string | 产品编码 | `P0007784` |
| `productName` | — | string | 产品名称 | `白茶` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `parentCode` | 产业代码 | `P0007783` |
| `productName` | 产业名称 | `白茶` |
| `industryCode` | 行业代码 | `CSF_30202010` |
| `productCode` | 直属父层级产品编码 | `FP00100303` |
| `ancestorsCodes` | 所有父层级产品编码 | `FP001, FP00100303` |
| `productLevel` | 产业层级 | `3` |

### 接口示例

```bash
# Body JSON 可选参数: productCode, productName
node scripts/gs-api.js chain/product-info --method POST --body-json '{"productCode":"P0007784","productName":"白茶"}'
```

---

### `gs/node`

- 请求方式：`GET/POST`
- 文档来源：当前 Skill 自动识别，待人工补充参数和字段口径

#### 调用示例

```bash
node scripts/gs-api.js gs/node stockCode=600519
```

#### 待补充

- Query 参数：待通过 `search` 确认。
- Body JSON 参数：待通过 `search` 确认；POST Body 必须使用 `--body-json`。
- 输出字段：待按当前 Skill 实际消费字段补充。

### `index/valuation`

- 请求方式：`GET/POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js index/valuation indexCode=801081
```
```bash
node scripts/gs-api.js index/valuation indexCode=399300 pageNum=1 pageSize=20
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 3 \| `index/valuation` \| `get_index_valuation` \| 查询行业对应指数的总市值、当前 PE/PB、换手率、股息率与 5 年分位 \| `references/行业估值/指数估值数据.md` \| |
| \| 查行业估值 \| `index/valuation` + `industry/market-stats` \| `industries` \| 总市值、当前 PE/PB、换手率、股息率、PE/PB 五年分位、PS 五年分位、阶段涨跌幅、主力资金净流 \| |
| \| 查行业全量概览 \| `index/valuation` + `industry/market-stats` + `industry/financial-overview` + `industry/prosperity-index` + `market/quote-summaries` \| `industries` \| 行业估值、财务、盈利、景气度、行情、竞争结构摘要综合表 \| |
| \| 估值背景 \| 指数总市值 \| `311.04亿` \| `index/valuation`, `2026-06-03` \| |
| \| 估值 \| 当前PE \| `189.44x` \| `index/valuation`, `2026-06-03` \| |
| \| 估值 \| 当前PB \| `10.10x` \| `index/valuation`, `2026-06-03` \| |
| \| 估值背景 \| 换手率 \| `6.42%` \| `index/valuation`, `2026-06-03` \| |
| \| 估值背景 \| 股息率 \| `0.13%` \| `index/valuation`, `2026-06-03` \| |

#### finance-data 参考文档摘录

## 指数估值信息

接口路径：`index/valuation`
请求方式：`GET`
tool_id：`get_index_valuation`

接口说明：通过指数代码和时间范围查询指数的估值信息，包括指数名称、发布机构、市场类型、行情时间、总市值、市盈率、市净率、换手率和股息率等核心数据，适用于金融分析和市场研究。

### 输入参数

**Query 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `indexCode` | ✅ | string |  | `399300` |
| `beginDate` | — | string |  | `2025-11-04` |
| `endDate` | — | string |  | `2025-11-04` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `indexCode` | 指数代码 | `000300` |
| `indexName` | 指数的证券简称 | `沪深300` |
| `progFullName` | 发布机构全称 | `中证指数有限公司` |
| `marketType` | 交易市场代码 | `S` |
| `date` | 行情时间 | `2025-11-06 00:00:00` |
| `indexMarketValue` | 指数的总市值 | `122081713834.268` |
| `pe` | 市盈率 | `14.3326` |
| `pb` | 市净率 | `1.376` |
| `peRank5y` | 近五年PE百分位 | `0.8399` |
| `pbRank5y` | 近五年PB百分位 | `0.6399` |
| `turnoverRate` | 换手率 | `0.0068` |
| `divYield` | 股息率 | `0.0269` |

### 接口示例

```bash
# Query 可选参数: beginDate, endDate, pageNum, pageSize
node scripts/gs-api.js index/valuation indexCode=399300
```

---

### `industry/financial-overview`

- 请求方式：`GET/POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js industry/financial-overview industryCode=640000
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 5 \| `industry/financial-overview` \| `get_industry_financial_overview` \| 查询行业财务概览 \| `references/财务与盈利/行业财务指标.md` \| |
| \| 14 \| `industry/forecasts` + `industry/prosperity-index` + `industry/financial-overview` + `industry/market-stats` + `market/quote-summaries` \| 多个行业数据接口 \| 为生命周期、周期属性和需求特征提供预测、景气、财务、估值行情辅助依据 \| `references/文本增强/行业结构化标签.md` \| |
| \| 查行业财务指标 \| `industry/financial-overview` \| `industries` \| 收入增速、利润增速、ROE、毛利率、股息率、资产负债率 \| |
| \| 查行业盈利指标 \| `industry/prosperity-index` \| `industry/financial-overview` \| ROE(TTM)环比、毛利率(TTM)环比、净利率(TTM)环比、标签 \| |
| \| 查行业景气度 \| `industry/prosperity-index` \| `industry/financial-overview` \| 景气标签、盈利改善/走弱方向、最新报告期变化 \| |
| \| 查竞争结构摘要 \| `report/research` + `announcements` + `chain/com-main-pro` \| `stock/fin-ind-sw-rnk-q` + `market/quote-summaries` + `stock/insti_holding` + `industry/financial-overview` \| P0 直接披露的竞争结论、A股上市样本产品收入CR、产品收入样本份额、样本产品毛利池分布、排序线索、竞争方式、进入壁垒、A 股补充视角、风险提示 \| |
| \| 查行业生命周期/周期属性/需求特征 \| `report/research` + `news/entity-related` + `announcements` \| `industry/forecasts` + `industry/prosperity-index` + `industry/financial-overview` + `industry/market-stats` + `market/quote-summaries` \| 生命周期标签、周期属性标签、需求刚性、需求频率、价格弹性、抗周期能力、替代风险；必须标注文本口径和辅助数据 \| |
| \| 查竞争格局文本线索 \| `report/research` + `announcements` + `news/entity-related` \| `chain/com-main-pro` + `industry/financial-overview` + `industry/prosperity-index` + `industry/market-stats` + `stock/fin-ind-sw-rnk-q` + `market/quote-summaries` \| CR3/CR5、市场份额、利润池分布、价格战强度；只有 P0 直接披露可作主结论，其余必须标注估算/样本观察和估算方式 \| |

#### finance-data 参考文档摘录

## 行业财务指标概览

接口路径：`industry/financial-overview`
请求方式：`GET`
tool_id：`get_industry_financial_overview`

接口说明：通过行业代码获取指定行业的财务指标概览数据，包含行业名称、最新季度年度、报告期、业务收入和净利润的3年平均增长率、最近四个季度的ROE、毛利率、资产负债率等核心财务指标，便于大模型进行行业财务分析和比较。

### 输入参数

**Query 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `industryCode` | ✅ | string | 申万行业代码 | `640000` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `industryCode` | 行业代码 | `640000` |
| `industryName` | 行业名称 | `能源` |
| `latestQuarterAnnual` | 最近季度年度 | `2024` |
| `latestQuarterlyRep` | 最近季度报告期 | `Q3` |
| `preQuarterQuarterlyAnnual` | 上一季度季度年度 | `2024` |
| `preQuarterRep` | 上一季度报告期 | `Q2` |
| `lastQuarterQuarterAnnual` | 次上季度季度年度 | `2024` |
| `lastQuarterReportPeriod` | 次上季度报告期 | `Q1` |
| `businessIncome3YAvgGrowthRate` | 业务收入3年平均增长率(%) | `15.5` |
| `netProfit3YAvgGrowthRate` | 净利润3年平均增长率(%) | `12.3` |
| `businessIncomeAvgGrowthRateNext3Y` | 业务收入未来3年平均增长率(%) | `18.2` |
| `netProfitAvgGrowthRate3Y` | 净利润未来3年平均增长率(%) | `14.8` |
| `latestQuarterRoe` | 最近季度净资产收益率(%) | `8.5%` |
| `latestQuarterBizIncomeGrowthRatePct` | 最近季度业务收入增长率(%) | `22.1` |
| `latestQuarterNetProfitGrowthRatePct` | 最近季度净利润增长率(%) | `19.6` |
| `preQuarterBizIncomeGrowthRate` | 上一季度业务收入增长率(%) | `18.3` |
| `preQuarterNetProfitGrowthRatePct` | 上一季度净利润增长率(%) | `16.7` |
| `preQuarterROE` | 上一季度净资产收益率(%) | `7.8` |
| `growthRateOfLastQuarterBizIncome` | 次上季度业务收入增长率(%) | `15.2` |
| `prevQuarterNetProfitGrowthRatePct` | 次上季度净利润增长率(%) | `13.4` |
| `lastQuarterRoePct` | 次上季度净资产收益率(%) | `6.9%` |
| `latest4QuarterBusinessIncomeGrowthRatePct` | 最近四季度业务收入增长率(%) | `20.1` |
| `latest4QuarterNetProfitGrowthRatePct` | 最近四季度净利润增长率(%) | `17.8` |
| `latest4QuarterRoePct` | 最近四季度净资产收益率(%) | `7.8` |
| `latest4QuarterDividendPayoutRatio` | 最近四季度股息支付率(%) | `35.2` |
| `latest4QuarterDividendYield` | 最近四季度股息率 | `2.8` |
| `latest4QuartersGrossMarginPct` | 最近四季毛利率(%) | `28.5` |
| `latestAssetLiabilityRatio` | 最新资产负债率(%) | `45.3` |
| `latest4Quarter3YAvgROE` | 最近四季度三年平均净资产收率(%) | `8.2` |
| `latest4QuartersAssetTurnoverRate` | 最近四季度资产周转率 | `1.2` |

### 接口示例

```bash
node scripts/gs-api.js industry/financial-overview industryCode=640000
```

---

### `industry/forecasts`

- 请求方式：`GET/POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js industry/forecasts industryCode=640000
```
```bash
node scripts/gs-api.js industry/forecasts industryCode=630000
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 7 \| `industry/forecasts` + `industry/rotation` + `industry/turnover-rates` \| `list_industry_forecasts` / `list_industry_rotation` / `list_idu_turnover_rates` \| 查询行业预测、轮动因子、换手率 \| `references/预测与活跃度/行业预测轮动换手率.md` \| |
| \| 14 \| `industry/forecasts` + `industry/prosperity-index` + `industry/financial-overview` + `industry/market-stats` + `market/quote-summaries` \| 多个行业数据接口 \| 为生命周期、周期属性和需求特征提供预测、景气、财务、估值行情辅助依据 \| `references/文本增强/行业结构化标签.md` \| |
| \| 查行业预测/轮动/换手率 \| `industry/forecasts` + `industry/rotation` + `industry/turnover-rates` \| `industry/market-stats` \| 收入利润预测、市场排名、轮动因子、换手率百分位 \| |
| \| 查行业生命周期/周期属性/需求特征 \| `report/research` + `news/entity-related` + `announcements` \| `industry/forecasts` + `industry/prosperity-index` + `industry/financial-overview` + `industry/market-stats` + `market/quote-summaries` \| 生命周期标签、周期属性标签、需求刚性、需求频率、价格弹性、抗周期能力、替代风险；必须标注文本口径和辅助数据 \| |
| \| 预测 \| 未来12个月净利润增长率 \| `17.3%` \| `industry/forecasts` \| |
| \| 4 \| `industry/forecasts` \| `get_industry_forecasts` \| 行业未来营收、净利润或 EPS 预测增速，供行业 PEG 分母使用 \| `references/指数与行业估值/指数行业估值数据.md` \| |

#### finance-data 参考文档摘录

## 行业预测

接口路径：`industry/forecasts`
请求方式：`GET`
tool_id：`list_industry_forecasts`

接口说明：通过行业代码获取行业预测数据，包括当前及未来几年的净利润增长率、业务收入增长率及其市场排名，以及历史净利润和业务收入数据，适用于行业趋势分析和投资决策支持。

### 输入参数

**Query 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `industryCode` | ✅ | string | 行业代码 | `640000` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `industryCode` | 行业代码 | `640000` |
| `industryName` | 行业名称 | `能源` |
| `tYear` | T年 | `2024` |
| `tYearNetProfitGrowthRate` | T年净利润增长率(%) | `15.5` |
| `tPlus1YNetProfitGrowthRate` | T+1年净利润增长率(%) | `18.2` |
| `tPlus2YNetProfitGrowthRate` | T+2年净利润增长率(%) | `16.8` |
| `tPlus3YNetProfitGrowthRate` | T+3年净利润增长率(%) | `14.3` |
| `t1YNetProfitGrowthRate` | T-1年净利润增长率(%) | `12.1` |
| `tMinus2YNetProfitGrowthRate` | T-2年净利润增长率(%) | `8.7` |
| `future12MonthsNetProfitGrowthRate` | 未来12个月净利润增长率(%) | `17.3` |
| `t3yNetIncomeGrowthRate` | T-3年净利润增长率(%) | `6.4` |
| `t4YNetProfitGrowthRate` | T-4年净利润增长率(%) | `4.2` |
| `tYearNetProfitGrowthRateMarketRanking` | T年净利润增长率在市场中排名 | `25` |
| `tPlus1YNetProfitGrowthRateMarketRanking` | T+1年净利润增长率在市场中排名 | `18` |
| `tPlus2YNetProfitGrowthRateMarketRanking` | T+2年净利润增长率在市场中排名 | `22` |
| `tPlus3YNetProfitGrowthRateMarketRanking` | T+3年净利润增长率在市场中排名 | `28` |
| `t1YNetProfitGrowthRateRankInMarket` | T-1年净利润增长率在市场中排名 | `35` |
| `t2yNetProfitGrowthRateMarketRank` | T-2年净利润增长率在市场中排名 | `45` |
| `future12MonthsNetProfitGrowthRateMarketRank` | 未来12个月净利润增长率在市场中排名 | `20` |
| `t3yNetProfitGrowthRateMarketRanking` | T-3年净利润增长率在市场中排名 | `58` |
| `profitGrowthRankInMarketT4Y` | T-4年净利润增长率在市场中排名 | `72` |
| `tYearBizIncomeGrowthRatePct` | T年业务收入增长率(%) | `22.5` |
| `tPlus1YBusinessIncomeGrowthRatePct` | T+1年业务收入增长率(%) | `25.8` |
| `tPlus2YBusinessIncomeGrowthRatePct` | T+2年业务收入增长率(%) | `23.2` |
| `tPlus3YBusinessIncomeGrowthRatePct` | T+3年业务收入增长率(%) | `20.6` |
| `t1YBusinessIncomeGrowthRatePct` | T-1年业务收入增长率(%) | `18.3` |
| `t2YBusinessIncomeGrowthRatePct` | T-2年业务收入增长率(%) | `15.7` |
| `growthRateNext12Months` | 未来12个月业务收入增长率(%) | `24.1` |
| `t3YBusinessIncomeGrowthRatePct` | T-3年业务收入增长率(%) | `12.4` |
| `t4YBusinessIncomeGrowthRatePct` | T-4年业务收入增长率(%) | `9.8` |

### 接口示例

```bash
node scripts/gs-api.js industry/forecasts industryCode=640000
```

### `industry/market-stats`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js industry/market-stats --method POST industryCode=640000
```
```bash
node scripts/gs-api.js industry/market-stats --method POST --body-json '{"industryCode":"640000"}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 4 \| `industry/market-stats` \| `get_industry_market_stats` \| 查询行业 PS 分位、阶段涨跌幅与主力资金净流 \| `references/行业估值/行业估值数据.md` \| |
| \| 14 \| `industry/forecasts` + `industry/prosperity-index` + `industry/financial-overview` + `industry/market-stats` + `market/quote-summaries` \| 多个行业数据接口 \| 为生命周期、周期属性和需求特征提供预测、景气、财务、估值行情辅助依据 \| `references/文本增强/行业结构化标签.md` \| |
| \| 查行业估值 \| `index/valuation` + `industry/market-stats` \| `industries` \| 总市值、当前 PE/PB、换手率、股息率、PE/PB 五年分位、PS 五年分位、阶段涨跌幅、主力资金净流 \| |
| \| 查行业预测/轮动/换手率 \| `industry/forecasts` + `industry/rotation` + `industry/turnover-rates` \| `industry/market-stats` \| 收入利润预测、市场排名、轮动因子、换手率百分位 \| |
| \| 查行业行情 \| `market/quote-summaries` \| `industry/market-stats` \| 行业指数、涨跌幅、成交量、总市值、涨跌家数、领涨股 \| |
| \| 查行业生命周期/周期属性/需求特征 \| `report/research` + `news/entity-related` + `announcements` \| `industry/forecasts` + `industry/prosperity-index` + `industry/financial-overview` + `industry/market-stats` + `market/quote-summaries` \| 生命周期标签、周期属性标签、需求刚性、需求频率、价格弹性、抗周期能力、替代风险；必须标注文本口径和辅助数据 \| |
| \| 查竞争格局文本线索 \| `report/research` + `announcements` + `news/entity-related` \| `chain/com-main-pro` + `industry/financial-overview` + `industry/prosperity-index` + `industry/market-stats` + `stock/fin-ind-sw-rnk-q` + `market/quote-summaries` \| CR3/CR5、市场份额、利润池分布、价格战强度；只有 P0 直接披露可作主结论，其余必须标注估算/样本观察和估算方式 \| |
| \| 查行业全量概览 \| `index/valuation` + `industry/market-stats` + `industry/financial-overview` + `industry/prosperity-index` + `market/quote-summaries` \| `industries` \| 行业估值、财务、盈利、景气度、行情、竞争结构摘要综合表 \| |

#### finance-data 参考文档摘录

## 行业行情统计

接口路径：`industry/market-stats`
请求方式：**`POST`**
tool_id：`get_industry_market_stats`

接口说明：通过行业代码查询指定行业的行情统计数据，包含行业代码、名称、近一日至近五年等多个时间维度的涨跌幅、近一日至近二十日的主力资金净流入（万元），以及PE、PB、PS的近五年历史百分位，用于行业表现分析和资金流向监控。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `industryCode` | ✅ | string | 行业代码 | `640000` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `industryCode` | 行业代码 | `64000` |
| `industryName` | 行业名称 | `机械设备` |
| `return1d` | 近一日涨跌幅(%) | `10` |
| `return1w` | 近一周涨跌幅(%) | `10` |
| `return1m` | 近一月涨跌幅(%) | `10` |
| `return3m` | 近三月涨跌幅(%) | `10` |
| `return6m` | 近半年涨跌幅(%) | `10` |
| `return1y` | 近一年涨跌幅(%) | `10` |
| `return3y` | 近三年涨跌幅(%) | `10` |
| `return5y` | 近五年涨跌幅(%) | `10` |
| `returnYtd` | 今年以来涨跌幅(%) | `10` |
| `pbPct5y` | PB近五年历史百分位 | `0.9983` |
| `pePct5y` | PE近五年历史百分位 | `0.9942` |
| `psPct5y` | PS近五年历史百分位 | `0.9975` |
| `netMainInflow1dMn` | 近1日主力净流(万元) | `1243416.7117` |
| `netMainInflow3dMn` | 近3日主力净流(万元) | `1439349.7327` |
| `netMainInflow5dMn` | 近5日主力净流(万元) | `2745604.8824` |
| `netMainInflow10dMn` | 近10日主力净流(万元) | `3698071.1197` |
| `netMainInflow20dMn` | 近20日主力净流(万元) | `3698071.1197` |

### 接口示例

```bash
node scripts/gs-api.js industry/market-stats --method POST --body-json '{"industryCode":"640000"}'
```

---

### `industry/prosperity-index`

- 请求方式：`GET/POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js industry/prosperity-index industryCode=740000
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 6 \| `industry/prosperity-index` \| `list_industry_prosperity_index` \| 查询行业盈利与景气度指标 \| `references/景气与结构/行业景气度.md` \| |
| \| 14 \| `industry/forecasts` + `industry/prosperity-index` + `industry/financial-overview` + `industry/market-stats` + `market/quote-summaries` \| 多个行业数据接口 \| 为生命周期、周期属性和需求特征提供预测、景气、财务、估值行情辅助依据 \| `references/文本增强/行业结构化标签.md` \| |
| \| 查行业盈利指标 \| `industry/prosperity-index` \| `industry/financial-overview` \| ROE(TTM)环比、毛利率(TTM)环比、净利率(TTM)环比、标签 \| |
| \| 查行业景气度 \| `industry/prosperity-index` \| `industry/financial-overview` \| 景气标签、盈利改善/走弱方向、最新报告期变化 \| |
| \| 查行业生命周期/周期属性/需求特征 \| `report/research` + `news/entity-related` + `announcements` \| `industry/forecasts` + `industry/prosperity-index` + `industry/financial-overview` + `industry/market-stats` + `market/quote-summaries` \| 生命周期标签、周期属性标签、需求刚性、需求频率、价格弹性、抗周期能力、替代风险；必须标注文本口径和辅助数据 \| |
| \| 查竞争格局文本线索 \| `report/research` + `announcements` + `news/entity-related` \| `chain/com-main-pro` + `industry/financial-overview` + `industry/prosperity-index` + `industry/market-stats` + `stock/fin-ind-sw-rnk-q` + `market/quote-summaries` \| CR3/CR5、市场份额、利润池分布、价格战强度；只有 P0 直接披露可作主结论，其余必须标注估算/样本观察和估算方式 \| |
| \| 查行业全量概览 \| `index/valuation` + `industry/market-stats` + `industry/financial-overview` + `industry/prosperity-index` + `market/quote-summaries` \| `industries` \| 行业估值、财务、盈利、景气度、行情、竞争结构摘要综合表 \| |
| \| 景气 \| 综合标签 \| `5（接口原始值，当前未定义数值含义映射）` \| `industry/prosperity-index` \| |

#### finance-data 参考文档摘录

## 行业景气度

接口路径：`industry/prosperity-index`
请求方式：`GET`
tool_id：`list_industry_prosperity_index`

接口说明：通过行业代码查询行业景气度数据，包括ROE(TTM)环比增速、毛利率(TTM)环比增速、净利率(TTM)环比增速等关键财务指标及其标签，适用于行业分析和投资决策。

### 输入参数

**Query 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `industryCode` | ✅ | string | 行业代码 | `740000` |
| `beginDate` | — | string | 开始日期（格式yyyy-MM-dd）。 最小值:2020-01-01; | `2025-01-01` |
| `endDate` | — | string | 结束日期（格式yyyy-MM-dd） | `2025-01-01` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `industryCode` | 行业代码 | — |
| `industryName` | 行业名称 | — |
| `reportYear` | 报告年度 | — |
| `reportPeriod` | 报告时段 | — |
| `roeTtmQoqGrowth` | ROE(TTM)环比增速 | — |
| `roeTtmQoqGrowthLabel` | ROE(TTM)环比增速的标签 | — |
| `grossMarginTTMMoMGrowth` | 毛利率(TTM)环比增速 | — |
| `grossMarginTTMMoMGrowthLabel` | 毛利率(TTM)环比增速的标签 | — |
| `ttmNetProfitMarginQoq` | 净利率(TTM)环比增速 | — |
| `ttmNetProfitMarginQoqLabel` | 净利率(TTM)环比增速的标签 | — |
| `latestQtrNetProfitYoyQoq` | 最近一季度归母净利润同比增速的环比增速 | — |
| `latestQtrNetProfitYoyQoqLabel` | 最近一季度归母净利润同比增速的环比增速的标签 | — |
| `latestQtrOpIncomeYoyQoq` | 最近一季度营业总收入同比增速的环比增速 | — |
| `latestQtrOpIncomeYoyQoqLabel` | 最近一季度营业总收入同比增速的环比增速的标签 | — |
| `latestQtrAdjNetProfitYoyMom` | 最近一季度扣非净利润同比增速的环比增速 | — |
| `latestQtrAdjNetProfitYoyMomLabel` | 最近一季度扣非净利润同比增速的环比增速的标签 | — |
| `totalTag` | 总的标签 | — |

### 接口示例

```bash
# Query 可选参数: beginDate, endDate, pageNum, pageSize
node scripts/gs-api.js industry/prosperity-index industryCode=740000
```

---

### `industry/rotation`

- 请求方式：`GET/POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js industry/rotation industryCode=801010 beginDate=2025-01-01
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 7 \| `industry/forecasts` + `industry/rotation` + `industry/turnover-rates` \| `list_industry_forecasts` / `list_industry_rotation` / `list_idu_turnover_rates` \| 查询行业预测、轮动因子、换手率 \| `references/预测与活跃度/行业预测轮动换手率.md` \| |
| \| 查行业预测/轮动/换手率 \| `industry/forecasts` + `industry/rotation` + `industry/turnover-rates` \| `industry/market-stats` \| 收入利润预测、市场排名、轮动因子、换手率百分位 \| |

#### finance-data 参考文档摘录

## 行业轮动因子

接口路径：`industry/rotation`
请求方式：`GET`
tool_id：`list_industry_rotation`

接口说明：通过行业代码和日期范围查询特定行业的轮动因子数据，包括市场情绪计温度和高低价风格相关性X动量等指标，用于分析行业轮动和市场风格变化。入参包括行业代码、开始日期（格式yyyy-MM-dd）、结束日期（格式yyyy-MM-dd）、页码和页大小；出参包括行业代码、行业名称、发布日期（格式yyyy-MM-dd HH:mm:ss）、市场情绪计温度和高低价风格相关性X动量。

### 输入参数

**Query 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `industryCode` | ✅ | string | 行业代码 | `002594` |
| `beginDate` | — | string | 开始日期（格式yyyy-MM-dd）。 最小值:2020-01-01; | `2020-01-01` |
| `endDate` | — | string | 结束日期（格式yyyy-MM-dd） | `2025-01-01` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `industryCode` | 行业代码 | `801010` |
| `industryName` | 行业名称 | `申万农林牧渔` |
| `date` | 发布日期 | `2000-01-17 00:00:00` |
| `marketSentiment` | 市场温度计温度 | `0.93333333` |
| `hlStyleCorrXMomentum` | 高低价风格相关性X动量 | `0.85` |

### 接口示例

```bash
# Query 可选参数: beginDate, endDate, pageNum, pageSize
node scripts/gs-api.js industry/rotation industryCode=002594
```

---

### `industry/turnover-rates`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js industry/turnover-rates --method POST industryCode=640000
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 7 \| `industry/forecasts` + `industry/rotation` + `industry/turnover-rates` \| `list_industry_forecasts` / `list_industry_rotation` / `list_idu_turnover_rates` \| 查询行业预测、轮动因子、换手率 \| `references/预测与活跃度/行业预测轮动换手率.md` \| |
| \| 查行业预测/轮动/换手率 \| `industry/forecasts` + `industry/rotation` + `industry/turnover-rates` \| `industry/market-stats` \| 收入利润预测、市场排名、轮动因子、换手率百分位 \| |
| \| 活跃度 \| 换手率百分位 \| `0.1` \| `industry/turnover-rates` \| |

#### finance-data 参考文档摘录

## 行业换手率

接口路径：`industry/turnover-rates`
请求方式：**`POST`**
tool_id：`list_idu_turnover_rates`

接口说明：通过行业代码和日期范围查询指定行业的历史换手率数据，返回行业代码、名称、日期、换手率及其近一年百分位，适用于分析行业流动性及市场活跃度。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `industryCode` | ✅ | string | 行业代码 | `640000` |
| `beginDate` | — | string | 开始日期（格式yyyy-MM-dd）。 最小值:2020-01-01; | `2020-01-01` |
| `endDate` | — | string | 结束日期（格式yyyy-MM-dd） | `2025-01-01` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `industryCode` | 行业代码 | `000027` |
| `industryName` | 行业名称 | `深圳能源` |
| `date` | 发布日期 | `1993-12-29 00:00:00` |
| `turnover` | 换手率(%) | `0.2489` |
| `turnoverAvg10d` | 近一年换手率百分位 | `0.1` |

### 接口示例

```bash
# Body JSON 可选参数: beginDate, endDate, pageNum, pageSize
node scripts/gs-api.js industry/turnover-rates --method POST --body-json '{"industryCode":"640000"}'
```

### `market/quote-summaries`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js market/quote-summaries --method POST --body-json '{"industryCodes":["640000"],"industrySubCodes":[],"conceptCodes":[]}'
```
```bash
node scripts/gs-api.js market/quote-summaries --method POST --body-json '{"industryCodes":[],"industrySubCodes":[],"conceptCodes":["CLS81936"]}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 8 \| `market/quote-summaries` \| `get_market_quote_summaries` \| 查询行业或概念板块行情汇总 \| `references/行情与排名/行业实时行情.md` \| |
| \| 14 \| `industry/forecasts` + `industry/prosperity-index` + `industry/financial-overview` + `industry/market-stats` + `market/quote-summaries` \| 多个行业数据接口 \| 为生命周期、周期属性和需求特征提供预测、景气、财务、估值行情辅助依据 \| `references/文本增强/行业结构化标签.md` \| |
| \| 15 \| `market/quote-summaries` \| `get_market_quote_summaries` \| 查询指定行业或概念代码的板块表现汇总 \| `references/行情与排名/板块排名.md` \| |
| \| 查行业行情 \| `market/quote-summaries` \| `industry/market-stats` \| 行业指数、涨跌幅、成交量、总市值、涨跌家数、领涨股 \| |
| \| 查竞争结构摘要 \| `report/research` + `announcements` + `chain/com-main-pro` \| `stock/fin-ind-sw-rnk-q` + `market/quote-summaries` + `stock/insti_holding` + `industry/financial-overview` \| P0 直接披露的竞争结论、A股上市样本产品收入CR、产品收入样本份额、样本产品毛利池分布、排序线索、竞争方式、进入壁垒、A 股补充视角、风险提示 \| |
| \| 查行业生命周期/周期属性/需求特征 \| `report/research` + `news/entity-related` + `announcements` \| `industry/forecasts` + `industry/prosperity-index` + `industry/financial-overview` + `industry/market-stats` + `market/quote-summaries` \| 生命周期标签、周期属性标签、需求刚性、需求频率、价格弹性、抗周期能力、替代风险；必须标注文本口径和辅助数据 \| |
| \| 查竞争格局文本线索 \| `report/research` + `announcements` + `news/entity-related` \| `chain/com-main-pro` + `industry/financial-overview` + `industry/prosperity-index` + `industry/market-stats` + `stock/fin-ind-sw-rnk-q` + `market/quote-summaries` \| CR3/CR5、市场份额、利润池分布、价格战强度；只有 P0 直接披露可作主结论，其余必须标注估算/样本观察和估算方式 \| |
| \| 查板块排名 \| `market/quote-summaries` \| — \| 指定行业或概念代码的板块表现汇总；全市场排行需上游提供代码集合或改用其他可用数据源 \| |

#### finance-data 参考文档摘录

## 市场行情汇总

接口路径：`market/quote-summaries`
请求方式：**`POST`**
tool_id：`get_market_quote_summary`

接口说明：通过申万一级行业代码、申万二级行业代码、概念代码，获取市场行情汇总数据，涵盖整体市场的有效样本数、涨跌家数、涨跌幅、赚钱效应、情绪温度等核心指标，同时提供一级行业、细分行业、概念板块的详细汇总信息，包括成分股涨跌情况、龙头股及领跌股、资金净流入、成交集中度等，可用于市场整体行情分析、行业及概念板块的监测与投研分析

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `industryCodes` | — | array | 申万一级行业代码【与industrySubCodes、conceptCodes组成多选多参数，必须传递其中一个至多个】 | `['410000']` |
| `industrySubCodes` | — | array | 申万二级行业代码【与industryCodes、conceptCodes组成多选多参数，必须传递其中一个至多个】 | `['410100']` |
| `conceptCodes` | — | array | 概念代码【与industryCodes、industrySubCodes组成多选多参数，必须传递其中一个至多个】 | `['CLS80201']` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `data` | 业务数据 | `{}` |

### 接口示例

```bash
# Body JSON 可选参数: industryCodes, industrySubCodes, conceptCodes
node scripts/gs-api.js market/quote-summaries --method POST --body-json '{"industryCodes":["410000"],"industrySubCodes":["410100"],"conceptCodes":["CLS80201"]}'
```

---

### `news/entity-related`

- 请求方式：`GET/POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js news/entity-related --method POST --body-json '{"beginTime":"2025-01-01","endTime":"2025-12-31","industryCode":"640000","title":"监管","pageNum":1,"pageSize":10}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 13 \| `report/research` + `news` + `news/entity-related` + `announcements` \| 多个文本接口 \| 查询市场空间、渗透率、替代空间、政策监管、生命周期、周期属性、需求特征和竞争格局文本线索 \| `references/文本增强/市场空间与政策监管.md`、`references/文本增强/行业结构化标签.md` \| |
| \| 查行业生命周期/周期属性/需求特征 \| `report/research` + `news/entity-related` + `announcements` \| `industry/forecasts` + `industry/prosperity-index` + `industry/financial-overview` + `industry/market-stats` + `market/quote-summaries` \| 生命周期标签、周期属性标签、需求刚性、需求频率、价格弹性、抗周期能力、替代风险；必须标注文本口径和辅助数据 \| |
| \| 查竞争格局文本线索 \| `report/research` + `announcements` + `news/entity-related` \| `chain/com-main-pro` + `industry/financial-overview` + `industry/prosperity-index` + `industry/market-stats` + `stock/fin-ind-sw-rnk-q` + `market/quote-summaries` \| CR3/CR5、市场份额、利润池分布、价格战强度；只有 P0 直接披露可作主结论，其余必须标注估算/样本观察和估算方式 \| |
| \| 查市场空间与政策监管 \| `report/research` + `news/entity-related` \| `news` + `announcements` \| 市场规模、渗透率、替代空间、政策事件、监管线索；必须标注文本来源 \| |
| \| 标签 \| 周期属性 \| `强周期 / 弱周期 / 政策驱动 / 技术迭代` \| `news/entity-related`、`report/research` + 行情/财务波动辅助 \| |
| \| 文本 \| 政策监管线索 \| `新闻/研报/公告摘要` \| `news/entity-related`、`announcements` \| |

#### finance-data 参考文档摘录

## 实体的相关新闻

接口路径：`news/entity-related`
请求方式：`GET`
tool_id：`list_entity_related_news`

接口说明：通过股票代码、行业代码或概念代码查询相关实体的新闻数据，支持按时间范围、新闻类型、新闻等级、情感倾向等多条件筛选，返回新闻标题、摘要、关键点、影响分析、投资机会与风险、情感得分及分析等核心信息，适用于市场监测、投资分析和舆情跟踪。

### 输入参数

**Query 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `beginTime` | — | string | 开始日期（格式yyyy-MM-dd HH:mm:ss）。 最小值:2020-01-01 00:00:00; | `2020-01-01 08:00:00` |
| `endTime` | — | string | 结束时间（格式yyyy-MM-dd HH:mm:ss） | `2025-02-01 08:00:00` |
| `title` | — | string | 标题 | `人工智能` |
| `newsType` | — | integer | 新闻类型 | `1` |
| `newsLevel` | — | integer | 新闻等级 | `1` |
| `sentiment` | — | integer | 情绪偏向 | `1` |
| `stockCode` | — | string | 股票代码 | `600839` |
| `industryCode` | — | string | 行业代码 | `370000` |
| `conceptCode` | — | string | 概念代码 | `CLS81936` |
| `minRelevance` | — | integer | 实体的相关度下限。 最小值:1; 最大值:5; | `1` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `date` | 发布时间 | `2025-04-02 15:45:02` |
| `newsId` | 新闻ID | `NEWS20250402001` |
| `newsType` | 新闻类型 | `4` |
| `title` | 新闻标题 | `3月基金发行回暖 新成立135只份额超千亿` |
| `summary` | 摘要 | `报道指出...后续盈利表现待察。` |
| `keyPoints` | 关键要点 | `3月基金发行 发行份额超1000亿份` |
| `impactAnalysis` | 影响分析 | `股市回暖→基金发行上升→市场盈利待察` |
| `investmentOpportunity` | 投资机会 | `- <价值红利风格>...` |
| `investmentRisk` | 投资风险 | `- <中小盘成长风格>...` |
| `sentimentScore` | 情绪得分(范围-5~5) | `2` |
| `sentiment` | 情绪值 | `5` |
| `sentimentAnalysis` | 情绪分析 | `3月基金发行回暖...整体偏积极。` |
| `themeCode` | 主题代码 | `AI001` |
| `newsLevel` | 新闻等级 | `2` |
| `entityCode` | 实体代码 | `600839` |
| `entityName` | 实体名称 | `四川长虹` |
| `relevance` | 关联度(范围1~5) | `1` |

### 接口示例

```bash
# Query 可选参数: beginTime, endTime, title, newsType, newsLevel, sentiment, stockCode, industryCode, conceptCode, minRelevance, pageNum, pageSize
node scripts/gs-api.js news/entity-related
```

---

### `report/research`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js report/research --method POST --body-json '{"stockCode":"{股票代码}","beginDate":"{开始日期}","endDate":"{结束日期}","pageNum":1,"pageSize":20}'
```
```bash
node scripts/gs-api.js report/research --method POST --body-json '{"industryCodeLv1":"640000","beginDate":"2025-01-01","endDate":"2025-12-31","pageNum":1,"pageSize":10}'
```
```bash
node scripts/gs-api.js report/research --method POST --body-json '{"stockCode":"600519","beginDate":"2025-01-01","endDate":"2026-06-16","pageNum":1,"pageSize":20}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 13 \| `report/research` + `news` + `news/entity-related` + `announcements` \| 多个文本接口 \| 查询市场空间、渗透率、替代空间、政策监管、生命周期、周期属性、需求特征和竞争格局文本线索 \| `references/文本增强/市场空间与政策监管.md`、`references/文本增强/行业结构化标签.md` \| |
| \| 查竞争结构摘要 \| `report/research` + `announcements` + `chain/com-main-pro` \| `stock/fin-ind-sw-rnk-q` + `market/quote-summaries` + `stock/insti_holding` + `industry/financial-overview` \| P0 直接披露的竞争结论、A股上市样本产品收入CR、产品收入样本份额、样本产品毛利池分布、排序线索、竞争方式、进入壁垒、A 股补充视角、风险提示 \| |
| \| 查行业生命周期/周期属性/需求特征 \| `report/research` + `news/entity-related` + `announcements` \| `industry/forecasts` + `industry/prosperity-index` + `industry/financial-overview` + `industry/market-stats` + `market/quote-summaries` \| 生命周期标签、周期属性标签、需求刚性、需求频率、价格弹性、抗周期能力、替代风险；必须标注文本口径和辅助数据 \| |
| \| 查竞争格局文本线索 \| `report/research` + `announcements` + `news/entity-related` \| `chain/com-main-pro` + `industry/financial-overview` + `industry/prosperity-index` + `industry/market-stats` + `stock/fin-ind-sw-rnk-q` + `market/quote-summaries` \| CR3/CR5、市场份额、利润池分布、价格战强度；只有 P0 直接披露可作主结论，其余必须标注估算/样本观察和估算方式 \| |
| \| 查市场空间与政策监管 \| `report/research` + `news/entity-related` \| `news` + `announcements` \| 市场规模、渗透率、替代空间、政策事件、监管线索；必须标注文本来源 \| |
| \| 标签 \| 生命周期 \| `成长 / 成熟 / 反转` \| `report/research` 文本抽取 + 行业预测/景气辅助 \| |
| \| 标签 \| 周期属性 \| `强周期 / 弱周期 / 政策驱动 / 技术迭代` \| `news/entity-related`、`report/research` + 行情/财务波动辅助 \| |
| \| 文本 \| 市场空间/渗透率 \| `研报摘要，非统一结构化口径` \| `report/research` \| |

#### finance-data 参考文档摘录

## 研究报告

接口路径：`report/research`
请求方式：**`POST`**
tool_id：`list_report_research`

接口说明：支持通过股票代码、行业代码、栏目分类代码以及发布日期范围（格式为yyyy-MM-dd）等条件，灵活筛选并获取详细的证券研究报告列表，返回内容包括报告标题、作者、发布时间、发布机构、核心观点、投资要点、主要投资逻辑、报告类型及语言等关键信息，适用于投资研究、市场分析和信息检索等场景。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `stockCode` | — | string | 股票代码【与industryCode、industryCodeLv1、institutionCode、categoryCode组成多选多参数，必须传递其中一个至多个】 | `600519` |
| `industryCode` | — | string | 行业代码（申万二级）【与stockCode、industryCodeLv1、institutionCode、categoryCode组成多选多参数，必须传递其中一个至多个】 | `740100` |
| `industryCodeLv1` | — | string | 行业代码（申万一级）【与stockCode、industryCode、institutionCode、categoryCode组成多选多参数，必须传递其中一个至多个】 | `640000` |
| `institutionCode` | — | integer | 机构代码【与stockCode、industryCode、industryCodeLv1、categoryCode组成多选多参数，必须传递其中一个至多个】 | `37` |
| `categoryCode` | — | string | 栏目分类代码【与stockCode、industryCode、industryCodeLv1、institutionCode组成多选多参数，必须传递其中一个至多个】 | `000100` |
| `beginDate` | — | string | 开始日期（格式yyyy-MM-dd） | `2020-01-01` |
| `endDate` | — | string | 结束日期（格式yyyy-MM-dd） | `2020-01-01` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |
| `key` | — | string | 关键字 | `光模块` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `guid` | 报告编号 | `B761EA4B-7146-436E-9C4E-03CE948A6DD4` |
| `reportId` | 报告id | `795857` |
| `title` | 标题 | `PICC Property and Casualty(02328.HK):PICC P&C to acquire 19.99% of Hua Xia Bank` |
| `author` | 作者 | `孙梦曦,王欢` |
| `date` | 发布时间 | `2016-01-04 09:54:27` |
| `institutionName` | 机构名称 | `Morgan Stanley` |
| `keyword` | 关键字 | `岭南控股作为广州市属文` |
| `content` | 内容 | `    我们将未来12个月美` |
| `categoryCode` | 栏目分类代码 | `000100` |
| `reportLanguage` | 报告语种 | — |
| `categoryCodeLv2` | 栏目二级分类代码 | `000111` |

### 接口示例

```bash
# Body JSON 可选参数: stockCode, industryCode, industryCodeLv1, institutionCode, categoryCode, beginDate, endDate, pageNum, pageSize, key
node scripts/gs-api.js report/research --method POST --body-json '{"stockCode":"600519","industryCode":"740100","industryCodeLv1":"640000"}'
```

### `stock/fin-ind-sw-rnk-q`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js stock/fin-ind-sw-rnk-q --method POST --body-json '{"industryCode":"640000","pageNum":1,"pageSize":20}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 9 \| `stock/fin-ind-sw-rnk-q` \| `list_stk_fin_ind_sw_rnk_q` \| 查询行业内公司财务排名，用于头部企业识别和排序线索；若仅返回排名而无收入/利润绝对值，不得直接计算收入/利润 CR \| `references/景气与结构/行业竞争结构快照.md` \| |
| \| 10 \| `stock/fin-ind-sw-rnk-q` \| `list_stk_fin_ind_sw_rnk_q` \| 查询个股在申万行业内的收入、利润、ROE、毛利率等财务排名；若仅返回排名而无收入/利润绝对值，只能用于头部企业识别和排序线索，不得直接计算收入/利润 CR \| `references/景气与结构/行业竞争结构摘要.md` \| |
| \| 查竞争结构摘要 \| `report/research` + `announcements` + `chain/com-main-pro` \| `stock/fin-ind-sw-rnk-q` + `market/quote-summaries` + `stock/insti_holding` + `industry/financial-overview` \| P0 直接披露的竞争结论、A股上市样本产品收入CR、产品收入样本份额、样本产品毛利池分布、排序线索、竞争方式、进入壁垒、A 股补充视角、风险提示 \| |
| \| 查竞争格局文本线索 \| `report/research` + `announcements` + `news/entity-related` \| `chain/com-main-pro` + `industry/financial-overview` + `industry/prosperity-index` + `industry/market-stats` + `stock/fin-ind-sw-rnk-q` + `market/quote-summaries` \| CR3/CR5、市场份额、利润池分布、价格战强度；只有 P0 直接披露可作主结论，其余必须标注估算/样本观察和估算方式 \| |

#### finance-data 参考文档摘录

## 个股财务指标申万行业排名(单季度)

接口路径：`stock/fin-ind-sw-rnk-q`
请求方式：**`POST`**
tool_id：`list_stk_fin_ind_sw_rnk_q`

接口说明：通过指定股票代码和报告期时间范围（格式为yyyy-MM-dd），查询单只股票在申万行业分类下的季度财务指标排名数据，包括股票及行业基础信息、报告期信息，以及总资产收益率、净资产收益率、营业收入、毛利率、净利率、归母净利润及其同比增长率、研发费用及其同比增长率和占比等多项核心财务指标在所属行业内的排名，用于分析个股在行业内的相对财务表现和竞争力。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `stockCode` | — | string | 股票代码【与stockCodes、industryCode组成多选一参数，必须且只能传递其中一个】 | `002594` |
| `stockCodes` | — | array | 股票代码列表【与stockCode、industryCode组成多选一参数，必须且只能传递其中一个】 | `['000001', '600519']` |
| `industryCode` | — | string | 行业代码【与stockCode、stockCodes组成多选一参数，必须且只能传递其中一个】 | `640000` |
| `beginDate` | — | string | 开始日期（格式yyyy-MM-dd）。 最小值:2020-01-01; | `2020-01-01` |
| `endDate` | — | string | 结束日期（格式yyyy-MM-dd） | `2025-03-30` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `stockCode` | 股票代码 | `000001.SZ` |
| `stockName` | 股票名称 | `贵州茅台` |
| `industryLevel` | 行业级别 | `1` |
| `industryCode` | 行业代码 | `1100000` |
| `industryName` | 行业名称 | `互联网科技` |
| `publishDate` | 发布日期 | `2023-08-15` |
| `reportType` | 报告类型 | `Q1` |
| `fiscalPeriod` | 会计期间 | `3` |
| `reportPeriodEnd` | 截止日期 | `2023-12-31` |
| `industryConstituentCount` | 行业股票数量 | `150` |
| `roaRank` | 总资产收益率个股排名 | `150` |
| `roeRank` | 净资产收益率个股排名 | `1` |
| `revenueRank` | 主营收入个股排名 | `150` |
| `grossMarginRank` | 毛利率个股排名 | `150` |
| `netMarginRank` | 净利率个股排名 | `150` |
| `netProfitParentRank` | 归母净利润个股排名 | `1` |
| `netProfitParentYoyRank` | 归母净利润同比增长率个股排名 | `150` |
| `rdExpenseRank` | 研发费用个股排名 | `150` |
| `rdExpenseYoyRank` | 研发费用同比增长率个股排名 | `125` |
| `rdExpenseRatioRank` | 研发费用占比个股排名 | `150` |
| `netProfitAdjRank` | 扣非净利润排名 | `100` |

### 接口示例

```bash
# Body JSON 可选参数: stockCode, stockCodes, industryCode, beginDate, endDate, pageNum, pageSize
node scripts/gs-api.js stock/fin-ind-sw-rnk-q --method POST --body-json '{"stockCode":"002594","stockCodes":["000001","600519"],"industryCode":"640000"}'
```

### `stock/industries`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js stock/industries --method POST stockCode=601012
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 2 \| `stock/industries` \| `get_stock_industries` \| 查询股票所属申万行业，用于从股票反查行业口径 \| `references/行业基础/股票所属行业.md` \| |
| \| 由股票反查行业 \| `stock/industries` \| `industries` \| 股票所属申万一级、二级、三级行业 \| |

#### finance-data 参考文档摘录

## 股票所属行业

接口路径：`stock/industries`
请求方式：**`POST`**
tool_id：`get_stock_industries`

接口说明：根据股票代码查询其所属的申万行业分类信息，包括股票代码、名称以及对应的一级、二级、三级行业代码和名称，适用于股票行业归属查询和行业分析。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `stockCode` | — | string | 股票代码【与stockCodes组成多选一参数，必须且只能传递其中一个】 | `000001` |
| `stockCodes` | — | array | 股票代码列表【与stockCode组成多选一参数，必须且只能传递其中一个】 | `['000001', '600519']` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `stockCode` | 股票代码 | `000001` |
| `stockName` | 股票名称 | `平安银行` |
| `industryCodeSwL1` | 申万一级行业代码 | `480000` |
| `industryNameSwL1` | 申万一级行业名称 | `银行` |
| `industryCodeSwL2` | 申万二级行业代码 | `480300` |
| `industryNameSwL2` | 申万二级行业名称 | `股份制银行Ⅱ` |
| `industryCodeSwL3` | 申万三级行业代码 | `480300` |
| `industryNameSwL3` | 申万三级行业名称 | `股份制银行Ⅱ` |

### 接口示例

```bash
# Body JSON 可选参数: stockCode, stockCodes, pageNum, pageSize
node scripts/gs-api.js stock/industries --method POST --body-json '{"stockCode":"000001","stockCodes":["000001","600519"],"pageNum":1}'
```

### `stock/insti_holding`

- 请求方式：`POST`
- 文档来源：转换包已有数据契约；finance-data references

#### 调用示例

```bash
node scripts/gs-api.js stock/insti_holding --method POST --body-json '{"stockCode":"600519"}'
```

#### 已有数据契约摘录

| 摘录 |
|---|
| \| 11 \| `stock/insti_holding` \| `list_stock_institutional_holdings_stats` \| 查询头部企业机构持股统计，用于机构偏好线索 \| `references/景气与结构/行业竞争结构摘要.md` \| |
| \| 查竞争结构摘要 \| `report/research` + `announcements` + `chain/com-main-pro` \| `stock/fin-ind-sw-rnk-q` + `market/quote-summaries` + `stock/insti_holding` + `industry/financial-overview` \| P0 直接披露的竞争结论、A股上市样本产品收入CR、产品收入样本份额、样本产品毛利池分布、排序线索、竞争方式、进入壁垒、A 股补充视角、风险提示 \| |
| \| A股视角 \| 机构偏好 \| `机构持股、流动性溢价线索` \| `stock/insti_holding`、行情数据 \| |

#### finance-data 参考文档摘录

## 机构持股统计

接口路径：`stock/insti_holding`
请求方式：**`POST`**
tool_id：`list_stock_institutional_holdings_stats`

接口说明：通过股票代码和日期范围查询沪深京股票的机构持股统计数据，包括基金、QFII、保险、社保基金、国家队等各类机构持有的A股流通股数量及占比、总股本数量及占比，以及相对于期初或流通股的增减持股份数量和比例，适用于分析机构投资者对特定股票的持仓变化和影响力。

### 输入参数

**Query 参数**

_无参数_

**Body JSON 参数**

| 参数名 | 必填 | 类型 | 说明 | 示例 |
|--------|:----:|------|------|------|
| `stockCode` | — | string | 股票代码【与stockCodes组成多选一参数，必须且只能传递其中一个】 | `002594` |
| `stockCodes` | — | array | 股票代码列表【与stockCode组成多选一参数，必须且只能传递其中一个】 | `['000001', '600519']` |
| `beginDate` | — | string | 开始日期（格式yyyy-MM-dd）。 最小值:2020-01-01; | `2020-01-01` |
| `endDate` | — | string | 结束日期（格式yyyy-MM-dd） | `2025-01-01` |
| `pageNum` | — | integer | 页码。 最小值:1; | `1` |
| `pageSize` | — | integer | 页长。 最小值:1; 最大值:500; | `10` |

### 输出参数

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `stockCode` | 股票代码 | `831697` |
| `stockName` | 中文简称 | `海优新材` |
| `date` | 截止日期 | `2025-09-30 00:00:00` |
| `infoSource` | 信息来源 | `第三季报` |
| `instHoldingAFloatShares` | 机构持有无限售流通A股数量合计(股) | `8055613` |
| `fundHoldingAFloatShares` | 基金持有无限售流通A股数量(股) | `1234567.89` |
| `qfiiHoldingAFloatShares` | QFII持有无限售流通A股数量(股) | `12345678.9` |
| `insuranceHoldingAFloatShares` | 保险公司持有无限售流通A股数量(股) | `123456789` |
| `pensionHoldingAFloatShares` | 社保基金持有无限售流通A股数量(股) | `12345678.9` |
| `nationalTeamHoldingAFloatShares` | 国家队持有无限售流通A股数量(股) | `123456789.12` |
| `instHoldingAFloatRatio` | 机构持有无限售流通A股比例合计(%) | `9.5873` |
| `fundHoldingAFloatRatio` | 基金持有无限售流通A股比例(%) | `3.75` |
| `qfiiHoldingAFloatRatio` | QFII持有无限售流通A股比例(%) | `3.75` |
| `insuranceHoldingAFloatRatio` | 保险公司持有无限售流通A股比例(%) | `3.75` |
| `pensionHoldingAFloatRatio` | 社保基金持有无限售流通A股比例(%) | `3.75` |
| `instHoldingAShares` | 机构持有A股数量合计(股) | `8281449` |
| `fundHoldingAShares` | 基金持有A股数量(股) | `225836` |
| `qfiiHoldingAShares` | QFII持有A股数量(股) | `1234567.89` |
| `insuranceHoldingAShares` | 保险公司持有A股数量(股) | `12345678.9` |
| `pensionHoldingAShares` | 社保基金持有A股数量(股) | `12345678.9` |
| `nationalTeamHoldingAShares` | 国家队持有A股数量(股) | `123456789.5` |
| `instHoldingARatio` | 机构持有A股比例合计(%) | `9.8561` |
| `fundHoldingARatio` | 基金持有A股比例(%) | `0.2688` |
| `qfiiHoldingARatio` | QFII持有A股比例(%) | `0.75` |
| `insuranceHoldingARatio` | 保险公司持有A股比例(%) | `3.75` |
| `pensionHoldingARatio` | 社保基金持有A股比例(%) | `3.75` |
| `instReduceAShares` | 机构持有A股减持数量合计(股) | `-9226892` |
| `fundReduceAShares` | 基金持有A股减持数量(股) | `-9974385` |
| `qfiiReduceAShares` | QFII持有A股减持数量(股) | `0` |
| `insuranceReduceAShares` | 保险公司持有A股减持数量(股) | `0` |

### 接口示例

```bash
# Body JSON 可选参数: stockCode, stockCodes, beginDate, endDate, pageNum, pageSize
node scripts/gs-api.js stock/insti_holding --method POST --body-json '{"stockCode":"002594","stockCodes":["000001","600519"],"beginDate":"2020-01-01"}'
```

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
