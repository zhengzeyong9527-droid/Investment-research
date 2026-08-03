import type { AgentGraphState } from "@/agents/graph/state";

export const MAX_REGEN_ATTEMPTS = 2;

export function routeFromRouter(state: AgentGraphState) {
  return state.agentKey === "market-broadcast-agent" ? "fetch_market" : "resolve_entity";
}

export function routeAfterCheckMissing(state: AgentGraphState) {
  return state.resumedFromInterrupt ? "normalize_input" : "retrieve_memory";
}

export function routeAfterMemory(state: AgentGraphState) {
  return state.agentKey === "market-broadcast-agent" ? "local_rag_retrieve" : "fetch_evidence";
}

export function routeAfterGrade(state: AgentGraphState) {
  if (!state.evidenceGrade?.passed && state.evidence.length === 0) return "degrade";
  return state.agentKey === "market-broadcast-agent" ? "run_broadcast" : "generate";
}

export function routeAfterVerify(state: AgentGraphState) {
  if (state.verification?.passed) return "commit_memory";
  if ((state.verification?.claimVerification?.blockingUnsupportedClaims?.length ?? 0) > 0 && state.attempts >= MAX_REGEN_ATTEMPTS) {
    return "degrade";
  }
  if (state.attempts >= MAX_REGEN_ATTEMPTS) return "finalize";
  return state.agentKey === "market-broadcast-agent" ? "run_broadcast" : "generate";
}
