import Link from "next/link";
import { ArrowLeft, Clock, Package, Gauge } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  RemoteList,
  type RemoteReportRow,
} from "@/app/remote/_components/RemoteList";
import { workHours, fmtHours1, fmtPerHour } from "@/lib/remote";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = RemoteReportRow & {
  staff_id: string;
  staffs: { display_name: string } | null;
};

export default async function AdminRemotePage({
  searchParams,
}: {
  searchParams: Promise<{ staff?: string; month?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const supabase = createAdminClient();

  // 今月デフォルト
  const now = new Date();
  const monthKey =
    sp.month ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [yearStr, monStr] = monthKey.split("-");
  const start = `${monthKey}-01`;
  const lastDay = new Date(Number(yearStr), Number(monStr), 0).getDate();
  const end = `${monthKey}-${String(lastDay).padStart(2, "0")}`;

  let query = supabase
    .from("remote_work_reports")
    .select(
      "id, staff_id, work_date, task_name, start_time, end_time, item_count, note, staffs(display_name)",
    )
    .gte("work_date", start)
    .lte("work_date", end)
    .order("work_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (sp.staff) query = query.eq("staff_id", sp.staff);

  const { data: rowsRaw } = await query;
  const rows = (rowsRaw ?? []) as unknown as Row[];

  // フィルタ用スタッフリスト
  const { data: staffsRaw } = await supabase
    .from("staffs")
    .select("id, display_name")
    .eq("is_active", true)
    .eq("role", "staff")
    .order("display_name");

  // ============= 集計 =============

  // 全体合計
  let totalHours = 0;
  let totalItems = 0;
  rows.forEach((r) => {
    totalHours += workHours(r.start_time.slice(0, 5), r.end_time.slice(0, 5));
    totalItems += r.item_count;
  });
  const overallRate = totalHours > 0 ? totalItems / totalHours : 0;

  // スタッフ別集計
  type StaffAgg = {
    staffId: string;
    name: string;
    count: number;
    hours: number;
    items: number;
    rate: number;
  };
  const staffAggMap = new Map<string, StaffAgg>();
  rows.forEach((r) => {
    const id = r.staff_id;
    const name = r.staffs?.display_name ?? "(不明)";
    const h = workHours(r.start_time.slice(0, 5), r.end_time.slice(0, 5));
    const agg = staffAggMap.get(id) ?? {
      staffId: id,
      name,
      count: 0,
      hours: 0,
      items: 0,
      rate: 0,
    };
    agg.count += 1;
    agg.hours += h;
    agg.items += r.item_count;
    staffAggMap.set(id, agg);
  });
  const staffAggs = [...staffAggMap.values()].map((a) => ({
    ...a,
    rate: a.hours > 0 ? a.items / a.hours : 0,
  }));
  // 作業時間の多い順で並べる（"誰がどれくらいやっているか" を見るため）
  const staffByHours = [...staffAggs].sort((a, b) => b.hours - a.hours);
  const maxHours = staffByHours[0]?.hours ?? 0;

  // 業務（task）別集計
  type TaskAgg = {
    task: string;
    count: number;
    hours: number;
    items: number;
    rate: number;
  };
  const taskAggMap = new Map<string, TaskAgg>();
  rows.forEach((r) => {
    const t = r.task_name;
    const h = workHours(r.start_time.slice(0, 5), r.end_time.slice(0, 5));
    const agg = taskAggMap.get(t) ?? {
      task: t,
      count: 0,
      hours: 0,
      items: 0,
      rate: 0,
    };
    agg.count += 1;
    agg.hours += h;
    agg.items += r.item_count;
    taskAggMap.set(t, agg);
  });
  const taskAggs = [...taskAggMap.values()]
    .map((t) => ({ ...t, rate: t.hours > 0 ? t.items / t.hours : 0 }))
    .sort((a, b) => b.hours - a.hours);

  // 日別合計（推移）
  type DailyAgg = {
    date: string;
    hours: number;
    items: number;
  };
  const dailyAggMap = new Map<string, DailyAgg>();
  rows.forEach((r) => {
    const h = workHours(r.start_time.slice(0, 5), r.end_time.slice(0, 5));
    const agg = dailyAggMap.get(r.work_date) ?? {
      date: r.work_date,
      hours: 0,
      items: 0,
    };
    agg.hours += h;
    agg.items += r.item_count;
    dailyAggMap.set(r.work_date, agg);
  });
  const dailyAggs = [...dailyAggMap.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const maxDailyItems = Math.max(1, ...dailyAggs.map((d) => d.items));

  // 前月/翌月リンク
  const prevMonth = (() => {
    const d = new Date(Number(yearStr), Number(monStr) - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();
  const nextMonth = (() => {
    const d = new Date(Number(yearStr), Number(monStr), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const reportsForList = rows.map((r) => ({
    id: r.id,
    work_date: r.work_date,
    task_name: r.task_name,
    start_time: r.start_time,
    end_time: r.end_time,
    item_count: r.item_count,
    note: r.note,
    staff_id: r.staff_id,
    staff_name: r.staffs?.display_name ?? "",
  }));

  return (
    <AppShell>
      <div className="mx-auto w-full px-0 pb-8 pt-6 sm:max-w-2xl animate-rise">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 px-3 text-[13px] text-[color:var(--ink-3)] active:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          管理者メニュー
        </Link>

        <header className="mb-5 mt-5 px-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[color:var(--accent)]">
            Remote work · Analytics
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.35] tracking-tight text-[color:var(--ink)]">
            リモート作業分析
          </h1>
        </header>

        {/* 月切替 */}
        <div className="mx-3 mb-3 flex items-center justify-between rounded-2xl bg-[color:var(--surface)] px-2 py-1 shadow-[var(--shadow-sm)]">
          <Link
            href={`?month=${prevMonth}${sp.staff ? `&staff=${sp.staff}` : ""}`}
            className="rounded-full px-3 py-2 text-[12px] font-medium text-[color:var(--ink-2)] active:bg-[color:var(--bg)]"
          >
            ← 前月
          </Link>
          <p className="text-[14px] font-semibold tabular-nums text-[color:var(--ink)]">
            {yearStr}年{Number(monStr)}月
          </p>
          <Link
            href={`?month=${nextMonth}${sp.staff ? `&staff=${sp.staff}` : ""}`}
            className="rounded-full px-3 py-2 text-[12px] font-medium text-[color:var(--ink-2)] active:bg-[color:var(--bg)]"
          >
            翌月 →
          </Link>
        </div>

        {/* スタッフフィルタ */}
        <div className="mx-3 mb-4 flex flex-wrap gap-1">
          <Link
            href={`?month=${monthKey}`}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${
              !sp.staff
                ? "bg-[color:var(--accent)] text-white"
                : "bg-[color:var(--surface)] text-[color:var(--ink-3)] shadow-[var(--shadow-sm)]"
            }`}
          >
            全員
          </Link>
          {(staffsRaw ?? []).map((s) => (
            <Link
              key={s.id}
              href={`?month=${monthKey}&staff=${s.id}`}
              className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${
                sp.staff === s.id
                  ? "bg-[color:var(--accent)] text-white"
                  : "bg-[color:var(--surface)] text-[color:var(--ink-3)] shadow-[var(--shadow-sm)]"
              }`}
            >
              {s.display_name}
            </Link>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="mx-3 rounded-2xl bg-[color:var(--surface)] p-10 text-center shadow-[var(--shadow-sm)]">
            <p className="text-[13px] text-[color:var(--ink-3)]">
              この期間の報告はありません
            </p>
          </div>
        ) : (
          <>
            {/* 全体サマリー */}
            <section className="mx-3 mb-5">
              <p className="mb-2 px-1 text-[12px] font-semibold text-[color:var(--ink-2)]">
                全体サマリー
              </p>
              <div className="grid grid-cols-3 gap-2">
                <SummaryCard
                  Icon={Clock}
                  label="合計時間"
                  value={fmtHours1(totalHours)}
                  unit="h"
                />
                <SummaryCard
                  Icon={Package}
                  label="合計件数"
                  value={String(totalItems)}
                  unit="件"
                />
                <SummaryCard
                  Icon={Gauge}
                  label="平均"
                  value={fmtPerHour(overallRate)}
                  unit="件/h"
                  highlight
                />
              </div>
            </section>

            {/* スタッフ別作業状況 */}
            {!sp.staff && staffByHours.length > 0 && (
              <section className="mx-3 mb-5">
                <p className="mb-2 px-1 text-[12px] font-semibold text-[color:var(--ink-2)]">
                  スタッフ別 作業状況
                </p>
                <ul className="space-y-1.5">
                  {staffByHours.map((s) => {
                    const widthPct =
                      maxHours > 0
                        ? Math.max(4, (s.hours / maxHours) * 100)
                        : 0;
                    return (
                      <li
                        key={s.staffId}
                        className="rounded-2xl bg-[color:var(--surface)] p-3 shadow-[var(--shadow-sm)]"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[color:var(--ink)]">
                            {s.name}
                          </p>
                          <p className="text-[14px] font-semibold tabular-nums text-[color:var(--ink)]">
                            {fmtHours1(s.hours)}
                            <span className="ml-0.5 text-[10px] font-normal text-[color:var(--ink-3)]">
                              h
                            </span>
                          </p>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[color:var(--bg)]">
                          <div
                            className="h-full rounded-full bg-[color:var(--accent)]"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-[11px] tabular-nums text-[color:var(--ink-3)]">
                          {s.items}件 ／{" "}
                          <span className="text-[color:var(--accent)] font-medium">
                            {fmtPerHour(s.rate)} 件/h
                          </span>
                          <span className="ml-1.5 text-[10px] text-[color:var(--ink-4)]">
                            （{s.count}件報告）
                          </span>
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* 業務別集計 */}
            {taskAggs.length > 0 && (
              <section className="mx-3 mb-5">
                <p className="mb-2 px-1 text-[12px] font-semibold text-[color:var(--ink-2)]">
                  業務別集計
                </p>
                <ul className="space-y-1.5">
                  {taskAggs.map((t) => {
                    const pct =
                      totalHours > 0 ? (t.hours / totalHours) * 100 : 0;
                    return (
                      <li
                        key={t.task}
                        className="rounded-2xl bg-[color:var(--surface)] p-3 shadow-[var(--shadow-sm)]"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[color:var(--ink)]">
                            {t.task}
                          </p>
                          <p className="text-[12px] tabular-nums text-[color:var(--ink-3)]">
                            {pct.toFixed(0)}%
                          </p>
                        </div>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[color:var(--bg)]">
                          <div
                            className="h-full rounded-full bg-[color:var(--accent)] opacity-70"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-[10px] tabular-nums text-[color:var(--ink-3)]">
                          {fmtHours1(t.hours)}h ／ {t.items}件 ／{" "}
                          <span className="font-semibold text-[color:var(--accent)]">
                            {fmtPerHour(t.rate)} 件/h
                          </span>
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* 日別推移 */}
            {dailyAggs.length > 0 && (
              <section className="mx-3 mb-5 rounded-2xl bg-[color:var(--surface)] p-4 shadow-[var(--shadow-sm)]">
                <p className="mb-3 text-[12px] font-semibold text-[color:var(--ink-2)]">
                  日別件数の推移
                </p>
                <div className="flex h-24 items-end gap-0.5 overflow-x-auto">
                  {dailyAggs.map((d) => {
                    const heightPct = (d.items / maxDailyItems) * 100;
                    const [, m, day] = d.date.split("-").map(Number);
                    return (
                      <div
                        key={d.date}
                        className="flex flex-1 min-w-[14px] flex-col items-center justify-end gap-1"
                        title={`${m}/${day} : ${d.items}件 / ${fmtHours1(d.hours)}h`}
                      >
                        <div
                          className="w-full rounded-t bg-[color:var(--accent)] opacity-80 transition-all"
                          style={{ height: `${heightPct}%`, minHeight: 2 }}
                        />
                        <span className="text-[8px] tabular-nums text-[color:var(--ink-4)]">
                          {day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 報告一覧 */}
            <section className="px-3">
              <p className="mb-2 px-1 text-[12px] font-semibold text-[color:var(--ink-2)]">
                報告一覧（{rows.length}件）
              </p>
              <RemoteList reports={reportsForList} showStaffName />
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function SummaryCard({
  Icon,
  label,
  value,
  unit,
  highlight,
}: {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-3 shadow-[var(--shadow-sm)] ${
        highlight
          ? "bg-[color:var(--accent-soft)]"
          : "bg-[color:var(--surface)]"
      }`}
    >
      <div
        className={`mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.06em] ${
          highlight
            ? "text-[color:var(--accent)]"
            : "text-[color:var(--ink-3)]"
        }`}
      >
        <Icon className="h-3 w-3" strokeWidth={2} />
        {label}
      </div>
      <p className="flex items-baseline gap-0.5 tabular-nums">
        <span
          className={`text-[20px] font-semibold leading-none tracking-tight ${
            highlight
              ? "text-[color:var(--accent)]"
              : "text-[color:var(--ink)]"
          }`}
        >
          {value}
        </span>
        <span className="text-[10px] font-medium text-[color:var(--ink-3)]">
          {unit}
        </span>
      </p>
    </div>
  );
}
