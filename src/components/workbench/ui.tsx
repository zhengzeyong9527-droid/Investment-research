import type { ComponentType } from "react";
import type { DisplayField } from "@/components/workbench/types";

export function DisplayFieldValue({ field, compact = false }: { field: DisplayField; compact?: boolean }) {
  const items = field.items?.filter(Boolean) ?? [];
  if (field.kind === "ordered" && items.length > 0) {
    return (
      <ol className={`display-list list-decimal ${compact ? "text-xs" : "text-sm"}`}>
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
      <ul className={`display-list list-disc ${compact ? "text-xs" : "text-sm"}`}>
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
    <div className={`display-paragraph ${compact ? "text-xs leading-5" : "text-sm leading-7"}`}>
      {text.split("\n").filter(Boolean).map((paragraph, index) => (
        <p key={`${field.label}-${index}`}>{paragraph}</p>
      ))}
    </div>
  );
}

export function SegmentedFilter({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-md border border-ink/10 bg-paper/70 p-1">
      {options.map(([optionValue, label]) => (
        <button
          key={optionValue}
          onClick={() => onChange(optionValue)}
          className={`rounded px-2 py-1.5 text-xs font-semibold transition ${
            value === optionValue ? "bg-jade text-white" : "text-ink/60 hover:bg-white/70"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function SentimentCell({ label, value, tone }: { label: string; value: number; tone: "positive" | "neutral" | "negative" }) {
  const toneClass =
    tone === "positive" ? "text-jade" : tone === "negative" ? "text-persimmon" : "text-brass";
  return (
    <div className="border-r border-ink/10 px-4 py-3 last:border-r-0 max-md:border-b max-md:border-r-0">
      <div className="text-xs text-ink/45">{label}</div>
      <div className={`mt-1 font-display text-3xl ${toneClass}`}>{value}</div>
    </div>
  );
}

export function InsightPanel({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  items: string[];
  tone: "positive" | "danger";
}) {
  const isPositive = tone === "positive";
  return (
    <section className={`insight-card ${isPositive ? "insight-card-positive" : "insight-card-danger"} p-4`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-2xl">
          <span className={`grid h-8 w-8 place-items-center rounded-md ${isPositive ? "bg-jade/10 text-jade" : "bg-persimmon/10 text-persimmon"}`}>
            <Icon size={18} />
          </span>
          {title}
        </h3>
        <span className={`rounded px-2 py-1 text-xs font-semibold ${isPositive ? "bg-jade/10 text-jade" : "bg-persimmon/10 text-persimmon"}`}>
          {items.length}
        </span>
      </div>
      <div className="grid gap-2">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-ink/15 bg-paper/55 px-3 py-5 text-center text-sm text-ink/55">当前范围暂无可展示线索。</div>
        ) : (
          items.map((item, index) => (
            <div key={`${title}-${index}`} className="insight-row">
              <span className={`insight-index ${isPositive ? "text-jade" : "text-persimmon"}`}>{String(index + 1).padStart(2, "0")}</span>
              <p>{item}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-ink/10 bg-paper/75 px-4 py-3">
      <div className="text-xs text-ink/50">{label}</div>
      <div className="mt-1 font-display text-3xl">{value}</div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, compact }: { icon: ComponentType<{ size?: number; className?: string }>; title: string; compact?: boolean }) {
  return (
    <div className={`flex items-center justify-center rounded-md border border-dashed border-ink/18 bg-paper/55 text-ink/55 ${compact ? "min-h-24" : "min-h-48"}`}>
      <div className="text-center">
        <Icon className="mx-auto mb-3 text-jade" size={28} />
        <div className="font-semibold">{title}</div>
      </div>
    </div>
  );
}

export function IconButton({
  label,
  icon: Icon,
  disabled,
  tone = "default",
  onClick,
}: {
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  disabled?: boolean;
  tone?: "default" | "danger";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 ${
        tone === "danger"
          ? "border-persimmon/25 text-persimmon hover:bg-persimmon hover:text-white"
          : "border-jade/25 text-jade hover:bg-jade hover:text-white"
      }`}
      title={label}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

export function LabeledInput({ name, label, type = "text", defaultValue }: { name: string; label: string; type?: string; defaultValue: string | number }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-ink/70">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} className="field rounded-md px-3 py-2" />
    </label>
  );
}
