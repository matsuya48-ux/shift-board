"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, RotateCcw, Check } from "lucide-react";
import {
  effectiveTimes,
  fmtTime,
  shiftHours,
  fmtHours,
  type ShiftRow,
  type PatternRow,
} from "@/lib/hours";
import { updateActualShift, clearActualShift } from "@/app/shifts/actions";

export function ActualShiftModal({
  shift,
  patterns,
  onClose,
}: {
  shift: ShiftRow;
  patterns: Map<string, PatternRow>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pattern = shift.pattern_id ? patterns.get(shift.pattern_id) : null;
  const plannedStart = pattern?.start_time ?? shift.start_time ?? "";
  const plannedEnd = pattern?.end_time ?? shift.end_time ?? "";
  const plannedBreak = pattern?.break_minutes ?? shift.break_minutes ?? 0;
  const plannedHours = shiftHours(
    { ...shift, actual_start_time: null, actual_end_time: null, actual_break_minutes: null },
    patterns,
  );

  const eff = effectiveTimes(shift, patterns);
  const hasActual = !!eff?.hasActual;

  const [year, mon, day] = shift.work_date.split("-").map(Number);
  const dateObj = new Date(year, mon - 1, day);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getDay()];

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateActualShift(shift.id, formData);
      if (result.ok) {
        router.refresh();
        onClose();
      } else {
        setError(result.message ?? "エラーが発生しました");
      }
    });
  }

  function handleClear() {
    if (!confirm("実働記録をクリアして予定通りに戻しますか？")) return;
    setError(null);
    startTransition(async () => {
      const result = await clearActualShift(shift.id);
      if (result.ok) {
        router.refresh();
        onClose();
      } else {
        setError(result.message ?? "エラーが発生しました");
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
              Actual hours
            </p>
            <h2 className="mt-1 text-[22px] font-semibold tracking-tight tabular-nums text-[color:var(--ink)]">
              {mon}/{day} ({wd})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[color:var(--ink-2)] shadow-[var(--shadow-sm)] active:scale-95"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* 予定 */}
        <div className="mb-5 rounded-2xl bg-white p-4 shadow-[var(--shadow-sm)]">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.1em] text-[color:var(--ink-3)]">
            Planned / 予定
          </p>
          <div className="flex items-baseline justify-between">
            <p className="text-[16px] font-semibold tabular-nums text-[color:var(--ink)]">
              {fmtTime(plannedStart)} – {fmtTime(plannedEnd)}
            </p>
            <p className="text-[11px] tabular-nums text-[color:var(--ink-3)]">
              休憩 {plannedBreak}分・{fmtHours(plannedHours)}h
            </p>
          </div>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[color:var(--ink-3)]">
            Actual / 実働
          </p>
          <p className="-mt-2 text-[11px] leading-relaxed text-[color:var(--ink-3)]">
            予定と違った場合のみ記録してください。
            変更不要なら「キャンセル」で閉じてください（予定通りとして計上されます）。
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
                開始
              </label>
              <input
                name="actual_start_time"
                type="time"
                required
                defaultValue={fmtTime(
                  shift.actual_start_time ?? plannedStart,
                )}
                className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[14px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
              />
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
                終了
              </label>
              <input
                name="actual_end_time"
                type="time"
                required
                defaultValue={fmtTime(
                  shift.actual_end_time ?? plannedEnd,
                )}
                className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[14px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
              />
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
                休憩
              </label>
              <input
                name="actual_break_minutes"
                type="number"
                min={0}
                max={300}
                defaultValue={shift.actual_break_minutes ?? plannedBreak}
                className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[14px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-[12px] text-[color:var(--danger)]">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            {hasActual && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isPending}
                className="flex h-11 items-center justify-center gap-1 rounded-full border border-[color:var(--line)] bg-white px-4 text-[11px] font-medium text-[color:var(--ink-2)] transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
                予定通りに戻す
              </button>
            )}
            <button
              type="submit"
              disabled={isPending}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-[color:var(--accent)] text-[13px] font-medium text-white shadow-[0_6px_18px_-6px_rgba(45,85,69,0.4)] transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              )}
              実働を記録
            </button>
          </div>
        </form>
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
