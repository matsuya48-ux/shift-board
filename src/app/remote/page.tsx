import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { requireStaff } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { RemoteForm } from "./_components/RemoteForm";
import { RemoteList, type RemoteReportRow } from "./_components/RemoteList";
import { workHours, fmtHours1, fmtPerHour } from "@/lib/remote";

// 報告は頻繁に変わるので毎回最新
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RemoteReportPage() {
  const { staff } = await requireStaff();
  const supabase = createAdminClient();

  const { data: rowsRaw } = await supabase
    .from("remote_work_reports")
    .select("id, work_date, task_name, start_time, end_time, item_count, note")
    .eq("staff_id", staff.id)
    .order("work_date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(50);

  const reports = (rowsRaw ?? []) as RemoteReportRow[];

  // 今月の集計
  const now = new Date();
  const mStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const monthReports = reports.filter((r) => r.work_date >= mStart);
  const totalItems = monthReports.reduce((s, r) => s + r.item_count, 0);
  const totalHours = monthReports.reduce(
    (s, r) =>
      s + workHours(r.start_time.slice(0, 5), r.end_time.slice(0, 5)),
    0,
  );
  const avgRate = totalHours > 0 ? totalItems / totalHours : 0;

  // 過去の業務名を suggestion に
  const taskSuggestions = Array.from(
    new Set(reports.map((r) => r.task_name)),
  ).slice(0, 20);

  return (
    <AppShell>
      <div className="mx-auto w-full px-0 pb-8 pt-6 sm:max-w-2xl animate-rise">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 px-3 text-[13px] text-[color:var(--ink-3)] active:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          ホーム
        </Link>

        <header className="mb-6 mt-5 px-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[color:var(--accent)]">
            Remote work
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.35] tracking-tight text-[color:var(--ink)]">
            リモート作業報告
          </h1>
          <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--ink-3)]">
            この日に何の業務を、何時から何時まで、何件作業したかを記録してください。
          </p>
        </header>

        {/* 今月の集計 */}
        {monthReports.length > 0 && (
          <section className="mx-3 mb-5 rounded-2xl bg-[color:var(--surface)] p-4 shadow-[var(--shadow-sm)]">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.1em] text-[color:var(--ink-3)]">
              今月の集計（{now.getMonth() + 1}月）
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-[color:var(--ink-3)]">作業時間</p>
                <p className="mt-0.5 text-[18px] font-semibold tabular-nums text-[color:var(--ink)]">
                  {fmtHours1(totalHours)}
                  <span className="ml-0.5 text-[10px] font-normal text-[color:var(--ink-3)]">
                    h
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[color:var(--ink-3)]">件数</p>
                <p className="mt-0.5 text-[18px] font-semibold tabular-nums text-[color:var(--ink)]">
                  {totalItems}
                  <span className="ml-0.5 text-[10px] font-normal text-[color:var(--ink-3)]">
                    件
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[color:var(--ink-3)]">平均</p>
                <p className="mt-0.5 text-[18px] font-semibold tabular-nums text-[color:var(--accent)]">
                  {fmtPerHour(avgRate)}
                  <span className="ml-0.5 text-[10px] font-normal text-[color:var(--ink-3)]">
                    件/h
                  </span>
                </p>
              </div>
            </div>
          </section>
        )}

        {/* 入力フォーム */}
        <section className="mx-3 mb-8 rounded-3xl bg-[color:var(--surface)] p-6 shadow-[var(--shadow-sm)]">
          <RemoteForm taskSuggestions={taskSuggestions} />
        </section>

        {/* 履歴 */}
        <section className="px-3">
          <h2 className="mb-3 text-[13px] font-semibold text-[color:var(--ink-2)]">
            あなたの報告履歴（{reports.length}件）
          </h2>
          <RemoteList
            reports={reports}
            taskSuggestions={taskSuggestions}
          />
        </section>
      </div>
    </AppShell>
  );
}
