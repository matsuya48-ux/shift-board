"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteWeekdayLabel } from "../actions";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

type LabelRow = {
  id: string;
  warehouse_id: string;
  weekday: number;
  label: string;
  color: string | null;
  warehouses: { name: string } | null;
};

export function WeekdayLabelList({ labels }: { labels: LabelRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (labels.length === 0) {
    return (
      <div className="rounded-2xl bg-[color:var(--surface)] p-8 text-center shadow-[var(--shadow-sm)]">
        <p className="text-[13px] text-[color:var(--ink-3)]">
          ラベルはまだ登録されていません
        </p>
      </div>
    );
  }

  function handleDelete(id: string) {
    if (!confirm("このラベルを削除しますか？")) return;
    startTransition(async () => {
      await deleteWeekdayLabel(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {labels.map((l) => (
        <div
          key={l.id}
          className="flex items-center gap-3.5 rounded-2xl bg-[color:var(--surface)] p-4 shadow-[var(--shadow-sm)]"
        >
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-[13px] font-semibold text-white"
            style={{ background: l.color ?? "#5a7d9a" }}
          >
            {WEEKDAYS[l.weekday]}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-[14px] font-semibold text-[color:var(--ink)]">
              {l.label}
            </p>
            <p className="truncate text-[11px] text-[color:var(--ink-3)]">
              {l.warehouses?.name ?? "—"}
              <span className="mx-1.5">・</span>
              {WEEKDAYS[l.weekday]}曜日
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleDelete(l.id)}
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
      ))}
    </div>
  );
}
