import { DatabaseZap } from "lucide-react";
import type { FormEvent } from "react";
import { patchJson } from "@/components/workbench/api";
import type { AppSettings } from "@/components/workbench/types";
import { LabeledInput } from "@/components/workbench/ui";

export function SettingsView({
  settings,
  health,
  onSaved,
  onCheckHealth,
}: {
  settings: AppSettings;
  health: { ok: boolean; message: string } | null;
  onSaved: (settings: AppSettings) => void;
  onCheckHealth: () => void;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = await patchJson<AppSettings>("/api/settings", {
      briefTime: form.get("briefTime"),
      dataWindowHours: Number(form.get("dataWindowHours")),
      backfillDays: Number(form.get("backfillDays")),
      defaultItemLimit: Number(form.get("defaultItemLimit")),
    });
    onSaved(next);
  }

  return (
    <div className="grid grid-cols-[420px_minmax(0,1fr)] gap-5 max-xl:grid-cols-1">
      <form onSubmit={submit} className="panel p-5">
        <h3 className="mb-4 font-display text-2xl">速览参数</h3>
        <div className="grid gap-3">
          <LabeledInput name="briefTime" label="生成时间" defaultValue={settings.briefTime} />
          <LabeledInput name="dataWindowHours" label="默认窗口小时" type="number" defaultValue={settings.dataWindowHours} />
          <LabeledInput name="backfillDays" label="补漏天数" type="number" defaultValue={settings.backfillDays} />
          <LabeledInput name="defaultItemLimit" label="默认展示数量" type="number" defaultValue={settings.defaultItemLimit} />
          <button className="rounded-md bg-jade px-4 py-2.5 text-white transition hover:bg-ink">保存设置</button>
        </div>
      </form>

      <section className="panel p-5">
        <h3 className="mb-4 font-display text-2xl">执行器与数据源</h3>
        <div className="grid gap-3">
          <div className="rounded-md border border-ink/10 bg-paper/60 p-4 text-sm leading-7 text-ink/70">
            OpenAI 执行器读取 `OPENAI_API_KEY`，默认模型为 `gpt-4.1-mini`。未配置时，Agent 会保存任务和提示包，但不会生成虚假分析结果。
          </div>
          <button onClick={onCheckHealth} className="inline-flex w-fit items-center gap-2 rounded-md border border-jade/30 px-4 py-2 text-jade transition hover:bg-jade hover:text-white">
            <DatabaseZap size={17} />
            检查今日投资
          </button>
          <div className={`rounded-md border px-4 py-3 text-sm ${health?.ok ? "border-jade/30 bg-jade/10 text-jade" : "border-persimmon/30 bg-persimmon/10 text-persimmon"}`}>
            {health?.message ?? "尚未检查。"}
          </div>
        </div>
      </section>
    </div>
  );
}
