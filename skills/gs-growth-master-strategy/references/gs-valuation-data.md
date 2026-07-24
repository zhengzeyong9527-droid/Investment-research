# 子 Skill 参考：gs-valuation-data

- 原路径：`skills/gs-valuation-analysis/skills/gs-valuation-data/SKILL.md`
- 转换说明：券商交付简化模式已移除 `skills/` 嵌套目录；本文件保留原子 Skill 的执行口径供主 Skill 按需引用。

## 原 Skill 正文

﻿---
name: gs-valuation-data
title: "估值数据查询"
version: "2.0.0"
description: "提供估值数据查询，覆盖A股个股PE/PB/PS、市值、历史估值样本、成长能力指标、指数估值、行业估值分位、股息率、分红、回购、现金流、每股自由现金流和国债收益率辅助口径。Use when: 用户要查估值数据、个股估值、PE、PB、PS、市盈率、市净率、市销率、估值分位、历史估值、成长性、营收增速、净利润增速、EPS增速、行业估值、指数估值、股息率、回购收益率、自由现金流收益率、无风险利率、国债收益率，或后续估值分析需要先拉取结构化估值数据。Do not use when: 用户要求直接买卖建议、目标价承诺、完整估值模型定价、DCF建模、期权/债券估值、第三方预测衍生指标查询、诊断PEG、行业排名、历史行业排名、EV倍数、非金融估值，或缺少证券/指数/行业代码时要求编造具体估值数据。"
tags:
  - gs
  - gs-valuation-data
  - stock-valuation
  - index-valuation
  - industry-valuation
  - dividend-yield
  - free-cash-flow
  - a-share
metadata:
  clawdbot:
    emoji: "💹"
    category: "finance"
    requires:
      skills:
        - gs-finance-data
requirements:
  skills:
    - name: gs-finance-data
  node: ">=18"
  packages:
    - name: "@gs/node scripts/gs-api.js"
      manager: "npm"
  network_access: true
---

# 估值数据查询

提供个股、指数、行业和可用预期相关的估值基础数据查询，适合作为后续估值分析、PEG 分析、行业对比和股东回报分析的子 skill。

**核心定位：基础数据查询。内部数据获取要尽量完整；用户侧按问题粒度展示重点数据和必要口径，不延伸为买卖建议、目标价承诺或完整估值模型结论。**

## 典型场景

- 查询 A 股个股当前 PE、扣非 PE、PB、PS、总市值、流通市值和自由流通换手率
- 查询成长能力指标，包括营收、净利润、EPS、经营现金流等 1 年平均增长率和同比增长率
- 查询历史估值样本，并在样本充足时基于 `stock/val-indicators` 返回序列计算 PE/PB/PS 分位
- 查询行业或指数当前 PE/PB、PE/PB 五年分位、股息率、总市值和 PS 五年分位
- 查询股息率、分红、回购、现金流、自由现金流收益率、无风险利率等估值辅助数据

## 何时使用

当用户表达以下意图时，优先使用本 skill：

| 意图 | 用户话术 |
|------|----------|
| A股核心估值 | "查一下茅台PE/PB/PS" "现在市盈率多少" "总市值和流通市值" |
| 历史估值 | "近三年PE分位" "估值历史位置" "历史PB走势" |
| 成长能力辅助 | "营收增速" "净利润增速" "EPS增速" "成长性数据" |
| 行业/指数估值 | "行业估值分位" "沪深300估值" "半导体行业PE PB PS分位" |
| 股东回报和现金流 | "股息率" "分红稳定性" "回购收益率" "自由现金流收益率" |
| DCF辅助口径 | "无风险利率" "国债收益率" "10年期国债" "贴现率辅助" |

典型用户话术：

- "帮我查宁德时代当前估值数据"
- "贵州茅台PE、PB、PS和历史位置"
- "只拉估值数据，不做分析"
- "查一下半导体行业估值分位"
- "沪深300现在PE和PB多少"
- "这只股票的历史估值位置"
- "查一下成长能力数据和当前估值"
- "查分红和回购，看看股东回报数据"

## 不适合什么

- 直接给出买入、卖出、持有建议
- 输出确定性目标价、合理市值或安全边际结论
- 完整 DCF、DDM、SOTP、期权、债券或衍生品定价模型
- 在缺少证券代码、指数代码、行业代码或可解析名称时编造估值数据
- 查询或承诺机构目标价、未来涨幅
- 将估值分位、行业排名或评分直接等同于低估/高估结论

