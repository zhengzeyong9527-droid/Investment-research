---
name: investoday-valuation-analysis
title: "估值分析"
version: "2.0.0"
description: "提供A股估值分析编排与结论生成，覆盖个股估值分析、PEG估值、成长匹配估值、安全边际、合理估值区间、情景DCF、反向DCF、估值分位、行业板块估值、个股在板块里贵不贵、估值方法选择、现金流估值辅助、PE/PB/PS/PEG对比和估值适用边界。Use when: 用户要分析股票估值高低、PEG是否合理、安全边际是否充足、合理估值区间、DCF估值、行业估值分位、板块估值水位、估值与成长是否匹配，或上层投资策略skill需要可复用的估值分析摘要。Do not use when: 用户只要原始估值数据查询、要求直接买卖建议、要求确定性目标价承诺、要求自动下单、要求编造缺失估值数据，或问题与金融估值无关。"
tags:
  - investoday
  - investoday-valuation-analysis
  - stock-valuation
  - peg
  - margin-of-safety
  - industry-valuation
  - a-share
metadata:
  clawdbot:
    emoji: "📊"
    category: "finance"
    requires:
      skills:
        - investoday-valuation-data
    quality_pipeline:
      type: role_pipeline
      fallback: current_model_role_pass
      pipelines:
        valuation_analysis:
          - valuation_analysis_executor
        no_agent_clarify: []
        no_agent_handoff: []
      route_agent_pipelines:
        full_valuation_analysis:
          pipeline: valuation_analysis
          required: false
        peg_growth_fit:
          pipeline: valuation_analysis
          required: false
        margin_of_safety:
          pipeline: valuation_analysis
          required: false
        industry_board_valuation:
          pipeline: valuation_analysis
          required: false
        valuation_method_selection:
          pipeline: valuation_analysis
          required: false
        compact_parent_summary:
          pipeline: valuation_analysis
          required: false
        clarify_missing_input:
          pipeline: no_agent_clarify
          required: false
          clarify: true
        out_of_scope:
          pipeline: no_agent_handoff
          required: false
          handoff: true
requirements:
  skills:
    - name: investoday-valuation-data
  network_access: true
---

# 估值分析

面向 A 股个股与行业板块的估值分析 skill。核心职责是调用 `$investoday-valuation-data` 获取结构化估值数据包，再进行成长匹配、安全边际、行业/板块估值位置和估值方法适配分析。

**核心定位：估值分析编排层。数据获取交给 `$investoday-valuation-data`；用户可见内容只呈现估值指标、分析逻辑和数据缺口，不暴露内部技术细节。不要输出直接买卖建议、确定性目标价承诺或无法由数据支撑的估值结论。**

## 典型场景

- 分析个股估值高不高、贵不贵、处在什么估值水位
- 计算或解释 PEG，判断估值与未来成长是否匹配
- 分析安全边际是否充足，给出合理估值区间和估值状态
- 分析个股相对行业、行业相对历史分位、行业相对宽基指数的位置
- 判断当前公司更适合 PE、PB、PS、PEG、现金流、股息率还是多方法交叉验证
- 作为上层策略 skill 的估值分析子模块，返回紧凑结构化摘要

## 不适合什么

- 只查询 PE、PB、PS、PEG、股息率、历史分位等原始数据；此类任务应使用 `$investoday-valuation-data`
- 直接给出买入、卖出、持有建议
- 承诺目标价、涨跌幅或未来收益
- 在自由现金流、风险利率、盈利预测、行业分位等关键数据缺失时把假设伪装成事实
- 把外部目标价或市场预期解释为确定性上涨空间
- 用单一估值倍数替代完整风险判断

## 前置依赖

- skill: `investoday-valuation-data`

运行时需要访问估值数据服务；联网能力已在 `requirements.network_access` 声明。

`requirements.skills` 与 `metadata.clawdbot.requires.skills` 必须同步声明 `investoday-valuation-data`。

## 输入要求

### 可接受输入

- A 股股票代码或完整股票名称，如 `300750`、`宁德时代`
- 行业、板块、指数或概念名称，如 `半导体`、`沪深300`
- 分析范围：完整估值分析、PEG、成长匹配、安全边际、合理估值区间、行业估值分位、估值方法选择
- 可选上下文：行业生命周期、景气度、市场周期、政策环境、风险偏好、父级策略已形成的公司分类

### 最小输入

- 个股估值分析：1 个可识别 A 股标的
- 行业/板块估值：1 个可识别行业、板块或指数

### 推荐输入

- 股票代码 + 股票名称 + 分析范围
- 父级 skill 调用时传入公司类型、行业阶段、盈利质量、景气位置和风险提示
- 安全边际分析最好补充市场周期、风险利率或现金流假设；缺失时按可得数据选择完整 DCF、简化情景 DCF、反向 DCF 或相对估值辅助

