"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { deleteRemoteReport } from "../actions";
import { RemoteForm } from "./RemoteForm";
import {
  workHours,
  itemsPerHour,
  fmtHours1,
  fmtPerHour,
} from "@/lib/remote";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export type RemoteReportRow = {
  id: string;
  work_date: string;
  task_name: string;
  start_time: string;
  end_time: string;
  item_count: number;
  note: string | null;
};

function fmtDate(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  const date = new Date(iso + "T00:00:00");
  return `${m}/${d}(${WEEKDAYS[date.getDay()]})`;
}

export function RemoteList({
  reports,
  showStaffName,
  staffNames,
  taskSuggestions = [],
}: {
  reports: (RemoteReportRow & { staff_id?: string; staff_name?: string })[];
  showStaffName?: boolean;
  staffNames?: Record<string, string>;
  taskSuggestions?: string[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function remove(id: string) {
    if (!confirm("この報告を削除しますか？")) return;
    startTransition(async () => {
      const r = await deleteRemoteReport(id);
      if (r.ok) router.refresh();
      else alert(r.message ?? "削除に失敗しました");
    });
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-2xl bg-[color:var(--surface)] p-8 text-center shadow-[var(--shadow-sm)]">
        <p className="text-[13px] text-[color:var(--ink-3)]">
          まだ報告がありません
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {reports.map((r) => {
        const start = r.start_time.slice(0, 5);
        const end = r.end_time.slice(0, 5);
        const hours = workHours(start, end);
        const rate = itemsPerHour(start, end, r.item_count);
        const isEditing = editingId === r.id;
        const isExpanded = expanded.has(r.id);
        const staffLabel =
          (r.staff_name ??
            (r.staff_id ? staffNames?.[r.staff_id] : undefined)) ||
          "";

        if (isEditing) {
          return (
            <li
              key={r.id}
              className="rounded-2xl bg-[color:var(--surface)] p-4 shadow-[var(--shadow-sm)]"
            >
              <p className="mb-3 text-[12px] font-semibold text-[color:var(--ink-2)]">
                編集中
              </p>
              <RemoteForm
                initial={{
                  id: r.id,
                  work_date: r.work_date,
                  task_name: r.task_name,
                  start_time: start,
                  end_time: end,
                  item_count: r.item_count,
                  note: r.note,
                }}
                onDone={() => setEditingId(null)}
                taskSuggestions={taskSuggestions}
              />
              <button
                type="button"
                onClick={() => setEditingId(null)}
                disabled={isPending}
                className="mt-2 flex h-10 w-full items-center justify-center rounded-full bg-[color:var(--bg)] text-[12px] font-medium text-[color:var(--ink-3)] active:scale-95"
              >
                編集を取り消す
              </button>
            </li>
          );
        }

        return (
          <li
            key={r.id}
            className="rounded-2xl bg-[color:var(--surface)] p-4 shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-[color:var(--bg)]">
                <span className="text-[10px] text-[color:var(--ink-3)]">
                  {fmtDate(r.work_date).split("(")[0]}
                </span>
                <span className="text-[10px] text-[color:var(--ink-3)]">
                  ({fmtDate(r.work_date).split("(")[1]}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-[color:var(--ink)]">
                  {r.task_name}
                </p>
                {showStaffName && staffLabel && (
                  <p className="mt-0.5 text-[11px] text-[color:var(--ink-3)]">
                    {staffLabel}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-[color:var(--ink-3)] tabular-nums">
                  {start}〜{end}（{fmtHours1(hours)}h）／ {r.item_count}件
                </p>
                <p className="mt-1 text-[12px] font-medium tabular-nums text-[color:var(--accent)]">
                  {fmtPerHour(rate)} 件/時
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditingId(r.id)}
                  disabled={isPending}
                  aria-label="編集"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--bg)] text-[color:var(--ink-2)] active:scale-95"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  disabled={isPending}
                  aria-label="削除"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--bg)] text-[color:var(--danger)] active:scale-95"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </div>
            {r.note && (
              <>
                <button
                  type="button"
                  onClick={() => toggleExpand(r.id)}
                  className="mt-2 flex items-center gap-1 text-[10px] text-[color:var(--ink-3)] active:opacity-60"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3" strokeWidth={2} />
                  ) : (
                    <ChevronDown className="h-3 w-3" strokeWidth={2} />
                  )}
                  メモ
                </button>
                {isExpanded && (
                  <p className="mt-1.5 whitespace-pre-wrap rounded-xl bg-[color:var(--bg)] p-2.5 text-[11px] leading-relaxed text-[color:var(--ink-2)]">
                    {r.note}
                  </p>
                )}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
