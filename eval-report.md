# 真实 Agent Eval Report

本报告只统计真实 AgentRun。任一 case 如果缺少 runId、ToolCall 或 ModelCall，会直接标记失败，不再计入伪成功。

## 总览指标

- total: 7
- passed: 0
- terminal_rate: 1
- completion_rate: 0
- tool_success_rate: 1
- evidence_coverage_rate: 1
- citation_precision: 0
- rag_recall_at_k: 1
- memory_recall_rate: null
- cross_session_leak_rate: 0
- stale_date_rate: 0
- hallucination_rate: 0
- latency_p50_ms: 18204
- latency_p95_ms: 30362
- total_cost_cents: 0

## 失败 Case

| case | runId | status | reasons |
|---|---|---|---|
| real-001#1 | cms6zjmfy00046vtw4rj9qvr4 | failed | unexpected_status:failed, citation_precision_low, memory_write_miss |
| real-002#1 | cms6zk8ck000b6vtwnjtm6ljs | failed | unexpected_status:failed, citation_precision_low |
| real-003#1 | cms6zkmeg000i6vtw9l16eld7 | failed | unexpected_status:failed, citation_precision_low |
| real-004#1 | cms6zkxct000p6vtwzr2vd46q | failed | unexpected_status:failed, citation_precision_low |
| real-005#1 | cms6zlczi000w6vtwcf5dmo0b | failed | unexpected_status:failed, citation_precision_low, memory_write_miss |
| real-005#2 | cms6zlphb00126vtwe6cfiaxb | failed | unexpected_status:failed, entity_mismatch, citation_precision_low |
| real-006#1 | cms6zm0e200196vtww5r63zw6 | failed | unexpected_status:failed, citation_precision_low |

## 工具失败分布

- none

## 证据缺口与幻觉示例

- real-001#1 / cms6zjmfy00046vtw4rj9qvr4: gaps=1, hallucination=0
- real-002#1 / cms6zk8ck000b6vtwnjtm6ljs: gaps=1, hallucination=0
- real-003#1 / cms6zkmeg000i6vtw9l16eld7: gaps=1, hallucination=0
- real-004#1 / cms6zkxct000p6vtwzr2vd46q: gaps=1, hallucination=0
- real-005#1 / cms6zlczi000w6vtwcf5dmo0b: gaps=1, hallucination=0

## RAG 命中示例

- real-001#1 / cms6zjmfy00046vtw4rj9qvr4: 茅台渠道风险 seed 文档(0.4411); 盘面播报口径 seed 文档(0.3155); 有色金属催化 seed 文档(0.2944)
- real-002#1 / cms6zk8ck000b6vtwnjtm6ljs: 有色金属催化 seed 文档(0.5442); 盘面播报口径 seed 文档(0.3981); 茅台渠道风险 seed 文档(0.3961)
- real-003#1 / cms6zkmeg000i6vtw9l16eld7: 盘面播报口径 seed 文档(0.6407); 茅台渠道风险 seed 文档(0.3596); 有色金属催化 seed 文档(0.279)
- real-004#1 / cms6zkxct000p6vtwzr2vd46q: 茅台渠道风险 seed 文档(0.6245); 有色金属催化 seed 文档(0.3802); 盘面播报口径 seed 文档(0.3599)
- real-005#1 / cms6zlczi000w6vtwcf5dmo0b: 茅台渠道风险 seed 文档(0.3625); 盘面播报口径 seed 文档(0.2925); 有色金属催化 seed 文档(0.2642)

## 记忆结果

- none

## 成本与延迟

- model_call_count: 14
- token_input: 510548
- token_output: 0
- cost_cents: 0
