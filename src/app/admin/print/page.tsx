import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "./_components/PrintButton";
import {
  toISODate,
  shiftHours,
  fmtHours,
  monthRange,
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
import "./print.css";

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
  weekly_hour_limit: number | null;
};

type WarehouseEvent = {
  id: string;
  warehouse_id: string;
  event_date: string;
  title: string;
  color: string | null;
};

type TimeOffRow = {
  staff_id: string;
  request_date: string;
  status: string;
};

export default async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; warehouse?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const supabase = createAdminClient();

  const { data: warehousesRaw } = await supabase
    .from("warehouses")
    .select("id, name, target_staff_per_weekday")
    .order("name");
  const warehouses = (warehousesRaw ?? []) as Warehouse[];

  const whFilter = sp.warehouse;
  const targetWarehouses = whFilter
    ? warehouses.filter((w) => w.id === whFilter)
    : warehouses;

  const now = new Date();
  const targetMonth = sp.month
    ? new Date(`${sp.month}-01T00:00:00`)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const { start, end } = monthRange(targetMonth);

  const whIds = targetWarehouses.map((w) => w.id);

  const [
    { data: shiftsRaw },
    { data: patternsRaw },
    { data: staffsRaw },
    { data: weekdayLabelsRaw },
    { data: eventsRaw },
    { data: timeOffsRaw },
    { data: overridesRaw },
  ] = await Promise.all([
    supabase
      .from("shifts")
      .select("*")
      .eq("is_published", true)
      .in("warehouse_id", whIds)
      .gte("work_date", toISODate(start))
      .lte("work_date", toISODate(end)),
    supabase.from("shift_patterns").select("*").in("warehouse_id", whIds),
    supabase
      .from("staffs")
      .select("id, display_name, warehouse_id, weekly_hour_limit")
      .in("warehouse_id", whIds)
      .eq("is_active", true)
      .order("display_name"),
    supabase
      .from("warehouse_weekday_labels")
      .select("*")
      .in("warehouse_id", whIds)
      .order("sort_order"),
    supabase
      .from("warehouse_events")
      .select("*")
      .in("warehouse_id", whIds)
      .gte("event_date", toISODate(start))
      .lte("event_date", toISODate(end)),
    supabase
      .from("time_off_requests")
      .select("staff_id, request_date, status")
      .in("status", ["approved", "pending"])
      .gte("request_date", toISODate(start))
      .lte("request_date", toISODate(end)),
    supabase
      .from("warehouse_date_label_overrides")
      .select("*")
      .in("warehouse_id", whIds)
      .gte("override_date", toISODate(start))
      .lte("override_date", toISODate(end)),
  ]);

  const patterns = (patternsRaw ?? []) as PatternRow[];
  const patternMap = new Map(patterns.map((p) => [p.id, p]));
  const shifts = (shiftsRaw ?? []) as ShiftRow[];
  const staffs = (staffsRaw ?? []) as Staff[];
  const weekdayLabels = (weekdayLabelsRaw ?? []) as WeekdayLabel[];
  const events = (eventsRaw ?? []) as WarehouseEvent[];
  const timeOffs = (timeOffsRaw ?? []) as TimeOffRow[];
  const overrides = (overridesRaw ?? []) as DateLabelOverride[];

  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const year = targetMonth.getFullYear();
  const mon = targetMonth.getMonth() + 1;

  return (
    <>
      {/* 操作バー（印刷時は非表示） */}
      <div className="no-print mx-auto max-w-5xl px-6 pb-4 pt-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-[13px] text-[color:var(--ink-3)] active:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          管理者メニュー
        </Link>

        <div className="mt-4 mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[color:var(--accent)]">
              Print Layout
            </p>
            <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-[color:var(--ink)]">
              A4印刷用シフト表
            </h1>
            <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--ink-3)]">
              {year}年{mon}月 / {targetWarehouses.length > 1
                ? "全拠点"
                : targetWarehouses[0]?.name ?? ""}
            </p>
          </div>
          <form className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium text-[color:var(--ink-2)]">
                月
              </label>
              <input
                type="month"
                name="month"
                defaultValue={`${year}-${String(mon).padStart(2, "0")}`}
                className="h-9 rounded-xl border border-[color:var(--line)] bg-white px-3 text-[13px] tabular-nums"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-[color:var(--ink-2)]">
                拠点
              </label>
              <select
                name="warehouse"
                defaultValue={whFilter ?? ""}
                className="h-9 rounded-xl border border-[color:var(--line)] bg-white px-3 text-[13px]"
              >
                <option value="">すべて</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="h-9 rounded-full bg-[color:var(--ink)] px-5 text-[12px] font-medium text-white"
            >
              表示
            </button>
          </form>
        </div>

        <PrintButton />
      </div>

      {/* 印刷対象 */}
      <div className="print-root">
        {targetWarehouses.map((wh, index) => (
          <PrintableSheet
            key={wh.id}
            warehouse={wh}
            days={days}
            staffs={staffs.filter((s) => s.warehouse_id === wh.id)}
            shifts={shifts.filter((s) => s.warehouse_id === wh.id)}
            patternMap={patternMap}
            weekdayLabels={weekdayLabels.filter(
              (l) => l.warehouse_id === wh.id,
            )}
            overrides={overrides.filter((o) => o.warehouse_id === wh.id)}
            events={events.filter((e) => e.warehouse_id === wh.id)}
            timeOffs={timeOffs}
            year={year}
            mon={mon}
            pageBreak={index < targetWarehouses.length - 1}
          />
        ))}
      </div>
    </>
  );
}

