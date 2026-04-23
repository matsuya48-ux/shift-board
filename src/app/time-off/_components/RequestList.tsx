"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelTimeOffRequest } from "../actions";
import { Check, Clock, X, Trash2, Inbox } from "lucide-react";

type Request = {
  id: string;
  request_date: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  admin_note: string | null;
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

const STATUS_META = {
  pending: {
    label: "申請中",
    Icon: Clock,
    bg: "bg-[#fdf5e6]",
    text: "text-[color:var(--warning)]",
    dot: "bg-[color:var(--warning)]",
  },
  approved: {
    label: "承認",
    Icon: Check,
    bg: "bg-[color:var(--accent-soft)]",
    text: "text-[color:var(--accent)]",
    dot: "bg-[color:var(--accent)]",
  },
  rejected: {
    label: "却下",
    Icon: X,
    bg: "bg-red-50",
    text: "text-[color:var(--danger)]",
    dot: "bg-[color:var(--danger)]",
  },
};

export function RequestList({ requests }: { requests: Request[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (requests.length === 0) {
    return (
      <div className="rounded-3xl bg-[color:var(--surface)] p-10 text-center shadow-[var(--shadow-sm)]">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--bg)]">
          <Inbox
            className="h-5 w-5 text-[color:var(--ink-4)]"
            strokeWidth={1.8}
          />
        </div>
        <p className="text-[14px] font-medium text-[color:var(--ink-2)]">
          まだ申請はありません
        </p>
        <p className="mt-1 text-[12px] text-[color:var(--ink-3)]">
          上のフォームからご申請ください
        </p>
      </div>
    );
  }

  function handleCancel(id: string) {
    if (!confirm("この希望休を取り消しますか？")) return;
    startTransition(async () => {
      await cancelTimeOffRequest(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2.5">
      {requests.map((req) => {
        const { month, day, wd, isSat, isSun } = formatDate(req.request_date);
        const canCancel = req.status === "pending";
        const meta = STATUS_META[req.status];
        const StatusIcon = meta.Icon;

        return (
          <div
            key={req.id}
            className="flex items-center gap-4 rounded-2xl bg-[color:var(--surface)] p-5 shadow-[var(--shadow-sm)]"
          >
            {/* 日付カード */}
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

            {/* ステータス + メモ */}
            <div className="min-w-0 flex-1">
              <span
                className={`inline-flex items-center gap-1 rounded-full ${meta.bg} px-2.5 py-1 text-[11px] font-medium ${meta.text}`}
              >
                <StatusIcon className="h-3 w-3" strokeWidth={2.5} />
                {meta.label}
              </span>
              {req.admin_note && (
                <p className="mt-1.5 truncate text-[11px] text-[color:var(--ink-3)]">
                  {req.admin_note}
                </p>
              )}
            </div>

            {/* 取消ボタン */}
            {canCancel && (
              <button
                onClick={() => handleCancel(req.id)}
                disabled={isPending}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[color:var(--ink-3)] transition-colors hover:bg-red-50 hover:text-[color:var(--danger)] active:scale-95 disabled:opacity-50"
                aria-label="取り消し"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.8} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
