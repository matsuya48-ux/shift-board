import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { RemoteList, type RemoteReportRow } from "@/app/remote/_components/RemoteList";
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

  // スタッフ別集計
  type Agg = {
    staffId: string;
    name: string;
    count: number;
    hours: number;
    items: number;
  };
  const aggMap = new Map<string, Agg>();
  rows.forEach((r) => {
    const id = r.staff_id;
    const name = r.staffs?.display_name ?? "(不明)";
    const h = workHours(r.start_time.slice(0, 5), r.end_time.slice(0, 5));
    const agg = aggMap.get(id) ?? {
      staffId: id,
      name,
      count: 0,
      hours: 0,
      items: 0,
    };
    agg.count += 1;
    agg.hours += h;
    agg.items += r.item_count;
    aggMap.set(id, agg);
  });
  const aggs = [...aggMap.values()].sort((a, b) => b.items - a.items);

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
            Remote work · Admin
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.35] tracking-tight text-[color:var(--ink)]">
            リモート作業報告
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

        {/* スタッフ別集計 */}
        {aggs.length > 0 && (
          <section className="mx-3 mb-5">
            <p className="mb-2 px-1 text-[12px] font-semibold text-[color:var(--ink-2)]">
              スタッフ別集計
            </p>
            <ul className="space-y-1.5">
              {aggs.map((a) => {
                const rate = a.hours > 0 ? a.items / a.hours : 0;
                return (
                  <li
                    key={a.staffId}
                    className="flex items-center gap-3 rounded-2xl bg-[color:var(--surface)] p-3 shadow-[var(--shadow-sm)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[color:var(--ink)]">
                        {a.name}
                      </p>
                      <p className="text-[10px] tabular-nums text-[color:var(--ink-3)]">
                        {a.count}件報告 / {fmtHours1(a.hours)}h / {a.items}件
                      </p>
                    </div>
                    <p className="text-[15px] font-semibold tabular-nums text-[color:var(--accent)]">
                      {fmtPerHour(rate)}
                      <span className="ml-0.5 text-[10px] font-normal text-[color:var(--ink-3)]">
                        件/h
                      </span>
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* 報告一覧 */}
        <section className="px-3">
          <p className="mb-2 px-1 text-[12px] font-semibold text-[color:var(--ink-2)]">
            報告一覧（{rows.length}件）
          </p>
          <RemoteList reports={reportsForList} showStaffName />
        </section>
      </div>
    </AppShell>
  );
}