## 前置依赖

- skill: `gs-finance-data`
- package: `@gs/node scripts/gs-api.js`
- node: `>=18`

## 输入要求

### 可接受输入

- A 股股票代码或名称，如 `600519`、`贵州茅台`
- 指数代码，如 `399300`
- 行业名称或行业代码，如 `半导体`、`640000`
- 查询范围：当前估值、历史估值、行业/指数估值、股息分红、回购、现金流辅助、成长能力、全量估值数据
- 可选时间范围：交易日区间、报告期区间、预测发布时间区间

### 最小输入

- 个股估值：股票代码或可解析股票名称
- 指数估值：指数代码
- 行业估值：行业名称或行业代码；涉及当前 PE/PB 时最好同时可解析 `indexCode`

### 推荐输入

- 标的代码 + 查询范围 + 时间范围
- 行业估值问题补充行业体系或行业层级
- PEG 分析所需未来盈利预测不由本 skill 主动获取；本 skill 仅提供 PE/PB/PS、行业估值和成长能力辅助数据

### 可选输入

- `beginDate` / `endDate`
- `pageNum` / `pageSize`
- 行业体系、行业代码、指数代码

### 默认假设

- 未指定查询范围时，A 股默认查当前核心估值 + 最新实时市值；若用户明确只要数据，不默认扩展分析。
- 未指定日期时，估值倍数取最近可得交易日。
- 用户输入股票名称时，先用 `$gs-finance-data` 的 `search` 或基础信息接口解析股票代码。
- 行业名称输入时，先解析行业代码和 `indexCode`；`index/valuation` 输出当前 PE/PB，`industry/market-stats` 输出 PS 分位。
- A 股个股请求若用于行业 PEG 或行业估值对比，必须先取得个股估值、财务评分或行业归属标准输出中的稳定对比行业，再解析行业层级：二级行业直接使用；三级或更细行业解析到同体系二级行业；只有二级行业无法形成有效行业基准 PEG 时，才回退同体系一级行业。行业指数 PE 与行业基准预测增速必须使用同一行业层级、同一预测期限和同一回退口径；`industry/market-stats` 的 PE/PB/PS 分位不能替代行业当前 PE。
- 输出字段以接口实际返回为准；文档说明存在但返回缺失的字段必须标注缺失。

### 输入校验

- 名称匹配多个证券、行业或指数时，返回候选列表，请用户确认。
- 股票代码无效或无返回时，说明未查询到对应估值数据，不猜测替代标的。
- 时间范围早于接口支持范围时，说明可用最早日期或改用默认最近值。
- 用户要求历史分位时，必须明确样本窗口；不可在没有历史样本时输出百分位。

### 缺失输入处理

- 缺少标的 → 提示提供股票、指数或行业
- 缺少查询范围 → 默认输出核心估值数据
- 缺少时间范围 → 默认最近可得数据
- 只有宽泛说“估值高不高” → 先拉核心估值和历史/行业相对数据，再用数据描述水位，不输出买卖建议
- 需要追问的情况：名称匹配多个标的、缺少证券/指数/行业代码且无法可靠解析、用户要求完整估值模型或目标价承诺、用户问题超出基础数据查询边界

### 示例输入

```text
帮我查一下宁德时代当前估值数据，包括PE、PB、PS、PEG和行业排名
```

```text
查一下半导体行业当前PE/PB和PS五年分位
```

### 反例输入

```text
这只股票现在值多少钱，直接给目标价
```

原因：这是估值模型和投资判断问题，不属于基础估值数据查询；本 skill 只能先拉取估值数据和可用口径。

## 数据接口一览

