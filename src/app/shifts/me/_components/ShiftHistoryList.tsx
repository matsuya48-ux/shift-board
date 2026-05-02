"use client";

import { useState, useMemo } from "react";
import { Pencil } from "lucide-react";
import { ActualShiftModal } from "@/components/ActualShiftModal";
import {
  effectiveTimes,
  fmtHours,
  fmtTimeShort,
  shiftHours,
  toISODate,
  type ShiftRow,
  type PatternRow,
} from "@/lib/hours";

type Props = {
  shifts: ShiftRow[];
  patterns: PatternRow[];
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function ShiftHistoryList({ shifts, patterns }: Props) {
  const patternMap = useMemo(
    () => new Map(patterns.map((p) => [p.id, p])),
    [patterns],
  );
  const [editing, setEditing] = useState<ShiftRow | null>(null);
  const todayStr = toISODate(new Date());

  if (shifts.length === 0) {
    return (
      <div className="rounded-2xl bg-[color:var(--surface)] p-8 text-center shadow-[var(--shadow-sm)]">
        <p className="text-[13px] text-[color:var(--ink-3)]">
          この月のシフトはまだありません
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {shifts.map((s) => {
          const p = s.pattern_id ? patternMap.get(s.pattern_id) : null;
          const eff = effectiveTimes(s, patternMap);
          const hours = shiftHours(s, patternMap);
          const d = new Date(`${s.work_date}T00:00:00`);
          const wd = WEEKDAYS[d.getDay()];
          const isSat = d.getDay() === 6;
          const isSun = d.getDay() === 0;
          const isPastOrToday = s.work_date <= todayStr;
          const isTentative = !!s.is_tentative;

          // 実働編集できるのは過去 or 今日 かつ 予備でないシフト
          const editable = isPastOrToday && !isTentative;
          const Wrapper: "button" | "div" = editable ? "button" : "div";

          return (
            <Wrapper
              key={s.id}
              type={editable ? "button" : undefined}
              onClick={editable ? () => setEditing(s) : undefined}
              className={`flex w-full items-center gap-3.5 rounded-2xl bg-[color:var(--surface)] p-4 text-left shadow-[var(--shadow-sm)] ${
                editable
                  ? "transition-transform active:scale-[0.99]"
                  : ""
              }`}
            >
              <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-[color:var(--bg)]">
                <span className="text-[18px] font-semibold leading-none tabular-nums text-[color:var(--ink)]">
                  {d.getDate()}
                </span>
                <span
                  className={`mt-0.5 text-[9px] ${
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
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[14px] font-semibold text-[color:var(--ink)]">
                    {isTentative
                      ? `△ 予備${s.note ? `（${s.note}）` : ""}`
                      : p
                        ? p.label
                        : "フリー"}
                  </p>
                  {!isTentative && eff?.hasActual && (
                    <span className="rounded-full bg-[color:var(--accent-soft)] px-1.5 py-0.5 text-[9px] font-semibold text-[color:var(--accent)]">
                      実働済
                    </span>
                  )}
                </div>
                {!isTentative && (
                  <p className="text-[11px] text-[color:var(--ink-3)] tabular-nums">
                    {eff
                      ? `${fmtTimeShort(eff.start)} – ${fmtTimeShort(eff.end)}`
                      : "—"}
                    <span className="mx-1.5">／</span>
                    {fmtHours(hours)}h
                  </p>
                )}
                {isTentative && (
                  <p className="text-[11px] text-[color:var(--ink-3)]">
                    出勤の可能性があります
                  </p>
                )}
              </div>
              {editable ? (
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--bg)] text-[color:var(--ink-3)]">
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
                </div>
              ) : (
                p && (
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ background: p.color ?? "#6366f1" }}
                  />
                )
              )}
            </Wrapper>
          );
        })}
      </div>

      {editing && (
        <ActualShiftModal
          shift={editing}
          patterns={patternMap}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