### 可选输入

- `market_cycle`: `bull` / `bear` / `volatile` / `neutral`
- `company_type`: `high_growth` / `stable_growth` / `cyclical` / `value` / `platform` / `financial`
- `analysis_depth`: `compact` / `standard` / `full`
- 上游已获取的估值数据包、行业数据包或风险提示

### 默认假设

- 未指定市场时，默认按 A 股分析。
- 未指定分析范围时，默认做完整估值分析，但只展示与数据匹配的模块。
- 未指定市场周期时，默认按中性/震荡环境处理。
- 关键数据不可得时，优先给出可解释的情景假设和数据缺口；不能把历史增速、主观假设或行业印象写成已验证事实。

### 输入校验

- 名称匹配多个证券、行业或指数时，先列候选项并要求确认。
- 无法识别标的时，要求补充代码或完整名称。
- PEG 分析必须存在有效 PE 与外部提供或上游传入的未来盈利预测；本 skill 不主动获取第三方预测衍生指标。未来预测不可得、预测为负、接近零或来源不清时，PEG 不计算或标注参考价值有限，不得使用诊断 PEG 或历史增速替代。
- 安全边际分析必须说明估值区间来源；DCF 或现金流法数据不足时必须切换到更弱口径，例如简化情景 DCF、反向 DCF 或现金流辅助验证。
- 行业分位必须说明样本窗口或数据口径；没有样本时不输出分位。

### 缺失输入处理

- 缺少标的：追问用户补充股票、行业、板块或指数。
- 缺少分析范围：默认进入完整估值分析。
- 缺少市场周期：按中性/震荡环境给出估值区间和风险提示。
- 缺少自由现金流、风险利率或盈利预测：保留安全边际框架，先判断能否用保守假设做简化情景 DCF；仍不足时用反向 DCF 或 PE/PB/PS/股息/现金流辅助数据。
- 只有“这只股票能不能买”：转为估值状态分析，避免直接买卖建议。

### 示例输入

```text
帮我做一下宁德时代的完整估值分析，重点看PEG和安全边际。
```

```text
半导体行业现在估值分位高不高？
```

```text
只看贵州茅台的安全边际，给出合理估值区间和风险区间。
```

### 反例输入

```text
直接告诉我这只股票该不该买，给目标价。
```

原因：本 skill 只输出估值分析、估值状态和数据边界，不输出直接交易建议或确定性目标价承诺。

## 意图路由

本节只在 skill 已由 frontmatter `description` 触发后使用，用于把估值分析请求分派到具体工作流；缺失输入先追问，买卖建议、目标价承诺或非估值问题说明不适用并转交。

| route id | 用户意图 | 必要输入 | Agent 自动触发 | 进入工作流 | 数据依赖 | 输出 |
|----------|----------|----------|----------------|------------|----------|------|
| `full_valuation_analysis` | 完整个股估值分析 | A 股代码或名称 | 可 `Spawn valuation_analysis_executor to analyze valuation`；无 subagent 时当前模型执行 | 读取输出模板、估值方法、PEG、安全边际、行业板块 reference | `$investoday-valuation-data` 全量估值数据包 | 综合估值摘要和分模块结论 |
| `peg_growth_fit` | PEG 或成长匹配估值 | A 股代码或名称 | 可 `Spawn valuation_analysis_executor to analyze valuation`；无 subagent 时当前模型执行 | 读取 `references/成长匹配估值/PEG估值分析.md` | PE、可用预期净利润数据、行业估值、历史估值水位 | PEG、情景测算、适用边界 |
| `margin_of_safety` | 安全边际、DCF 或合理估值区间 | A 股代码或名称 | 可 `Spawn valuation_analysis_executor to analyze valuation`；无 subagent 时当前模型执行 | 读取 `references/安全边际估值/安全边际估值框架.md` | 核心估值、历史估值、行业估值、现金流、分红、国债收益率 | 合理估值区间、安全边际状态、DCF 层级 |
| `industry_board_valuation` | 行业/板块估值水位 | 行业、板块或指数 | 可 `Spawn valuation_analysis_executor to analyze valuation`；无 subagent 时当前模型执行 | 读取 `references/行业板块估值/行业板块估值分析.md` | 行业/指数估值、行业分位、板块行情 | 行业估值分位和相对位置 |
| `valuation_method_selection` | 不确定该用哪种估值法 | A 股代码或公司类型 | 可 `Spawn valuation_analysis_executor to analyze valuation`；无 subagent 时当前模型执行 | 读取 `references/估值方法选择/估值方法选择与适用边界.md` | 核心估值、盈利质量、现金流、行业信息 | 主估值方法和辅助方法 |
| `compact_parent_summary` | 父级 skill 调用摘要 | A 股代码或估值数据包 | 可 `Spawn valuation_analysis_executor to analyze valuation`；无 subagent 时当前模型执行 | 读取 `references/输出模板/估值分析输出模板.md` | 已传入数据包或 `$investoday-valuation-data` | 结构化紧凑摘要 |
| `clarify_missing_input` | 输入不足或多候选 | 缺失项本身 | 无，当前 skill 直接追问 | 先追问，不做估值分析 | 无 | 候选项或最小补充输入 |
| `out_of_scope` | 买卖建议、目标价承诺、非估值问题 | 不适用 | 无，当前 skill 说明不适用或转交 | 转交对应投资研究 skill，或说明边界 | 无 | 边界说明，不编造结论 |

