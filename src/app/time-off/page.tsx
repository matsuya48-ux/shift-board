import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { requireStaff } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getNextCycle,
  daysUntilDeadline,
  cycleMonthKey,
} from "@/lib/time-off-reminder";
import { TimeOffForm } from "./_components/TimeOffForm";
import { RequestList } from "./_components/RequestList";
import { NoRequestSwitch } from "./_components/NoRequestSwitch";

export default async function TimeOffPage() {
  const { staff } = await requireStaff();
  const supabase = createAdminClient();
  const cycle = getNextCycle();
  const daysLeft = daysUntilDeadline();
  const cycleKey = cycleMonthKey(cycle);

  const [{ data: requests }, { count: cycleReqCount }, { data: noReq }] =
    await Promise.all([
      supabase
        .from("time_off_requests")
        .select("id, request_date, status, submitted_at, admin_note")
        .eq("staff_id", staff.id)
        .order("request_date", { ascending: true }),
      supabase
        .from("time_off_requests")
        .select("*", { count: "exact", head: true })
        .eq("staff_id", staff.id)
        .gte("request_date", cycle.start)
        .lte("request_date", cycle.end),
      supabase
        .from("time_off_no_requests")
        .select("id")
        .eq("staff_id", staff.id)
        .eq("cycle_month", cycleKey)
        .maybeSingle(),
    ]);

  const pendingCount =
    requests?.filter((r) => r.status === "pending").length ?? 0;
  const noRequestMarked = !!noReq;
  const hasCycleRequest = (cycleReqCount ?? 0) > 0;

  return (
    <AppShell>
      <div className="mx-auto w-full px-0 pb-8 pt-6 sm:max-w-2xl animate-rise">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-[13px] text-[color:var(--ink-3)] active:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          ホーム
        </Link>

        <header className="mb-8 mt-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[color:var(--accent)]">
            Time off
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.35] tracking-tight text-[color:var(--ink)]">
            希望休を申請
          </h1>
        </header>

        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-[color:var(--accent-soft)] p-5">
          <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)]">
            <Info className="h-3 w-3 text-white" strokeWidth={2.5} />
          </div>
          <div className="space-y-1 text-[12px] leading-relaxed">
            <p className="font-semibold text-[color:var(--ink)]">
              {cycle.cycleMonth}月度（{cycle.startMonth}月{cycle.startDay}日〜
              {cycle.endMonth}月{cycle.endDay}日）の希望休を申請してください
            </p>
            <p className="text-[color:var(--ink-2)]">
              締切：{cycle.deadlineMonth}月{cycle.deadlineDay}日
              {daysLeft >= 0 ? `（あと ${daysLeft} 日）` : "（締切を過ぎています）"}
            </p>
          </div>
        </div>

        {/* 申請フォームカード */}
        <section className="mb-5 rounded-3xl bg-[color:var(--surface)] p-7 shadow-[var(--shadow-sm)]">
          <TimeOffForm cycleStart={cycle.start} cycleEnd={cycle.end} />
        </section>

        {/* 希望休なしスイッチ */}
        <section className="mb-10">
          <NoRequestSwitch
            cycleMonth={cycleKey}
            cycleLabel={`${cycle.cycleMonth}月度`}
            initialMarked={noRequestMarked}
            hasAnyRequest={hasCycleRequest}
          />
        </section>

        {/* 申請中 件数 */}
        {(requests?.length ?? 0) > 0 && (
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="text-[13px] font-semibold text-[color:var(--ink-2)]">
              申請一覧
            </h2>
            <p className="text-[11px] text-[color:var(--ink-3)]">
              申請中 {pendingCount} 件 / 全 {requests?.length} 件
            </p>
          </div>
        )}

        <RequestList requests={requests ?? []} />
      </div>
    </AppShell>
  );
}
