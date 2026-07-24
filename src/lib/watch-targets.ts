import { z } from "zod";
import type { NormalizedWatchTarget, WatchTargetInput } from "@/lib/types";

const targetInputSchema = z.object({
  type: z.enum(["stock", "sector"]),
  code: z.string(),
  name: z.string(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  reason: z.string().optional(),
  enabled: z.boolean().optional(),
});

export function parseWatchTargetInput(input: WatchTargetInput): NormalizedWatchTarget {
  const parsed = targetInputSchema.parse(input);
  const code = parsed.code.trim().toUpperCase();
  const name = parsed.name.trim();

  if (!code || !name) {
    throw new Error("名称和代码不能为空");
  }

  return {
    type: parsed.type,
    code,
    name,
    tags: normalizeTags(parsed.tags),
    reason: parsed.reason?.trim() ?? "",
    enabled: parsed.enabled ?? true,
  };
}

export type WatchTargetResolver = {
  resolveStock(input: { code?: string; name?: string }): Promise<NormalizedWatchTarget>;
  resolveSector(input: { code?: string; name?: string }): Promise<NormalizedWatchTarget>;
};

export type RepairableWatchTarget = NormalizedWatchTarget & { id: string };

export type WatchTargetRepairPlan =
  | { action: "replace"; id: string; input: NormalizedWatchTarget }
  | { action: "merge"; fromId: string; intoId: string; input: NormalizedWatchTarget };

export async function normalizeWatchTargetForSave(
  input: WatchTargetInput,
  resolver: WatchTargetResolver
): Promise<NormalizedWatchTarget> {
  const parsed = targetInputSchema.parse(input);
  const code = parsed.code.trim().toUpperCase();
  const name = parsed.name.trim();

  if (code && name) {
    return parseWatchTargetInput(input);
  }

  if (!code && !name) {
    throw new Error(parsed.type === "stock" ? "股票代码或名称至少填写一项" : "板块代码或名称至少填写一项");
  }

  const resolved =
    parsed.type === "stock"
      ? await resolver.resolveStock(stockLookupFrom(code, name))
      : await resolver.resolveSector(sectorLookupFrom(code, name));
  const tagInput = parsed.tags;

  return {
    ...resolved,
    tags: tagInput === undefined ? resolved.tags : normalizeTags(tagInput),
    reason: parsed.reason?.trim() ?? "",
    enabled: parsed.enabled ?? true,
  };
}

export function serializeTags(tags: string[]): string {
  return JSON.stringify(tags);
}

export function deserializeTags(tags: string | null | undefined): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return normalizeTags(tags);
  }
}

function normalizeTags(tags: string | string[] | undefined): string[] {
  const source = Array.isArray(tags) ? tags : (tags ?? "").split(/[，,]/);
  return Array.from(new Set(source.map((tag) => tag.trim()).filter(Boolean)));
}

export function buildWatchTargetRepairPlan(
  pending: RepairableWatchTarget,
  resolved: NormalizedWatchTarget,
  existingTargets: RepairableWatchTarget[]
): WatchTargetRepairPlan {
  const duplicate = existingTargets.find(
    (target) => target.id !== pending.id && target.type === resolved.type && target.code === resolved.code
  );
  const input = mergeWatchTargetFields(duplicate ?? pending, pending, resolved);

  if (duplicate) {
    return {
      action: "merge",
      fromId: pending.id,
      intoId: duplicate.id,
      input,
    };
  }

  return {
    action: "replace",
    id: pending.id,
    input,
  };
}

function mergeWatchTargetFields(
  base: RepairableWatchTarget,
  pending: RepairableWatchTarget,
  resolved: NormalizedWatchTarget
): NormalizedWatchTarget {
  return {
    type: resolved.type,
    code: resolved.code,
    name: resolved.name,
    tags: uniqueTags([...(base.tags ?? []), ...(pending.tags ?? []), ...(resolved.tags ?? [])]),
    reason: mergeReason(base.reason, pending.reason),
    enabled: base.enabled || pending.enabled || resolved.enabled,
  };
}

function uniqueTags(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
}

function mergeReason(first: string, second: string) {
  const parts = Array.from(new Set([first.trim(), second.trim()].filter(Boolean)));
  return parts.join("；");
}

function stockLookupFrom(code: string, name: string) {
  if (name) return { name };
  return /^\d{6}$/.test(code) ? { code } : { name: code };
}

function sectorLookupFrom(code: string, name: string) {
  if (name) return { name };
  return /^\d+$/.test(code) || /^[A-Z]+\d+$/i.test(code) ? { code } : { name: code };
}