| # | 接口 | tool_id | 用途 | 参考文档 |
|---|------|---------|------|----------|
| 1 | `stock/val-indicators` | `get_stock_val_indicators` | A 股交易日核心 PE/PB/PS、市值、自由流通换手率 | `references/个股估值/A股核心估值指标.md` |
| 2 | `index/valuation` | `get_index_valuation` | 指数或行业指数 PE/PB、分位、股息率、总市值 | `references/指数与行业估值/指数行业估值数据.md` |
| 3 | `industries` | `list_industries` | 解析行业代码、行业名称和行业指数代码，供行业估值和行业 PEG 使用 | `references/指数与行业估值/指数行业估值数据.md` |
| 4 | `industry/forecasts` | `get_industry_forecasts` | 行业未来营收、净利润或 EPS 预测增速，供行业 PEG 分母使用 | `references/指数与行业估值/指数行业估值数据.md` |
| 5 | `industry/market-stats` | `get_industry_market_stats` | 行业 PE/PB/PS 五年分位、阶段涨跌幅、主力资金 | `references/指数与行业估值/指数行业估值数据.md` |
| 6 | `market/quote-summaries` | `get_market_quote_summaries` | 行业和概念板块行情汇总、总市值辅助 | `references/指数与行业估值/指数行业估值数据.md` |
| 7 | `stock-quote/core` | `get_stock_quote_core` | 最新价格、市值、换手率、行业口径辅助 | `references/估值辅助/估值辅助数据.md` |
| 8 | `stock/dividends` | `list_stocks_dividends` | 分红派息、每股派现、股息率估算辅助 | `references/估值辅助/估值辅助数据.md` |
| 9 | `stock/repurchase-plans` | `list_stock_repurchase_plans` | 股份回购金额、数量、进展，回购收益率辅助 | `references/估值辅助/估值辅助数据.md` |
| 10 | `stock/cash-flows` + `stock/cash-flows-ttm` | `list_stock_cash_flows` / `list_stock_cash_flows_ttm` | 经营现金流、自由现金流代理和 P/OCF 辅助 | `references/估值辅助/估值辅助数据.md` |
| 11 | `stock/per-share-indicators` + `stock/financial-indicators-cash-col` | `list_per_share_indicators` / `list_fin_ind_cash_collect` | 每股经营现金流、每股股东自由现金流、现金流质量 | `references/估值辅助/估值辅助数据.md` |
| 12 | `economic/gover-bond-yield` | `list_gover_bond_yield` | 3个月、6个月、2年、10年、30年国债收益率，无风险利率辅助 | `references/估值辅助/估值辅助数据.md` |
| 13 | `stock/financial-indicators-growth` | `get_stock_fin_ind_growth` / `list_stock_fin_ind_growth` | 营收、净利润、EPS、经营现金流等成长能力指标 | `references/估值辅助/估值辅助数据.md` |

## 意图路由

本节只在 skill 已由 frontmatter `description` 触发后使用，用于把已触发的估值数据请求分派到具体查询工作流；不要把这里的路由表当作新的触发条件。

| route id | 用户意图 | 必要输入 | Agent 自动触发 | 进入工作流 | 输出 |
|----------|----------|----------|----------------|------------|------|
| `a_share_core` | A 股当前核心估值 | 股票代码或可解析名称 | 可 `Spawn valuation_data_executor to query valuation data`；无 subagent 时当前模型执行 | `stock/val-indicators`，必要时补实时行情 | PE/PB/PS、市值、日期 |
| `a_share_history` | A 股历史估值样本和分位 | 股票代码 + 时间范围 | 可 `Spawn valuation_data_executor to query valuation data`；无 subagent 时当前模型执行 | `stock/val-indicators` 历史区间 | PE/PB/PS 历史序列、样本窗口和可计算分位 |
| `index_industry_valuation` | 指数或行业估值 | 指数代码、行业代码或可解析行业名称 | 可 `Spawn valuation_data_executor to query valuation data`；无 subagent 时当前模型执行 | `index/valuation` + `industry/market-stats` | PE/PB、分位、股息率、行业市值 |
| `valuation_auxiliary` | 股息、回购、现金流、成长能力辅助 | 股票代码和可选时间范围 | 可 `Spawn valuation_data_executor to query valuation data`；无 subagent 时当前模型执行 | 分红、回购、现金流、每股指标和成长能力接口 | 股东回报、现金流和成长能力口径 |
| `clarify_missing_input` | 缺失输入或多候选 | 缺失项本身 | 无，当前 skill 直接追问 | 先追问，不查询数据 | 候选项或最小补充输入 |
| `out_of_scope_handoff` | 买卖建议、目标价承诺、完整估值模型 | 不适用 | 无，当前 skill 转交或说明不适用 | 转交估值分析/投资研究 skill，或说明边界 | 不编造数据和结论 |

