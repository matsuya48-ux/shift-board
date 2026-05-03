import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireStaff } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArrowLeft, Info, Pencil } from "lucide-react";
import {
  summarize,
  weekRange,
  monthRange,
  toISODate,
  fmtHours,
  type ShiftRow,
  type PatternRow,
} from "@/lib/hours";
import { ShiftHistoryList } from "./_components/ShiftHistoryList";

export default async function MyShiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { staff } = await requireStaff();
  const sp = await searchParams;
  const supabase = createAdminClient();

  const now = new Date();
  const month = sp.month
    ? new Date(`${sp.month}-01T00:00:00`)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const { start: mStart, end: mEnd } = monthRange(month);
  const { start: wkStart, end: wkEnd } = weekRange(now);

  const [
    { data: staffDetail },
    { data: monthShiftsRaw },
    { data: weekShiftsRaw },
    { data: patternsRaw },
    { data: timeOffsRaw },
  ] = await Promise.all([
    supabase
      .from("staffs")
      .select("weekly_hour_limit")
      .eq("id", staff.id)
      .single(),
    supabase
      .from("shifts")
      .select("*")
      .eq("staff_id", staff.id)
      .eq("is_published", true)
      .gte("work_date", toISODate(mStart))
      .lte("work_date", toISODate(mEnd))
      .order("work_date"),
    supabase
      .from("shifts")
      .select("*")
      .eq("staff_id", staff.id)
      .eq("is_published", true)
      .gte("work_date", toISODate(wkStart))
      .lte("work_date", toISODate(wkEnd)),
    supabase
      .from("shift_patterns")
      .select("*")
      .eq("warehouse_id", staff.warehouse_id),
    supabase
      .from("time_off_requests")
      .select("request_date, status")
      .eq("staff_id", staff.id)
      .gte("request_date", toISODate(mStart))
      .lte("request_date", toISODate(mEnd)),
  ]);

  const patterns = (patternsRaw ?? []) as PatternRow[];
  const patternMap = new Map(patterns.map((p) => [p.id, p]));
  const monthShifts = (monthShiftsRaw ?? []) as ShiftRow[];
  const weekShifts = (weekShiftsRaw ?? []) as ShiftRow[];
  const timeOffs = (timeOffsRaw ?? []) as {
    request_date: string;
    status: "pending" | "approved" | "rejected";
  }[];

  const weekSummary = summarize(weekShifts, patternMap, now);
  const monthSummary = summarize(monthShifts, patternMap, now);

  const weeklyLimit = staffDetail?.weekly_hour_limit ?? null;

  const [year, mon] = toISODate(mStart).split("-").map(Number);

  return (
    <AppShell>
      <div
        className="mx-auto w-full px-0 pb-8 pt-6 sm:max-w-2xl animate-rise"
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-[13px] text-[color:var(--ink-3)] active:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          ホーム
        </Link>

        <header className="mb-6 mt-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[color:var(--accent)]">
            My Schedule
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.35] tracking-tight text-[color:var(--ink)]">
            自分のシフト
          </h1>
        </header>

        {/* 集計 */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[color:var(--surface)] p-4 shadow-[var(--shadow-sm)]">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[color:var(--ink-3)]">
              今週
            </p>
            <p className="mt-2 flex items-baseline gap-1 tabular-nums">
              <span className="text-[22px] font-semibold leading-none text-[color:var(--ink)]">
                {fmtHours(weekSummary.total)}
              </span>
              <span className="text-[11px] text-[color:var(--ink-3)]">h</span>
              {weeklyLimit && (
                <span
                  className={`ml-1 text-[10px] ${
                    weekSummary.total > weeklyLimit
                      ? "text-[color:var(--danger)]"
                      : "text-[color:var(--ink-3)]"
                  }`}
                >
                  / {weeklyLimit}h
                </span>
              )}
            </p>
            <p className="mt-1.5 text-[10px] text-[color:var(--ink-3)] tabular-nums">
              実働 {fmtHours(weekSummary.actual)} + 予定 {fmtHours(weekSummary.planned)}
            </p>
          </div>
          <div className="rounded-2xl bg-[color:var(--surface)] p-4 shadow-[var(--shadow-sm)]">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[color:var(--ink-3)]">
              {mon}月
            </p>
            <p className="mt-2 flex items-baseline gap-1 tabular-nums">
              <span className="text-[22px] font-semibold leading-none text-[color:var(--ink)]">
                {fmtHours(monthSummary.total)}
              </span>
              <span className="text-[11px] text-[color:var(--ink-3)]">h</span>
            </p>
            <p className="mt-1.5 text-[10px] text-[color:var(--ink-3)] tabular-nums">
              実働 {fmtHours(monthSummary.actual)} + 予定 {fmtHours(monthSummary.planned)}
            </p>
          </div>
        </div>

        <MonthCalendar
          year={year}
          month={mon}
          shifts={monthShifts}
          patterns={patternMap}
          timeOffs={timeOffs}
        />

        {/* 月切替（既存: link） */}
        <div className="mt-4 flex gap-2">
          <Link
            href={`?month=${prevMonth(year, mon)}`}
            className="flex h-10 flex-1 items-center justify-center rounded-full border border-[color:var(--line)] bg-white text-[12px] font-medium text-[color:var(--ink-2)]"
          >
            ← 前月
          </Link>
          <Link
            href={`?month=${nextMonth(year, mon)}`}
            className="flex h-10 flex-1 items-center justify-center rounded-full border border-[color:var(--line)] bg-white text-[12px] font-medium text-[color:var(--ink-2)]"
          >
            翌月 →
          </Link>
        </div>

        {/* 使い方案内：実働の修正 */}
        <section className="mt-8">
          <div className="mb-4 flex items-start gap-3 rounded-2xl bg-[color:var(--accent-soft)] p-4">
            <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)]">
              <Info className="h-3 w-3 text-white" strokeWidth={2.5} />
            </div>
            <div className="space-y-1.5 text-[12px] leading-relaxed">
              <p className="font-semibold text-[color:var(--ink)]">
                予定と違う働き方をした日は記録できます
              </p>
              <p className="text-[color:var(--ink-2)]">
                下のシフト一覧で過去・今日の項目に
                <span className="mx-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--bg)] align-middle text-[color:var(--ink-3)]">
                  <Pencil className="h-2.5 w-2.5" strokeWidth={1.8} />
                </span>
                マークが付いています。タップで実働の開始・終了・休憩を入力できます。
              </p>
              <p className="text-[color:var(--ink-3)]">
                予定通りなら何もしなくてOK。記録すると一覧に
                <span className="mx-0.5 rounded-full bg-[color:var(--accent-soft)] px-1.5 py-0.5 text-[9px] font-semibold text-[color:var(--accent)]">
                  実働済
                </span>
                バッジが付き、上の「今週・今月」集計にも反映されます。
              </p>
            </div>
          </div>

          <h2 className="mb-3 px-1 text-[13px] font-semibold text-[color:var(--ink-2)]">
            シフト一覧
          </h2>
          <ShiftHistoryList
            shifts={monthShifts}
            patterns={patterns}
            isAdmin={staff.role === "admin"}
          />
        </section>
      </div>
    </AppShell>
  );
}

