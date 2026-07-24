# 核心工作流

本文件是成长大师 skill 触发后的运行总控，负责 route 判定、`response_contract`、`dimension_plan`、最小读取集、执行深度、升级逻辑和最终自检。输入预检细节归 `00-意图路由与输入预检.md`；维度映射归 `dimensions/index.md`；用户输出归 `07-综合输出与表达规范.md`；合规门禁归 `09-输出前校验与合规.md`。

每次执行只读取当前 route 必需的最小文件集。先确定唯一 `route_id`，再生成 `response_contract` 和 `dimension_plan`；除非当前 route 明确需要，不要默认读取全部 reference、全部子 Skill 或完整报告模板。

## 固定入口

1. 读取 `../SKILL.md`，确认触发、输入要求和最高优先级边界。
2. 读取本文件，确定唯一 `route_id`、执行深度和最小读取集。
3. 读取 `dimensions/index.md`，生成或校验 `dimension_plan`。
4. 读取当前 route 命中的轻量契约或维度 reference、输出规则和合规规则。

## Route 到最小读取集

| route_id | 执行深度 | 必读文件 | 按需文件 |
|---|---|---|---|
| `industry_classification` | `classification` | `../SKILL.md`、本文件、`growth-master-six-types.md`、`industry-codes.md`、`07-综合输出与表达规范.md`、`09-输出前校验与合规.md` | `00-意图路由与输入预检.md` |
| `clarify_industry_scope` | `clarify` | `../SKILL.md`、本文件、`00-意图路由与输入预检.md` | 无 |
| `industry_direct_analysis` | `industry` | `../SKILL.md`、本文件、`dimensions/index.md`、`02-行业生命周期评估.md`、`03-行业景气度评估.md`、`07-综合输出与表达规范.md`、`09-输出前校验与合规.md` | 行业分析子 Skill 请求契约；缺口需要时读取 `08-调用链路与数据补充.md` |
| `single_dimension_analysis` | `focused` | `../SKILL.md`、本文件、`dimensions/index.md`、命中维度 reference、`07-综合输出与表达规范.md`、`09-输出前校验与合规.md` | 命中维度对应子 Skill 请求契约；缺口需要时读取 `08-调用链路与数据补充.md` |
| `growth_feature_screening` | `screening` | `../SKILL.md`、本文件、`dimensions/index.md`、`06-成长股特征匹配编排.md`、`07-综合输出与表达规范.md`、`09-输出前校验与合规.md` | 成长股特征匹配子 Skill；缺口需要时读取 `08-调用链路与数据补充.md` |
| `single_stock_light_readable` | `summary_fast` | `../SKILL.md`、本文件、`dimensions/index.md`、`light-fast-summary.md`、`07-综合输出与表达规范.md`、`09-输出前校验与合规.md` | 只取标的识别、行情估值、核心财务、行业归属、必要行业景气摘要和近期机构预测样本摘要；不得读取 `01-06` 完整维度 reference，不读取完整报告模板，不默认调用评级变动原因、PEG 行业深链路或成长股特征深层补证 |
| `single_stock_full_flow` | `full` | `../SKILL.md`、本文件、`dimensions/index.md`、六维 reference、`07-综合输出与表达规范.md`、`09-输出前校验与合规.md` | 五个事实型子 Skill 请求契约；缺口需要时读取 `08-调用链路与数据补充.md` |
| `multi_stock_comparison` | `comparison` | `../SKILL.md`、本文件、`dimensions/index.md`、六维 reference、`07-综合输出与表达规范.md`、`09-输出前校验与合规.md` | 每个标的涉及的子 Skill 请求契约；明确完整对比时使用 full 深度 |
| `clarify_invalid_input` | `clarify` | `../SKILL.md`、本文件、`00-意图路由与输入预检.md`、`09-输出前校验与合规.md` | 无 |

## Route 判定优先级

1. `clarify_invalid_input`：缺少可识别标的、行业、筛选范围，或命中买卖点、目标价、仓位等越界请求。
2. `clarify_industry_scope`：行业词过宽、跨行业主题或候选口径过多。
3. `industry_classification`：用户询问行业属于成长大师六类公司中的哪一类。
4. `single_dimension_analysis`：用户说“仅看”“只看”“单独分析”并给出明确维度。
5. `growth_feature_screening`：用户要求筛选成长股候选、成长股特征或行业候选方向。
6. `industry_direct_analysis`：用户直问行业、板块或赛道。
7. `multi_stock_comparison`：用户给出两个或以上 A 股标的并要求对比。
8. `single_stock_full_flow`：用户明确说完整、全面、深度、查看完整分析、五维度或六维度分析。
9. `single_stock_light_readable`：默认单股分析。

每次回答只能确定一个 `route_id`。多个关注点通过 `dimension_plan` 表达，不创建多个并行 route。

## Response Contract

命中业务 route 后先生成内部 `response_contract`：

```json
{
  "route_id": "",
  "execution_depth": "summary_fast|summary|full|focused|industry|screening|comparison|classification|clarify",
  "required_sections": [],
  "dimension_plan": [],
  "template_source": "",
  "forbidden_terms": ["买入", "卖出", "持有", "目标价", "仓位", "上涨空间"],
  "missing_data_policy": "continue_with_gap_note"
}
```

`response_contract` 不向用户展示；它只用于限制读取范围、下游调用和输出结构。

## 深度规则

- `summary_fast`：普通单股轻量版快速画像。只读 `light-fast-summary.md`，只产出 5 个轻量槽位：生意与分类、行业快照、财务快照、预测快照、估值快照；默认只取标的识别、行情估值、核心财务、行业归属、必要行业景气摘要和近期机构预测样本摘要。不得读取 `01-06` 完整维度 reference，不逐段嵌入完整模板，不调用评级变动原因或完整盈利预测链路。
- `summary`：六维都可读取，但每维只产出 1 条摘要判断、1 条关键证据和 1 个最大缺口或反证；不逐段嵌入完整模板。
- `full`：读取并展开 `01-06` 完整用户可见模板，保留字段、表格和数据不足占位。
- `focused`：只读取用户命中的维度 reference；不读取其他未命中维度。
- `industry`：只读取行业生命周期、行业景气度和必要输出/合规规则。
- `screening`：只读取成长股特征匹配和必要输出/合规规则。
- `comparison`：默认每个标的按 summary 深度执行；用户明确要求完整对比时才使用 full 深度。

## 轻量到完整升级

用户在轻量版后追问“查看完整分析”“展开完整报告”或同义表达时，进入 `single_stock_full_flow`。执行时复用仍然有效的 `summary_fast` 标的识别、关键证据和缺口，只补齐 full 级维度内容；不要把首次轻量版设计为预取完整链路。

## 自检

- 是否已确定唯一 `route_id`？
- 是否已生成 `response_contract` 和 `dimension_plan`？
- 当前读取文件是否匹配 route 的最小读取集？
- 轻量版是否只输出 `summary_fast` 五块快速画像，而不是读取 `01-06`、完整六维报告、评级变动原因或 PEG 行业深链路？
- 单维度是否只读取命中维度？
- 完整报告是否读取并展开 `01-06`？
- 是否避免默认读取全部 reference、全部子 Skill 或完整报告模板？
