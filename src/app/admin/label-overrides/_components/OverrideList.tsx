"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteOverride } from "../actions";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

type OverrideRow = {
  id: string;
  warehouse_id: string;
  override_date: string;
  label: string;
  action: "add" | "skip";
  color: string | null;
  note: string | null;
  warehouses: { name: string } | null;
};

export function OverrideList({ overrides }: { overrides: OverrideRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (overrides.length === 0) {
    return (
      <div className="rounded-2xl bg-[color:var(--surface)] p-8 text-center shadow-[var(--shadow-sm)]">
        <p className="text-[13px] text-[color:var(--ink-3)]">
          例外はまだ登録されていません
        </p>
      </div>
    );
  }

  function handleDelete(id: string) {
    if (!confirm("この例外を削除しますか？")) return;
    startTransition(async () => {
      await deleteOverride(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {overrides.map((o) => {
        const d = new Date(`${o.override_date}T00:00:00`);
        const mon = d.getMonth() + 1;
        const day = d.getDate();
        const wd = WEEKDAYS[d.getDay()];
        const isSkip = o.action === "skip";
        return (
          <div
            key={o.id}
            className="flex items-center gap-3 rounded-2xl bg-[color:var(--surface)] p-4 shadow-[var(--shadow-sm)]"
          >
            <div className="flex h-12 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-[color:var(--bg)]">
              <span className="text-[10px] text-[color:var(--ink-3)]">
                {mon}月
              </span>
              <span className="text-[18px] font-semibold leading-none tabular-nums text-[color:var(--ink)]">
                {day}
              </span>
              <span className="text-[9px] text-[color:var(--ink-3)]">{wd}</span>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    isSkip
                      ? "bg-red-50 text-[color:var(--danger)]"
                      : "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                  }`}
                >
                  {isSkip ? "スキップ" : "追加"}
                </span>
                <span
                  className="truncate rounded px-1.5 py-0.5 text-[11px] font-semibold text-white"
                  style={{ background: o.color ?? "#5a7d9a" }}
                >
                  {o.label}
                </span>
              </div>
              <p className="truncate text-[11px] text-[color:var(--ink-3)]">
                {o.warehouses?.name ?? "—"}
                {o.note && (
                  <>
                    <span className="mx-1.5">・</span>
                    {o.note}
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(o.id)}
              disabled={isPending}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[color:var(--ink-3)] transition-colors hover:bg-red-50 hover:text-[color:var(--danger)] disabled:opacity-50"
              aria-label="削除"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
