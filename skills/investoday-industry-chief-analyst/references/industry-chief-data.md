# 行业首席数据请求契约

> 本文件是主 Skill 的数据请求契约占位文件。当前主 Skill 不直接新增 `investoday-api` endpoint；所有数据通过 7 个子 Skill 的标准输出获得。
> PDF 需求中的景气评分、估值分位、政策评级、CR3/CR5/HHI、产业链盈利弹性和行业比较矩阵，也只能消费子 Skill 标准输出，不在主 Skill 临场新增接口。

## 适用 Skill

- 主 Skill：`investoday-industry-chief-analyst`
- 数据契约文件：`references/industry-chief-data.md`
- 适用范围：主入口编排层的数据边界与子 Skill 数据隔离规则。

## API 搜索确认记录

| 搜索轮次 | search-api 命令 | 业务数据项 | 候选 endpoint | Method | 关键入参 | 返回字段摘要 | 采用结论 | 原因 |
|---|---|---|---|---|---|---|---|---|
| 1 | 待用户确认后执行 | 主 Skill 直连接口 | 待确认 | 待确认 | 待确认 | 待确认 | 暂不采用 | 当前主 Skill 只消费子 Skill 标准输出 |

## 已确认数据请求总览

| 数据项 | endpoint | Method | CLI 命令模板 | 必填入参 | 可选入参 | 返回字段 | 使用方 | 是否必需 |
|---|---|---|---|---|---|---|---|---|
| 主 Skill 直连数据 | 不适用 | 不适用 | 不适用 | 不适用 | 不适用 | 不适用 | 主 Skill | 否 |

## 子 Skill 数据来源

| 数据域 | 数据来源 Skill | 使用方式 |
|---|---|---|
| 行业口径、估值、景气、产业链、竞争、文本线索 | `investoday-industry-data` | 读取标准用户态输出和数据缺口说明 |
| 代表公司候选/公司池候选线索 | `investoday-industry-data`、`investoday-research-report-query`、公司财务/估值相关子 Skill | 只读取 `source-skill-contracts.md` 定义的 `company_pool_candidates`、`company_type_mapping_evidence`、`company_pool_completeness_status`；主 Skill 不直连新增 endpoint |
| 量化评分、分位、评级、集中度、盈利弹性 | 7 个子 Skill 标准输出 | 有数据才输出；无数据、空结果或无法得出时正式报告省略，内部摘要记录 |
| 生命周期、需求、空间、竞争、政策、风险 | `investoday-industry-analysis` | 读取维度判断、证据和风险 |
| 公司财务数据包 | `investoday-financial-data-query` | 只供公司财务分析子 Skill 消费，主 Skill 不读取原始 data pack |
| 公司财务质量 | `investoday-company-financial-analysis` | 读取客户版财务摘要和风险因素 |
| 估值数据 | `investoday-valuation-data` | 读取核心估值表、行业估值和口径 |
| 估值分析 | `investoday-valuation-analysis` | 读取估值摘要、成长匹配和风险 |
| 研报证据 | `investoday-research-report-query` | 读取研报证据表和 `source_refs` |

## 数据隔离规则

- 主 Skill 不临场新增 endpoint。
- 子 Skill 使用自己的数据契约和接口规则。
- 主 Skill 只能读取 `source-skill-contracts.md` 中列出的标准交接字段。
- 若未来需要主 Skill 直连某个 endpoint，必须先执行 `investoday-api search-api` 或 `investoday-api list`，整理候选清单，经用户确认后再写入本文件。

## 缺口与兜底

| 缺口 | 影响 | 处理方式 | 输出提示 |
|---|---|---|---|
| 主 Skill 没有直连接口 | 不影响当前编排 | 使用子 Skill 标准输出 | 不展示底层接口 |
| 子 Skill 无数据 | 对应模块无法支撑正式结论 | 正式报告省略对应指标、表格行或章节 | 内部摘要记录缺失内容和触发原因 |
| 公司池候选字段缺失 | 无法补齐对应公司类型 | 触发 `company_pool_completeness_status=incomplete`，正式表仅展示合格且不重复类型 | 内部摘要记录缺失类型和证据缺口 |
| 需要新增数据域 | 当前无法直接使用 | 先形成 API 候选清单并确认 | 待确认数据接口 |

## 验收标准

- 本文件不得写入未确认 endpoint。
- 主 Skill 不读取子 Skill 原始接口响应。
- 子 Skill 数据交接以 `source-skill-contracts.md` 为准。
- 缺失数据、空值和接口失败在最终报告中有明确说明。
