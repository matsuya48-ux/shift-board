import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireStaff } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { MyCalendarCarousel } from "@/components/MyCalendarCarousel";
import { InstallPromptCard } from "@/components/InstallPromptCard";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { TimeOffReminder } from "@/components/TimeOffReminder";
import { BrandLogo } from "@/components/BrandLogo";
import {
  CalendarHeart,
  Users,
  Settings,
  ChevronRight,
  Bell,
} from "lucide-react";
import {
  summarize,
  weekRange,
  monthRange,
  toISODate,
  fmtHours,
  type ShiftRow,
  type PatternRow,
} from "@/lib/hours";

type MonthOffset = -1 | 0 | 1;

function monthAt(now: Date, offset: MonthOffset) {
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
}

export default async function DashboardPage() {
  const { staff } = await requireStaff();
  const supabase = createAdminClient();

  const { data: staffDetail } = await supabase
    .from("staffs")
    .select("weekly_hour_limit")
    .eq("id", staff.id)
    .single();
  const weeklyLimit = staffDetail?.weekly_hour_limit ?? null;

  const now = new Date();

  // 3ヶ月分の範囲
  const prev = monthRange(monthAt(now, -1));
  const curr = monthRange(monthAt(now, 0));
  const next = monthRange(monthAt(now, 1));

  const rangeStart = prev.start;
  const rangeEnd = next.end;

  const { start: wkStart, end: wkEnd } = weekRange(now);

  const [
    { count: pendingCount },
    { count: notifCount },
    { data: weekShiftsRaw },
    { data: allShiftsRaw },
    { data: allTimeOffsRaw },
    { data: patternsRaw },
    { data: allEventsRaw },
    { data: weekdayLabelsRaw },
    { data: overridesRaw },
  ] = await Promise.all([
    supabase
      .from("time_off_requests")
      .select("*", { count: "exact", head: true })
      .eq("staff_id", staff.id)
      .eq("status", "pending"),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("staff_id", staff.id)
      .eq("is_read", false),
    supabase
      .from("shifts")
      .select("*")
      .eq("staff_id", staff.id)
      .gte("work_date", toISODate(wkStart))
      .lte("work_date", toISODate(wkEnd)),
    supabase
      .from("shifts")
      .select("*")
      .eq("staff_id", staff.id)
      .eq("is_published", true)
      .gte("work_date", toISODate(rangeStart))
      .lte("work_date", toISODate(rangeEnd))
      .order("work_date"),
    supabase
      .from("time_off_requests")
      .select("request_date, status")
      .eq("staff_id", staff.id)
      .gte("request_date", toISODate(rangeStart))
      .lte("request_date", toISODate(rangeEnd)),
    supabase
      .from("shift_patterns")
      .select("*")
      .eq("warehouse_id", staff.warehouse_id),
    supabase
      .from("warehouse_events")
      .select("*")
      .eq("warehouse_id", staff.warehouse_id)
      .gte("event_date", toISODate(rangeStart))
      .lte("event_date", toISODate(rangeEnd)),
    supabase
      .from("warehouse_weekday_labels")
      .select("*")
      .eq("warehouse_id", staff.warehouse_id),
    supabase
      .from("warehouse_date_label_overrides")
      .select("*")
      .eq("warehouse_id", staff.warehouse_id)
      .gte("override_date", toISODate(rangeStart))
      .lte("override_date", toISODate(rangeEnd)),
  ]);

  const patterns = (patternsRaw ?? []) as PatternRow[];
  const patternMap = new Map(patterns.map((p) => [p.id, p]));
  const weekSummary = summarize(
    (weekShiftsRaw ?? []) as ShiftRow[],
    patternMap,
    now,
  );

  // 月ごとに分割
  const allShifts = (allShiftsRaw ?? []) as ShiftRow[];
  const allTimeOffs = (allTimeOffsRaw ?? []) as {
    request_date: string;
    status: "pending" | "approved" | "rejected";
  }[];
  const allEvents = (allEventsRaw ?? []) as {
    id: string;
    warehouse_id: string;
    event_date: string;
    title: string;
    description?: string | null;
    color: string | null;
  }[];
  const weekdayLabels = (weekdayLabelsRaw ?? []) as unknown as {
    id: string;
    warehouse_id: string;
    weekday: number;
    label: string;
    color: string | null;
  }[];
  const overrides = (overridesRaw ?? []) as unknown as {
    id: string;
    warehouse_id: string;
    override_date: string;
    label: string;
    action: "add" | "skip";
    color: string | null;
  }[];

  function ym(year: number, month: number) {
    return `${year}-${String(month).padStart(2, "0")}`;
  }

  function filterMonth<
    T extends { work_date?: string; request_date?: string; event_date?: string },
  >(rows: T[], y: number, m: number): T[] {
    const key = ym(y, m);
    return rows.filter((r) =>
      (r.work_date ?? r.request_date ?? r.event_date)?.startsWith(key),
    );
  }

  const months = [monthAt(now, -1), monthAt(now, 0), monthAt(now, 1)].map(
    (d) => ({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      shifts: filterMonth(allShifts, d.getFullYear(), d.getMonth() + 1),
      timeOffs: filterMonth(allTimeOffs, d.getFullYear(), d.getMonth() + 1),
      events: filterMonth(allEvents, d.getFullYear(), d.getMonth() + 1),
    }),
  );

  const currentMonthSummary = summarize(
    months[1].shifts,
    patternMap,
    now,
  );

  const firstWord = staff.display_name.split(/\s+/)[0] ?? "";
  const initial = firstWord.slice(0, 2) || "?";
  const todayStr = toISODate(now);

  return (
    <AppShell>
      <div
        className="mx-auto w-full px-2 pb-8 pt-6 sm:px-3 md:px-4 landscape:px-3 sm:max-w-2xl"
      >
        <header className="mb-6 flex items-center justify-between gap-3 animate-rise">
          <BrandLogo size="lg" />
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--surface)] shadow-[var(--shadow-sm)] active:scale-95"
            >
              <Bell
                className="h-[18px] w-[18px] text-[color:var(--ink-2)]"
                strokeWidth={1.8}
              />
              {(notifCount ?? 0) > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[color:var(--danger)]" />
              )}
            </button>
            <Link
              href="/select-staff"
              className="flex h-10 min-w-[2.5rem] items-center justify-center rounded-full bg-[color:var(--accent)] px-2.5 text-[12px] font-semibold text-white active:scale-95"
              aria-label="スタッフ切替"
            >
              {initial}
            </Link>
          </div>
        </header>

        <div className="mb-6 animate-rise">
          <h1 className="truncate text-[22px] font-semibold tracking-tight text-[color:var(--ink)]">
            {staff.display_name}
            <span className="text-[color:var(--ink-3)]"> さん</span>
          </h1>
        </div>

        {/* インストール誘導（条件により表示） */}
        <InstallPromptCard />

        {/* 希望休未提出の案内 */}
        <TimeOffReminder staffId={staff.id} />

        {/* 管理者からのお知らせ */}
        <AnnouncementBanner warehouseId={staff.warehouse_id} />

        {/* 勤務時間サマリー */}
        <section className="mb-7 grid grid-cols-2 gap-4 animate-rise">
          <HoursCard
            label="今週"
            total={weekSummary.total}
            actual={weekSummary.actual}
            planned={weekSummary.planned}
            limit={weeklyLimit}
          />
          <HoursCard
            label={`${now.getMonth() + 1}月`}
            total={currentMonthSummary.total}
            actual={currentMonthSummary.actual}
            planned={currentMonthSummary.planned}
            days={months[1].shifts.length}
          />
        </section>

        {/* カレンダー（カルーセル） */}
        <section className="mb-7 animate-rise">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[color:var(--ink-2)]">
              <span className="flex h-5 min-w-[1.5rem] flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] px-1 text-[9px] font-semibold text-white">
                {initial}
              </span>
              {staff.display_name} さんのシフト
            </h2>
            <Link
              href="/shifts/all"
              className="flex items-center gap-0.5 text-[11px] font-medium text-[color:var(--accent)] active:opacity-60"
            >
              全員を見る
              <ChevronRight className="h-3 w-3" strokeWidth={2.2} />
            </Link>
          </div>
          <MyCalendarCarousel
            months={months}
            patterns={patterns}
            weekdayLabels={weekdayLabels}
            overrides={overrides}
            todayStr={todayStr}
            warehouseId={staff.warehouse_id}
          />
        </section>

        {/* 全員のシフト バナー */}
        <Link
          href="/shifts/all"
          className="mb-5 flex items-center gap-3.5 rounded-2xl bg-[color:var(--surface)] p-4 shadow-[var(--shadow-sm)] transition-transform active:scale-[0.98] animate-rise"
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
            <Users className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-[14px] font-semibold tracking-tight text-[color:var(--ink)]">
              全員のシフトを見る
            </p>
            <p className="text-[11px] text-[color:var(--ink-3)]">
              今月の出勤予定・イベント・事業部
            </p>
          </div>
          <ChevronRight
            className="h-4 w-4 flex-shrink-0 text-[color:var(--ink-4)]"
            strokeWidth={2}
          />
        </Link>

        {/* 希望休申請カード */}
        <Link
          href="/time-off"
          className="relative mb-5 block overflow-hidden rounded-2xl bg-gradient-to-br from-[color:var(--accent)] to-[#1f3e31] p-4 text-white shadow-[var(--shadow-md)] animate-rise active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <CalendarHeart className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-white/70">
                Time off
              </p>
              <p className="mt-0.5 truncate text-[16px] font-semibold tracking-tight">
                希望休を申請する
              </p>
              <p className="mt-0.5 truncate text-[11px] text-white/70">
                {(pendingCount ?? 0) > 0
                  ? `申請中 ${pendingCount} 件`
                  : "翌月分は毎月10日まで"}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 flex-shrink-0 opacity-70" strokeWidth={2} />
          </div>
        </Link>

        {/* 管理者メニュー */}
        <div className="grid gap-5 animate-rise">
          {staff.role === "admin" && (
            <Link
              href="/admin"
              className="flex items-center gap-3.5 rounded-2xl bg-[color:var(--ink)] p-4 text-white shadow-[var(--shadow-md)] active:scale-[0.99]"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Settings className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-[14px] font-semibold leading-snug tracking-tight">
                  管理者メニュー
                </p>
                <p className="truncate text-[11px] leading-snug text-white/60">
                  スタッフ・シフト管理
                </p>
              </div>
              <ChevronRight
                className="h-4 w-4 flex-shrink-0 text-white/60"
                strokeWidth={2}
              />
            </Link>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function HoursCard({
  label,
  total,
  actual,
  planned,
  limit,
  days,
}: {
  label: string;
  total: number;
  actual: number;
  planned: number;
  limit?: number | null;
  days?: number;
}) {
  const overLimit = limit !== null && limit !== undefined && total > limit;
  const ratio = limit ? Math.min(100, (total / limit) * 100) : 0;

  return (
    <div className="flex items-stretch gap-3 rounded-2xl bg-[color:var(--surface)] py-5 pl-5 pr-5 shadow-[var(--shadow-sm)]">
      {/* 左側のアクセント */}
      <div
        className={`w-1 flex-shrink-0 rounded-full ${
          overLimit ? "bg-[color:var(--danger)]" : "bg-[color:var(--accent)]"
        }`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-[color:var(--ink-3)]">
            {label}
          </p>
          {limit && (
            <p
              className={`text-[10px] font-medium tabular-nums ${
                overLimit
                  ? "text-[color:var(--danger)]"
                  : "text-[color:var(--ink-3)]"
              }`}
            >
              / {limit}h
            </p>
          )}
        </div>
        <p className="mt-2 flex items-baseline gap-1 tabular-nums">
          <span
            className={`text-[24px] font-semibold leading-none tracking-tight ${
              overLimit
                ? "text-[color:var(--danger)]"
                : "text-[color:var(--ink)]"
            }`}
          >
            {fmtHours(total)}
          </span>
          <span className="text-[11px] text-[color:var(--ink-3)]">h</span>
          {days !== undefined && (
            <>
              <span className="ml-2 text-[24px] font-semibold leading-none tracking-tight tabular-nums text-[color:var(--ink)]">
                {days}
              </span>
              <span className="text-[11px] text-[color:var(--ink-3)]">日</span>
            </>
          )}
        </p>
        {limit && (
          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[color:var(--bg)]">
            <div
              className={`h-full rounded-full transition-all ${
                overLimit
                  ? "bg-[color:var(--danger)]"
                  : "bg-[color:var(--accent)]"
              }`}
              style={{ width: `${ratio}%` }}
            />
          </div>
        )}
        <p className="mt-2 text-[10px] leading-relaxed text-[color:var(--ink-3)] tabular-nums">
          実 {fmtHours(actual)}
          <span className="mx-1">＋</span>
          予 {fmtHours(planned)}
        </p>
      </div>
    </div>
  );
}

function MenuCard({
  href,
  title,
  subtitle,
  Icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 rounded-2xl bg-[color:var(--surface)] p-5 shadow-[var(--shadow-sm)] transition-transform active:scale-[0.98]"
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-[14px] font-semibold leading-snug tracking-tight text-[color:var(--ink)]">
          {title}
        </p>
        <p className="truncate text-[11px] leading-snug text-[color:var(--ink-3)]">
          {subtitle}
        </p>
      </div>
      <ChevronRight
        className="h-4 w-4 flex-shrink-0 text-[color:var(--ink-4)]"
        strokeWidth={2}
      />
    </Link>
  );
}