| 用户意图 | 核心接口 | 辅助接口 | 输出 |
|----------|----------|----------|------|
| 查 A 股当前核心估值 | `stock/val-indicators` | `stock-quote/core` | PE、扣非 PE、PB、PS、总市值、流通市值、日期 |
| 查 A 股历史估值 | `stock/val-indicators` | `stock-quote/core` | 历史交易日估值序列、样本窗口和可计算分位 |
| 查 PEG 所需基础数据 | `stock/val-indicators` | `stock/financial-indicators-growth` + 研报预测评级标准输出 | 当前 PE/PB/PS、历史成长辅助；PEG 分母必须来自上层研报预测样本或用户显式假设 |
| 查行业或指数估值 | `index/valuation` + `industry/market-stats` | `market/quote-summaries` | 当前 PE/PB、PE/PB/PS 五年分位、股息率、行业总市值 |
| 查股息/分红 | `stock/dividends` | `stock-quote/core` | 每股派现、除权除息日、股息率估算、分红稳定性数据 |
| 查回购收益率 | `stock/repurchase-plans` | `stock-quote/core` | 回购金额、回购股数、进展、回购金额/市值 |
| 查现金流估值辅助 | `stock/cash-flows` + `stock/per-share-indicators` | `stock/cash-flows-ttm` + `stock/financial-indicators-cash-col` | CFO、每股经营现金流、每股自由现金流、现金流质量 |
| 查DCF辅助利率 | `economic/gover-bond-yield` | 货币市场利率接口 | 10年期/30年期国债收益率、日期 |
| 查成长能力辅助 | `stock/financial-indicators-growth` | `stock/finance/growth-ability` | 营收增长、净利润增长、EPS 增长、CFO 增长 |
| 查全量估值数据包 | 上述核心接口按标的类型组合 | 名称解析、行业解析 | 结构化估值数据表和缺失字段 |

## 决策流程

1. 先识别标的类型：A 股个股、指数、行业、概念板块，还是只给了模糊名称。
2. 如果只有名称，先用 `$gs-finance-data` 的 `search` 或基础信息接口解析代码；多候选时先请用户确认。
3. A 股核心估值优先调用 `stock/val-indicators`；需要最新价和总市值校验时补 `stock-quote/core`。
4. 用户问历史估值位置时，只使用 `stock/val-indicators` 的历史交易日序列；样本不足时展示已返回日期和指标，不输出分位。
5. 用户问诊断 PEG、行业排名、历史行业排名、EV 倍数、P/FCF、周期调整 PE 或估值评分时，说明当前估值数据查询不再覆盖这些不可用接口字段；可改查核心 PE/PB/PS、历史估值样本、行业指数估值、成长能力和现金流辅助数据。
6. 行业估值必须先解析行业代码、行业名称、行业层级和 `indexCode`；`index/valuation` 提供当前 PE/PB、股息率和 PE/PB 五年分位，`industry/market-stats` 补 PS 五年分位。若已经取得行业代码，优先用行业代码精确查询 `industries`，不要额外追加与返回口径不一致的行业体系过滤条件；行业名称模糊查询只作为补充路径，且多候选时不得用于行业 PEG 计算。
7. 行业 PEG 或个股相对行业 PEG 对比固定按二级行业优先形成：先取得稳定对比行业；解析行业层级；若为二级行业则直接使用；若为三级或更细行业则解析到同体系二级行业；若二级行业无法取得行业指数 PE 或行业基准预测增速，才回退同体系一级行业。行业指数 PE 来自行情估值日期对应的行业指数估值，PE/PB/PS 五年分位不得替代当前 PE。行业基准预测增速来自同一行业代码口径；回退一级行业时，行业 PE 和预测增速必须同时使用一级口径。行业 PEG 必须输出行业名称、行业层级、行业指数 PE、行业估值日期、行业基准预测增速、行业基准 PEG、行业 PEG 口径说明、是否一级回退和缺失原因。
8. 行业侧默认只形成行业基准 PEG，不跟随个股增速拆成三档情景。行业基准增速优先使用未来 1-3 年净利润预测的同口径复合增速；若底层提供 T+1、T+2、T+3 年度净利润预测增速，则用 `((1+g1)*(1+g2)*(1+g3))^(1/3)-1` 计算几何复合增速。若只有单一三年字段，必须确认其为未来三年复合预测口径；若与其他前瞻字段明显冲突，标注口径冲突，不直接采用。不同期限字段不得分别冒充行业侧三档情景；只有底层明确返回同一预测期限下的高 / 中 / 低预测情景，才允许额外输出行业侧三档 PEG。
9. 股息率、回购收益率、自由现金流收益率和成长能力指标属于辅助口径，读取 `references/估值辅助/估值辅助数据.md` 并明确计算公式、时间窗口和缺失字段。
10. 任何估值分位、行业排名、评分都只能描述水位和相对位置，不直接输出买卖结论。

## 输出规则