function MonthCalendar({
  year,
  month,
  shifts,
  patterns,
  timeOffs,
}: {
  year: number;
  month: number;
  shifts: ShiftRow[];
  patterns: Map<string, PatternRow>;
  timeOffs: { request_date: string; status: string }[];
}) {
  const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];
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
  const todayStr = toISODate(new Date());

  return (
    <div className="overflow-hidden rounded-2xl bg-[color:var(--surface)] shadow-[var(--shadow-sm)]">
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
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const dateStr = toISODate(d);
          const isCurrentMonth = d.getMonth() === month - 1;
          const isToday = dateStr === todayStr;
          const dow = (d.getDay() + 6) % 7;
          const shift = shiftMap.get(dateStr);
          const timeOff = timeOffMap.get(dateStr);
          const pattern = shift?.pattern_id ? patterns.get(shift.pattern_id) : null;

          return (
            <div
              key={i}
              className={`flex min-h-[56px] flex-col items-center border-b border-r border-[color:var(--line-soft)] p-1 text-center ${
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
              {shift ? (
                <div className="mt-0.5 w-full">
                  {pattern ? (
                    <div
                      className="truncate rounded px-0.5 text-[9px] font-medium text-white"
                      style={{ background: pattern.color ?? "#6366f1" }}
                    >
                      {pattern.label}
                    </div>
                  ) : (
                    <div className="truncate rounded bg-[color:var(--ink-3)] px-0.5 text-[9px] font-medium text-white">
                      {shift.start_time?.slice(0, 5)}
                    </div>
                  )}
                </div>
              ) : timeOff && timeOff.status === "approved" ? (
                <span className="mt-0.5 rounded bg-[color:var(--accent-soft)] px-1 text-[9px] font-medium text-[color:var(--accent)]">
                  休
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function prevMonth(y: number, m: number): string {
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(y: number, m: number): string {
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
