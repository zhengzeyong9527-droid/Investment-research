import { NextResponse } from "next/server";
import { InvestodayDataAdapter } from "@/lib/investoday";
import { deleteWatchTarget, listWatchTargets, updateWatchTarget } from "@/lib/repositories";
import { buildWatchTargetRepairPlan, type RepairableWatchTarget } from "@/lib/watch-targets";

export async function POST() {
  const adapter = new InvestodayDataAdapter();
  let targets = (await listWatchTargets()) as RepairableWatchTarget[];
  const pendingTargets = targets.filter((target) => target.code.startsWith("NAME:"));
  const repaired: string[] = [];
  const failed: Array<{ id: string; name: string; message: string }> = [];

  for (const pending of pendingTargets) {
    try {
      const lookupName = pending.name || pending.code.replace(/^NAME:/, "");
      const resolved =
        pending.type === "stock"
          ? await adapter.resolveStock({ name: lookupName })
          : await adapter.resolveSector({ name: lookupName });
      const plan = buildWatchTargetRepairPlan(pending, resolved, targets);

      if (plan.action === "merge") {
        await updateWatchTarget(plan.intoId, plan.input);
        await deleteWatchTarget(plan.fromId);
        repaired.push(pending.id);
        targets = targets
          .filter((target) => target.id !== plan.fromId)
          .map((target) => (target.id === plan.intoId ? { id: plan.intoId, ...plan.input } : target));
      } else {
        await updateWatchTarget(plan.id, plan.input);
        repaired.push(pending.id);
        targets = targets.map((target) => (target.id === plan.id ? { id: plan.id, ...plan.input } : target));
      }
    } catch (error) {
      failed.push({
        id: pending.id,
        name: pending.name,
        message: error instanceof Error ? error.message : "未能识别该自选对象",
      });
    }
  }

  return NextResponse.json({
    repairedCount: repaired.length,
    failedCount: failed.length,
    failed,
    targets: await listWatchTargets(),
  });
}