## 工作流

1. 识别标的类型、市场、分析范围和输出深度。
2. 若用户只要原始数据，转用 `$investoday-valuation-data`；若用户要分析，继续本 workflow。
3. 调用 `$investoday-valuation-data` 获取所需数据包：
   - 个股核心估值：PE、PB、PS、市值、价格、历史估值
   - 综合估值指标：PEG、EV 倍数、P/OCF、P/FCF、行业相对位置
   - 成长能力辅助：营收、净利润、EPS、经营现金流增长；用于验证成长质量，不替代未来预测
   - 外部预测数据：仅复用用户或上游明确提供的未来 EPS、净利润或增长假设；未提供时记录数据缺口，不主动获取第三方预测衍生指标
   - 行业/指数估值：行业 PE/PB/PS 分位、宽基指数估值
   - 估值辅助：分红、回购、经营现金流、自由现金流辅助口径、国债收益率
4. 根据意图读取对应 reference；完整分析时按输出模板组合多个模块。
5. 做估值方法适配，先判断主估值方法，再决定是否展开 PEG、安全边际或行业相对估值。
6. 生成结论时必须区分“数据事实”“估值推断”“适用边界”。
7. 输出中性估值状态，不给直接买卖建议。

## Reference 路由

- `docs/references-index.md`：不确定读取哪个 reference 时先读。
- `references/成长匹配估值/PEG估值分析.md`：用户问 PEG、成长匹配、估值与增速是否匹配时读。
- `references/安全边际估值/安全边际估值框架.md`：用户问安全边际、DCF、合理估值区间、估值下沿、估值泡沫或风险区间时读。
- `references/行业板块估值/行业板块估值分析.md`：用户问行业估值分位、板块贵不贵、个股相对行业估值时读。
- `references/估值方法选择/估值方法选择与适用边界.md`：用户问该用什么估值法、公司类型不清、PEG/DCF/PB 是否适用时读。
- `references/输出模板/估值分析输出模板.md`：完整输出、单模块输出或父级 skill 调用摘要时读。

## 输出规则

- 默认输出结构：估值结论摘要、成长匹配估值、安全边际估值、行业/板块估值位置、估值方法与逻辑、适用边界与数据缺口。
- 单模块问题只输出对应模块和必要边界，不强行展开完整框架。
- 父级 skill 调用时优先输出紧凑结构化摘要。
- 估值区间必须说明来源、方法和缺失项；不能把机构目标价当作合理价值。
- 安全边际可表达为“安全边际充足/部分具备/接近合理/安全边际不足/泡沫预警”，不要写成直接买卖动作。
- 所有内部来源、参考来源、模板来源都不要出现在用户可见结论中。
- 用户可见输出统一写作“PEG”“PEG 结论”“预测数据不可得”“数据口径”等业务表达，不使用内部技术标签。

## 失败处理

- `$investoday-valuation-data` 无法获取数据：说明缺失的数据类型，停止基于该数据继续推断。
- PE 为负、盈利预测为负或接近零：PEG 不适用，转向 PB、现金流、股息或周期中枢等辅助框架。
- 自由现金流或风险利率不可得：不做完整 DCF；优先尝试简化情景 DCF 或反向 DCF，仍不足时只做现金流质量观察或相对估值。
- 行业估值分位不可得：保留个股估值分析，标注行业相对位置缺失。
- 市场周期不可判断：按中性/震荡环境输出，不加入强周期修正。
- 数据样本不足：展示已得事实和缺口，不输出百分位、估值区间或安全边际比例。

## 交付说明

- 文件结构：`SKILL.md` + `docs/references-index.md` + `references/` 下 5 个分析参考文档。
- 格式：Investoday 扩展格式，包含 `title`、`version`、`tags`、`metadata.clawdbot`、`requirements`。
- 核心边界：数据查询交给 `$investoday-valuation-data`，本 skill 只做估值分析、解释和结构化摘要。
