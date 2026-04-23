import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireStaff, isAuthenticatedAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
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
import { EventPopover } from "@/components/EventPopover";
import { isHoliday, holidayName } from "@/lib/holidays";

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
};

type WarehouseEvent = {
  id: string;
  warehouse_id: string;
  event_date: string;
  title: string;
  description?: string | null;
  color: string | null;
};

export default async function AllShiftsPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: "day" | "month";
    date?: string;
    month?: string;
    warehouse?: string;
  }>;
}) {
  const { staff } = await requireStaff();
  const isAdmin = await isAuthenticatedAdmin();
  const sp = await searchParams;
  const view = sp.view ?? "month";
  const supabase = createAdminClient();

  const { data: warehousesRaw } = await supabase
    .from("warehouses")
    .select("id, name, target_staff_per_weekday")
    .order("name");
  const warehouses = (warehousesRaw ?? []) as Warehouse[];

  const whParam = sp.warehouse ?? staff.warehouse_id;
  const isAll = whParam === "all";
  const whId = isAll ? "all" : whParam;

  return (
    <AppShell>
      <div
        style={{
          width: "100%",
          maxWidth: view === "month" ? "80rem" : "32rem",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "0.25rem",
          paddingRight: "0.25rem",
          paddingTop: "1.75rem",
          paddingBottom: "2rem",
          boxSizing: "border-box",
        }}
        className="animate-rise"
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-[13px] text-[color:var(--ink-3)] active:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          ホーム
        </Link>

        <header className="mb-5 mt-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[color:var(--accent)]">
            All Shifts
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.35] tracking-tight text-[color:var(--ink)]">
            全員のシフト
          </h1>
        </header>

        {/* 拠点タブ */}
        <div className="mb-3 flex gap-1 overflow-x-auto rounded-full bg-[color:var(--surface)] p-1 shadow-[var(--shadow-sm)]">
          {(() => {
            const qs = new URLSearchParams();
            qs.set("warehouse", "all");
            qs.set("view", view);
            if (sp.date) qs.set("date", sp.date);
            if (sp.month) qs.set("month", sp.month);
            return (
              <Link
                href={`?${qs.toString()}`}
                className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-center text-[12px] font-medium transition-colors ${
                  isAll
                    ? "bg-[color:var(--accent)] text-white"
                    : "text-[color:var(--ink-3)]"
                }`}
              >
                すべて
              </Link>
            );
          })()}
          {warehouses.map((wh) => {
            const active = !isAll && whId === wh.id;
            const qs = new URLSearchParams();
            qs.set("warehouse", wh.id);
            qs.set("view", view);
            if (sp.date) qs.set("date", sp.date);
            if (sp.month) qs.set("month", sp.month);
            return (
              <Link
                key={wh.id}
                href={`?${qs.toString()}`}
                className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-center text-[12px] font-medium transition-colors ${
                  active
                    ? "bg-[color:var(--accent)] text-white"
                    : "text-[color:var(--ink-3)]"
                }`}
              >
                {wh.name.replace("物流倉庫", "")}
              </Link>
            );
          })}
        </div>

        {/* 表示切替タブ */}
        <div className="mb-4 flex gap-1 rounded-full bg-[color:var(--surface)] p-1 shadow-[var(--shadow-sm)]">
          <ViewTab currentView={view} wh={whId} target="month" label="月" />
          <ViewTab currentView={view} wh={whId} target="day" label="日" />
        </div>

        {view === "day" ? (
          <DayView whId={whId} date={sp.date} warehouses={warehouses} />
        ) : (
          <MonthView
            whId={whId}
            month={sp.month}
            warehouses={warehouses}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </AppShell>
  );
}

