import type { AdapterBriefItem, BriefDraft, BriefItemDraft, EnabledTarget } from "@/lib/types";

export type DailyBriefRepository = {
  listEnabledTargets(): Promise<EnabledTarget[]>;
  upsertBrief(brief: BriefDraft): Promise<{ id: string; status: BriefDraft["status"]; summary: string; items: unknown[] } & Record<string, unknown>>;
};

export type DailyBriefAdapter = {
  fetchBriefItems(input: {
    target: EnabledTarget;
    windowStart: Date;
    windowEnd: Date;
  }): Promise<AdapterBriefItem[]>;
};

export type GenerateBriefInput = {
  briefDate: string;
  now: Date;
  windowHours: number;
  repository: DailyBriefRepository;
  adapter: DailyBriefAdapter;
};

export async function generateDailyBrief(input: GenerateBriefInput) {
  const windowEnd = input.now;
  const windowStart = new Date(windowEnd.getTime() - input.windowHours * 60 * 60 * 1000);
  const targets = await input.repository.listEnabledTargets();
  const items: BriefItemDraft[] = [];

  for (const target of targets) {
    const targetItems = await input.adapter.fetchBriefItems({ target, windowStart, windowEnd });
    items.push(...targetItems.filter(shouldIncludeBriefItem).map((item) => ({ ...item, targetId: target.id })));
  }

  const status = items.length > 0 ? "success" : "empty";
  const summary =
    items.length > 0
      ? buildBriefSummary(items, targets.length)
      : "近24小时未获取到匹配内容，可使用近7天补漏或检查自选池。";

  return input.repository.upsertBrief({
    briefDate: input.briefDate,
    status,
    windowStart,
    windowEnd,
    summary,
    generatedAt: input.now,
    items,
  });
}

function buildBriefSummary(items: BriefItemDraft[], targetCount: number): string {
  const researchCount = items.filter((item) => item.kind === "research").length;
  const newsCount = items.filter((item) => item.kind === "news").length;
  const announcementCount = items.filter((item) => item.kind === "announcement").length;
  const eventCount = items.filter((item) => item.kind === "event").length;
  return `覆盖 ${targetCount} 个启用自选对象，获取 ${items.length} 条内容：新闻 ${newsCount} 条、研报 ${researchCount} 条、公告 ${announcementCount} 条、事件 ${eventCount} 条。`;
}

function shouldIncludeBriefItem(item: AdapterBriefItem) {
  if (item.kind !== "news") return true;
  const newsLevel = payloadNumber(item.normalizedPayload, "newsLevel") ?? payloadNumber(item.rawPayload, "newsLevel");
  return newsLevel === 1;
}

function payloadNumber(payload: unknown, key: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  const value = (payload as Record<string, unknown>)[key];
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
