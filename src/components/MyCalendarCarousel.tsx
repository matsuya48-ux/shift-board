"use client";

import { useState, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  toISODate,
  shiftHours,
  effectiveTimes,
  fmtTimeShort,
  type ShiftRow,
  type PatternRow,
} from "@/lib/hours";
import { ActualShiftModal } from "./ActualShiftModal";
import {
  resolveLabelsForDate,
  type WeekdayLabel,
  type DateLabelOverride,
} from "@/lib/labels";
import { isHoliday } from "@/lib/holidays";

type TimeOff = {
  request_date: string;
  status: "pending" | "approved" | "rejected";
};

type WarehouseEvent = {
  id: string;
  warehouse_id: string;
  event_date: string;
  title: string;
  description?: string | null;
  color: string | null;
};

type MonthData = {
  year: number;
  month: number; // 1-12
  shifts: ShiftRow[];
  timeOffs: TimeOff[];
  events: WarehouseEvent[];
};

type Props = {
  months: MonthData[]; // 3件：[先月, 今月, 翌月]
  patterns: PatternRow[];
  weekdayLabels: WeekdayLabel[];
  overrides: DateLabelOverride[];
  todayStr: string;
  warehouseId: string;
  isHonbu?: boolean;
};

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

export function MyCalendarCarousel({
  months,
  patterns,
  weekdayLabels,
  overrides,
  todayStr,
  warehouseId,
  isHonbu = false,
}: Props) {
  const [index, setIndex] = useState(1); // 1 = 今月
  const [editingShift, setEditingShift] = useState<ShiftRow | null>(null);

  const patternMap = useMemo(
    () => new Map(patterns.map((p) => [p.id, p])),
    [patterns],
  );

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    // 横方向のスワイプだけ反応
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0 && index > 0) setIndex(index - 1);
      if (deltaX < 0 && index < months.length - 1) setIndex(index + 1);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }

  const current = months[index];

  const canPrev = index > 0;
  const canNext = index < months.length - 1;

  return (
    <div className="rounded-3xl bg-[color:var(--surface)] px-1 py-5 shadow-[var(--shadow-sm)]">
      {/* ヘッダー：月切替 */}
      <div className="mb-4 flex items-center justify-between px-3">
        <button
          type="button"
          onClick={() => canPrev && setIndex(index - 1)}
          disabled={!canPrev}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--ink-2)] transition-colors active:bg-[color:var(--bg)] disabled:opacity-20"
          aria-label="前月"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[color:var(--ink-3)]">
            {index === 0 ? "Last month" : index === 1 ? "This month" : "Next month"}
          </p>
          <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-[color:var(--ink)]">
            {current.year}年{current.month}月
          </p>
        </div>
        <button
          type="button"
          onClick={() => canNext && setIndex(index + 1)}
          disabled={!canNext}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--ink-2)] transition-colors active:bg-[color:var(--bg)] disabled:opacity-20"
          aria-label="翌月"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* インジケータ */}
      <div className="mb-3 flex items-center justify-center gap-1.5">
        {months.map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-all ${
              i === index
                ? "w-5 bg-[color:var(--accent)]"
                : "w-1 bg-[color:var(--line-strong)]"
            }`}
          />
        ))}
      </div>

      {/* 凡例（カレンダー上部） */}
      <div className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-3 text-[10px] text-[color:var(--ink-3)]">
        <span className="inline-flex items-center gap-1">
          <span className="text-[14px] font-semibold leading-none text-[color:var(--accent)]">
            ●
          </span>
          希望休
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="text-[14px] font-semibold leading-none text-[color:var(--ink-3)]">
            △
          </span>
          出勤未定
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="text-[10px] text-[color:var(--ink-4)]">無印</span>
          通常休み
        </span>
      </div>

      {/* カレンダー（スワイプ対応） */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="select-none"
      >
        <MonthCalendar
          year={current.year}
          month={current.month}
          shifts={current.shifts}
          timeOffs={current.timeOffs}
          events={current.events}
          weekdayLabels={weekdayLabels}
          overrides={overrides}
          warehouseId={warehouseId}
          patternMap={patternMap}
          todayStr={todayStr}
          onEditShift={setEditingShift}
        />
      </div>

      {/* スケジュール情報 */}
      <div className="px-3">
        <ScheduleInfo
          events={current.events}
          weekdayLabels={weekdayLabels.filter(
            (l) => l.warehouse_id === warehouseId,
          )}
          isHonbu={isHonbu}
        />
      </div>

      {/* 実働修正モーダル */}
      {editingShift && (
        <ActualShiftModal
          shift={editingShift}
          patterns={patternMap}
          onClose={() => setEditingShift(null)}
        />
      )}
    </div>
  );
}

function MonthCalendar({
  year,
  month,
  shifts,
  timeOffs,
  events,
  weekdayLabels,
  overrides,
  warehouseId,
  patternMap,
  todayStr,
  onEditShift,
}: {
  year: number;
  month: number;
  shifts: ShiftRow[];
  timeOffs: TimeOff[];
  events: WarehouseEvent[];
  weekdayLabels: WeekdayLabel[];
  overrides: DateLabelOverride[];
  warehouseId: string;
  patternMap: Map<string, PatternRow>;
  todayStr: string;
  onEditShift: (s: ShiftRow) => void;
}) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));
  const gridEnd = new Date(lastDay);
  gridEnd.setDate(lastDay.getDate() + ((7 - lastDay.getDay()) % 7));

  const days: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const shiftMap = new Map(shifts.map((s) => [s.work_date, s]));
  const timeOffMap = new Map(timeOffs.map((t) => [t.request_date, t]));
  const eventMap = new Map<string, WarehouseEvent[]>();
  events.forEach((e) => {
    const arr = eventMap.get(e.event_date) ?? [];
    arr.push(e);
    eventMap.set(e.event_date, arr);
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--line-strong)]">
      <div className="grid grid-cols-7 border-b-2 border-[color:var(--line-strong)] bg-[color:var(--bg)] text-center">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`py-1.5 text-[10px] font-semibold ${
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
      <div className="grid grid-cols-7 bg-white">
        {days.map((d, i) => {
          const dateStr = toISODate(d);
          const isCurrentMonth = d.getMonth() === month - 1;
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;
          const dow = (d.getDay() + 6) % 7;
          const shift = shiftMap.get(dateStr);
          const timeOff = timeOffMap.get(dateStr);
          const pattern = shift?.pattern_id ? patternMap.get(shift.pattern_id) : null;
          const hours = shift ? shiftHours(shift, patternMap) : 0;
          // 予備(△)シフトは時間がないので実働編集は無効
          const clickable = shift && !shift.is_tentative && (isPast || isToday);

          const Cell = clickable ? "button" : "div";

          return (
            <Cell
              key={i}
              type={clickable ? "button" : undefined}
              onClick={
                clickable ? () => shift && onEditShift(shift) : undefined
              }
              className={`relative flex min-h-[78px] flex-col items-center border-b border-r border-[color:var(--line)] p-1 text-center ${
                !isCurrentMonth ? "opacity-30" : ""
              } ${(i + 1) % 7 === 0 ? "border-r-0" : ""} ${
                (() => {
                  const holiday = isHoliday(dateStr);
                  const isOff = d.getDay() === 0 || d.getDay() === 6 || holiday;
                  return isOff && isCurrentMonth
                    ? "bg-[color:var(--off-day)]"
                    : "";
                })()
              } ${
                clickable ? "transition-colors hover:bg-[color:var(--bg)]" : ""
              }`}
            >
              {/* 日付＋ドット（イベント・事業部） */}
              <div className="flex w-full items-center justify-center gap-1">
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
                {/* 事業部ドット */}
                {(() => {
                  const labels = resolveLabelsForDate(
                    d,
                    warehouseId,
                    weekdayLabels,
                    overrides,
                  );
                  if (labels.length === 0) return null;
                  return (
                    <div className="flex gap-0.5">
                      {labels.slice(0, 3).map((l, i) => (
                        <span
                          key={i}
                          className="h-2 w-2 rounded-full ring-1 ring-white"
                          style={{ background: l.color }}
                          title={l.label}
                        />
                      ))}
                    </div>
                  );
                })()}
                {/* イベントドット */}
                {(() => {
                  const evs = eventMap.get(dateStr) ?? [];
                  if (evs.length === 0) return null;
                  return (
                    <div className="flex gap-0.5">
                      {evs.slice(0, 3).map((ev) => (
                        <span
                          key={ev.id}
                          className="h-2 w-2 rounded-full ring-1 ring-white"
                          style={{ background: ev.color ?? "#c98579" }}
                          title={ev.title}
                        />
                      ))}
                    </div>
                  );
                })()}
              </div>
              {shift?.is_tentative ? (
                <span
                  className="mt-0.5 text-[16px] font-semibold leading-none text-[color:var(--ink-3)]"
                  title={shift.note ?? "予備"}
                >
                  △
                </span>
              ) : shift ? ((() => {
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
                      {eff.hasActual && (
                        <span className="ml-0.5 text-[color:var(--accent)]">
                          *
                        </span>
                      )}
                    </p>
                  </div>
                );
              })()) : null}
              {!shift && timeOff && timeOff.status !== "rejected" ? (
                <span
                  className={`mt-0.5 text-[14px] font-semibold leading-none ${
                    timeOff.status === "approved"
                      ? "text-[color:var(--accent)]"
                      : "text-[color:var(--warning)]"
                  }`}
                  title={
                    timeOff.status === "approved"
                      ? "希望休（承認済み）"
                      : "希望休（申請中）"
                  }
                >
                  ●
                </span>
              ) : null}
            </Cell>
          );
        })}
      </div>
    </div>
  );
}