- 简短问题输出 `重点摘要 + 核心估值表 + 数据日期/口径`。
- 细致问题或用户要求原始数据时，按模块输出专业原始数据：核心估值、历史估值样本、行业/指数估值、股东回报、现金流、成长能力。
- 字段名面向用户时用中文，但保留必要的英文缩写，如 PE、PB、PS、PEG、EV/EBIT。
- 估值字段为空、为负或不适用时，不要强行计算 PEG 或分位。
- 历史分位必须说明样本区间；接口自带五年分位时注明来自接口，自己计算时注明“基于返回样本计算”。
- 不输出诊断估值、行业排名、历史排名或估值评分；当前可用口径只描述核心估值倍数、历史样本和行业/指数估值水位。
- 不输出第三方预测衍生指标；用户要求时说明该类数据当前不在本 skill 覆盖范围内。
- 汇总语只允许基于数据做轻量描述，例如“当前 PE 处于近五年较高分位”“估值倍数高于行业中位口径”，不得给投资建议。

推荐表格字段：

| 模块 | 指标 | 最新值 | 口径/时间 |
|------|------|--------|-----------|
| 核心估值 | PE | `15.73x` | `stock/val-indicators`, 最近交易日 |
| 核心估值 | 扣非 PE | `15.73x` | `stock/val-indicators` |
| 核心估值 | PB | `1.85x` | `stock/val-indicators` |
| 核心估值 | PS | `3.75x` | `stock/val-indicators` |
| 市值 | 总市值 | `xxxx亿元` | `stock/val-indicators` 或 `stock-quote/core` |
| 行业估值 | 行业对照名称 | `电池（二级行业）` | 二级优先；一级回退时标注“一级回退口径” |
| 行业估值 | 行业指数 PE | `xx.x` | `index/valuation` |
| 行业估值 | 行业基准 PEG | `3.49` | 行业指数 PE / 同口径行业基准预测增速 |
| 行业估值 | PS五年分位 | `xx%` | `industry/market-stats` |
| 股东回报 | 股息率 | `x.xx%` | 接口字段或计算口径 |
| 股东回报 | 回购收益率 | `x.xx%` | 近12个月实际回购金额/总市值 |
| 现金流 | 每股自由现金流 | `x.xx` | `stock/per-share-indicators` |
| 成长能力 | 净利润1年平均增长率 | `x.xx%` | `stock/financial-indicators-growth` |

## 失败处理

- 名称匹配多个标的：返回候选项，请用户确认。
- 核心估值接口无返回：说明接口、标的和日期范围，不用其他字段硬补 PE/PB/PS。
- 用户要求第三方预测衍生指标、诊断 PEG、行业排名、历史行业排名或 EV 倍数：说明本 skill 已移除这些不可用接口链，不使用历史增速、核心 PE 或目标价替代 PEG 分母。
- 行业 `indexCode` 缺失：先用稳定对比行业精确查询 `industries` 并解析同体系二级行业；不要因为行业名称模糊查询为空或行业体系过滤条件不匹配就判定缺失；二级行业无法解析时才回退一级行业，仍缺失时仅输出 `industry/market-stats` 可得分位，并说明当前 PE/PB 绝对倍数缺失。
- 行业 PEG 缺失：必须区分二级行业无法解析、二级行业 PE 缺失、二级行业基准预测增速缺失/为负/接近零/口径冲突、一级回退也不可用四类原因；不得把行业分位缺失、只取得分位、未直接返回行业 PEG、或未尝试二级行业优先链路写成行业 PEG 数据不足。
- 历史样本不足：不输出分位，只展示已返回日期和指标。
- 网络、权限或 CLI 配置不可用：说明当前无法获取数据，并停止基于该数据继续推断。

## 辅助文档

- 接口索引见 `docs/references-index.md`
- 详细参数见 `references/` 目录

## 交付说明

- 文件：`SKILL.md` + `docs/references-index.md` + `references/` 下接口参考文档
- 格式：gs 扩展格式（含 `requirements`、`metadata.clawdbot`）
- 触发词已放入 `description`：估值数据、个股估值、PE、PB、PS、市盈率、市净率、市销率、估值分位、历史估值、行业估值、指数估值、股息率、回购收益率、自由现金流收益率

## finance-data 接口文档

当前 Skill 的数据接口口径、参数示例、POST Body 写法和回归检查见 [`gs-valuation-data-finance-data-interface.md`](gs-valuation-data-finance-data-interface.md)。
