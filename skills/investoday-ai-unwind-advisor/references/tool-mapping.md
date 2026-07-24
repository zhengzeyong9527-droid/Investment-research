# Tool Mapping

来源：`/Users/kenneth/Desktop/TMP/数据/dify-dsl/AI解套.yml`

## 结论

- 2026-06-03 更新：常规金融数据与解套信号使用 `investoday-finance-data` 1.8.22 的 `references/`；仅 ETF 轮动策略和 ETF 入选理由生成不依赖 `investoday-finance-data` 的 `references/`，而是依赖 `api.json` 中定义的 path。常规 `references/` 接口和两个解套信号接口运行时通过 `investoday-api` CLI 调用；ETF 轮动策略和 ETF 入选理由生成运行时必须通过 `investoday-finance-data/scripts/call_api.js` 调用。
- `confirmed`：股票解套信号统计和明细已进入新版 `references/沪深京数据/特色数据/解套信号.md`，可作为正式依赖；运行时统一使用 `INVESTODAY_API_KEY`。
- ETF 替代能力中，行业持仓基金列表和基金技术指标来自 `investoday-finance-data` references；ETF 轮动策略和 ETF 入选理由生成来自 `api.json` 并通过 `node scripts/call_api.js` 调用。这些接口与两个股票解套信号接口均统一使用 `INVESTODAY_API_KEY` 调用。
- `confirmed`：19 个基础工具已在 `investoday-finance-data` references 文档中命中；这不等于已经完成真实 API 端到端调用验证。
- `manual_confirm`：1 个时间工具不是 `investoday-finance-data` 工具，可替换为运行环境日期或 `get_trade_special_date`。
- `api_json_script_investoday_key`：ETF 轮动策略和 ETF 入选理由生成仅通过 `api.json` 确认 operationId 与 path,实际执行使用 `investoday-finance-data/scripts/call_api.js` 和 `INVESTODAY_API_KEY`。
- 正文工具清单允许列入新版 `references` 中的常规工具,也允许列入 `api.json` 中已确认 path 的 ETF 轮动策略和 ETF 入选理由生成；ETF 两个接口不得改用 `investoday-api` CLI 直接调用。
- ETF 替代流程保持为：ETF 轮动策略候选 -> 行业持仓基金匹配 -> 基金技术指标验证 -> ETF 入选理由生成。
- DSL validator 未通过：主要是 tool 节点 `plugin_unique_identifier` 版本与 dependencies/local 版本不一致，见 `review-notes.md`。

## 已确认工具

