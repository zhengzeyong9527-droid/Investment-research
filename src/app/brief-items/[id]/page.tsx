import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, ShieldAlert, Sparkles } from "lucide-react";
import { contentKindLabel } from "@/lib/display";
import { getBriefItemDetail } from "@/lib/repositories";

type DisplayField = {
  label: string;
  kind?: "paragraph" | "bullets" | "ordered" | "tags" | "metric";
  value?: string;
  items?: string[];
};

export default async function BriefItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getBriefItemDetail(id);
  if (!item) notFound();

  const highlightSections = item.displaySections.filter((section) =>
    ["关键要点", "影响分析", "机会线索", "风险提示", "研报观点"].includes(section.title)
  );

  return (
    <main className="glass-shell min-h-screen bg-terminal px-6 py-7 text-ink max-sm:px-4">
      <div className="grain" />
      <div className="relative mx-auto max-w-6xl">
        <Link href="/" className="mb-5 inline-flex items-center gap-2 rounded-md border border-jade/20 bg-white/70 px-3 py-2 text-sm font-semibold text-jade shadow-sm backdrop-blur hover:border-jade/45 hover:bg-white">
          <ArrowLeft size={16} />
          返回工作台
        </Link>

        <section className="detail-hero panel mb-5 p-6 max-sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-4xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded bg-jade/10 px-2 py-1 text-xs font-semibold text-jade">{contentKindLabel(item.kind)}</span>
                {item.sentimentLabel && <span className={sentimentClass(item.sentimentTone)}>{item.sentimentLabel}</span>}
                {item.newsLevelLabel && <span className="rounded bg-ink px-2 py-1 text-xs font-semibold text-paper">{item.newsLevelLabel}</span>}
                {item.newsTypeLabel && <span className="rounded border border-ink/10 px-2 py-1 text-xs text-ink/60">{item.newsTypeLabel}</span>}
              </div>
              <h1 className="max-w-[28ch] font-display text-4xl leading-[1.22] text-ink max-md:text-3xl">{item.title}</h1>
              <p className="mt-4 max-w-[76ch] text-base leading-8 text-ink/70 max-sm:text-sm max-sm:leading-7">{item.summary}</p>
            </div>
            <div className="min-w-44 rounded-md border border-ink/10 bg-white/60 px-3 py-2 text-sm backdrop-blur">
              <div className="text-xs text-ink/45">关联对象</div>
              <div className="mt-1 font-semibold">{item.target ? `${item.target.name} ${item.target.code}` : "未关联"}</div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-5 max-xl:grid-cols-1">
          <section className="grid gap-4">
            {item.displaySections.map((section) => (
              <article key={section.title} id={section.title} className="detail-section-card p-5 max-sm:p-4">
                <h2 className="mb-4 flex items-center gap-2 font-display text-[1.35rem] leading-7">
                  <FileText size={19} className="text-jade" />
                  {section.title}
                </h2>
                <div className={section.title === "基本信息" || section.title === "情绪与重要性" ? "grid grid-cols-2 gap-3 max-md:grid-cols-1" : "grid gap-3"}>
                  {section.fields.map((field) => (
                    <div key={`${section.title}-${field.label}`} className="detail-field border-b border-ink/10 pb-4 last:border-b-0 last:pb-0">
                      <div className="text-xs font-semibold text-ink/45">{field.label}</div>
                      <DisplayFieldDetail field={field} />
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>

          <aside className="grid content-start gap-4">
            <section className="panel p-4">
              <h2 className="mb-3 flex items-center gap-2 font-display text-xl">
                <Sparkles size={19} className="text-persimmon" />
                信息摘要
              </h2>
              <div className="grid gap-2">
                <MiniStat label="情绪" value={item.sentimentLabel ?? "未标注"} />
                <MiniStat label="重要性" value={item.newsLevelLabel ?? "未标注"} />
                <MiniStat label="关联度" value={item.relevance === undefined ? "未标注" : String(item.relevance)} />
                <MiniStat label="情绪得分" value={item.sentimentScore === undefined ? "未标注" : String(item.sentimentScore)} />
              </div>
            </section>

            <section className="panel border-persimmon/20 p-4">
              <h2 className="mb-3 flex items-center gap-2 font-display text-xl">
                <ShieldAlert size={19} className="text-persimmon" />
                阅读边界
              </h2>
              <p className="text-sm leading-7 text-ink/65">
                本页仅整理公开信息、研报观点和风险线索，不构成买卖点、仓位、止盈止损或交易时机建议。
              </p>
            </section>

            {highlightSections.length > 0 && (
              <section className="panel p-4">
                <h2 className="mb-3 font-display text-xl">重点段落</h2>
                <div className="grid gap-2">
                  {highlightSections.map((section) => (
                    <a key={section.title} href={`#${section.title}`} className="rounded border border-ink/10 bg-white/70 px-3 py-2 text-sm font-semibold hover:border-jade/40 hover:text-jade">
                      {section.title}
                    </a>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function DisplayFieldDetail({ field }: { field: DisplayField }) {
  const items = field.items?.filter(Boolean) ?? [];
  if (field.kind === "ordered" && items.length > 0) {
    return (
      <ol className="display-list list-decimal text-sm">
        {items.map((item, index) => (
          <li key={`${field.label}-${index}`}>{item}</li>
        ))}
      </ol>
    );
  }
  if ((field.kind === "bullets" || field.kind === "tags") && items.length > 0) {
    if (field.kind === "tags") {
      return (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span key={item} className="rounded border border-jade/20 bg-jade/10 px-2 py-1 text-xs font-semibold text-jade">
              {item}
            </span>
          ))}
        </div>
      );
    }
    return (
      <ul className="display-list list-disc text-sm">
        {items.map((item, index) => (
          <li key={`${field.label}-${index}`}>{item}</li>
        ))}
      </ul>
    );
  }

  const text = field.value ?? items.join(" ");
  if (!text) return null;
  if (field.kind === "metric") {
    return <div className="mt-1 text-sm font-semibold leading-6 text-ink/78">{text}</div>;
  }
  return (
    <div className="display-paragraph text-sm leading-7">
      {text.split("\n").filter(Boolean).map((paragraph, index) => (
        <p key={`${field.label}-${index}`}>{paragraph}</p>
      ))}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-paper/70 px-3 py-2">
      <div className="text-xs text-ink/45">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function sentimentClass(tone?: "positive" | "neutral" | "negative") {
  if (tone === "positive") return "rounded bg-jade/10 px-2 py-1 text-xs font-semibold text-jade";
  if (tone === "negative") return "rounded bg-persimmon/10 px-2 py-1 text-xs font-semibold text-persimmon";
  return "rounded bg-brass/10 px-2 py-1 text-xs font-semibold text-brass";
}
