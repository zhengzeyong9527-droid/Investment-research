import { parseUnwindFields } from "@/agents/entity-resolver";

export function isSupplementForInterruptedRun(
  content: string,
  interruptedRun: { status?: string; outputJson?: unknown; inputPayload?: unknown }
) {
  if (interruptedRun.status !== "interrupted") return false;
  const text = content.trim();
  const interruptType = interruptTypeFromRun(interruptedRun);
  if (interruptType === "risk_confirm") return isConfirmMessage(text);

  const missingInputs = missingInputsFromRun(interruptedRun);
  if (missingInputs.length === 0) return false;
  if (isNewTaskMessage(text)) return false;
  if (isConfirmMessage(text)) return true;
  if (/^\d{6}$/.test(text) && missingInputs.some((key) => key.includes("stock"))) return true;
  if (/^[\u4e00-\u9fa5A-Za-z0-9]{2,12}$/.test(text) && missingInputs.some((key) => key.includes("stock"))) return true;
  if (missingInputs.includes("positionPercent") && hasPositionField(text)) return true;
  if (missingInputs.includes("lossPercent") && hasLossField(text)) return true;
  return false;
}

export function buildResumePayloadFromMessage(content: string): Record<string, unknown> {
  const text = content.trim();
  const payload: Record<string, unknown> = {};
  if (isConfirmMessage(text)) payload.riskConfirmed = true;
  if (/^\d{6}$/.test(text)) {
    payload.stockCode = text;
    payload.stockCodeOrName = text;
  } else if (/^[\u4e00-\u9fa5A-Za-z0-9]{2,12}$/.test(text) && !hasPositionField(text)) {
    payload.stockCodeOrName = text;
  }
  return { ...payload, ...parseUnwindFields(text) };
}

function missingInputsFromRun(run: { outputJson?: unknown }) {
  const interrupt = interruptFromRun(run);
  return Array.isArray(interrupt.missingInputs) ? interrupt.missingInputs.map(String) : [];
}

function interruptTypeFromRun(run: { outputJson?: unknown }) {
  const interrupt = interruptFromRun(run);
  return typeof interrupt.type === "string" ? interrupt.type : "";
}

function interruptFromRun(run: { outputJson?: unknown }) {
  const outputJson = run.outputJson && typeof run.outputJson === "object" ? (run.outputJson as Record<string, unknown>) : {};
  return outputJson.interrupt && typeof outputJson.interrupt === "object" ? (outputJson.interrupt as Record<string, unknown>) : {};
}

function isNewTaskMessage(text: string) {
  return /^(重新|新建|换个|研究|分析).*(行业|板块|股票|公司|主题)/.test(text) ||
    /^(閲嶆柊|鏂板缓|鎹釜|鐮旂┒|鍒嗘瀽).*(琛屼笟|鏉垮潡|鑲＄エ|鍏徃|涓婚)/.test(text);
}

function isConfirmMessage(text: string) {
  return /^(确认|同意|继续|可以|yes|ok)$/i.test(text) || /^(纭|鍚屾剰|缁х画|鍙互)$/i.test(text);
}

function hasPositionField(text: string) {
  return /(仓位|持仓|满仓|半仓|[一二三四五六七八九]成|\d{1,3}%)/.test(text) ||
    /(浠撲綅|鎸佷粨|婊′粨|鍗婁粨|[涓€浜屼笁鍥涗簲鍏竷鍏節]鎴恷\d{1,3}%)/.test(text);
}

function hasLossField(text: string) {
  return /(被套|亏损|浮亏|套了|亏了|\d{1,3}%)/.test(text) ||
    /(琚|浜忔崯|娴簭|濂椾簡|浜忎簡|\d{1,3}%)/.test(text);
}
