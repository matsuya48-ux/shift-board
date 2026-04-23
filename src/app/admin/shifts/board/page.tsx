import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft } from "lucide-react";
import {
  toISODate,
  monthRange,
  type ShiftRow,
  type PatternRow,
} from "@/lib/hours";
import {
  type WeekdayLabel,
  type DateLabelOverride,
} from "@/lib/labels";
import { ShiftBoard } from "./_components/ShiftBoard";

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

export default async function ShiftBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ warehouse?: string; month?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const supabase = createAdminClient();

  const { data: warehouses } = await supabase
    .from("warehouses")
    .select("id, name, target_staff_per_weekday")
    .order("name");

  const whId = sp.warehouse ?? warehouses?.[0]?.id ?? "";

  const now = new Date();
  const month = sp.month
    ? new Date(`${sp.month}-01T00:00:00`)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const { start, end } = monthRange(month);

  const [
    { data: staffsRaw },
    { data: shiftsRaw },
    { data: patternsRaw },
    { data: weekdayLabelsRaw },
    { data: overridesRaw },
    { data: eventsRaw },
    { data: timeOffsRaw },
  ] = await Promise.all([
    supabase
      .from("staffs")
      .select(
        "id, display_name, warehouse_id, preferred_start_time, preferred_end_time, shift_style, weekly_hour_limit",
      )
      .eq("warehouse_id", whId)
      .eq("is_active", true)
      .order("display_name"),
    supabase
      .from("shifts")
      .select("*")
      .eq("warehouse_id", whId)
      .gte("work_date", toISODate(start))
      .lte("work_date", toISODate(end)),
    supabase.from("shift_patterns").select("*").eq("warehouse_id", whId),
    supabase
      .from("warehouse_weekday_labels")
      .select("*")
      .eq("warehouse_id", whId)
      .order("sort_order"),
    supabase
      .from("warehouse_date_label_overrides")
      .select("*")
      .eq("warehouse_id", whId)
      .gte("override_date", toISODate(start))
      .lte("override_date", toISODate(end)),
    supabase
      .from("warehouse_events")
      .select("*")
      .eq("warehouse_id", whId)
      .gte("event_date", toISODate(start))
      .lte("event_date", toISODate(end)),
    supabase
      .from("time_off_requests")
      .select("staff_id, request_date, status")
      .in("status", ["approved", "pending"])
      .gte("request_date", toISODate(start))
      .lte("request_date", toISODate(end)),
  ]);

  const warehouse = (warehouses ?? []).find((w) => w.id === whId) as
    | Warehouse
    | undefined;

  return (
    <AppShell>
      <div
        className="mx-auto w-full px-2 pb-8 pt-6 sm:px-3 md:px-4 landscape:px-3 sm:max-w-7xl animate-rise"
      >
        <Link
          href="/admin/shifts"
          className="inline-flex items-center gap-1 text-[13px] text-[color:var(--ink-3)] active:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          シフト作成
        </Link>

        <header className="mb-5 mt-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[color:var(--accent)]">
            Shift Board
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.35] tracking-tight text-[color:var(--ink)]">
            シフト編集ボード
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--ink-3)]">
            月カレンダーのセルをタップしてシフトを直接追加・編集できます。
            自動提案で下書きされたシフトをここで確認・修正してください。
          </p>
        </header>

        {/* 拠点タブ */}
        {warehouses && warehouses.length > 0 && (
          <div className="mb-3 flex gap-1 overflow-x-auto rounded-full bg-[color:var(--surface)] p-1 shadow-[var(--shadow-sm)]">
            {warehouses.map((wh) => {
              const active = whId === wh.id;
              const qs = new URLSearchParams();
              qs.set("warehouse", wh.id);
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
        )}

        {warehouse && (
          <ShiftBoard
            warehouse={warehouse}
            staffs={(staffsRaw ?? []) as Staff[]}
            shifts={(shiftsRaw ?? []) as ShiftRow[]}
            patterns={(patternsRaw ?? []) as PatternRow[]}
            weekdayLabels={(weekdayLabelsRaw ?? []) as WeekdayLabel[]}
            overrides={(overridesRaw ?? []) as DateLabelOverride[]}
            events={(eventsRaw ?? []) as WarehouseEvent[]}
            timeOffs={
              (timeOffsRaw ?? []) as {
                staff_id: string;
                request_date: string;
                status: string;
              }[]
            }
            month={toISODate(month).slice(0, 7)}
          />
        )}

        <p className="mt-3 text-center text-[10px] text-[color:var(--ink-3)]">
          ※ 空のセルをタップ：新規追加、埋まっているセル：編集・削除
        </p>
      </div>
    </AppShell>
  );
}
