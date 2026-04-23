"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import {
  toISODate,
  shiftHours,
  fmtHours,
  effectiveTimes,
  fmtTimeShort,
  type ShiftRow,
  type PatternRow,
} from "@/lib/hours";
import {
  resolveLabelsForDate,
  type WeekdayLabel,
  type DateLabelOverride,
} from "@/lib/labels";
import { isHoliday, holidayName } from "@/lib/holidays";
import { upsertShift, deleteShift } from "../../actions";

const WEEKDAYS_SHORT = ["日", "月", "火", "水", "木", "金", "土"];

type Warehouse = {
  id: string;
  name: string;
  target_staff_per_weekday?: Record<string, number> | null;
};

type Staff = {
  id: string;
  display_name: string;
  warehouse_id: string;
  preferred_start_time: string | null;
  preferred_end_time: string | null;
  shift_style: "pattern" | "free" | "both";
  weekly_hour_limit: number | null;
};

type WarehouseEvent = {
  id: string;
  warehouse_id: string;
  event_date: string;
  title: string;
  color: string | null;
};

type EditCell = {
  staff: Staff;
  date: string;
  shift: ShiftRow | null;
};

export function ShiftBoard({
  warehouse,
  staffs,
  shifts,
  patterns,
  weekdayLabels,
  overrides,
  events,
  timeOffs,
  month,
}: {
  warehouse: Warehouse;
  staffs: Staff[];
  shifts: ShiftRow[];
  patterns: PatternRow[];
  weekdayLabels: WeekdayLabel[];
  overrides: DateLabelOverride[];
  events: WarehouseEvent[];
  timeOffs: { staff_id: string; request_date: string; status: string }[];
  month: string;
}) {
  const router = useRouter();
  const [editCell, setEditCell] = useState<EditCell | null>(null);

  const [year, mon] = month.split("-").map(Number);
  const firstDay = new Date(year, mon - 1, 1);
  const lastDay = new Date(year, mon, 0);
  const days: Date[] = [];
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const patternMap = useMemo(
    () => new Map(patterns.map((p) => [p.id, p])),
    [patterns],
  );

  const shiftMap = useMemo(() => {
    const m = new Map<string, ShiftRow>();
    shifts.forEach((s) => m.set(`${s.staff_id}_${s.work_date}`, s));
    return m;
  }, [shifts]);

  const timeOffSet = useMemo(
    () => new Set(timeOffs.map((t) => `${t.staff_id}_${t.request_date}`)),
    [timeOffs],
  );

  const eventByDate = useMemo(() => {
    const m = new Map<string, WarehouseEvent[]>();
    events.forEach((e) => {
      const arr = m.get(e.event_date) ?? [];
      arr.push(e);
      m.set(e.event_date, arr);
    });
    return m;
  }, [events]);

  // 合計
  const staffTotals = useMemo(() => {
    const m = new Map<string, { hours: number; days: number }>();
    shifts.forEach((s) => {
      const cur = m.get(s.staff_id) ?? { hours: 0, days: 0 };
      cur.hours += shiftHours(s, patternMap);
      cur.days += 1;
      m.set(s.staff_id, cur);
    });
    return m;
  }, [shifts, patternMap]);

  const dayCount = useMemo(() => {
    const m = new Map<string, number>();
    shifts.forEach((s) => {
      m.set(s.work_date, (m.get(s.work_date) ?? 0) + 1);
    });
    return m;
  }, [shifts]);

  const todayStr = toISODate(new Date());
  const target = warehouse.target_staff_per_weekday ?? null;

  function prevMonthUrl() {
    const d = new Date(year, mon - 2, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return `?warehouse=${warehouse.id}&month=${m}`;
  }
  function nextMonthUrl() {
    const d = new Date(year, mon, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return `?warehouse=${warehouse.id}&month=${m}`;
  }

  return (
    <>
      {/* 月切替 */}
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-[color:var(--surface)] p-2 shadow-[var(--shadow-sm)]">
        <Link
          href={prevMonthUrl()}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--ink-2)] active:bg-[color:var(--bg)]"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </Link>
        <div className="text-center">
          <p className="text-[16px] font-semibold tabular-nums text-[color:var(--ink)]">
            {year}年{mon}月
          </p>
          <p className="text-[10px] text-[color:var(--ink-3)]">
            {warehouse.name}・{staffs.length}名
          </p>
        </div>
        <Link
          href={nextMonthUrl()}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--ink-2)] active:bg-[color:var(--bg)]"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>

      {/* グリッド */}
      <div className="border-y border-[color:var(--line-strong)] bg-[color:var(--surface)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-[color:var(--line-strong)] bg-[color:var(--bg)]">
                <th className="sticky left-0 z-30 w-24 border-r border-[color:var(--line-strong)] bg-[color:var(--bg)] pl-4 pr-2 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--ink-3)]">
                  名前
                </th>
                {days.map((d) => {
                  const dateStr = toISODate(d);
                  const dow = d.getDay();
                  const isToday = dateStr === todayStr;
                  const holiday = isHoliday(dateStr);
                  const isOff = dow === 0 || dow === 6 || holiday;
                  return (
                    <th
                      key={dateStr}
                      className={`w-10 border-r border-[color:var(--line)] py-2 text-center text-[10px] font-semibold tabular-nums ${
                        isToday
                          ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                          : isOff
                            ? "bg-[color:var(--off-day-strong)]"
                            : ""
                      } ${
                        dow === 0 || holiday
                          ? "text-[color:var(--danger)]"
                          : dow === 6
                            ? "text-[#3a5a7a]"
                            : !isToday
                              ? "text-[color:var(--ink-3)]"
                              : ""
                      }`}
                      title={holiday ? holidayName(dateStr) ?? "" : undefined}
                    >
                      <div>{d.getDate()}</div>
                      <div className="text-[8px] font-normal opacity-70">
                        {WEEKDAYS_SHORT[dow]}
                      </div>
                    </th>
                  );
                })}
                <th className="w-12 px-1 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--ink-3)]">
                  日数
                </th>
                <th className="w-14 px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--ink-3)]">
                  計
                </th>
              </tr>

              {events.length > 0 && (
                <tr className="border-b border-[color:var(--line)] bg-white">
                  <th className="sticky left-0 z-10 w-24 border-r border-[color:var(--line-strong)] bg-[color:var(--surface)] pl-4 pr-2 py-1.5 text-left text-[10px] font-medium text-[color:var(--ink-3)]">
                    イベ
                  </th>
                  {days.map((d) => {
                    const dateStr = toISODate(d);
                    const evs = eventByDate.get(dateStr) ?? [];
                    const dow = d.getDay();
                    const holiday = isHoliday(dateStr);
                    const isOff = dow === 0 || dow === 6 || holiday;
                    return (
                      <td
                        key={dateStr}
                        className={`w-10 border-r border-[color:var(--line)] px-0.5 py-1 text-center align-top ${
                          isOff ? "bg-[color:var(--off-day)]" : ""
                        }`}
                      >
                        {evs.map((ev) => (
                          <div
                            key={ev.id}
                            className="mx-auto mb-0.5 truncate rounded px-0.5 text-[8px] font-medium leading-tight text-white"
                            style={{ background: ev.color ?? "#c98579" }}
                            title={ev.title}
                          >
                            {ev.title.length > 4
                              ? ev.title.slice(0, 4) + "…"
                              : ev.title}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                  <td colSpan={2} />
                </tr>
              )}

              {(weekdayLabels.length > 0 || overrides.length > 0) && (
                <tr className="border-b border-[color:var(--line)] bg-[color:var(--surface)]">
                  <th className="sticky left-0 z-10 w-24 border-r border-[color:var(--line-strong)] bg-[color:var(--surface)] pl-4 pr-2 py-1.5 text-left text-[10px] font-medium text-[color:var(--ink-3)]">
                    事業部
                  </th>
                  {days.map((d) => {
                    const dateStr = toISODate(d);
                    const labels = resolveLabelsForDate(
                      d,
                      warehouse.id,
                      weekdayLabels,
                      overrides,
                    );
                    const dow = d.getDay();
                    const holiday = isHoliday(dateStr);
                    const isOff = dow === 0 || dow === 6 || holiday;
                    return (
                      <td
                        key={dateStr}
                        className={`w-10 border-r border-[color:var(--line)] px-0.5 py-1 text-center align-top ${
                          isOff ? "bg-[color:var(--off-day)]" : ""
                        }`}
                      >
                        {labels.map((l, i) => (
                          <div
                            key={i}
                            className="mx-auto truncate rounded px-0.5 text-[8px] font-semibold leading-tight text-white"
                            style={{ background: l.color }}
                          >
                            {l.source === "added" ? `+${l.label}` : l.label}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                  <td colSpan={2} />
                </tr>
              )}
            </thead>
            <tbody>
              {staffs.map((s) => {
                const total = staffTotals.get(s.id) ?? { hours: 0, days: 0 };
                return (
                  <tr
                    key={s.id}
                    className="border-b border-[color:var(--line-strong)] last:border-b-0"
                  >
                    <th
                      scope="row"
                      className="sticky left-0 z-10 w-24 truncate border-r border-[color:var(--line-strong)] bg-[color:var(--surface)] pl-4 pr-2 py-2 text-left text-[12px] font-medium text-[color:var(--ink)]"
                    >
                      {s.display_name.split(/\s+/)[0]}
                    </th>
                    {days.map((d) => {
                      const dateStr = toISODate(d);
                      const key = `${s.id}_${dateStr}`;
                      const shift = shiftMap.get(key);
                      const hasOff = timeOffSet.has(key);
                      const dow = d.getDay();
                      const isToday = dateStr === todayStr;
                      const holiday = isHoliday(dateStr);
                      const isOff = dow === 0 || dow === 6 || holiday;
                      const eff = shift
                        ? effectiveTimes(shift, patternMap)
                        : null;
                      const pattern = shift?.pattern_id
                        ? patternMap.get(shift.pattern_id)
                        : null;
                      const isDraft = shift && !shift.is_published;

                      return (
                        <td
                          key={dateStr}
                          className={`w-10 border-r border-[color:var(--line)] p-0 ${
                            isToday
                              ? "bg-[color:var(--accent-soft)]"
                              : isOff
                                ? "bg-[color:var(--off-day)]"
                                : ""
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setEditCell({
                                staff: s,
                                date: dateStr,
                                shift: shift ?? null,
                              })
                            }
                            className={`flex h-full min-h-[44px] w-full flex-col items-center justify-center px-0.5 py-1 text-center transition-colors hover:bg-[color:var(--accent-soft)] ${
                              isDraft
                                ? "ring-1 ring-dashed ring-[color:var(--warning)]"
                                : ""
                            }`}
                            title={
                              shift
                                ? isDraft
                                  ? "下書き - タップで編集"
                                  : "タップで編集"
                                : hasOff
                                  ? "希望休あり - タップで追加"
                                  : "タップで追加"
                            }
                          >
                            {eff ? (
                              <>
                                <div
                                  className="w-full rounded px-0.5 text-[9px] font-medium text-white tabular-nums"
                                  style={{
                                    background: pattern?.color ?? "#6b7280",
                                  }}
                                >
                                  {fmtTimeShort(eff.start)}
                                </div>
                                <div className="text-[9px] text-[color:var(--ink-3)] tabular-nums">
                                  {fmtTimeShort(eff.end)}
                                </div>
                              </>
                            ) : hasOff ? (
                              <span className="text-[10px] font-semibold text-[color:var(--warning)]">
                                休
                              </span>
                            ) : (
                              <span className="text-[16px] text-[color:var(--ink-4)]">
                                ＋
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                    <td className="w-12 px-1 py-1 text-right text-[12px] font-semibold tabular-nums text-[color:var(--ink)]">
                      {total.days}
                      <span className="ml-0.5 text-[10px] font-normal text-[color:var(--ink-3)]">
                        日
                      </span>
                    </td>
                    <td className="w-14 px-2 py-1 text-right text-[12px] font-semibold tabular-nums text-[color:var(--ink)]">
                      {fmtHours(total.hours)}
                      <span className="ml-0.5 text-[10px] font-normal text-[color:var(--ink-3)]">
                        h
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* 合計人数 */}
              <tr className="border-t-2 border-[color:var(--line-strong)] bg-[color:var(--bg)]">
                <th
                  scope="row"
                  className="sticky left-0 z-10 w-24 border-r border-[color:var(--line-strong)] bg-[color:var(--bg)] pl-4 pr-2 py-2 text-left text-[11px] font-semibold text-[color:var(--ink-2)]"
                >
                  合計人数
                </th>
                {days.map((d) => {
                  const dateStr = toISODate(d);
                  const count = dayCount.get(dateStr) ?? 0;
                  const dow = d.getDay();
                  const holiday = isHoliday(dateStr);
                  const isOff = dow === 0 || dow === 6 || holiday;
                  const goal = target ? (target[String(dow)] ?? null) : null;
                  const short = goal !== null && count < goal;
                  return (
                    <td
                      key={dateStr}
                      className={`w-10 border-r border-[color:var(--line)] px-0.5 py-2 text-center text-[11px] font-semibold tabular-nums ${
                        isOff ? "bg-[color:var(--off-day)]" : ""
                      }`}
                    >
                      <div
                        className={
                          short
                            ? "text-[color:var(--danger)]"
                            : count === 0
                              ? "text-[color:var(--ink-4)]"
                              : "text-[color:var(--ink)]"
                        }
                      >
                        {count > 0 ? count : "·"}
                      </div>
                      {goal !== null && (
                        <div className="text-[8px] font-normal text-[color:var(--ink-3)]">
                          /{goal}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 編集モーダル */}
      {editCell && (
        <CellEditModal
          cell={editCell}
          patterns={patterns}
          warehouse={warehouse}
          onClose={() => setEditCell(null)}
          onSaved={() => {
            setEditCell(null);
            router.refresh();
          }}
        />
      )}

      {/* 凡例 */}
      <div className="mt-4 flex flex-wrap gap-4 text-[10px] text-[color:var(--ink-3)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-[color:var(--off-day)]" />
          土日・祝日
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-[color:var(--accent-soft)]" />
          本日
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border-2 border-dashed border-[color:var(--warning)]" />
          下書き
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-[color:var(--warning)]">休</span>
          希望休あり
        </span>
      </div>
    </>
  );
}

function CellEditModal({
  cell,
  patterns,
  warehouse,
  onClose,
  onSaved,
}: {
  cell: EditCell;
  patterns: PatternRow[];
  warehouse: Warehouse;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { staff, date, shift } = cell;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const defaultMode: "pattern" | "free" =
    staff.shift_style === "free"
      ? "free"
      : shift?.pattern_id
        ? "pattern"
        : staff.shift_style === "pattern"
          ? "pattern"
          : "free";
  const [mode, setMode] = useState<"pattern" | "free">(defaultMode);

  const [y, m, d] = date.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const wd = WEEKDAYS_SHORT[dateObj.getDay()];

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("id", shift?.id ?? "");
    formData.set("staff_id", staff.id);
    formData.set("warehouse_id", warehouse.id);
    formData.set("work_date", date);
    formData.set("input_mode", mode);

    startTransition(async () => {
      const result = await upsertShift(formData);
      if (result.ok) onSaved();
      else setError(result.message ?? "保存に失敗しました");
    });
  }

  function handleDelete() {
    if (!shift) return;
    if (!confirm("このシフトを削除しますか？")) return;
    startTransition(async () => {
      const result = await deleteShift(shift.id);
      if (result.ok) onSaved();
      else setError(result.message ?? "削除に失敗しました");
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
              {shift ? "Edit" : "New"}
            </p>
            <h2 className="mt-1 text-[20px] font-semibold tracking-tight text-[color:var(--ink)]">
              {staff.display_name}
              <span className="ml-2 text-[14px] font-normal text-[color:var(--ink-3)]">
                {m}/{d} ({wd})
              </span>
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

        <form action={handleSubmit} className="space-y-4">
          {/* 管理者画面ではスタッフ設定に関わらず両モード切替可能 */}
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
                  この拠点にはパターンが登録されていません
                </p>
              ) : (
                <select
                  name="pattern_id"
                  required={mode === "pattern"}
                  defaultValue={shift?.pattern_id ?? ""}
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
                    shift?.start_time?.slice(0, 5) ??
                    staff.preferred_start_time?.slice(0, 5) ??
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
                    shift?.end_time?.slice(0, 5) ??
                    staff.preferred_end_time?.slice(0, 5) ??
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
                  defaultValue={shift?.break_minutes ?? 60}
                  className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[13px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
                />
              </div>
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white p-3.5">
            <input
              name="is_published"
              type="checkbox"
              defaultChecked={shift?.is_published ?? true}
              className="h-5 w-5 accent-[color:var(--accent)]"
            />
            <div>
              <p className="text-[13px] font-medium text-[color:var(--ink)]">
                スタッフに公開
              </p>
              <p className="text-[11px] text-[color:var(--ink-3)]">
                外すと下書き扱いになります
              </p>
            </div>
          </label>

          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-[12px] text-[color:var(--danger)]">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            {shift && (
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
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {shift ? "更新する" : "登録する"}
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
