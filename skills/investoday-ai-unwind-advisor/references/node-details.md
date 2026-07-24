# Node Details

> 本文件仅记录原始 Dify DSL 节点快照,用于溯源和业务还原,不作为正式 Skill 的接口调用口径。正式调用规则以 `SKILL.md` 和 `tool-mapping.md` 为准:常规 `references/` 接口和两个解套信号接口使用 `investoday-api` CLI;ETF 轮动策略和 ETF 入选理由生成依赖 `api.json` path,不依赖 `investoday-finance-data` references,并通过 `investoday-finance-data/scripts/call_api.js` 调用。所有接口均统一使用 `INVESTODAY_API_KEY`。

## 用户输入 (`1772413630417`)

- 类型：`start`
- 上游：无
- 下游：1772523141092
- 输入变量：[{"default": "", "hint": "", "label": "股票代码", "max_length": 48, "options": [], "placeholder": "", "required": true, "type": "text-input", "variable": "stock_code"}, {"default": "", "hint": "", "label": "被套深度（亏损百分比%）", "max_length": 48, "options": [], "placeholder": "", "required": true, "type": "number", "variable": "set_depth"}, {"default": "", "hint": "", "label": "仓位（%）", "max_length": 48, "opt...
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 获取当前时间 (`1772414047304`)

- 类型：`tool`
- 上游：1772523141092
- 下游：1772414055057
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"format\": \"\", \"timezone\": \"\"}", "provider": "time", "tool": "current_time"}
- 参数摘要：{"format": "", "timezone": ""}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 交易日历衍生 (`1772414055057`)

- 类型：`tool`
- 上游：1772414047304
- 下游：1772414097224
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"tradeDate\": {\"type\": \"mixed\", \"value\": \"{{#1772414047304.text#}}\"}}", "plugin": "investoday/base:2.0.2@88922e4d6817e3c873c601cace005847ef3d1cbb342fbef1a750fcc5ca320c90", "provider": "investoday/base/base", "tool": "get_trade_special_date"}
- 参数摘要：{"tradeDate": {"type": "mixed", "value": "{{#1772414047304.text#}}"}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 获取时间 (`1772414097224`)

- 类型：`code`
- 上游：1772414055057
- 下游：1772415682172, 1772415958500, 1772417840200, 1772418782182, 1772419630002, 1772419679091, 1772419711432, 1772421453175, 1772429924300, 1772430221774, 1772430244450, 1772437428828, 1772499711135, 1772502624129, 1772502635815, 1772517516691, 1772613677097, 1772690353791
- 输入变量：[{"value_selector": ["1772414047304", "text"], "value_type": "string", "variable": "current_date_text"}, {"value_selector": ["1772414055057", "text"], "value_type": "string", "variable": "trading_calendar_text"}]
- 输出变量：{"eighteen_months_ago": {"children": null, "type": "string"}, "five_years_ago": {"children": null, "type": "string"}, "one_day_ago_trading_day": {"children": null, "type": "string"}, "one_month_ago_trading_day": {"children": null, "type": "string"}, "one_week_ago_trading_day": {"children": null, "type": "string"}, "one_year_ago": {"children": null, "type": "string"}, "six_months_ago": {"children":...
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 股票量价与压力支撑指标 (`1772415682172`)

- 类型：`tool`
- 上游：1772414097224
- 下游：1772418123446
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"beginDate\": {\"type\": \"mixed\", \"value\": \"{{#1772414097224.one_week_ago_trading_day#}}\"}, \"endDate\": {\"type\": \"mixed\", \"value\": \"{{#1772414047304.text#}}\"}, \"pageNum\": {\"type\": \"constant\", \"value\": null}, \"pageSize\": {\"type\": \"constant\", \"value\": null}, \"stockCode\": {\"type\": \"mixed\", \"value\": \"{{#1772413630417.stock_code#}}\"}}", "plugin...
- 参数摘要：{"beginDate": {"type": "mixed", "value": "{{#1772414097224.one_week_ago_trading_day#}}"}, "endDate": {"type": "mixed", "value": "{{#1772414047304.text#}}"}, "pageNum": {"type": "constant", "value": null}, "pageSize": {"type": "constant", "value": null}, "stockCode": {"type": "mixed", "value": "{{#1772413630417.stock_code#}}"}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 行情技术指标(数据挖掘) (`1772415958500`)

- 类型：`tool`
- 上游：1772414097224
- 下游：1772418123446
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"beginDate\": {\"type\": \"mixed\", \"value\": \"{{#1772414097224.one_week_ago_trading_day#}}\"}, \"endDate\": {\"type\": \"mixed\", \"value\": \"{{#1772414047304.text#}}\"}, \"pageNum\": {\"type\": \"constant\", \"value\": null}, \"pageSize\": {\"type\": \"constant\", \"value\": null}, \"stockCode\": {\"type\": \"mixed\", \"value\": \"{{#1772413630417.stock_code#}}\"}}", "plugin...
- 参数摘要：{"beginDate": {"type": "mixed", "value": "{{#1772414097224.one_week_ago_trading_day#}}"}, "endDate": {"type": "mixed", "value": "{{#1772414047304.text#}}"}, "pageNum": {"type": "constant", "value": null}, "pageSize": {"type": "constant", "value": null}, "stockCode": {"type": "mixed", "value": "{{#1772413630417.stock_code#}}"}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 股票摆动与超买超卖指标 (`1772417840200`)

- 类型：`tool`
- 上游：1772414097224
- 下游：1772418123446
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"beginDate\": {\"type\": \"mixed\", \"value\": \"{{#1772414097224.one_week_ago_trading_day#}}\"}, \"endDate\": {\"type\": \"mixed\", \"value\": \"{{#1772414047304.text#}}\"}, \"pageNum\": {\"type\": \"constant\", \"value\": null}, \"pageSize\": {\"type\": \"constant\", \"value\": null}, \"stockCode\": {\"type\": \"mixed\", \"value\": \"{{#1772413630417.stock_code#}}\"}}", "plugin...
- 参数摘要：{"beginDate": {"type": "mixed", "value": "{{#1772414097224.one_week_ago_trading_day#}}"}, "endDate": {"type": "mixed", "value": "{{#1772414047304.text#}}"}, "pageNum": {"type": "constant", "value": null}, "pageSize": {"type": "constant", "value": null}, "stockCode": {"type": "mixed", "value": "{{#1772413630417.stock_code#}}"}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 判断波段潜力 (`1772418123446`)

- 类型：`code`
- 上游：1772415682172, 1772415958500, 1772417840200, 1772437428828, 1772440541916
- 下游：1772759965109
- 输入变量：[{"value_selector": ["1772415682172", "text"], "value_type": "string", "variable": "price_pressure_response"}, {"value_selector": ["1772415958500", "text"], "value_type": "string", "variable": "data_mining_response"}, {"value_selector": ["1772417840200", "text"], "value_type": "string", "variable": "swing_response"}, {"value_selector": ["1772437428828", "text"], "value_type": "string", "variable":...
- 输出变量：{"has_swing_potential": {"children": null, "type": "number"}, "swing_potential_score": {"children": null, "type": "number"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 股票基本面分析 (`1772418782182`)

- 类型：`tool`
- 上游：1772414097224
- 下游：1772691167480
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"stockCode\": {\"type\": \"mixed\", \"value\": \"{{#1772413630417.stock_code#}}\"}}", "plugin": "investoday/stock:3.0.4@5a2272c563eef8791961f5277da069c91273a1a8d2d463273dfa6cbb22eeb384", "provider": "investoday/stock/stock", "tool": "get_stk_fundamentals"}
- 参数摘要：{"stockCode": {"type": "mixed", "value": "{{#1772413630417.stock_code#}}"}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 研究报告 (`1772419630002`)

- 类型：`tool`
- 上游：1772414097224
- 下游：1772689062037
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"beginDate\": {\"type\": \"mixed\", \"value\": \"{{#1772414097224.one_week_ago_trading_day#}}\"}, \"categoryCode\": {\"type\": \"mixed\", \"value\": null}, \"endDate\": {\"type\": \"mixed\", \"value\": \"{{#1772414047304.text#}}\"}, \"industryCode\": {\"type\": \"mixed\", \"value\": \"\"}, \"pageNum\": {\"type\": \"constant\", \"value\": null}, \"pageSize\": {\"type\": \"constant...
- 参数摘要：{"beginDate": {"type": "mixed", "value": "{{#1772414097224.one_week_ago_trading_day#}}"}, "categoryCode": {"type": "mixed", "value": null}, "endDate": {"type": "mixed", "value": "{{#1772414047304.text#}}"}, "industryCode": {"type": "mixed", "value": ""}, "pageNum": {"type": "constant", "value": null}, "pageSize": {"type": "constant", "value": null}, "stockCode": {"type": "mixed", "value": "{{#1772...
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 实体的相关新闻 (`1772419679091`)

- 类型：`tool`
- 上游：1772414097224
- 下游：1772689071482
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"beginTime\": {\"type\": \"mixed\", \"value\": \"{{#1772414097224.one_week_ago_trading_day#}}\"}, \"conceptCode\": {\"type\": \"mixed\", \"value\": null}, \"endTime\": {\"type\": \"mixed\", \"value\": \"{{#1772414047304.text#}}\"}, \"industryCode\": {\"type\": \"mixed\", \"value\": null}, \"minRelevance\": {\"type\": \"constant\", \"value\": null}, \"newsLevel\": {\"type\": \"con...
- 参数摘要：{"beginTime": {"type": "mixed", "value": "{{#1772414097224.one_week_ago_trading_day#}}"}, "conceptCode": {"type": "mixed", "value": null}, "endTime": {"type": "mixed", "value": "{{#1772414047304.text#}}"}, "industryCode": {"type": "mixed", "value": null}, "minRelevance": {"type": "constant", "value": null}, "newsLevel": {"type": "constant", "value": null}, "newsType": {"type": "constant", "value":...
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 上市公司的公告 (`1772419711432`)

- 类型：`tool`
- 上游：1772414097224
- 下游：1772689079646
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"announcementID\": {\"type\": \"constant\", \"value\": null}, \"beginDate\": {\"type\": \"mixed\", \"value\": \"{{#1772414097224.one_week_ago_trading_day#}}\"}, \"endDate\": {\"type\": \"mixed\", \"value\": \"{{#1772414047304.text#}}\"}, \"pageNum\": {\"type\": \"constant\", \"value\": null}, \"pageSize\": {\"type\": \"constant\", \"value\": null}, \"stockCode\": {\"type\": \"mix...
- 参数摘要：{"announcementID": {"type": "constant", "value": null}, "beginDate": {"type": "mixed", "value": "{{#1772414097224.one_week_ago_trading_day#}}"}, "endDate": {"type": "mixed", "value": "{{#1772414047304.text#}}"}, "pageNum": {"type": "constant", "value": null}, "pageSize": {"type": "constant", "value": null}, "stockCode": {"type": "mixed", "value": "{{#1772413630417.stock_code#}}"}, "title": {"type"...
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 判断股票质地 (`1772420570690`)

- 类型：`code`
- 上游：1772429924300, 1772430221774
- 下游：1772431038460
- 输入变量：[{"value_selector": ["1772429924300", "text"], "value_type": "string", "variable": "finance_score_response"}, {"value_selector": ["1772430221774", "text"], "value_type": "string", "variable": "financial_strength_data"}]
- 输出变量：{"result": {"children": null, "type": "string"}, "type": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 股票所属行业 (`1772421453175`)

- 类型：`tool`
- 上游：1772414097224
- 下游：1772440573912
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"stockCode\": {\"type\": \"mixed\", \"value\": \"{{#1772413630417.stock_code#}}\"}}", "plugin": "investoday/stock:3.0.5@32238506e90a130cc4a201fb04c076daba5d12d0051a9a5e1376aac896802d7d", "provider": "investoday/stock/stock", "tool": "get_stock_industries"}
- 参数摘要：{"stockCode": {"type": "mixed", "value": "{{#1772413630417.stock_code#}}"}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 股票财务分项最新评分 (`1772429924300`)

- 类型：`tool`
- 上游：1772414097224
- 下游：1772420570690
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"stockCode\": {\"type\": \"mixed\", \"value\": \"{{#1772413630417.stock_code#}}\"}}", "plugin": "investoday/stock:3.0.5@32238506e90a130cc4a201fb04c076daba5d12d0051a9a5e1376aac896802d7d", "provider": "investoday/stock/stock", "tool": "get_stock_fin_subitem_score"}
- 参数摘要：{"stockCode": {"type": "mixed", "value": "{{#1772413630417.stock_code#}}"}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 股票财务实力的最新指标 (`1772430221774`)

- 类型：`tool`
- 上游：1772414097224
- 下游：1772420570690
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"stockCode\": {\"type\": \"mixed\", \"value\": \"{{#1772413630417.stock_code#}}\"}}", "plugin": "investoday/stock:3.0.5@32238506e90a130cc4a201fb04c076daba5d12d0051a9a5e1376aac896802d7d", "provider": "investoday/stock/stock", "tool": "get_stock_finance_strength"}
- 参数摘要：{"stockCode": {"type": "mixed", "value": "{{#1772413630417.stock_code#}}"}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 股票财务实力的历史指标 (`1772430244450`)

- 类型：`tool`
- 上游：1772414097224
- 下游：无
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"stockCode\": {\"type\": \"mixed\", \"value\": \"{{#1772413630417.stock_code#}}\"}, \"type\": {\"type\": \"mixed\", \"value\": \"2\"}}", "plugin": "investoday/stock:3.0.5@32238506e90a130cc4a201fb04c076daba5d12d0051a9a5e1376aac896802d7d", "provider": "investoday/stock/stock", "tool": "get_fin_health_history"}
- 参数摘要：{"stockCode": {"type": "mixed", "value": "{{#1772413630417.stock_code#}}"}, "type": {"type": "mixed", "value": "2"}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 股票质地分类 (`1772431038460`)

- 类型：`if-else`
- 上游：1772420570690, 1772612387433, 1772614671589, 1772759965109
- 下游：1772435143559, 1772675454851
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 基本面不佳股票分类 (`1772435143559`)

- 类型：`if-else`
- 上游：1772431038460
- 下游：1772439978615, 17725268667200
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 股票综合得分 (`1772437428828`)

- 类型：`tool`
- 上游：1772414097224
- 下游：1772418123446
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"stockCode\": {\"type\": \"mixed\", \"value\": \"{{#1772413630417.stock_code#}}\"}}", "plugin": "investoday/stock:3.0.5@32238506e90a130cc4a201fb04c076daba5d12d0051a9a5e1376aac896802d7d", "provider": "investoday/stock/stock", "tool": "get_stock_score"}
- 参数摘要：{"stockCode": {"type": "mixed", "value": "{{#1772413630417.stock_code#}}"}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 有无波段潜力 (`1772439978615`)

- 类型：`if-else`
- 上游：1772435143559
- 下游：1772675630170, 1772526538433
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 行业轮动因子 (`1772440541916`)

- 类型：`tool`
- 上游：1772440573912
- 下游：1772418123446
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"beginDate\": {\"type\": \"mixed\", \"value\": \"{{#1772414097224.one_month_ago_trading_day#}}\"}, \"endDate\": {\"type\": \"mixed\", \"value\": \"{{#1772414047304.text#}}\"}, \"industryCode\": {\"type\": \"mixed\", \"value\": \"{{#1772440573912.industry_code_sw_l1#}}\"}, \"pageNum\": {\"type\": \"constant\", \"value\": null}, \"pageSize\": {\"type\": \"constant\", \"value\": nul...
- 参数摘要：{"beginDate": {"type": "mixed", "value": "{{#1772414097224.one_month_ago_trading_day#}}"}, "endDate": {"type": "mixed", "value": "{{#1772414047304.text#}}"}, "industryCode": {"type": "mixed", "value": "{{#1772440573912.industry_code_sw_l1#}}"}, "pageNum": {"type": "constant", "value": null}, "pageSize": {"type": "constant", "value": null}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 提取申万行业等级 (`1772440573912`)

- 类型：`code`
- 上游：1772421453175
- 下游：1772440541916, 1772604426679
- 输入变量：[{"value_selector": ["1772421453175", "text"], "value_type": "string", "variable": "industry_response"}]
- 输出变量：{"industry_code_sw_l1": {"children": null, "type": "string"}, "industry_code_sw_l2": {"children": null, "type": "string"}, "industry_code_sw_l3": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 股票解套信号统计 (`1772499711135`)

- 类型：`tool`
- 上游：1772414097224
- 下游：1772614146559
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"stockCode\": {\"type\": \"mixed\", \"value\": \"{{#1772413630417.stock_code#}}\"}}", "plugin": "investoday/internal:2.0.0@c9a421e3c651b6a6af5f7c9ec68815dfb9760c78975f7390f46956a0d8e01ae5", "provider": "investoday/internal/internal", "tool": "get_stk_unwind_sig_stat"}
- 参数摘要：{"stockCode": {"type": "mixed", "value": "{{#1772413630417.stock_code#}}"}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 股票及所属申万行业区间涨幅 (`1772502624129`)

- 类型：`tool`
- 上游：1772414097224
- 下游：1772603896542
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"stockCode\": {\"type\": \"mixed\", \"value\": \"{{#1772413630417.stock_code#}}\"}}", "plugin": "investoday/stock:3.0.5@1168b75f800965cb72fd63299211912297368ddf1514dff573ba66dc6c9bdd21", "provider": "investoday/stock/stock", "tool": "get_stk_sw_idu_returns"}
- 参数摘要：{"stockCode": {"type": "mixed", "value": "{{#1772413630417.stock_code#}}"}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 指数区间涨幅 (`1772502635815`)

- 类型：`tool`
- 上游：1772414097224
- 下游：1772603896542
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"indexCode\": {\"type\": \"mixed\", \"value\": \"000300\"}}", "plugin": "investoday/index:2.0.2@71ac1c765d780545db886670b8c8cc73b829dfbc78160f8de23acff87284734b", "provider": "investoday/index/index", "tool": "get_index_range_gains"}
- 参数摘要：{"indexCode": {"type": "mixed", "value": "000300"}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## ETF轮动策略 (`1772517516691`)

- 类型：`tool`
- 上游：1772414097224
- 下游：1772603896542
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"beginDate\": {\"type\": \"mixed\", \"value\": \"{{#1772414097224.one_week_ago_trading_day#}}\"}, \"endDate\": {\"type\": \"mixed\", \"value\": \"{{#1772414047304.text#}}\"}, \"pageNum\": {\"type\": \"constant\", \"value\": null}, \"pageSize\": {\"type\": \"constant\", \"value\": null}}", "plugin": "investoday/internal:2.0.0@c9a421e3c651b6a6af5f7c9ec68815dfb9760c78975f7390f46956a...
- 参数摘要：{"beginDate": {"type": "mixed", "value": "{{#1772414097224.one_week_ago_trading_day#}}"}, "endDate": {"type": "mixed", "value": "{{#1772414047304.text#}}"}, "pageNum": {"type": "constant", "value": null}, "pageSize": {"type": "constant", "value": null}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 被套深度/仓位 (`1772523141092`)

- 类型：`code`
- 上游：1772413630417
- 下游：1772414047304
- 输入变量：[{"value_selector": ["1772413630417", "set_depth"], "value_type": "number", "variable": "depth"}, {"value_selector": ["1772413630417", "set_postion"], "value_type": "number", "variable": "position"}]
- 输出变量：{"get_loss_degree": {"children": null, "type": "string"}, "get_position_level": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 赛道潜力分类 (`1772526538433`)

- 类型：`if-else`
- 上游：1772439978615, 17725268667200
- 下游：1772676227393, 1772676327619, 1772676401916
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 有无波段潜力 (`17725268667200`)

- 类型：`if-else`
- 上游：1772435143559
- 下游：1772526538433, 1772676463739
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 输出 (`1772526899233`)

- 类型：`end`
- 上游：1772677093912
- 下游：无
- 输入变量：待确认
- 输出变量：[{"value_selector": ["1772677093912", "text"], "value_type": "string", "variable": "text"}]
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 变量聚合器 (`1772586878432`)

- 类型：`variable-aggregator`
- 上游：1772672806923, 1772675551697, 1772675630170, 1772676227393, 1772676327619, 1772676401916, 1772676463739
- 下游：1772677093912
- 输入变量：[["1772672806923", "output"], ["1772675551697", "output"], ["1772675630170", "output"], ["1772676227393", "output"], ["1772676327619", "output"], ["1772676401916", "output"], ["1772676463739", "output"]]
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 判断赛道潜力 (`1772603896542`)

- 类型：`code`
- 上游：1772502635815, 1772502624129, 1772517516691, 1772689071482, 1772689062037, 1772689079646, 1772691167480
- 下游：1772604426679
- 输入变量：[{"value_selector": ["1772502635815", "text"], "value_type": "string", "variable": "index_return_response"}, {"value_selector": ["1772502624129", "text"], "value_type": "string", "variable": "stock_industry_return_response"}, {"value_selector": ["1772517516691", "text"], "value_type": "string", "variable": "etf_recommend_response"}]
- 输出变量：{"sector_beats_index_count": {"children": null, "type": "number"}, "sector_beats_stock_count": {"children": null, "type": "number"}, "sector_has_more_potential": {"children": null, "type": "string"}, "sector_positive_count": {"children": null, "type": "number"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 条件分支 6 (`1772604426679`)

- 类型：`if-else`
- 上游：1772603896542, 1772440573912
- 下游：1772604497677, 1775111405767, 17751114939220
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 行业持仓的基金列表 (`1772604497677`)

- 类型：`tool`
- 上游：1772604426679
- 下游：1772604603838
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"industryCode\": {\"type\": \"mixed\", \"value\": \"{{#1772440573912.industry_code_sw_l1#}}\"}, \"industryCodes\": {\"type\": \"mixed\", \"value\": null}, \"pageNum\": {\"type\": \"constant\", \"value\": null}, \"pageSize\": {\"type\": \"constant\", \"value\": null}}", "plugin": "investoday/fund:2.3.3@28da40826e2a746214c3013c57af598b352f7037192481ea272c70176d45c62c", "provider": ...
- 参数摘要：{"industryCode": {"type": "mixed", "value": "{{#1772440573912.industry_code_sw_l1#}}"}, "industryCodes": {"type": "mixed", "value": null}, "pageNum": {"type": "constant", "value": null}, "pageSize": {"type": "constant", "value": null}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 匹配共同基金节点 (`1772604603838`)

- 类型：`code`
- 上游：1772604497677, 17751114939220
- 下游：1772606146488
- 输入变量：[{"value_selector": ["1772604497677", "json"], "value_type": "array[object]", "variable": "etf_rotation_data"}, {"value_selector": ["17751114939220", "json"], "value_type": "array[object]", "variable": "industry_fund_list_data"}]
- 输出变量：{"has_match": {"children": null, "type": "string"}, "matched_funds": {"children": null, "type": "array[object]"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 判断ETF轮动策略是否存在 (`1772604627506`)

- 类型：`code`
- 上游：1775111405767
- 下游：1772605416756
- 输入变量：[{"value_selector": ["1775111405767", "text"], "value_type": "string", "variable": "etf_rotation_data"}]
- 输出变量：{"etf_rotation_data": {"children": null, "type": "string"}, "has_data": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## ETF轮动策略是否有数据 (`1772605416756`)

- 类型：`if-else`
- 上游：1772604627506
- 下游：1772605482644, 1772612387433
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## ETF代码名称提取 (`1772605482644`)

- 类型：`code`
- 上游：1772605416756
- 下游：1772607427341
- 输入变量：[{"value_selector": ["1775111405767", "text"], "value_type": "string", "variable": "etf_rotation_data"}]
- 输出变量：{"etf_list": {"children": null, "type": "array[object]"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 是否有基金 (`1772606146488`)

- 类型：`if-else`
- 上游：1772604603838
- 下游：1772606190536, 1772774825678
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 获取符合条件的基金技术指标 (`1772606190536`)

- 类型：`iteration`
- 上游：1772606146488
- 下游：1772606523810
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 1772606190536start (`1772606190536start`)

- 类型：`iteration-start`
- 上游：无
- 下游：1772606226707
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 获取基金代码 (`1772606226707`)

- 类型：`code`
- 上游：1772606190536start
- 下游：1772606423519
- 输入变量：[{"value_selector": ["1772606190536", "item"], "value_type": "object", "variable": "item"}]
- 输出变量：{"fund_code": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 基金技术指标 (`1772606423519`)

- 类型：`tool`
- 上游：1772606226707
- 下游：无
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"beginDate\": {\"type\": \"mixed\", \"value\": null}, \"endDate\": {\"type\": \"mixed\", \"value\": null}, \"fundCode\": {\"type\": \"mixed\", \"value\": \"{{#1772606226707.fund_code#}}\"}, \"fundCodes\": {\"type\": \"mixed\", \"value\": null}, \"pageNum\": {\"type\": \"constant\", \"value\": null}, \"pageSize\": {\"type\": \"constant\", \"value\": null}}", "plugin": "investoday/...
- 参数摘要：{"beginDate": {"type": "mixed", "value": null}, "endDate": {"type": "mixed", "value": null}, "fundCode": {"type": "mixed", "value": "{{#1772606226707.fund_code#}}"}, "fundCodes": {"type": "mixed", "value": null}, "pageNum": {"type": "constant", "value": null}, "pageSize": {"type": "constant", "value": null}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 同赛道ETF推荐 (`1772606523810`)

- 类型：`code`
- 上游：1772606190536
- 下游：1772608524656
- 输入变量：[{"value_selector": ["1772604603838", "matched_funds"], "value_type": "array[object]", "variable": "matched_funds"}, {"value_selector": ["1772606190536", "output"], "value_type": "array[object]", "variable": "fund_technical_data"}]
- 输出变量：{"recommended_funds": {"children": null, "type": "array[object]"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## ETF入选理由汇总 (`1772607427341`)

- 类型：`iteration`
- 上游：1772605482644
- 下游：1772607770573
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 1772607427341start (`1772607427341start`)

- 类型：`iteration-start`
- 上游：无
- 下游：1772607472094
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## ETF代码提取 (`1772607472094`)

- 类型：`code`
- 上游：1772607427341start
- 下游：1772607572907
- 输入变量：[{"value_selector": ["1772607427341", "item"], "value_type": "object", "variable": "item"}]
- 输出变量：{"fund_code": {"children": null, "type": "string"}, "fund_name": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## ETF入选理由生成 (`1772607572907`)

- 类型：`tool`
- 上游：1772607472094
- 下游：无
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"etf_codes\": {\"type\": \"mixed\", \"value\": \"{{#1772607472094.fund_code#}}\"}}", "plugin": "investoday/internal:2.0.0@c9a421e3c651b6a6af5f7c9ec68815dfb9760c78975f7390f46956a0d8e01ae5", "provider": "investoday/internal/internal", "tool": "list_etf_selection_reason"}
- 参数摘要：{"etf_codes": {"type": "mixed", "value": "{{#1772607472094.fund_code#}}"}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 不同赛道ETF轮动策略 (`1772607770573`)

- 类型：`code`
- 上游：1772607427341
- 下游：1772612387433
- 输入变量：[{"value_selector": ["1775111405767", "text"], "value_type": "string", "variable": "etf_rotation_data"}, {"value_selector": ["1772607427341", "output"], "value_type": "array[string]", "variable": "etf_reason_data"}]
- 输出变量：{"etf_recommendations": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 同赛道ETF推荐-模板转换 (`1772608524656`)

- 类型：`template-transform`
- 上游：1772606523810
- 下游：1772612387433
- 输入变量：[{"value_selector": ["1772606523810", "recommended_funds"], "value_type": "array[object]", "variable": "recommended_funds"}]
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 换股策略 (`1772612387433`)

- 类型：`variable-aggregator`
- 上游：1772608524656, 1772607770573, 1772605416756, 1772775932463
- 下游：1772431038460
- 输入变量：[["1772608524656", "output"], ["1772607770573", "etf_recommendations"], ["1772775932463", "data"]]
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 股票解套信号明细 (`1772613677097`)

- 类型：`tool`
- 上游：1772414097224
- 下游：1772614146559
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"beginDate\": {\"type\": \"mixed\", \"value\": null}, \"endDate\": {\"type\": \"mixed\", \"value\": null}, \"pageNum\": {\"type\": \"constant\", \"value\": null}, \"pageSize\": {\"type\": \"constant\", \"value\": null}, \"stockCode\": {\"type\": \"mixed\", \"value\": \"{{#1772413630417.stock_code#}}\"}}", "plugin": "investoday/internal:2.0.0@c9a421e3c651b6a6af5f7c9ec68815dfb9760c...
- 参数摘要：{"beginDate": {"type": "mixed", "value": null}, "endDate": {"type": "mixed", "value": null}, "pageNum": {"type": "constant", "value": null}, "pageSize": {"type": "constant", "value": null}, "stockCode": {"type": "mixed", "value": "{{#1772413630417.stock_code#}}"}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 是否在波段信号内 (`1772614146559`)

- 类型：`code`
- 上游：1772499711135, 1772613677097
- 下游：1772614344657
- 输入变量：[{"value_selector": ["1772613677097", "json"], "value_type": "array[object]", "variable": "signal_detail_data"}]
- 输出变量：{"is_signal_period": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 是否在波段信号内 (`1772614344657`)

- 类型：`if-else`
- 上游：1772614146559
- 下游：1772614510708, 1772614594009
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 波段信号解套方案 (`1772614510708`)

- 类型：`code`
- 上游：1772614344657
- 下游：1772614671589
- 输入变量：[{"value_selector": ["1772613677097", "text"], "value_type": "string", "variable": "signal_detail_data"}, {"value_selector": ["1772499711135", "text"], "value_type": "string", "variable": "signal_stat_data"}]
- 输出变量：{"signal_plan": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 不在信号期内的统计数据 (`1772614594009`)

- 类型：`code`
- 上游：1772614344657
- 下游：1772614671589
- 输入变量：[{"value_selector": ["1772499711135", "text"], "value_type": "string", "variable": "signal_stat_data"}]
- 输出变量：{"signal_stat": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 波段策略 (`1772614671589`)

- 类型：`variable-aggregator`
- 上游：1772614510708, 1772614594009
- 下游：1772431038460
- 输入变量：[["1772614510708", "signal_plan"], ["1772614594009", "signal_stat"]]
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 方案建议一 (`1772672806923`)

- 类型：`code`
- 上游：1772675454851
- 下游：1772586878432
- 输入变量：[{"value_selector": ["1772614671589", "output"], "value_type": "string", "variable": "signal_strategy"}, {"value_selector": ["1772612387433", "output"], "value_type": "string", "variable": "replace_strategy_"}]
- 输出变量：{"output": {"children": null, "type": "string"}, "plan_suggestion": {"children": null, "type": "string"}, "signal_data": {"children": null, "type": "string"}, "strategy_data": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 优质股票分类 (`1772675454851`)

- 类型：`if-else`
- 上游：1772431038460
- 下游：1772672806923, 1772675551697
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 方案建议二 (`1772675551697`)

- 类型：`code`
- 上游：1772675454851
- 下游：1772586878432
- 输入变量：[{"value_selector": ["1772614671589", "output"], "value_type": "string", "variable": "signal_strategy"}, {"value_selector": ["1772612387433", "output"], "value_type": "string", "variable": "replace_strategy"}]
- 输出变量：{"output": {"children": null, "type": "string"}, "plan_suggestion": {"children": null, "type": "string"}, "signal_data": {"children": null, "type": "string"}, "strategy_data": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 方案建议三 (`1772675630170`)

- 类型：`code`
- 上游：1772439978615
- 下游：1772586878432
- 输入变量：[{"value_selector": ["1772614671589", "output"], "value_type": "string", "variable": "signal_strategy"}, {"value_selector": ["1772612387433", "output"], "value_type": "string", "variable": "replace_strategy"}]
- 输出变量：{"output": {"children": null, "type": "string"}, "plan_suggestion": {"children": null, "type": "string"}, "signal_data": {"children": null, "type": "string"}, "strategy_data": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 方案建议四 (`1772676227393`)

- 类型：`code`
- 上游：1772526538433
- 下游：1772586878432
- 输入变量：[{"value_selector": ["1772614671589", "output"], "value_type": "string", "variable": "signal_strategy"}, {"value_selector": ["1772612387433", "output"], "value_type": "string", "variable": "replace_strategy"}]
- 输出变量：{"output": {"children": null, "type": "string"}, "plan_suggestion": {"children": null, "type": "string"}, "signal_data": {"children": null, "type": "string"}, "strategy_data": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 方案建议五 (`1772676327619`)

- 类型：`code`
- 上游：1772526538433
- 下游：1772586878432
- 输入变量：[{"value_selector": ["1772614671589", "output"], "value_type": "string", "variable": "signal_strategy"}, {"value_selector": ["1772612387433", "output"], "value_type": "string", "variable": "replace_strategy"}]
- 输出变量：{"output": {"children": null, "type": "string"}, "plan_suggestion": {"children": null, "type": "string"}, "signal_data": {"children": null, "type": "string"}, "strategy_data": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 方案建议六 (`1772676401916`)

- 类型：`code`
- 上游：1772526538433
- 下游：1772586878432
- 输入变量：[{"value_selector": ["1772614671589", "output"], "value_type": "string", "variable": "signal_strategy"}, {"value_selector": ["1772612387433", "output"], "value_type": "string", "variable": "replace_strategy"}]
- 输出变量：{"output": {"children": null, "type": "string"}, "plan_suggestion": {"children": null, "type": "string"}, "signal_data": {"children": null, "type": "string"}, "strategy_data": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 方案建议七 (`1772676463739`)

- 类型：`code`
- 上游：17725268667200
- 下游：1772586878432
- 输入变量：[{"value_selector": ["1772614671589", "output"], "value_type": "string", "variable": "arg1"}, {"value_selector": ["1772612387433", "output"], "value_type": "string", "variable": "arg2"}]
- 输出变量：{"output": {"children": null, "type": "string"}, "plan_suggestion": {"children": null, "type": "string"}, "signal_data": {"children": null, "type": "string"}, "strategy_data": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 解套方案生成 (`1772677093912`)

- 类型：`llm`
- 上游：1772586878432
- 下游：1772526899233
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：[{"id": "8fbc8f66-7dbc-4e82-bde4-64f5ff3936e4", "role": "system", "text": "假设你是资深投资顾问，请根据输入的数据进行分析、总结，依据下方给出的生成框架输出内容。\n\n\n\n分析相关数据：\n股票基本面分析：{{#1772691167480.fundamental_list#}}\n股票研报：{{#1772689062037.report_text#}}\n股票新闻：{{#1772689071482.news_list#}}\n股票公告：{{#1772689079646.announcement_text#}}\n赛道潜力：{{#1772603896542.sector_has_more_potential#}}\n股票技术面解读：{{#1772759965109.technical_interpretation#}}\n股票技术指标：{{#1772759965109.technical_indicators#}}\n当前是否有波段信号：{{#1772614146559.is_signal_period#}}\n解套方案数据：{{#1772586878432.output#}}\n被套深度：{{#1772523141092.get_loss_degree#}}\n被套仓位在账户占比：{{#1772523141092.get_position_level#}}\n解套方案整合：{{#1772586878432.output#}}，其中包括总体的方案建议、波段策略、换股策略。\n解套可行性依据此偏向输出。...

{"enabled": false, "variable_selector": []}
- 业务用途：待人工归纳
- 状态：manual_confirm

## 研报提取 (`1772689062037`)

- 类型：`code`
- 上游：1772419630002
- 下游：1772603896542
- 输入变量：[{"value_selector": ["1772419630002", "text"], "value_type": "string", "variable": "arg1"}]
- 输出变量：{"report_text": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 新闻提取 (`1772689071482`)

- 类型：`code`
- 上游：1772419679091
- 下游：1772603896542
- 输入变量：[{"value_selector": ["1772419679091", "text"], "value_type": "string", "variable": "arg1"}]
- 输出变量：{"news_list": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 公告提取 (`1772689079646`)

- 类型：`code`
- 上游：1772419711432
- 下游：1772603896542
- 输入变量：[{"value_selector": ["1772419711432", "text"], "value_type": "string", "variable": "arg1"}]
- 输出变量：{"announcement_text": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 研报舆情 (`1772690353791`)

- 类型：`tool`
- 上游：1772414097224
- 下游：无
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"beginTime\": {\"type\": \"mixed\", \"value\": \"{{#1772414097224.one_month_ago_trading_day#}}\"}, \"conceptCode\": {\"type\": \"mixed\", \"value\": null}, \"endTime\": {\"type\": \"mixed\", \"value\": \"{{#1772414047304.text#}}\"}, \"guid\": {\"type\": \"mixed\", \"value\": null}, \"industryCode\": {\"type\": \"mixed\", \"value\": null}, \"institutionCode\": {\"type\": \"constan...
- 参数摘要：{"beginTime": {"type": "mixed", "value": "{{#1772414097224.one_month_ago_trading_day#}}"}, "conceptCode": {"type": "mixed", "value": null}, "endTime": {"type": "mixed", "value": "{{#1772414047304.text#}}"}, "guid": {"type": "mixed", "value": null}, "industryCode": {"type": "mixed", "value": null}, "institutionCode": {"type": "constant", "value": null}, "minRelevance": {"type": "constant", "value":...
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 基本面提取 (`1772691167480`)

- 类型：`code`
- 上游：1772418782182
- 下游：1772603896542
- 输入变量：[{"value_selector": ["1772418782182", "text"], "value_type": "string", "variable": "arg1"}]
- 输出变量：{"fundamental_list": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 技术面解读 (`1772759965109`)

- 类型：`code`
- 上游：1772418123446
- 下游：1772431038460
- 输入变量：[{"value_selector": ["1772415682172", "text"], "value_type": "string", "variable": "price_pressure_response"}, {"value_selector": ["1772415958500", "text"], "value_type": "string", "variable": "data_mining_response"}, {"value_selector": ["1772417840200", "text"], "value_type": "string", "variable": "swing_response"}, {"value_selector": ["1772437428828", "text"], "value_type": "string", "variable":...
- 输出变量：{"technical_indicators": {"children": null, "type": "string"}, "technical_interpretation": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 行业持仓基金列表解析 (`1772774825678`)

- 类型：`code`
- 上游：1772606146488
- 下游：1772775139634
- 输入变量：[{"value_selector": ["1772604497677", "json"], "value_type": "array[object]", "variable": "input"}]
- 输出变量：{"data": {"children": null, "type": "array[object]"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 找出持仓规模最大的 (`1772775139634`)

- 类型：`iteration`
- 上游：1772774825678
- 下游：1772775932463
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 1772775139634start (`1772775139634start`)

- 类型：`iteration-start`
- 上游：无
- 下游：1772775816855
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 基金技术指标 (`1772775236293`)

- 类型：`tool`
- 上游：1772775816855
- 下游：1772775741124
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"beginDate\": {\"type\": \"mixed\", \"value\": null}, \"endDate\": {\"type\": \"mixed\", \"value\": null}, \"fundCode\": {\"type\": \"mixed\", \"value\": \"{{#1772775816855.fund_code#}}\"}, \"fundCodes\": {\"type\": \"mixed\", \"value\": \"\"}, \"pageNum\": {\"type\": \"constant\", \"value\": null}, \"pageSize\": {\"type\": \"constant\", \"value\": null}}", "plugin": "investoday/...
- 参数摘要：{"beginDate": {"type": "mixed", "value": null}, "endDate": {"type": "mixed", "value": null}, "fundCode": {"type": "mixed", "value": "{{#1772775816855.fund_code#}}"}, "fundCodes": {"type": "mixed", "value": ""}, "pageNum": {"type": "constant", "value": null}, "pageSize": {"type": "constant", "value": null}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 基金技术指标解析 (`1772775741124`)

- 类型：`code`
- 上游：1772775236293
- 下游：无
- 输入变量：[{"value_selector": ["1772775236293", "json"], "value_type": "array[object]", "variable": "input"}]
- 输出变量：{"data": {"children": null, "type": "array[object]"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 获取基金代码 (`1772775816855`)

- 类型：`code`
- 上游：1772775139634start
- 下游：1772775236293
- 输入变量：[{"value_selector": ["1772775139634", "item"], "value_type": "object", "variable": "item"}]
- 输出变量：{"fund_code": {"children": null, "type": "string"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## 占比最高、规模最大 (`1772775932463`)

- 类型：`code`
- 上游：1772775139634
- 下游：1772612387433
- 输入变量：[{"value_selector": ["1772775139634", "output"], "value_type": "array[object]", "variable": "output"}, {"value_selector": ["1772774825678", "data"], "value_type": "array[object]", "variable": "input"}]
- 输出变量：{"data": {"children": null, "type": "string"}, "data_list": {"children": null, "type": "array[object]"}}
- 工具/插件：无
- 参数摘要：无
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## ETF轮动策略 (`1775111405767`)

- 类型：`tool`
- 上游：1772604426679
- 下游：1772604627506
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"beginDate\": {\"type\": \"mixed\", \"value\": \"{{#1772414097224.three_months_ago#}}\"}, \"endDate\": {\"type\": \"mixed\", \"value\": \"{{#1772414047304.text#}}\"}, \"pageNum\": {\"type\": \"constant\", \"value\": null}, \"pageSize\": {\"type\": \"constant\", \"value\": null}}", "plugin": "investoday/internal:2.0.0@c9a421e3c651b6a6af5f7c9ec68815dfb9760c78975f7390f46956a0d8e01ae...
- 参数摘要：{"beginDate": {"type": "mixed", "value": "{{#1772414097224.three_months_ago#}}"}, "endDate": {"type": "mixed", "value": "{{#1772414047304.text#}}"}, "pageNum": {"type": "constant", "value": null}, "pageSize": {"type": "constant", "value": null}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm

## ETF轮动策略 (`17751114939220`)

- 类型：`tool`
- 上游：1772604426679
- 下游：1772604603838
- 输入变量：待确认
- 输出变量：待确认
- 工具/插件：{"parameters": "{\"beginDate\": {\"type\": \"mixed\", \"value\": \"{{#1772414097224.three_months_ago#}}\"}, \"endDate\": {\"type\": \"mixed\", \"value\": \"{{#1772414047304.text#}}\"}, \"pageNum\": {\"type\": \"constant\", \"value\": null}, \"pageSize\": {\"type\": \"constant\", \"value\": null}}", "plugin": "investoday/internal:2.0.0@c9a421e3c651b6a6af5f7c9ec68815dfb9760c78975f7390f46956a0d8e01ae...
- 参数摘要：{"beginDate": {"type": "mixed", "value": "{{#1772414097224.three_months_ago#}}"}, "endDate": {"type": "mixed", "value": "{{#1772414047304.text#}}"}, "pageNum": {"type": "constant", "value": null}, "pageSize": {"type": "constant", "value": null}}
- Prompt 摘要：无
- 业务用途：待人工归纳
- 状态：manual_confirm