const WEEKDAYS_JP = ["日", "月", "火", "水", "木", "金", "土"];

function ScheduleInfo({
  events,
  weekdayLabels,
  isHonbu = false,
}: {
  events: WarehouseEvent[];
  weekdayLabels: WeekdayLabel[];
  isHonbu?: boolean;
}) {
  if (events.length === 0 && weekdayLabels.length === 0) return null;

  // weekdayLabelsを曜日順に並び替え
  const sortedWeekdays = [...weekdayLabels].sort(
    (a, b) => a.weekday - b.weekday,
  );

  // イベントを日付順に
  const sortedEvents = [...events].sort((a, b) =>
    a.event_date.localeCompare(b.event_date),
  );

  return (
    <div className="mt-4 space-y-3">
      {sortedWeekdays.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-medium tracking-[0.08em] text-[color:var(--ink-3)]">
            {isHonbu ? "出荷スケジュール" : "事業部別出荷スケジュール"}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {sortedWeekdays.map((l) => (
              <span
                key={l.id}
                className="inline-flex items-center justify-center gap-1 rounded-full bg-[color:var(--bg)] px-2.5 py-1 text-[11px] text-[color:var(--ink-2)]"
              >
                <span
                  className="inline-flex min-w-[2.5rem] justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                  style={{ background: l.color ?? "#5a7d9a" }}
                >
                  {l.label}
                </span>
                <span className="text-[color:var(--ink-2)]">
                  {WEEKDAYS_JP[l.weekday]}曜
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {sortedEvents.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-medium tracking-[0.08em] text-[color:var(--ink-3)]">
            今月のイベント
          </p>
          <ul className="space-y-1">
            {sortedEvents.map((e) => {
              const [, m, d] = e.event_date.split("-").map(Number);
              const date = new Date(e.event_date + "T00:00:00");
              const wd = WEEKDAYS_JP[date.getDay()];
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-2.5 rounded-lg bg-[color:var(--bg)] px-3 py-1.5"
                >
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ background: e.color ?? "#c98579" }}
                  />
                  <span className="text-[11px] tabular-nums text-[color:var(--ink-3)]">
                    {m}/{d} ({wd})
                  </span>
                  <span className="truncate text-[12px] font-medium text-[color:var(--ink)]">
                    {e.title}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
