import type { ComplianceResult } from "@/agents/types";

const BLOCKED_TERMS = [
  "建议买入",
  "建议卖出",
  "买入",
  "卖出",
  "加仓",
  "减仓",
  "建仓",
  "清仓",
  "仓位",
  "目标价",
  "止盈",
  "止损",
  "交易时机",
  "买点",
  "卖点",
  "支撑位",
  "压力位",
  "短线信号",
];

export function checkInvestmentCompliance(text: string): ComplianceResult {
  const blockedTerms = unique(BLOCKED_TERMS.filter((term) => text.includes(term)));
  return {
    passed: blockedTerms.length === 0,
    issues: blockedTerms.length > 0 ? ["contains_trading_advice"] : [],
    blockedTerms,
    revised: false,
  };
}

function unique(values: string[]) {
  return [...new Set(values)];
}
