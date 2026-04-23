import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { requireStaff } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { TimeOffForm } from "./_components/TimeOffForm";
import { RequestList } from "./_components/RequestList";

export default async function TimeOffPage() {
  const { staff } = await requireStaff();
  const supabase = createAdminClient();

  const { data: requests } = await supabase
    .from("time_off_requests")
    .select("id, request_date, status, submitted_at, admin_note")
    .eq("staff_id", staff.id)
    .order("request_date", { ascending: true });

  const pendingCount =
    requests?.filter((r) => r.status === "pending").length ?? 0;

  return (
    <AppShell>
      <div
        className="animate-rise"
        style={{
          width: "100%",
          maxWidth: "32rem",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "2.25rem",
          paddingRight: "2.25rem",
          paddingTop: "1.75rem",
          paddingBottom: "2rem",
          boxSizing: "border-box",
        }}
      >
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
          <div className="text-[12px] leading-relaxed space-y-1">
            <p className="font-semibold text-[color:var(--ink)]">
              他の方には表示されません
            </p>
            <p className="text-[color:var(--ink-2)]">
              翌月分は毎月10日までに申請してください
            </p>
          </div>
        </div>

        {/* 申請フォームカード */}
        <section className="mb-10 rounded-3xl bg-[color:var(--surface)] p-7 shadow-[var(--shadow-sm)]">
          <TimeOffForm />
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
