# 维度计划索引

本文件是成长大师维度执行和轻量画像的唯一调度入口。轻量分析、完整分析、单维度、行业直问、成长股特征筛选和多标的对比都先生成 `dimension_plan`，再按本索引读取命中的轻量契约或维度 reference。

模板只负责最终版式；维度 reference 负责分析契约、数据需求、子 Skill 依赖、证据要求和输出槽位。

## dimension_plan

每次业务分析必须先生成 `dimension_plan`。该计划用户不可见，只用于限制读取范围和执行深度。

```json
{
  "dimension_id": "peg_valuation",
  "reference": "05-PEG估值分析.md",
  "execution_depth": "summary_fast|summary|full|focused|industry|screening|comparison",
  "required_sub_skill": "gs-valuation-analysis",
  "output_slot": "peg_valuation"
}
```

`dimension_plan` 可以有多个条目。`summary_fast` 用于普通单股轻量版快速画像，只读取 `light-fast-summary.md` 和五个轻量槽位；summary 和 full 可以读取六维；focused 只读取命中维度；industry 只读取行业相关维度；screening 只读取成长股特征匹配相关维度。

## 维度映射

| dimension_id | reference | 子 Skill | output_slot |
|---|---|---|---|
| `circle_and_fit` | `../01-能力圈与框架适配分析.md` | 无固定子 Skill | `circle_and_fit` |
| `industry_lifecycle` | `../02-行业生命周期评估.md` | `gs-industry-analysis` | `industry_lifecycle` |
| `industry_sentiment` | `../03-行业景气度评估.md` | `gs-industry-analysis` | `industry_sentiment` |
| `earnings_forecast` | `../04-企业盈利预测.md` | `gs-company-financial-analysis` | `earnings_forecast` |
| `peg_valuation` | `../05-PEG估值分析.md` | `gs-valuation-analysis` | `peg_valuation` |
| `growth_feature_match` | `../06-成长股特征匹配编排.md` | `gs-growth-master-growth-feature-match` | `growth_feature_match` |

## 轻量画像槽位

`summary_fast` 不读取上表 `01-06` 完整维度 reference，只生成以下轻量槽位：

| light_slot | 数据范围 | 默认子 Skill 请求 |
|---|---|---|
| `circle_and_business_light` | 标的识别、主营业务、生意可理解度、成长大师六类初判 | 不固定调用子 Skill |
| `industry_snapshot` | 行业归属、生命周期/景气的一句话摘要、最大不确定性 | 行业分析子 Skill 的 `compact_parent_summary` |
| `financial_snapshot` | 最近核心收入、利润、现金流、ROE/毛利率等摘要；最多最近 3 个完整年度 + 最近一期 | 财务分析子 Skill 的 `compact_parent_summary` |
| `forecast_snapshot` | 近期机构预测样本摘要、未来 1-3 年预测方向、样本可靠性边界 | 研报查询子 Skill 的预测评级紧凑标准输出 |
| `valuation_snapshot` | 当前 PE/PB/PS、市值、估值日期、估值成长匹配摘要；未展开的 PEG/行业 PEG 不输出用户可见占位 | 估值分析子 Skill 的 `compact_parent_summary` |

研报查询在 `summary_fast` 中只承担近期机构预测样本摘要，不进入评级变动原因、研报文本线索或研报观点风险深链路。只有命中维度 reference 明确需要预测修正摘要、研报文本线索或研报观点风险时，才读取 `gs-research-report-query` 的更完整请求契约或消费其扩展标准输出。

## route 到维度集合

| route_id | dimension_plan |
|---|---|
| `single_stock_light_readable` | `light_fast_profile` 五槽位，`execution_depth=summary_fast`；不读取 `01-06` 完整维度 reference；必须补充近期机构预测样本摘要；PEG 三情景、评级变动原因和成长股特征深层证据默认不补跑，也不输出用户可见占位 |
| `single_stock_full_flow` | 六维全部，`execution_depth=full` |
| `single_dimension_analysis` | 只包含用户命中的维度，`execution_depth=focused` |
| `industry_direct_analysis` | `industry_lifecycle`、`industry_sentiment`，`execution_depth=industry` |
| `growth_feature_screening` | `growth_feature_match`，`execution_depth=screening` |
| `multi_stock_comparison` | 每个标的六维全部，默认 `execution_depth=comparison`；明确完整对比时使用 `full` |
| `industry_classification` | 不生成事实型六维计划；读取 `growth-master-six-types.md` 和 `industry-codes.md` |
| `clarify_industry_scope` / `clarify_invalid_input` | 不生成事实型六维计划 |

## 输出深度

| execution_depth | 槽位规则 |
|---|---|
| `summary_fast` | 只产出五个轻量槽位和最终简析；只取标的识别、行情估值、核心财务、行业归属、必要行业景气摘要和近期机构预测样本摘要；不读取 `01-06`，不默认调用评级变动原因、PEG 行业深链路或成长股特征深层补证 |
| `summary` | 每维产出 1 条摘要判断、1 条关键证据、1 个最大缺口或反证；最终压缩成轻量可读版 |
| `full` | 每维使用对应 reference 的完整用户可见模板，保留字段、表格和数据不足占位 |
| `focused` | 命中维度使用对应 reference 的单维度完整模板，不追加未命中维度 |
| `industry` | 输出行业生命周期和行业景气度，不套用个股六维报告 |
| `screening` | 输出成长股特征候选筛选逻辑和必要证据缺口 |
| `comparison` | 每个标的按六维摘要生成对比依据，不排序推荐买入 |

## 补充数据读取规则

维度子 Skill 输出不足且命中维度 reference 明确要求补充标准输出时，才读取 `../08-调用链路与数据补充.md` 的对应条目。`summary_fast` 轻量分析不读取整份补充手册，也不因缺口升级到完整维度；单维度、行业直问和多标的对比的补充只服务当前 `dimension_plan` 命中的缺口。`summary_fast` 下近期机构预测样本摘要是必取槽位；PEG 分母、行业 PEG、评级变化原因或成长股特征深层证据默认不展开，除非用户明确追问该维度；未展开项目不得输出“暂不展示”或同类占位话术。

## 自检

- `dimension_plan` 是否只包含当前 route 需要的维度？
- `execution_depth` 是否与 route 一致？
- 单维度请求是否没有读取未命中维度？
- 行业直问是否没有套用个股六维报告？
- 轻量版是否使用 `summary_fast` 五槽位，且没有读取 `01-06`、要求完整标准中间结果、评级变动原因或 PEG 行业深链路？
- 完整报告是否仍保留 `01-06` 完整模板要求？