| DSL 节点 | DSL 工具 | 候选 Investoday 工具ID | 方法 | 用途 | 状态 | 证据文件/章节 | 参数差异 | 用户确认替代 | 允许写入正文 | 处理结论 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 交易日历衍生 | `investoday/base/base / get_trade_special_date` | `get_trade_special_date` | GET | 获取交易日窗口 | confirmed | `references/基础数据.md` | 无 | 否 | 是 | 无 |
| 股票量价与压力支撑指标 | `investoday/stock/stock / list_stock_price_volume_indicators` | `list_stock_price_volume_indicators` | POST | 支撑压力与量价指标 | confirmed | `references/沪深京数据/股票行情.md` | DSL validator 提示部分 paramSchemas 与本地声明有差异 | 否 | 是 | 正式导入 Dify 前需修 plugin 版本 |
| 行情技术指标 | `investoday/stock/stock / list_stock_market_ind_dm` | `list_stock_market_ind_dm` | POST | 数据挖掘技术指标 | confirmed | `references/沪深京数据/特色数据.md` | DSL validator 提示部分 paramSchemas 与本地声明有差异 | 否 | 是 | 正式导入 Dify 前需修 plugin 版本 |
| 股票摆动与超买超卖指标 | `investoday/stock/stock / list_stock_oscillator_indicators` | `list_stock_oscillator_indicators` | POST | RSI/KDJ/BIAS 等指标 | confirmed | `references/沪深京数据/股票行情.md` | DSL validator 提示部分 paramSchemas 与本地声明有差异 | 否 | 是 | 正式导入 Dify 前需修 plugin 版本 |
| 股票基本面分析 | `investoday/stock/stock / get_stk_fundamentals` | `get_stk_fundamentals` | POST | 基本面结论与引用 | confirmed | `references/沪深京数据/特色数据.md` | 无 | 否 | 是 | 无 |
| 研究报告 | `investoday/research-report/research-report / list_report_research` | `list_report_research` | POST | 个股/行业研报 | confirmed | `references/研报/基础数据.md` | DSL plugin 版本不一致 | 否 | 是 | 正式导入 Dify 前需修 plugin 版本 |
| 实体的相关新闻 | `investoday/news/news / list_entity_related_news` | `list_entity_related_news` | GET | 个股新闻与舆情线索 | confirmed | `references/新闻与观点/基础数据.md` | DSL plugin 版本不一致 | 否 | 是 | 正式导入 Dify 前需修 plugin 版本 |
| 上市公司的公告 | `investoday/announcement/announcement / list_announcements` | `list_announcements` | GET | 公司公告 | confirmed | `references/公告.md` | DSL plugin 版本不一致 | 否 | 是 | 正式导入 Dify 前需修 plugin 版本 |
| 股票所属行业 | `investoday/stock/stock / get_stock_industries` | `get_stock_industries` | POST | 申万行业分类 | confirmed | `references/沪深京数据/公司行为.md` | 无 | 否 | 是 | 无 |
| 股票财务分项最新评分 | `investoday/stock/stock / get_stock_fin_subitem_score` | `get_stock_fin_subitem_score` | GET | 财务分项评分 | confirmed | `references/沪深京数据/特色数据.md` | 无 | 否 | 是 | 无 |
| 股票财务实力的最新指标 | `investoday/stock/stock / get_stock_finance_strength` | `get_stock_finance_strength` | GET | 财务实力与风险指标 | confirmed | `references/沪深京数据/特色数据.md` | 无 | 否 | 是 | 无 |
| 股票财务实力的历史指标 | `investoday/stock/stock / get_fin_health_history` | `get_fin_health_history` | GET | 财务实力历史指标 | confirmed | `references/沪深京数据/特色数据.md` | 无 | 否 | 是 | 无 |
| 股票综合得分 | `investoday/stock/stock / get_stock_score` | `get_stock_score` | GET | 情绪/财务/赛道/技术综合得分 | confirmed | `references/沪深京数据/特色数据.md` | 无 | 否 | 是 | 无 |
| 行业轮动因子 | `investoday/industry/industry / list_industry_rotation` | `list_industry_rotation` | GET | 行业轮动与风格 | confirmed | `references/板块/特色数据.md` | DSL plugin 版本不一致 | 否 | 是 | 正式导入 Dify 前需修 plugin 版本 |
| 股票及所属申万行业区间涨幅 | `investoday/stock/stock / get_stk_sw_idu_returns` | `get_stk_sw_idu_returns` | POST | 个股与行业相对表现 | confirmed | `references/沪深京数据/股票行情.md` | 无 | 否 | 是 | 无 |
| 指数区间涨幅 | `investoday/index/index / get_index_range_gains` | `get_index_range_gains` | GET | 指数区间表现 | confirmed | `references/指数/行情衍生数据.md` | DSL plugin 版本不一致 | 否 | 是 | 正式导入 Dify 前需修 plugin 版本 |
| 行业持仓的基金列表 | `investoday/fund/fund / list_industry_hold_fund` | `list_industry_hold_fund` | POST | 持有行业股票的基金候选 | confirmed | `references/基金/基金投资组合.md` | 无 | 否 | 是 | 无 |
| 基金技术指标 | `investoday/fund/fund / list_fund_tech_indicators` | `list_fund_tech_indicators` | POST | 基金支撑压力位 | confirmed | `references/基金/基金行情.md` | 无 | 否 | 是 | 无 |
| 研报舆情 | `investoday/research-report/research-report / list_research_sentiment` | `list_research_sentiment` | POST | 研报情绪、机会、风险 | confirmed | `references/研报/特色数据.md` | 无 | 否 | 是 | 无 |
| 股票解套信号统计 | 旧 DSL internal 同名能力 | `get_stk_unwind_sig_stat` | POST | 波段解套历史胜率、收益、持仓天数 | confirmed | `references/沪深京数据/特色数据/解套信号.md` | 使用 `INVESTODAY_API_KEY` | 是 | 是 | 进入正式调用链 |
| 股票解套信号明细 | 旧 DSL internal 同名能力 | `list_stk_unwind_signal_de` | POST | 当前波段信号、买卖价、止盈止损 | confirmed | `references/沪深京数据/特色数据/解套信号.md` | 使用 `INVESTODAY_API_KEY` | 是 | 是 | 进入正式调用链 |
| ETF轮动策略 | `investoday/internal/internal / list_etf_rotation_strateg` | `list_etf_rotation_strateg` | POST | 行业ETF轮动候选、入选/调出时间、当前持仓状态 | api_json_script_investoday_key | `api.json` path: `/fund/etf-rotation-strategies` | 使用 `INVESTODAY_API_KEY`，通过 `node scripts/call_api.js fund/etf-rotation-strategies --method POST ...` 执行 | 是 | 是 | 进入正式调用链 |
| ETF入选理由生成 | `investoday/internal/internal / list_etf_selection_reason` | `list_etf_selection_reason` | POST | ETF 推荐理由 | api_json_script_investoday_key | `api.json` path: `/etf-selection-reason` | 使用 `INVESTODAY_API_KEY`，通过 `node scripts/call_api.js etf-selection-reason --method POST ...` 执行 | 是 | 是 | 进入正式调用链 |

## 非正式依赖工具

| DSL 节点 | DSL 工具 | 候选工具ID | 方法 | 用途 | 状态 | 证据文件/章节 | 参数差异 | 用户确认替代 | 允许写入正文 | 处理结论 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 获取当前时间 | `time / current_time` | 无 | - | 获取当前日期 | manual_confirm | DSL 节点 | 非 `investoday-finance-data` 工具 | 可用运行环境日期或交易日历替代 | 否 | 是否允许使用系统当前日期 |
| 股票解套信号统计 | 旧 internal 节点 | `get_stk_unwind_sig_stat` | POST | 波段解套历史胜率、收益、持仓天数 | upgraded | 新版 references 已覆盖 | 使用 `INVESTODAY_API_KEY` | 已替代 | 是 | 已迁移为正式依赖 |
| 股票解套信号明细 | 旧 internal 节点 | `list_stk_unwind_signal_de` | POST | 当前波段信号、买卖价、止盈止损 | upgraded | 新版 references 已覆盖 | 使用 `INVESTODAY_API_KEY` | 已替代 | 是 | 已迁移为正式依赖 |
