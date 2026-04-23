"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveTimeOff, rejectTimeOff, revertTimeOff } from "../actions";
import { Check, X, RotateCcw, Loader2 } from "lucide-react";

type Req = {
  id: string;
  request_date: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  admin_note: string | null;
  staffs: {
    display_name: string;
    warehouses: { name: string } | null;
  } | null;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    month: d.getMonth() + 1,
    day: d.getDate(),
    wd: WEEKDAYS[d.getDay()],
    isSat: d.getDay() === 6,
    isSun: d.getDay() === 0,
  };
}

export function RequestItem({ request: req }: { request: Req }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isExpanded, setIsExpanded] = useState(false);
  const [note, setNote] = useState(req.admin_note ?? "");

  const { month, day, wd, isSat, isSun } = formatDate(req.request_date);

  function run(action: (f: FormData) => Promise<{ ok: boolean; message?: string }>) {
    const form = new FormData();
    form.set("id", req.id);
    form.set("note", note);
    startTransition(async () => {
      const result = await action(form);
      if (result.ok) {
        router.refresh();
        setIsExpanded(false);
      } else if (result.message) {
        alert(result.message);
      }
    });
  }

  return (
    <div className="rounded-2xl bg-[color:var(--surface)] shadow-[var(--shadow-sm)]">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        {/* 日付 */}
        <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-2xl bg-[color:var(--bg)]">
          <span className="text-[10px] text-[color:var(--ink-3)]">
            {month}月
          </span>
          <span className="text-[22px] font-semibold leading-none tabular-nums tracking-tight text-[color:var(--ink)]">
            {day}
          </span>
          <span
            className={`text-[10px] ${
              isSun
                ? "text-[color:var(--danger)]"
                : isSat
                  ? "text-[#3a5a7a]"
                  : "text-[color:var(--ink-3)]"
            }`}
          >
            {wd}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-[color:var(--ink)]">
            {req.staffs?.display_name ?? "—"}
          </p>
          <p className="truncate text-[11px] text-[color:var(--ink-3)]">
            {req.staffs?.warehouses?.name ?? "拠点不明"}
          </p>
        </div>

        <StatusBadge status={req.status} />
      </button>

      {isExpanded && (
        <div className="border-t border-[color:var(--line)] px-4 py-4">
          {req.admin_note && req.status !== "pending" && (
            <p className="mb-3 rounded-xl bg-[color:var(--bg)] p-3 text-[12px] text-[color:var(--ink-2)]">
              管理者メモ：{req.admin_note}
            </p>
          )}

          {req.status === "pending" ? (
            <>
              <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
                メモ（任意・スタッフに表示されます）
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例：ありがとうございます"
                rows={2}
                className="w-full resize-none rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] px-3 py-2 text-[13px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:bg-[color:var(--surface)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => run(rejectTimeOff)}
                  disabled={isPending}
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-[color:var(--line)] bg-white text-[12px] font-medium text-[color:var(--danger)] transition-transform active:scale-[0.98] disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" strokeWidth={2.2} />
                  )}
                  却下
                </button>
                <button
                  type="button"
                  onClick={() => run(approveTimeOff)}
                  disabled={isPending}
                  className="flex h-10 flex-[2] items-center justify-center gap-1.5 rounded-full bg-[color:var(--accent)] text-[12px] font-medium text-white shadow-[0_4px_14px_-4px_rgba(45,85,69,0.4)] transition-transform active:scale-[0.98] disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  )}
                  承認
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => run(revertTimeOff)}
              disabled={isPending}
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-[color:var(--line)] bg-white text-[12px] font-medium text-[color:var(--ink-2)] transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
              )}
              申請中に戻す
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "pending" | "approved" | "rejected";
}) {
  const config = {
    pending: {
      label: "申請中",
      bg: "bg-[#fdf5e6]",
      text: "text-[color:var(--warning)]",
    },
    approved: {
      label: "承認",
      bg: "bg-[color:var(--accent-soft)]",
      text: "text-[color:var(--accent)]",
    },
    rejected: {
      label: "却下",
      bg: "bg-red-50",
      text: "text-[color:var(--danger)]",
    },
  }[status];

  return (
    <span
      className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}