function PrintableSheet({
  warehouse,
  days,
  staffs,
  shifts,
  patternMap,
  weekdayLabels,
  overrides,
  events,
  timeOffs,
  year,
  mon,
  pageBreak,
}: {
  warehouse: Warehouse;
  days: Date[];
  staffs: Staff[];
  shifts: ShiftRow[];
  patternMap: Map<string, PatternRow>;
  weekdayLabels: WeekdayLabel[];
  overrides: DateLabelOverride[];
  events: WarehouseEvent[];
  timeOffs: TimeOffRow[];
  year: number;
  mon: number;
  pageBreak: boolean;
}) {
  const shiftMap = new Map<string, ShiftRow>();
  shifts.forEach((s) => shiftMap.set(`${s.staff_id}_${s.work_date}`, s));

  const timeOffSet = new Set<string>();
  timeOffs.forEach((t) =>
    timeOffSet.add(`${t.staff_id}_${t.request_date}`),
  );

  const staffTotals = new Map<string, { hours: number; days: number }>();
  shifts.forEach((s) => {
    const cur = staffTotals.get(s.staff_id) ?? { hours: 0, days: 0 };
    cur.hours += shiftHours(s, patternMap);
    cur.days += 1;
    staffTotals.set(s.staff_id, cur);
  });

  const dayStaffCount = new Map<string, number>();
  shifts.forEach((s) => {
    dayStaffCount.set(
      s.work_date,
      (dayStaffCount.get(s.work_date) ?? 0) + 1,
    );
  });

  const eventByDate = new Map<string, WarehouseEvent[]>();
  events.forEach((e) => {
    const arr = eventByDate.get(e.event_date) ?? [];
    arr.push(e);
    eventByDate.set(e.event_date, arr);
  });

  const hasEvents = events.length > 0;
  const hasWeekdayLabels = weekdayLabels.length > 0 || overrides.length > 0;
  const target = warehouse.target_staff_per_weekday ?? null;

  return (
    <div className={`print-sheet ${pageBreak ? "page-break" : ""}`}>
      <header className="print-header">
        <div>
          <h1 className="print-title">
            {warehouse.name} {year}年{mon}月 勤務シフト
          </h1>
          <p className="print-subtitle">
            ㈱まつや 糸島Logistics ・ SHIFT BOARD ・ 休み希望＝●
          </p>
        </div>
        <div className="print-meta">
          <span>作成：{new Date().toLocaleDateString("ja-JP")}</span>
        </div>
      </header>

      <table className="print-table">
        <thead>
          <tr>
            <th className="col-name" rowSpan={2}>
              氏名
            </th>
            {days.map((d) => {
              const dateStr = toISODate(d);
              const dow = d.getDay();
              const holiday = isHoliday(dateStr);
              const cls = dow === 0 || holiday
                ? "sun"
                : dow === 6
                  ? "sat"
                  : "";
              return (
                <th
                  key={dateStr}
                  className={`col-day ${cls}`}
                  title={holiday ? holidayName(dateStr) ?? "" : undefined}
                >
                  {d.getDate()}
                </th>
              );
            })}
            <th className="col-total" rowSpan={2}>
              日数
            </th>
            <th className="col-total" rowSpan={2}>
              時間
            </th>
          </tr>
          <tr>
            {days.map((d) => {
              const dateStr = toISODate(d);
              const dow = d.getDay();
              const holiday = isHoliday(dateStr);
              const cls = dow === 0 || holiday
                ? "sun"
                : dow === 6
                  ? "sat"
                  : "";
              return (
                <th key={`dow-${dateStr}`} className={`col-dow ${cls}`}>
                  {WEEKDAYS_SHORT[dow]}
                </th>
              );
            })}
          </tr>
          {hasEvents && (
            <tr className="row-event">
              <th className="row-label">イベント</th>
              {days.map((d) => {
                const evs = eventByDate.get(toISODate(d)) ?? [];
                return (
                  <td key={toISODate(d)} className="event-cell">
                    {evs.map((e) => (
                      <div
                        key={e.id}
                        className="event-badge"
                        style={{ background: e.color ?? "#c98579" }}
                      >
                        {e.title}
                      </div>
                    ))}
                  </td>
                );
              })}
              <td colSpan={2} />
            </tr>
          )}
          {hasWeekdayLabels && (
            <tr className="row-weekday">
              <th className="row-label">事業部</th>
              {days.map((d) => {
                const labels = resolveLabelsForDate(
                  d,
                  warehouse.id,
                  weekdayLabels,
                  overrides,
                );
                return (
                  <td key={toISODate(d)} className="weekday-cell">
                    {labels.map((l, i) => (
                      <div
                        key={i}
                        className="weekday-badge"
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
              <tr key={s.id}>
                <th className="staff-name" scope="row">
                  {s.display_name}
                </th>
                {days.map((d) => {
                  const dateStr = toISODate(d);
                  const shift = shiftMap.get(`${s.id}_${dateStr}`);
                  const hasTimeOff = timeOffSet.has(`${s.id}_${dateStr}`);
                  const dow = d.getDay();
                  const holiday = isHoliday(dateStr);
                  const cls = dow === 0 || holiday
                    ? "sun"
                    : dow === 6
                      ? "sat"
                      : "";
                  const eff = shift
                    ? effectiveTimes(shift, patternMap)
                    : null;

                  return (
                    <td
                      key={dateStr}
                      className={`shift-cell ${cls}`}
                    >
                      {eff ? (
                        <>
                          <div className="time-start">
                            {fmtTimeShort(eff.start)}
                          </div>
                          <div className="time-end">
                            {fmtTimeShort(eff.end)}
                          </div>
                        </>
                      ) : hasTimeOff ? (
                        <div className="time-off">●</div>
                      ) : (
                        <div className="empty">·</div>
                      )}
                    </td>
                  );
                })}
                <td className="total-cell">{total.days}</td>
                <td className="total-cell">{fmtHours(total.hours)}</td>
              </tr>
            );
          })}

          {/* 合計人数行 */}
          <tr className="row-totals">
            <th className="row-label" scope="row">
              合計人数
            </th>
            {days.map((d) => {
              const dateStr = toISODate(d);
              const count = dayStaffCount.get(dateStr) ?? 0;
              const dow = d.getDay();
              const goal = target ? (target[String(dow)] ?? null) : null;
              const short = goal !== null && count < goal;
              return (
                <td key={dateStr} className="count-cell">
                  <div className={short ? "short" : ""}>
                    {count > 0 ? count : ""}
                  </div>
                  {goal !== null && <div className="goal">/{goal}</div>}
                </td>
              );
            })}
            <td colSpan={2} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
