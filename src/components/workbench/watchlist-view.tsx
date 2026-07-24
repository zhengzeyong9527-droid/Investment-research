import { Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { postJson } from "@/components/workbench/api";
import type { WatchTarget } from "@/components/workbench/types";
import { IconButton } from "@/components/workbench/ui";
import { watchTargetStatusClass, watchTargetStatusLabel } from "@/components/workbench/utils";

export function WatchlistView({ targets, onChanged }: { targets: WatchTarget[]; onChanged: (message: string) => Promise<void> }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await postJson("/api/watch-targets", Object.fromEntries(form));
      formElement.reset();
      await onChanged("自选对象已保存。");
    } catch (error) {
      await onChanged(error instanceof Error ? error.message : "自选对象保存失败");
    }
  }

  return (
    <div className="grid grid-cols-[380px_minmax(0,1fr)] gap-5 max-xl:grid-cols-1">
      <form onSubmit={submit} className="panel p-5">
        <h3 className="mb-4 font-display text-2xl">新增自选</h3>
        <div className="grid gap-3">
          <select name="type" className="field rounded-md px-3 py-2">
            <option value="stock">A 股个股</option>
            <option value="sector">板块</option>
          </select>
          <input name="code" className="field rounded-md px-3 py-2" placeholder="代码或名称，股票/板块二选一即可" />
          <input name="name" className="field rounded-md px-3 py-2" placeholder="名称，可留空；也可只在上一栏输入名称" />
          <input name="tags" className="field rounded-md px-3 py-2" placeholder="标签，用逗号分隔" />
          <textarea name="reason" className="field min-h-28 rounded-md px-3 py-2" placeholder="关注理由" />
          <button className="inline-flex items-center justify-center gap-2 rounded-md bg-jade px-4 py-2.5 text-white transition hover:bg-ink">
            <Plus size={17} />
            保存
          </button>
        </div>
      </form>

      <section className="grid gap-3">
        {targets.map((target) => (
          <div key={target.id} className="panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-jade/10 px-2 py-1 text-xs font-semibold text-jade">{target.type === "stock" ? "个股" : "板块"}</span>
                  <h4 className="text-lg font-semibold">{target.name}</h4>
                  <span className="text-sm text-ink/45">{target.code}</span>
                  <span className={watchTargetStatusClass(target)}>{watchTargetStatusLabel(target)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink/65">{target.reason || "未填写关注理由"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {target.tags.map((tag) => (
                    <span key={tag} className="rounded border border-brass/30 px-2 py-1 text-xs text-brass">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <IconButton
                label="删除"
                icon={Trash2}
                tone="danger"
                onClick={async () => {
                  await fetch(`/api/watch-targets/${target.id}`, { method: "DELETE" });
                  await onChanged("已删除。");
                }}
              />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
