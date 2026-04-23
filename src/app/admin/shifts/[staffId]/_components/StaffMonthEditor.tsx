"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { upsertShift, deleteShift } from "../../actions";
import {
  shiftHours,
  toISODate,
  effectiveTimes,
  fmtTimeShort,
  type PatternRow,
  type ShiftRow,
} from "@/lib/hours";

type TimeOff = {
  request_date: string;
  status: "pending" | "approved" | "rejected";
};

type Props = {
  staffId: string;
  warehouseId: string;
  shiftStyle: "pattern" | "free" | "both";
  patterns: PatternRow[];
  shifts: ShiftRow[];
  timeOffs: TimeOff[];
  month: string; // YYYY-MM
  preferredStart: string | null;
  preferredEnd: string | null;
};

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

export function StaffMonthEditor({
  staffId,
  warehouseId,
  shiftStyle,
  patterns,
  shifts,
  timeOffs,
  month,
  preferredStart,
  preferredEnd,
}: Props) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const shiftByDate = useMemo(() => {
    const m = new Map<string, ShiftRow>();
    shifts.forEach((s) => m.set(s.work_date, s));
    return m;
  }, [shifts]);

  const timeOffByDate = useMemo(() => {
    const m = new Map<string, TimeOff>();
    timeOffs.forEach((t) => m.set(t.request_date, t));
    return m;
  }, [timeOffs]);

  const patternMap = useMemo(
    () => new Map(patterns.map((p) => [p.id, p])),
    [patterns],
  );

  const [year, mon] = month.split("-").map(Number);
  const firstDay = new Date(year, mon - 1, 1);
  const lastDay = new Date(year, mon, 0);

  // 月曜始まりグリッド
  const gridStart = new Date(firstDay);
  const offset = (firstDay.getDay() + 6) % 7; // Mon=0
  gridStart.setDate(firstDay.getDate() - offset);

  const gridEnd = new Date(lastDay);
  const endOffset = (7 - lastDay.getDay()) % 7;
  gridEnd.setDate(lastDay.getDate() + endOffset);

  const days: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  function gotoMonth(delta: number) {
    const d = new Date(year, mon - 1 + delta, 1);
    const nextMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    router.push(`?month=${nextMonth}`);
  }

  const selectedShift = selectedDate ? shiftByDate.get(selectedDate) : null;
  const selectedTimeOff = selectedDate ? timeOffByDate.get(selectedDate) : null;

  return (
    <>
      {/* 月切替 */}
      <div className="mb-3 flex items-center justify-between rounded-2xl bg-[color:var(--surface)] p-2 shadow-[var(--shadow-sm)]">
        <button
          type="button"
          onClick={() => gotoMonth(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--ink-2)] active:bg-[color:var(--bg)]"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <p className="text-[14px] font-semibold tracking-tight text-[color:var(--ink)] tabular-nums">
          {year}年{mon}月
        </p>
        <button
          type="button"
          onClick={() => gotoMonth(1)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--ink-2)] active:bg-[color:var(--bg)]"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* カレンダー */}
      <div className="overflow-hidden rounded-2xl bg-[color:var(--surface)] shadow-[var(--shadow-sm)]">
        {/* 曜日 */}
        <div className="grid grid-cols-7 border-b border-[color:var(--line)] bg-[color:var(--bg)] text-center">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`py-2 text-[10px] font-semibold ${
                i === 5
                  ? "text-[#3a5a7a]"
                  : i === 6
                    ? "text-[color:var(--danger)]"
                    : "text-[color:var(--ink-3)]"
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        {/* セル */}
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const dateStr = toISODate(d);
            const isCurrentMonth = d.getMonth() === mon - 1;
            const isToday = dateStr === toISODate(new Date());
            const dow = (d.getDay() + 6) % 7; // Mon=0
            const isWeekend = dow === 5 || dow === 6;

            const shift = shiftByDate.get(dateStr);
            const timeOff = timeOffByDate.get(dateStr);
            const hours = shift ? shiftHours(shift, patternMap) : 0;
            const pattern = shift?.pattern_id
              ? patternMap.get(shift.pattern_id)
              : null;

            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                className={`relative flex min-h-[66px] flex-col items-center border-b border-r border-[color:var(--line-soft)] p-1 text-center transition-colors hover:bg-[color:var(--bg)] ${
                  !isCurrentMonth ? "opacity-30" : ""
                } ${(i + 1) % 7 === 0 ? "border-r-0" : ""}`}
              >
                <span
                  className={`text-[11px] tabular-nums ${
                    isToday
                      ? "flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--accent)] font-semibold text-white"
                      : dow === 6
                        ? "text-[color:var(--danger)]"
                        : dow === 5
                          ? "text-[#3a5a7a]"
                          : "text-[color:var(--ink-2)]"
                  }`}
                >
                  {d.getDate()}
                </span>

                {timeOff && timeOff.status !== "rejected" && !shift && (
                  <span
                    className={`mt-0.5 rounded px-1 text-[9px] font-medium ${
                      timeOff.status === "approved"
                        ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                        : "bg-[#fdf5e6] text-[color:var(--warning)]"
                    }`}
                  >
                    休
                  </span>
                )}

                {shift && (() => {
                  const eff = effectiveTimes(shift, patternMap);
                  if (!eff) return null;
                  const bg = pattern?.color ?? "#6b7280";
                  return (
                    <div className="mt-0.5 w-full overflow-hidden leading-tight tabular-nums">
                      <div
                        className="rounded px-0.5 text-[9px] font-medium text-white"
                        style={{ background: bg }}
                      >
                        {fmtTimeShort(eff.start)}
                      </div>
                      <div className="text-[9px] text-[color:var(--ink-3)]">
                        {fmtTimeShort(eff.end)}
                      </div>
                      <p className="text-[9px] text-[color:var(--ink-4)]">
                        {hours.toFixed(1).replace(/\.0$/, "")}h
                      </p>
                    </div>
                  );
                })()}
              </button>
            );
          })}
        </div>
      </div>

      {/* 編集モーダル */}
      {selectedDate && (
        <EditModal
          date={selectedDate}
          staffId={staffId}
          warehouseId={warehouseId}
          shiftStyle={shiftStyle}
          patterns={patterns}
          existing={selectedShift ?? null}
          timeOff={selectedTimeOff ?? null}
          preferredStart={preferredStart}
          preferredEnd={preferredEnd}
          onClose={() => setSelectedDate(null)}
          onSaved={() => {
            setSelectedDate(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function EditModal({
  date,
  staffId,
  warehouseId,
  shiftStyle,
  patterns,
  existing,
  timeOff,
  preferredStart,
  preferredEnd,
  onClose,
  onSaved,
}: {
  date: string;
  staffId: string;
  warehouseId: string;
  shiftStyle: "pattern" | "free" | "both";
  patterns: PatternRow[];
  existing: ShiftRow | null;
  timeOff: TimeOff | null;
  preferredStart: string | null;
  preferredEnd: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const defaultMode: "pattern" | "free" =
    shiftStyle === "free" ? "free" : existing?.pattern_id ? "pattern" : shiftStyle === "pattern" ? "pattern" : "free";
  const [mode, setMode] = useState<"pattern" | "free">(defaultMode);

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("id", existing?.id ?? "");
    formData.set("staff_id", staffId);
    formData.set("warehouse_id", warehouseId);
    formData.set("work_date", date);
    formData.set("input_mode", mode);

    startTransition(async () => {
      const result = await upsertShift(formData);
      if (result.ok) onSaved();
      else setError(result.message ?? "保存に失敗しました");
    });
  }

  function handleDelete() {
    if (!existing) return;
    if (!confirm("このシフトを削除しますか？")) return;
    startTransition(async () => {
      const result = await deleteShift(existing.id);
      if (result.ok) onSaved();
      else setError(result.message ?? "削除に失敗しました");
    });
  }

  const [y, m, d] = date.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getDay()];

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
              {existing ? "Edit Shift" : "New Shift"}
            </p>
            <h2 className="mt-1 text-[22px] font-semibold tracking-tight tabular-nums text-[color:var(--ink)]">
              {m}/{d} ({wd})
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

        {timeOff && timeOff.status !== "rejected" && (
          <div
            className={`mb-4 rounded-xl p-3 text-[12px] ${
              timeOff.status === "approved"
                ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                : "bg-[#fdf5e6] text-[color:var(--warning)]"
            }`}
          >
            この日は希望休が
            {timeOff.status === "approved" ? "承認" : "申請"}されています
          </div>
        )}

        <form action={handleSubmit} className="space-y-4">
          {/* モード切替（管理者画面では常に表示） */}
          {true && (
            <div className="flex gap-1 rounded-full bg-white p-1">
              <button
                type="button"
                onClick={() => setMode("pattern")}
                className={`flex-1 rounded-full py-2 text-[12px] font-medium transition-colors ${
                  mode === "pattern"
                    ? "bg-[color:var(--ink)] text-white"
                    : "text-[color:var(--ink-3)]"
                }`}
              >
                パターン
              </button>
              <button
                type="button"
                onClick={() => setMode("free")}
                className={`flex-1 rounded-full py-2 text-[12px] font-medium transition-colors ${
                  mode === "free"
                    ? "bg-[color:var(--ink)] text-white"
                    : "text-[color:var(--ink-3)]"
                }`}
              >
                時刻入力
              </button>
            </div>
          )}

          {mode === "pattern" ? (
            <div>
              <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
                パターン
              </label>
              {patterns.length === 0 ? (
                <p className="rounded-xl bg-white p-3 text-[12px] text-[color:var(--ink-3)]">
                  この拠点にはまだパターンが登録されていません。
                </p>
              ) : (
                <select
                  name="pattern_id"
                  required={mode === "pattern"}
                  defaultValue={existing?.pattern_id ?? ""}
                  className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[14px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
                >
                  <option value="">— 選択 —</option>
                  {patterns.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}（{p.start_time.slice(0, 5)}–
                      {p.end_time.slice(0, 5)}）
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
                  開始
                </label>
                <input
                  name="start_time"
                  type="time"
                  required={mode === "free"}
                  defaultValue={
                    existing?.start_time?.slice(0, 5) ??
                    preferredStart?.slice(0, 5) ??
                    "09:00"
                  }
                  className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[13px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
                />
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
                  終了
                </label>
                <input
                  name="end_time"
                  type="time"
                  required={mode === "free"}
                  defaultValue={
                    existing?.end_time?.slice(0, 5) ??
                    preferredEnd?.slice(0, 5) ??
                    "18:00"
                  }
                  className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[13px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
                />
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
                  休憩
                </label>
                <input
                  name="break_minutes"
                  type="number"
                  min={0}
                  max={300}
                  defaultValue={existing?.break_minutes ?? 60}
                  className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[13px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
              備考（任意）
            </label>
            <input
              name="note"
              type="text"
              defaultValue={existing?.note ?? ""}
              placeholder="例：終日、遅刻可 など"
              className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[13px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white p-3.5">
            <input
              name="is_published"
              type="checkbox"
              defaultChecked={existing?.is_published ?? true}
              className="h-5 w-5 accent-[color:var(--accent)]"
            />
            <div>
              <p className="text-[13px] font-medium text-[color:var(--ink)]">
                スタッフに公開
              </p>
              <p className="text-[11px] text-[color:var(--ink-3)]">
                外すと作成中の下書き状態になります
              </p>
            </div>
          </label>

          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-[12px] text-[color:var(--danger)]">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            {existing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="flex h-12 items-center justify-center rounded-full border border-[color:var(--line)] bg-white px-5 text-[12px] font-medium text-[color:var(--danger)] transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                削除
              </button>
            )}
            <button
              type="submit"
              disabled={isPending}
              className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-[color:var(--accent)] text-[13px] font-medium text-white shadow-[0_6px_18px_-6px_rgba(45,85,69,0.4)] transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              {existing ? "更新する" : "登録する"}
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