function ViewTab({
  currentView,
  wh,
  target,
  label,
}: {
  currentView: string;
  wh: string;
  target: "month" | "day";
  label: string;
}) {
  const active = currentView === target;
  return (
    <Link
      href={`?warehouse=${wh}&view=${target}`}
      className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-center text-[12px] font-medium transition-colors ${
        active
          ? "bg-[color:var(--ink)] text-white"
          : "text-[color:var(--ink-3)]"
      }`}
    >
      {label}
    </Link>
  );
}

// ============================================================
// 日ビュー
// ============================================================
async function DayView({
  whId,
  date,
  warehouses,
}: {
  whId: string;
  date?: string;
  warehouses: Warehouse[];
}) {
  const supabase = createAdminClient();
  const isAll = whId === "all";

  const today = new Date();
  const selectedDate = date ? new Date(`${date}T00:00:00`) : today;
  const dateStr = toISODate(selectedDate);

  let shiftsQuery = supabase
    .from("shifts")
    .select("*")
    .eq("is_published", true)
    .eq("work_date", dateStr)
    .order("start_time");
  if (!isAll) shiftsQuery = shiftsQuery.eq("warehouse_id", whId);

  let patternsQuery = supabase.from("shift_patterns").select("*");
  if (!isAll) patternsQuery = patternsQuery.eq("warehouse_id", whId);

  const [{ data: shiftsRaw }, { data: patternsRaw }, { data: staffsRaw }] =
    await Promise.all([
      shiftsQuery,
      patternsQuery,
      supabase.from("staffs").select("id, display_name").eq("is_active", true),
    ]);

  const patterns = (patternsRaw ?? []) as PatternRow[];
  const patternMap = new Map(patterns.map((p) => [p.id, p]));
  const staffMap = new Map(
    (staffsRaw ?? []).map((s) => [s.id as string, s.display_name as string]),
  );
  const shifts = (shiftsRaw ?? []) as ShiftRow[];

  const sorted = shifts
    .map((s) => {
      const eff = effectiveTimes(s, patternMap);
      const p = s.pattern_id ? patternMap.get(s.pattern_id) : null;
      return { shift: s, pattern: p, eff };
    })
    .sort((a, b) =>
      (a.eff?.start ?? "").localeCompare(b.eff?.start ?? ""),
    );

  const totalHours = shifts.reduce(
    (sum, s) => sum + shiftHours(s, patternMap),
    0,
  );

  return (
    <>
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-[color:var(--surface)] p-2 shadow-[var(--shadow-sm)]">
        <Link
          href={`?warehouse=${whId}&view=day&date=${shiftDay(selectedDate, -1)}`}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--ink-2)] active:bg-[color:var(--bg)]"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </Link>
        <div className="text-center">
          <p className="text-[16px] font-semibold tabular-nums text-[color:var(--ink)]">
            {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
            <span className="ml-2 text-[12px] font-normal text-[color:var(--ink-3)]">
              ({WEEKDAYS_SHORT[selectedDate.getDay()]})
            </span>
          </p>
          <p className="text-[10px] text-[color:var(--ink-3)] tabular-nums">
            出勤 {shifts.length} 名・計 {fmtHours(totalHours)}h
          </p>
        </div>
        <Link
          href={`?warehouse=${whId}&view=day&date=${shiftDay(selectedDate, 1)}`}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--ink-2)] active:bg-[color:var(--bg)]"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-3xl bg-[color:var(--surface)] p-10 text-center shadow-[var(--shadow-sm)]">
          <p className="text-[14px] font-medium text-[color:var(--ink-2)]">
            この日の公開済みシフトはありません
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(({ shift: s, pattern: p, eff }) => {
            const staffName = staffMap.get(s.staff_id) ?? "—";
            const hours = shiftHours(s, patternMap);
            if (!eff) return null;
            return (
              <div
                key={s.id}
                className="flex items-center gap-3.5 rounded-2xl bg-[color:var(--surface)] p-4 shadow-[var(--shadow-sm)]"
              >
                <div
                  className="h-10 w-1.5 flex-shrink-0 rounded-full"
                  style={{ background: p?.color ?? "#6b7280" }}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-[14px] font-semibold text-[color:var(--ink)]">
                    {staffName}
                  </p>
                  <p className="truncate text-[11px] text-[color:var(--ink-3)] tabular-nums">
                    {p ? p.label : "フリー"}
                    <span className="mx-1.5">・</span>
                    {fmtTimeShort(eff.start)} – {fmtTimeShort(eff.end)}
                  </p>
                </div>
                <p className="flex-shrink-0 text-[13px] font-semibold tabular-nums text-[color:var(--ink)]">
                  {fmtHours(hours)}
                  <span className="ml-0.5 text-[11px] font-normal text-[color:var(--ink-3)]">
                    h
                  </span>
                </p>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ============================================================
// 月ビュー（拠点ごとにグループ化）
// ============================================================
async function MonthView({
  whId,
  month,
  warehouses,
  isAdmin,
}: {
  whId: string;
  month?: string;
  warehouses: Warehouse[];
  isAdmin: boolean;
}) {
  const supabase = createAdminClient();
  const isAll = whId === "all";

  const now = new Date();
  const targetMonth = month
    ? new Date(`${month}-01T00:00:00`)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const { start, end } = monthRange(targetMonth);

  const targetWarehouses = isAll
    ? warehouses
    : warehouses.filter((wh) => wh.id === whId);

  const [
    { data: shiftsRaw },
    { data: patternsRaw },
    { data: staffsRaw },
    { data: weekdayLabelsRaw },
    { data: eventsRaw },
    { data: overridesRaw },
  ] = await Promise.all([
    supabase
      .from("shifts")
      .select("*")
      .eq("is_published", true)
      .in(
        "warehouse_id",
        targetWarehouses.map((w) => w.id),
      )
      .gte("work_date", toISODate(start))
      .lte("work_date", toISODate(end)),
    supabase
      .from("shift_patterns")
      .select("*")
      .in(
        "warehouse_id",
        targetWarehouses.map((w) => w.id),
      ),
    supabase
      .from("staffs")
      .select("id, display_name, warehouse_id")
      .in(
        "warehouse_id",
        targetWarehouses.map((w) => w.id),
      )
      .eq("is_active", true)
      .order("display_name"),
    supabase
      .from("warehouse_weekday_labels")
      .select("*")
      .in(
        "warehouse_id",
        targetWarehouses.map((w) => w.id),
      )
      .order("sort_order"),
    supabase
      .from("warehouse_events")
      .select("*")
      .in(
        "warehouse_id",
        targetWarehouses.map((w) => w.id),
      )
      .gte("event_date", toISODate(start))
      .lte("event_date", toISODate(end)),
    supabase
      .from("warehouse_date_label_overrides")
      .select("*")
      .in(
        "warehouse_id",
        targetWarehouses.map((w) => w.id),
      )
      .gte("override_date", toISODate(start))
      .lte("override_date", toISODate(end)),
  ]);

  const patterns = (patternsRaw ?? []) as PatternRow[];
  const patternMap = new Map(patterns.map((p) => [p.id, p]));
  const shifts = (shiftsRaw ?? []) as ShiftRow[];
  const staffs = (staffsRaw ?? []) as Staff[];
  const weekdayLabels = (weekdayLabelsRaw ?? []) as WeekdayLabel[];
  const events = (eventsRaw ?? []) as WarehouseEvent[];
  const overrides = (overridesRaw ?? []) as DateLabelOverride[];

  // 日付リスト
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const year = targetMonth.getFullYear();
  const mon = targetMonth.getMonth() + 1;
  const todayStr = toISODate(now);

  return (
    <>
      {/* 月切替 */}
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-[color:var(--surface)] p-2 shadow-[var(--shadow-sm)]">
        <Link
          href={`?warehouse=${whId}&view=month&month=${prevMonth(year, mon)}`}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--ink-2)] active:bg-[color:var(--bg)]"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </Link>
        <div className="text-center">
          <p className="text-[16px] font-semibold tabular-nums text-[color:var(--ink)]">
            {year}年{mon}月
          </p>
        </div>
        <Link
          href={`?warehouse=${whId}&view=month&month=${nextMonth(year, mon)}`}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--ink-2)] active:bg-[color:var(--bg)]"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>

      <div className="space-y-6">
        {targetWarehouses.map((wh) => (
          <WarehouseMonthGrid
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
            todayStr={todayStr}
            mon={mon}
            isAdmin={isAdmin}
          />
        ))}
      </div>

      <p className="mt-3 text-center text-[10px] text-[color:var(--ink-3)]">
        ※ 横スクロールで月末まで表示できます
      </p>
    </>
  );
}

function WarehouseMonthGrid({
  warehouse,
  days,
  staffs,
  shifts,
  patternMap,
  weekdayLabels,
  overrides,
  events,
  todayStr,
  mon,
  isAdmin,
}: {
  warehouse: Warehouse;
  days: Date[];
  staffs: Staff[];
  shifts: ShiftRow[];
  patternMap: Map<string, PatternRow>;
  weekdayLabels: WeekdayLabel[];
  overrides: DateLabelOverride[];
  events: WarehouseEvent[];
  todayStr: string;
  mon: number;
  isAdmin: boolean;
}) {
  // (staff_id, work_date) → shift
  const shiftMap = new Map<string, ShiftRow>();
  shifts.forEach((s) => shiftMap.set(`${s.staff_id}_${s.work_date}`, s));

  // スタッフ別: 日数, 時間
  const staffTotals = new Map<string, number>();
  const staffDays = new Map<string, number>();
  shifts.forEach((s) => {
    staffTotals.set(
      s.staff_id,
      (staffTotals.get(s.staff_id) ?? 0) + shiftHours(s, patternMap),
    );
    staffDays.set(s.staff_id, (staffDays.get(s.staff_id) ?? 0) + 1);
  });

  // 日別人数
  const dayStaffCount = new Map<string, number>();
  shifts.forEach((s) => {
    dayStaffCount.set(
      s.work_date,
      (dayStaffCount.get(s.work_date) ?? 0) + 1,
    );
  });

  // 日付別イベント
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
    <section>
      {/* 拠点ヘッダー */}
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="h-4 w-1 rounded-full bg-[color:var(--accent)]" />
        <h2 className="text-[14px] font-semibold tracking-tight text-[color:var(--ink)]">
          {warehouse.name}
        </h2>
        <span className="text-[11px] text-[color:var(--ink-3)]">
          （{staffs.length}名）
        </span>
      </div>

      <div className="rounded-2xl border border-[color:var(--line-strong)] bg-[color:var(--surface)] shadow-[var(--shadow-sm)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-30">
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
                {isAdmin && (
                  <>
                    <th className="w-12 px-1 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--ink-3)]">
                      日数
                    </th>
                    <th className="w-14 px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--ink-3)]">
                      計
                    </th>
                  </>
                )}
              </tr>

              {/* イベント行 */}
              {hasEvents && (
                <tr className="border-b border-[color:var(--line)] bg-white">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 w-24 border-r border-[color:var(--line-strong)] bg-[color:var(--surface)] pl-4 pr-2 py-1.5 text-left text-[10px] font-medium text-[color:var(--ink-3)]"
                  >
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
                        {evs.length > 0 && (
                          <EventPopover
                            date={dateStr}
                            events={evs}
                            warehouseName={warehouse.name}
                          />
                        )}
                      </td>
                    );
                  })}
                  {isAdmin && (
                    <>
                      <td className="w-12 px-1" />
                      <td className="w-14 px-2" />
                    </>
                  )}
                </tr>
              )}

              {/* 事業部ラベル行（例外適用） */}
              {hasWeekdayLabels && (
                <tr className="border-b border-[color:var(--line)] bg-[color:var(--surface)]">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 w-24 border-r border-[color:var(--line-strong)] bg-[color:var(--surface)] pl-4 pr-2 py-1.5 text-left text-[10px] font-medium text-[color:var(--ink-3)]"
                  >
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
                            title={
                              l.source === "added"
                                ? `${l.label}（臨時）`
                                : l.label
                            }
                          >
                            {l.source === "added" ? `+${l.label}` : l.label}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                  {isAdmin && (
                    <>
                      <td className="w-12 px-1" />
                      <td className="w-14 px-2" />
                    </>
                  )}
                </tr>
              )}
            </thead>
            <tbody>
              {staffs.map((s) => {
                const total = staffTotals.get(s.id) ?? 0;
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
                      const shift = shiftMap.get(`${s.id}_${dateStr}`);
                      const dow = d.getDay();
                      const isToday = dateStr === todayStr;
                      const holiday = isHoliday(dateStr);
                      const isOff = dow === 0 || dow === 6 || holiday;
                      const eff = shift ? effectiveTimes(shift, patternMap) : null;
                      const pattern = shift?.pattern_id
                        ? patternMap.get(shift.pattern_id)
                        : null;

                      return (
                        <td
                          key={dateStr}
                          className={`w-10 border-r border-[color:var(--line)] px-0.5 py-1 text-center ${
                            isToday
                              ? "bg-[color:var(--accent-soft)]"
                              : isOff
                                ? "bg-[color:var(--off-day)]"
                                : ""
                          }`}
                        >
                          {eff ? (
                            <div className="mx-auto w-full leading-tight">
                              <div
                                className="rounded px-0.5 text-[9px] font-medium text-white tabular-nums"
                                style={{ background: pattern?.color ?? "#6b7280" }}
                              >
                                {fmtTimeShort(eff.start)}
                              </div>
                              <div className="text-[9px] text-[color:var(--ink-3)] tabular-nums">
                                {fmtTimeShort(eff.end)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[color:var(--ink-4)]">·</span>
                          )}
                        </td>
                      );
                    })}
                    {isAdmin && (
                      <>
                        <td className="w-12 px-1 py-1 text-right text-[12px] font-semibold tabular-nums text-[color:var(--ink)]">
                          {staffDays.get(s.id) ?? 0}
                          <span className="ml-0.5 text-[10px] font-normal text-[color:var(--ink-3)]">
                            日
                          </span>
                        </td>
                        <td className="w-14 px-2 py-1 text-right text-[12px] font-semibold tabular-nums text-[color:var(--ink)]">
                          {fmtHours(total)}
                          <span className="ml-0.5 text-[10px] font-normal text-[color:var(--ink-3)]">
                            h
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}

              {/* 日別合計人数（目標人数があれば比較表示） */}
              <tr className="border-t-2 border-[color:var(--line-strong)] bg-[color:var(--bg)]">
                <th
                  scope="row"
                  className="sticky left-0 z-10 w-24 border-r border-[color:var(--line-strong)] bg-[color:var(--bg)] pl-4 pr-2 py-2 text-left text-[11px] font-semibold text-[color:var(--ink-2)]"
                >
                  合計人数
                </th>
                {days.map((d) => {
                  const dateStr = toISODate(d);
                  const count = dayStaffCount.get(dateStr) ?? 0;
                  const isToday = dateStr === todayStr;
                  const dow = d.getDay();
                  const holiday = isHoliday(dateStr);
                  const isOff = dow === 0 || dow === 6 || holiday;
                  const goal = target ? target[String(dow)] ?? null : null;
                  const short = goal !== null && count < goal;
                  return (
                    <td
                      key={dateStr}
                      className={`w-10 border-r border-[color:var(--line)] px-0.5 py-2 text-center text-[11px] font-semibold tabular-nums ${
                        isToday
                          ? "bg-[color:var(--accent-soft)]"
                          : isOff
                            ? "bg-[color:var(--off-day)]"
                            : ""
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
                {isAdmin && (
                  <>
                    <td className="w-12 px-1" />
                    <td className="w-14 px-2" />
                  </>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function shiftDay(d: Date, delta: number): string {
  const nd = new Date(d);
  nd.setDate(d.getDate() + delta);
  return toISODate(nd);
}

function prevMonth(y: number, m: number): string {
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(y: number, m: number): string {
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
