"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Check, Trash2, Loader2 } from "lucide-react";
import {
  confirmTentativeShift,
  deleteTentativeShift,
} from "@/app/shifts/actions";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function TentativeShiftModal({
  shiftId,
  staffName,
  workDate,
  note,
  defaultStart = "09:00",
  defaultEnd = "17:00",
  defaultBreak = 60,
  onClose,
}: {
  shiftId: string;
  staffName: string;
  workDate: string; // YYYY-MM-DD
  note: string | null;
  defaultStart?: string;
  defaultEnd?: string;
  defaultBreak?: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [breakMin, setBreakMin] = useState(defaultBreak);
  const [error, setError] = useState<string | null>(null);

  const [y, m, d] = workDate.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const wd = WEEKDAYS[dateObj.getDay()];

  function confirm() {
    setError(null);
    startTransition(async () => {
      const r = await confirmTentativeShift(shiftId, {
        start_time: start,
        end_time: end,
        break_minutes: breakMin,
      });
      if (r.ok) {
        router.refresh();
        onClose();
      } else {
        setError(r.message ?? "確定に失敗しました");
      }
    });
  }

  function remove() {
    if (!window.confirm("この予備シフトを削除しますか？")) return;
    setError(null);
    startTransition(async () => {
      const r = await deleteTentativeShift(shiftId);
      if (r.ok) {
        router.refresh();
        onClose();
      } else {
        setError(r.message ?? "削除に失敗しました");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/40 p-0 backdrop-blur-sm animate-fade sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="my-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-[color:var(--bg)] p-6 shadow-[var(--shadow-lg)] animate-slide-up sm:rounded-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[color:var(--accent)]">
              Tentative shift
            </p>
            <h2 className="mt-1 text-[22px] font-semibold tracking-tight tabular-nums text-[color:var(--ink)]">
              △ {m}/{d} ({wd})
            </h2>
            <p className="mt-0.5 text-[13px] text-[color:var(--ink-2)]">
              {staffName}
              {note && (
                <span className="ml-1 text-[11px] text-[color:var(--ink-3)]">
                  / {note}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[color:var(--ink-2)] shadow-[var(--shadow-sm)] active:scale-95"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <p className="mb-4 rounded-xl bg-[color:var(--accent-soft)] p-3 text-[12px] leading-relaxed text-[color:var(--ink-2)]">
          実際に出勤することになった場合、開始・終了を入力して確定してください。出勤しなかった場合は削除できます。
        </p>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-[color:var(--ink-2)]">
              開始
            </label>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[14px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-[color:var(--ink-2)]">
              終了
            </label>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[14px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-[color:var(--ink-2)]">
              休憩(分)
            </label>
            <input
              type="number"
              min={0}
              max={300}
              value={breakMin}
              onChange={(e) => setBreakMin(Number(e.target.value) || 0)}
              className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[14px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-red-50 p-3 text-[12px] text-[color:var(--danger)]">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            className="flex h-11 items-center justify-center gap-1 rounded-full border border-[color:var(--line)] bg-white px-4 text-[12px] font-medium text-[color:var(--danger)] active:scale-95 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            削除
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={isPending || !start || !end}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-[color:var(--accent)] text-[13px] font-medium text-white shadow-[0_6px_18px_-6px_rgba(45,85,69,0.4)] active:scale-95 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            )}
            シフトとして確定
          </button>
        </div>
      </div>

      <style jsx>{`
        .animate-fade {
          animation: fade 0.2s ease-out;
        }
        .animate-slide-up {
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
