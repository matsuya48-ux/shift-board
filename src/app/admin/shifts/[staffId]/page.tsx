import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft } from "lucide-react";
import {
  monthRange,
  toISODate,
  shiftHours,
  summarize,
  weekRange,
  fmtHours,
  type ShiftRow,
  type PatternRow,
} from "@/lib/hours";
import { StaffMonthEditor } from "./_components/StaffMonthEditor";

export default async function StaffShiftEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ staffId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  await requireAdmin();
  const { staffId } = await params;
  const sp = await searchParams;

  const supabase = createAdminClient();

  const { data: staff } = await supabase
    .from("staffs")
    .select(
      "id, display_name, warehouse_id, weekly_hour_limit, employment_type, preferred_start_time, preferred_end_time, shift_style, warehouses(name)",
    )
    .eq("id", staffId)
    .single();

  if (!staff) notFound();

  const warehouseName =
    (staff.warehouses as unknown as { name: string } | null)?.name ?? null;

  // 対象月
  const now = new Date();
  const month = sp.month
    ? new Date(`${sp.month}-01T00:00:00`)
    : new Date(now.getFullYear(), now.getMonth(), 1);

  const { start, end } = monthRange(month);

  // その月のシフト
  const { data: shiftsRaw } = await supabase
    .from("shifts")
    .select("*")
    .eq("staff_id", staffId)
    .gte("work_date", toISODate(start))
    .lte("work_date", toISODate(end))
    .order("work_date");

  // 拠点のパターン
  const { data: patternsRaw } = await supabase
    .from("shift_patterns")
    .select("*")
    .eq("warehouse_id", staff.warehouse_id)
    .order("start_time");

  // 希望休
  const { data: timeOffsRaw } = await supabase
    .from("time_off_requests")
    .select("request_date, status")
    .eq("staff_id", staffId)
    .gte("request_date", toISODate(start))
    .lte("request_date", toISODate(end));

  const shifts = (shiftsRaw ?? []) as ShiftRow[];
  const patterns = (patternsRaw ?? []) as PatternRow[];
  const patternMap = new Map(patterns.map((p) => [p.id, p]));

  const monthSummary = summarize(shifts, patternMap, now);

  // 今週の集計（今月の範囲内に限定せず全シフトで計算するため、週データ別取得）
  const { start: wkStart, end: wkEnd } = weekRange(now);
  const { data: weekShiftsRaw } = await supabase
    .from("shifts")
    .select("*")
    .eq("staff_id", staffId)
    .gte("work_date", toISODate(wkStart))
    .lte("work_date", toISODate(wkEnd));
  const weekSummary = summarize(
    (weekShiftsRaw ?? []) as ShiftRow[],
    patternMap,
    now,
  );

  return (
    <AppShell>
      <div
        className="mx-auto w-full px-2 pb-8 pt-6 sm:px-3 md:px-4 landscape:px-0 sm:max-w-2xl animate-rise"
      >
        <Link
          href="/admin/shifts"
          className="inline-flex items-center gap-1 text-[13px] text-[color:var(--ink-3)] active:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          スタッフ選択に戻る
        </Link>

        <header className="mb-5 mt-5 flex items-center gap-3.5">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--accent-soft)] text-base font-semibold uppercase text-[color:var(--accent)]">
            {staff.display_name[0] ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[color:var(--accent)]">
              Shift Editor
            </p>
            <h1 className="mt-0.5 truncate text-[20px] font-semibold tracking-tight text-[color:var(--ink)]">
              {staff.display_name}
            </h1>
            <p className="mt-0.5 truncate text-[11px] text-[color:var(--ink-3)]">
              {warehouseName ?? "—"}
              {staff.weekly_hour_limit && (
                <>
                  <span className="mx-1.5">・</span>
                  週上限 {staff.weekly_hour_limit}h
                </>
              )}
            </p>
          </div>
        </header>

        {/* 集計サマリー */}
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
              {staff.weekly_hour_limit && (
                <span
                  className={`ml-1 text-[10px] ${
                    weekSummary.total > staff.weekly_hour_limit
                      ? "text-[color:var(--danger)]"
                      : "text-[color:var(--ink-3)]"
                  }`}
                >
                  / {staff.weekly_hour_limit}h
                </span>
              )}
            </p>
            <p className="mt-1.5 text-[10px] text-[color:var(--ink-3)]">
              実 {fmtHours(weekSummary.actual)} + 予 {fmtHours(weekSummary.planned)}
            </p>
          </div>
          <div className="rounded-2xl bg-[color:var(--surface)] p-4 shadow-[var(--shadow-sm)]">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[color:var(--ink-3)]">
              今月（{month.getMonth() + 1}月）
            </p>
            <p className="mt-2 flex items-baseline gap-1 tabular-nums">
              <span className="text-[22px] font-semibold leading-none text-[color:var(--ink)]">
                {fmtHours(monthSummary.total)}
              </span>
              <span className="text-[11px] text-[color:var(--ink-3)]">h</span>
            </p>
            <p className="mt-1.5 text-[10px] text-[color:var(--ink-3)]">
              実 {fmtHours(monthSummary.actual)} + 予 {fmtHours(monthSummary.planned)}
            </p>
          </div>
        </div>

        <StaffMonthEditor
          staffId={staffId}
          warehouseId={staff.warehouse_id}
          shiftStyle={staff.shift_style as "pattern" | "free" | "both"}
          patterns={patterns}
          shifts={shifts}
          timeOffs={timeOffsRaw ?? []}
          month={toISODate(start).slice(0, 7)}
          preferredStart={staff.preferred_start_time}
          preferredEnd={staff.preferred_end_time}
        />
      </div>
    </AppShell>
  );
}
