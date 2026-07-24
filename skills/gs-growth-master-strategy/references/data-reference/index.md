# 数据接口契约索引

本目录集中维护 `gs-growth-master-strategy` 综合业务包的数据接口契约，用于约束事实数据来源、请求边界、标准输出字段、模块间数据交接和用户可见口径。

## 使用边界

- 本目录只维护数据接口契约、字段交接口径、空值处理和 CLI 请求示例。
- 分析框架、业务规则、评分规则、质量门禁、验收清单、报告模板和普通参考说明不放入本目录。
- 本目录不保存真实 API Key、Token、密钥或本机私密路径。
- 用户可见报告不得直接暴露接口路径、工具 ID、原始字段名、失败码、请求参数或内部调试信息；除非进入内部审计或排障材料。

## 主包事实入口

- 数据地址与授权配置说明：[setup-api-key.md](../setup-api-key.md)
- 公共请求脚本：`../../scripts/gs-api.js`
- 默认 Markdown 输出模板：`../../assets/templates/output-markdown-report-template.md`
- 可选 HTML 输出模板：`../../assets/templates/output-html-report-template.md`

## 公共请求脚本调用规则

底层取数优先通过 `node ../../scripts/gs-api.js` 发起，尤其是 Windows / PowerShell 环境。普通查询参数继续使用 `key=value`；POST Body 参数优先使用脚本提供的 `--body key=value ...`，由脚本自动转成合法 JSON 后再调用底层 CLI，避免 PowerShell 拆分 `--body-json` 内部双引号。

推荐写法：

```bash
node ../../scripts/gs-api.js stock/val-indicators --method POST --body stockCode=600519 pageSize=1
node ../../scripts/gs-api.js stock/income-statements --method POST --body stockCode=600519 beginDate=2026-01-01 endDate=2026-07-01 pageSize=1
```

标准版 CLI 示例统一写为：

```bash
node scripts/gs-api.js stock/val-indicators --method POST --body-json '{"stockCode":"600519","pageSize":1}'
```

仅在需要嵌套对象、数组或复杂文本时使用 `--body-json`；使用前先做最小请求验证。用户可见报告仍不得展示调用命令、参数、原始 JSON 或内部取数细节。

## 数据契约清单

### 行业数据

| 文件 | 覆盖能力 |
|---|---|
| [industry-data-行业列表.md](industry-data-行业列表.md) | 行业分类列表、行业代码和行业名称识别。 |
| [industry-data-股票所属行业.md](industry-data-股票所属行业.md) | 股票所属行业、行业层级和行业归属口径。 |
| [industry-data-行业实时行情.md](industry-data-行业实时行情.md) | 行业实时行情、涨跌幅、成交和行情快照。 |
| [industry-data-板块排名.md](industry-data-板块排名.md) | 行业/板块表现排名和区间排序。 |
| [industry-data-行业景气度.md](industry-data-行业景气度.md) | 行业景气、热度、活跃度和趋势观察。 |
| [industry-data-行业竞争结构快照.md](industry-data-行业竞争结构快照.md) | 行业竞争格局、集中度和代表公司结构线索。 |
| [industry-data-行业估值数据.md](industry-data-行业估值数据.md) | 行业 PE/PB/PS、分位和估值对比。 |
| [industry-data-指数估值数据.md](industry-data-指数估值数据.md) | 指数估值、行业指数估值和估值日期。 |
| [industry-data-行业财务指标.md](industry-data-行业财务指标.md) | 行业财务指标、收入利润和经营质量对比。 |
| [industry-data-行业盈利指标.md](industry-data-行业盈利指标.md) | 行业盈利能力、利润率和盈利变化。 |
| [industry-data-行业预测轮动换手率.md](industry-data-行业预测轮动换手率.md) | 行业预测、轮动、换手率和活跃度补充。 |
| [industry-data-行业产业链数据.md](industry-data-行业产业链数据.md) | 产业链行业信息、产品信息、上下游关系和公司产业链图谱。 |
| [industry-data-市场空间与政策监管.md](industry-data-市场空间与政策监管.md) | 研报、新闻、实体相关新闻和公告中的市场空间、政策监管文本线索。 |

### 研报数据

| 文件 | 覆盖能力 |
|---|---|
| [gs-research-report-query.md](gs-research-report-query.md) | 研报查询原子能力的标准输出、`source_refs` 和上层消费边界。 |
| [research-report-研报基础数据.md](research-report-研报基础数据.md) | 研报列表和基础检索字段。 |
| [research-report-研报特色数据.md](research-report-研报特色数据.md) | 研报向量搜索和文本证据抽取。 |
| [research-report-研报投资评级.md](research-report-研报投资评级.md) | 股票研报预测评级、预测评级变动和预测修正摘要。 |

### 估值数据

| 文件 | 覆盖能力 |
|---|---|
| [valuation-data-A股核心估值指标.md](valuation-data-A股核心估值指标.md) | A 股 PE/PB/PS、市值、换手率和核心估值快照。 |
| [valuation-data-估值辅助数据.md](valuation-data-估值辅助数据.md) | 估值辅助行情、财务、预测和可比分析数据。 |
| [valuation-data-指数行业估值数据.md](valuation-data-指数行业估值数据.md) | 指数与行业估值、行业基准和估值日期补充。 |

## 维护规则

1. 新增数据能力时，应先补充对应的数据接口契约，再更新调用说明和输出口径。
2. 数据契约必须说明可用 endpoint、工具 ID、关键入参、返回字段、字段含义、空值处理和用户可见来源表达。
3. 每个具体接口请求必须提供标准版 `node scripts/gs-api.js <endpoint>` CLI 示例；主包运行时可用 `scripts/gs-api.js` 包装执行。
4. 数据契约与实际请求脚本或模块输出不一致时，应同步修正，避免同一字段出现多套口径。
5. 非数据契约资料继续在对应业务模块目录维护，由主入口或模块入口按需引用。
